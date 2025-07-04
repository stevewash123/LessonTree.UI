// **COMPLETE FILE** - CourseStateCoordinationService - Observable Infrastructure REMOVED
// RESPONSIBILITY: Course state coordination with clean business logic delegation
// DOES NOT: Handle HTTP operations, user feedback, or direct API calls - delegates to CRUD service
// CALLED BY: CourseCrudService for business logic coordination and workflow management

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { Course } from '../../../models/course';
import { LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { CourseQueryService } from '../course-data/course-query.service';
import { CourseDataService, OperationType, OperationMetadata } from '../course-data/course-data.service';

// Required Observable event interfaces for external consumers
export interface EntityCoordinationEvent {
  operation: 'create' | 'update' | 'delete';
  entityType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson';
  entityId: number;
  entityTitle: string;
  success: boolean;
  sortOrder?: number;
  parentId?: number;
  parentType?: string;
  error?: Error;
  timestamp: Date;
}

export interface ValidationEvent {
  validationType: 'parent-container' | 'course-exists' | 'sort-order';
  entityType: string;
  entityId?: number;
  parentId?: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface WorkflowCoordinationEvent {
  workflowType: 'entity-added' | 'entity-updated' | 'entity-moved';
  sourceService: string;
  coordinationAction: string;
  entityDetails: {
    entityType: string;
    entityId: number;
    entityTitle: string;
  };
  success: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CourseBusinessService implements OnDestroy {

  // ✅ REQUIRED: Observable event emissions for external consumers
  private readonly _coordinationCompleted$ = new Subject<EntityCoordinationEvent>();
  private readonly _validationCompleted$ = new Subject<ValidationEvent>();
  private readonly _workflowCoordinated$ = new Subject<WorkflowCoordinationEvent>();

  // Public observables for external consumption (course-crud-coordination.service.ts)
  readonly coordinationCompleted$ = this._coordinationCompleted$.asObservable();
  readonly validationCompleted$ = this._validationCompleted$.asObservable();
  readonly workflowCoordinated$ = this._workflowCoordinated$.asObservable();

  constructor(
    private courseQueryService: CourseQueryService,
    private courseDataService: CourseDataService
  ) {
    console.log('[CourseStateCoordinationService] Service initialized with required Observable events for external consumers');
  }

  // === SORT ORDER COMPUTATION ===

  /**
   * Compute topic sort order for course
   */
  computeTopicSortOrder(courseId: number): number {
    console.log(`[CourseStateCoordinationService] Computing topic sort order for course ${courseId}`);

    const course = this.courseQueryService.getCourseById(courseId);
    let computedSortOrder = 0;
    let containerItemCount = 0;

    if (course?.topics) {
      const maxSortOrder = Math.max(...course.topics.map(t => t.sortOrder), -1);
      computedSortOrder = maxSortOrder + 1;
      containerItemCount = course.topics.length;
    }

    console.log(`[CourseStateCoordinationService] Computed topic sort order: ${computedSortOrder} (${containerItemCount} existing topics)`);
    return computedSortOrder;
  }

  /**
   * Compute unified sort order for lessons and subtopics
   */
  computeUnifiedSortOrder(topicId?: number | null, subTopicId?: number | null): number {
    console.log(`[CourseStateCoordinationService] Computing unified sort order`, { topicId, subTopicId });

    let computedSortOrder = 0;
    let containerItemCount = 0;

    if (subTopicId) {
      // Lesson going into a SubTopic
      const subTopic = this.courseQueryService.getSubTopicById(subTopicId);

      if (subTopic?.lessons) {
        const validSortOrders = subTopic.lessons
          .map(l => l.sortOrder)
          .filter(order => order !== null && order !== undefined);

        const maxSortOrder = validSortOrders.length > 0 ? Math.max(...validSortOrders) : -1;
        computedSortOrder = maxSortOrder + 1;
        containerItemCount = subTopic.lessons.length;
      }
    } else if (topicId) {
      // Item going directly into a Topic
      const topic = this.courseQueryService.getTopicById(topicId);

      if (topic) {
        const allSortOrders: number[] = [];

        // Add SubTopic sort orders
        if (topic.subTopics) {
          const subTopicOrders = topic.subTopics
            .map(st => st.sortOrder)
            .filter(order => order !== null && order !== undefined);
          allSortOrders.push(...subTopicOrders);
          containerItemCount += topic.subTopics.length;
        }

        // Add direct lesson sort orders
        if (topic.lessons) {
          const lessonOrders = topic.lessons
            .map(l => l.sortOrder)
            .filter(order => order !== null && order !== undefined);
          allSortOrders.push(...lessonOrders);
          containerItemCount += topic.lessons.length;
        }

        const maxSort = allSortOrders.length > 0 ? Math.max(...allSortOrders) : -1;
        computedSortOrder = maxSort + 1;
      }
    } else {
      console.warn('[CourseStateCoordinationService] No valid parent container provided for sort order computation');
    }

    console.log(`[CourseStateCoordinationService] Computed unified sort order: ${computedSortOrder} (${containerItemCount} existing items)`);
    return computedSortOrder;
  }

  // === STATE COORDINATION METHODS ===

  /**
   * Coordinate course creation with clean delegation
   */
  coordinateCourseCreation<T>(
    apiOperation: Observable<T>,
    createdEntity: T,
    successMessage: string,
    operationType: OperationType = 'USER_ADD',
    metadata?: OperationMetadata
  ): Observable<T> {
    console.log('[CourseStateCoordinationService] Coordinating course creation');

    return apiOperation.pipe(
      tap(result => {
        try {
          console.log(`[CourseStateCoordinationService] ${successMessage}`);

          // Storage and signal emission
          this.courseDataService.addEntity(
            result as any,
            'infopanel',
            operationType,
            metadata
          );

          // ✅ REQUIRED: Emit coordination event for external consumers
          const entity = result as any;
          this._coordinationCompleted$.next({
            operation: 'create',
            entityType: 'Course',
            entityId: entity.id,
            entityTitle: entity.title || 'Unknown',
            success: true,
            sortOrder: entity.sortOrder,
            timestamp: new Date()
          });

          console.log('[CourseStateCoordinationService] Course creation coordination completed successfully');

        } catch (error: any) {
          console.error('[CourseStateCoordinationService] Error during course creation coordination:', error);

          // ✅ REQUIRED: Emit failed coordination event
          this._coordinationCompleted$.next({
            operation: 'create',
            entityType: 'Course',
            entityId: 0,
            entityTitle: 'Unknown',
            success: false,
            error,
            timestamp: new Date()
          });

          throw error;
        }
      })
    );
  }

  /**
   * Coordinate entity updates with clean delegation
   */
  coordinateEntityUpdate<T>(
    apiOperation: Observable<T>,
    successMessage: string,
    entityType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' = 'Course'
  ): Observable<T> {
    console.log(`[CourseStateCoordinationService] Coordinating ${entityType} update`);

    return apiOperation.pipe(
      tap(result => {
        try {
          console.log(`[CourseStateCoordinationService] ${successMessage}`);

          // Storage and signal emission
          this.courseDataService.updateEntity(result as any, 'infopanel');

          // ✅ REQUIRED: Emit coordination event for external consumers
          const entity = result as any;
          this._coordinationCompleted$.next({
            operation: 'update',
            entityType,
            entityId: entity.id,
            entityTitle: entity.title || 'Unknown',
            success: true,
            sortOrder: entity.sortOrder,
            parentId: entity.courseId || entity.topicId || entity.subTopicId,
            timestamp: new Date()
          });

          console.log(`[CourseStateCoordinationService] ${entityType} update coordination completed successfully`);

        } catch (error: any) {
          console.error(`[CourseStateCoordinationService] Error during ${entityType} update coordination:`, error);

          // ✅ REQUIRED: Emit failed coordination event
          this._coordinationCompleted$.next({
            operation: 'update',
            entityType,
            entityId: 0,
            entityTitle: 'Unknown',
            success: false,
            error,
            timestamp: new Date()
          });

          throw error;
        }
      })
    );
  }

  /**
   * Coordinate entity deletion with clean delegation
   */
  coordinateEntityDeletion<T>(
    apiOperation: Observable<T>,
    entityToDelete: any,
    successMessage: string,
    entityType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' = 'Course'
  ): Observable<T> {
    console.log(`[CourseStateCoordinationService] Coordinating ${entityType} deletion`);

    const entityId = entityToDelete?.id || 0;
    const entityTitle = entityToDelete?.title || 'Unknown';

    return apiOperation.pipe(
      tap(result => {
        try {
          if (entityToDelete) {
            console.log(`[CourseStateCoordinationService] ${successMessage}`);

            // Storage and signal emission
            this.courseDataService.removeEntity(entityToDelete, 'infopanel');

            // ✅ REQUIRED: Emit coordination event for external consumers
            this._coordinationCompleted$.next({
              operation: 'delete',
              entityType,
              entityId,
              entityTitle,
              success: true,
              timestamp: new Date()
            });

            console.log(`[CourseStateCoordinationService] ${entityType} deletion coordination completed successfully`);
          }
        } catch (error: any) {
          console.error(`[CourseStateCoordinationService] Error during ${entityType} deletion coordination:`, error);

          // ✅ REQUIRED: Emit failed coordination event
          this._coordinationCompleted$.next({
            operation: 'delete',
            entityType,
            entityId,
            entityTitle,
            success: false,
            error,
            timestamp: new Date()
          });

          throw error;
        }
      })
    );
  }

  // === ENTITY PREPARATION METHODS ===

  /**
   * Prepare course for API creation
   */
  prepareCourseForCreation(course: Course): any {
    return {
      title: course.title,
      description: course.description ?? '',
      visibility: course.visibility || 'Private'
    };
  }

  /**
   * Prepare topic for API creation with computed sort order
   */
  prepareTopicForCreation(topic: Topic): any {
    const computedSortOrder = this.computeTopicSortOrder(topic.courseId);

    return {
      title: topic.title,
      description: topic.description ?? '',
      courseId: topic.courseId,
      visibility: topic.visibility || 'Private',
      sortOrder: computedSortOrder
    };
  }

  /**
   * Prepare subtopic for API creation with computed sort order
   */
  prepareSubTopicForCreation(subtopic: SubTopic): SubTopic {
    const computedSortOrder = this.computeUnifiedSortOrder(subtopic.topicId);

    return {
      ...subtopic,
      sortOrder: computedSortOrder
    };
  }

  /**
   * Prepare lesson for API creation with computed sort order
   */
  prepareLessonForCreation(lesson: LessonDetail): any {
    const computedSortOrder = this.computeUnifiedSortOrder(lesson.topicId, lesson.subTopicId);

    return {
      title: lesson.title,
      subTopicId: lesson.subTopicId || null,
      topicId: lesson.topicId || null,
      visibility: lesson.visibility || 'Private',
      level: lesson.level || null,
      objective: lesson.objective || '',
      materials: lesson.materials || null,
      classTime: lesson.classTime || null,
      methods: lesson.methods || null,
      specialNeeds: lesson.specialNeeds || null,
      assessment: lesson.assessment || null,
      sortOrder: computedSortOrder
    };
  }

  /**
   * Create full lesson entity from API response and original data
   */
  createFullLessonEntity(originalLesson: LessonDetail, apiResponse: any, computedSortOrder: number): LessonDetail {
    return {
      ...originalLesson,
      id: apiResponse.id,
      sortOrder: computedSortOrder,
      nodeId: apiResponse.nodeId || `lesson_${apiResponse.id}`,
      entityType: 'Lesson',
      hasChildren: false,
      archived: false,
      userId: apiResponse.userId || 0,
      standards: [],
      attachments: [],
      notes: []
    };
  }

  // === VALIDATION METHODS ===

  /**
   * Validate parent containers exist
   */
  validateParentContainers(topicId?: number | null, subTopicId?: number | null): boolean {
    console.log('[CourseStateCoordinationService] Validating parent containers', { topicId, subTopicId });

    let isValid = true;

    if (subTopicId) {
      const subTopic = this.courseQueryService.getSubTopicById(subTopicId);
      if (!subTopic) {
        console.error(`[CourseStateCoordinationService] SubTopic ${subTopicId} not found`);
        isValid = false;
      }

      // ✅ REQUIRED: Emit validation event for external consumers
      this._validationCompleted$.next({
        validationType: 'parent-container',
        entityType: 'SubTopic',
        entityId: subTopicId,
        success: !!subTopic,
        error: subTopic ? undefined : `SubTopic ${subTopicId} not found`,
        timestamp: new Date()
      });
    }

    if (topicId) {
      const topic = this.courseQueryService.getTopicById(topicId);
      if (!topic) {
        console.error(`[CourseStateCoordinationService] Topic ${topicId} not found`);
        isValid = false;
      }

      // ✅ REQUIRED: Emit validation event for external consumers
      this._validationCompleted$.next({
        validationType: 'parent-container',
        entityType: 'Topic',
        entityId: topicId,
        success: !!topic,
        error: topic ? undefined : `Topic ${topicId} not found`,
        timestamp: new Date()
      });
    }

    console.log(`[CourseStateCoordinationService] Parent container validation result: ${isValid}`);
    return isValid;
  }

  /**
   * Validate course exists
   */
  validateCourse(courseId: number): boolean {
    console.log(`[CourseStateCoordinationService] Validating course ${courseId}`);

    const course = this.courseQueryService.getCourseById(courseId);
    const isValid = !!course;

    if (!isValid) {
      console.error(`[CourseStateCoordinationService] Course ${courseId} not found`);
    }

    // ✅ REQUIRED: Emit validation event for external consumers
    this._validationCompleted$.next({
      validationType: 'course-exists',
      entityType: 'Course',
      entityId: courseId,
      success: isValid,
      error: isValid ? undefined : `Course ${courseId} not found`,
      timestamp: new Date()
    });

    console.log(`[CourseStateCoordinationService] Course validation result: ${isValid}`);
    return isValid;
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[CourseStateCoordinationService] Cleaning up Observable subjects');

    // ✅ Complete subjects for external consumers
    this._coordinationCompleted$.complete();
    this._validationCompleted$.complete();
    this._workflowCoordinated$.complete();

    console.log('[CourseStateCoordinationService] All Observable subjects completed');
  }
}
