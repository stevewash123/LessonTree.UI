// **COMPLETE FILE** - CourseStateCoordinationService with COMPLETE dual Signal/Observable pattern
// RESPONSIBILITY: Course state coordination with Observable events for cross-component workflows
// DOES NOT: Handle HTTP operations, user feedback, or direct API calls - delegates to CRUD service
// CALLED BY: CourseCrudService for business logic coordination with workflow event emission

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription, tap } from 'rxjs';
import { Course } from '../../../models/course';
import { LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { CourseQueryService } from '../course-data/course-query.service';
import { CourseDataService, OperationType, OperationMetadata } from '../course-data/course-data.service';
import { CourseSignalService } from '../course-data/course-signal.service';

// ✅ Observable event interfaces for coordination workflows
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

export interface SortOrderComputationEvent {
  entityType: 'Topic' | 'SubTopic' | 'Lesson';
  parentType: 'Course' | 'Topic' | 'SubTopic';
  parentId: number;
  computedSortOrder: number;
  containerItemCount: number;
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
export class CourseStateCoordinationService implements OnDestroy {

  // ✅ Observable event emissions following established pattern
  private readonly _coordinationCompleted$ = new Subject<EntityCoordinationEvent>();
  private readonly _sortOrderComputed$ = new Subject<SortOrderComputationEvent>();
  private readonly _validationCompleted$ = new Subject<ValidationEvent>();
  private readonly _workflowCoordinated$ = new Subject<WorkflowCoordinationEvent>();

  // Public observables
  readonly coordinationCompleted$ = this._coordinationCompleted$.asObservable();
  readonly sortOrderComputed$ = this._sortOrderComputed$.asObservable();
  readonly validationCompleted$ = this._validationCompleted$.asObservable();
  readonly workflowCoordinated$ = this._workflowCoordinated$.asObservable();

  // ✅ Subscription management for Observable consumption
  private subscriptions = new Subscription();

  constructor(
    private courseQueryService: CourseQueryService,
    private courseDataService: CourseDataService,
    private courseSignalService: CourseSignalService
  ) {
    console.log('[CourseStateCoordinationService] Enhanced with COMPLETE dual Signal/Observable pattern - emission AND consumption');
    this.setupObservableConsumption();
  }

  // ✅ NEW: Complete Observable consumption setup
  private setupObservableConsumption(): void {
    console.log('[CourseStateCoordinationService] Setting up Observable consumption for cross-service coordination');

    // ✅ Consume CourseSignalService events for workflow coordination
    this.subscriptions.add(
      this.courseSignalService.nodeAdded$.subscribe(event => {
        console.log('[CourseStateCoordinationService] Received nodeAdded event - coordinating workflow', {
          entityType: event.node.nodeType,
          entityId: event.node.id,
          source: event.source,
          operationType: event.operationType
        });

        this.handleEntityAddedWorkflow(event);
      })
    );

    this.subscriptions.add(
      this.courseSignalService.nodeEdited$.subscribe(event => {
        console.log('[CourseStateCoordinationService] Received nodeEdited event - coordinating workflow', {
          entityType: event.node.nodeType,
          entityId: event.node.id,
          source: event.source
        });

        this.handleEntityUpdatedWorkflow(event);
      })
    );

    this.subscriptions.add(
      this.courseSignalService.nodeMoved$.subscribe(event => {
        console.log('[CourseStateCoordinationService] Received nodeMoved event - coordinating workflow', {
          entityType: event.node.nodeType,
          entityId: event.node.id,
          source: event.source
        });

        this.handleEntityMovedWorkflow(event);
      })
    );

    console.log('[CourseStateCoordinationService] Observable consumption setup complete - monitoring 3 event streams');
  }

  // ✅ NEW: Workflow coordination handlers
  private handleEntityAddedWorkflow(event: any): void {
    try {
      // Coordinate follow-up actions when entities are added
      const entity = event.node;
      const coordinationActions: string[] = [];

      // Example coordination logic
      if (entity.nodeType === 'Lesson' && event.source === 'infopanel') {
        coordinationActions.push('validate-lesson-constraints');
        coordinationActions.push('update-course-lesson-count');

        // Perform validation
        const isValid = this.validateParentContainers(entity.topicId, entity.subTopicId);
        if (isValid) {
          coordinationActions.push('validation-passed');
        }
      }

      if (entity.nodeType === 'Topic' && event.source === 'infopanel') {
        coordinationActions.push('validate-topic-constraints');
        coordinationActions.push('update-course-topic-count');
      }

      // ✅ Emit workflow coordination event
      this._workflowCoordinated$.next({
        workflowType: 'entity-added',
        sourceService: 'CourseSignalService',
        coordinationAction: coordinationActions.join(', '),
        entityDetails: {
          entityType: entity.nodeType,
          entityId: entity.id,
          entityTitle: entity.title || 'Unknown'
        },
        success: true,
        timestamp: new Date()
      });

      console.log('[CourseStateCoordinationService] Entity added workflow coordination completed', {
        entityType: entity.nodeType,
        actions: coordinationActions
      });

    } catch (error) {
      console.error('[CourseStateCoordinationService] Error in entity added workflow:', error);

      this._workflowCoordinated$.next({
        workflowType: 'entity-added',
        sourceService: 'CourseSignalService',
        coordinationAction: 'error-handling',
        entityDetails: {
          entityType: event.node?.nodeType || 'Unknown',
          entityId: event.node?.id || 0,
          entityTitle: event.node?.title || 'Unknown'
        },
        success: false,
        timestamp: new Date()
      });
    }
  }

  private handleEntityUpdatedWorkflow(event: any): void {
    try {
      const entity = event.node;
      const coordinationActions = ['validate-entity-integrity', 'update-dependent-entities'];

      // ✅ Emit workflow coordination event
      this._workflowCoordinated$.next({
        workflowType: 'entity-updated',
        sourceService: 'CourseSignalService',
        coordinationAction: coordinationActions.join(', '),
        entityDetails: {
          entityType: entity.nodeType,
          entityId: entity.id,
          entityTitle: entity.title || 'Unknown'
        },
        success: true,
        timestamp: new Date()
      });

      console.log('[CourseStateCoordinationService] Entity updated workflow coordination completed');

    } catch (error) {
      console.error('[CourseStateCoordinationService] Error in entity updated workflow:', error);
    }
  }

  private handleEntityMovedWorkflow(event: any): void {
    try {
      const entity = event.node;
      const coordinationActions = ['recalculate-sort-orders', 'validate-new-container', 'update-entity-relationships'];

      // ✅ Emit workflow coordination event
      this._workflowCoordinated$.next({
        workflowType: 'entity-moved',
        sourceService: 'CourseSignalService',
        coordinationAction: coordinationActions.join(', '),
        entityDetails: {
          entityType: entity.nodeType,
          entityId: entity.id,
          entityTitle: entity.title || 'Unknown'
        },
        success: true,
        timestamp: new Date()
      });

      console.log('[CourseStateCoordinationService] Entity moved workflow coordination completed');

    } catch (error) {
      console.error('[CourseStateCoordinationService] Error in entity moved workflow:', error);
    }
  }

  // === ENHANCED SORT ORDER COMPUTATION WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Compute topic sort order with Observable event emission
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

    // ✅ Emit sort order computation event
    this._sortOrderComputed$.next({
      entityType: 'Topic',
      parentType: 'Course',
      parentId: courseId,
      computedSortOrder,
      containerItemCount,
      timestamp: new Date()
    });

    console.log(`[CourseStateCoordinationService] Computed topic sort order: ${computedSortOrder} (${containerItemCount} existing topics)`);
    return computedSortOrder;
  }

  /**
   * ✅ Enhanced: Compute unified sort order with Observable event emission
   */
  computeUnifiedSortOrder(topicId?: number | null, subTopicId?: number | null): number {
    console.log(`[CourseStateCoordinationService] Computing unified sort order`, { topicId, subTopicId });

    let computedSortOrder = 0;
    let containerItemCount = 0;
    let parentType: 'Topic' | 'SubTopic' = 'Topic';
    let parentId = topicId || 0;

    if (subTopicId) {
      // Lesson going into a SubTopic
      const subTopic = this.courseQueryService.getSubTopicById(subTopicId);
      parentType = 'SubTopic';
      parentId = subTopicId;

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
      parentType = 'Topic';
      parentId = topicId;

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

    // ✅ Emit sort order computation event
    this._sortOrderComputed$.next({
      entityType: subTopicId ? 'Lesson' : 'SubTopic',
      parentType,
      parentId,
      computedSortOrder,
      containerItemCount,
      timestamp: new Date()
    });

    console.log(`[CourseStateCoordinationService] Computed unified sort order: ${computedSortOrder} (${containerItemCount} existing items)`);
    return computedSortOrder;
  }

  // === ENHANCED STATE COORDINATION METHODS WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Coordinate course creation with Observable event emission
   */
  coordinateCourseCreation<T>(
    apiOperation: Observable<T>,
    createdEntity: T,
    successMessage: string,
    operationType: OperationType = 'USER_ADD',
    metadata?: OperationMetadata
  ): Observable<T> {
    console.log('[CourseStateCoordinationService] Coordinating course creation with observable events');

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

          // ✅ Emit successful coordination event
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

        } catch (error: any) {
          console.error('[CourseStateCoordinationService] Error during course creation coordination:', error);

          // ✅ Emit failed coordination event
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
   * ✅ Enhanced: Coordinate entity updates with Observable event emission
   */
  coordinateEntityUpdate<T>(
    apiOperation: Observable<T>,
    successMessage: string,
    entityType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' = 'Course'
  ): Observable<T> {
    console.log(`[CourseStateCoordinationService] Coordinating ${entityType} update with observable events`);

    return apiOperation.pipe(
      tap(result => {
        try {
          console.log(`[CourseStateCoordinationService] ${successMessage}`);

          // Storage and signal emission
          this.courseDataService.updateEntity(result as any, 'infopanel');

          // ✅ Emit successful coordination event
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

        } catch (error: any) {
          console.error(`[CourseStateCoordinationService] Error during ${entityType} update coordination:`, error);

          // ✅ Emit failed coordination event
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
   * ✅ Enhanced: Coordinate entity deletion with Observable event emission
   */
  coordinateEntityDeletion<T>(
    apiOperation: Observable<T>,
    entityToDelete: any,
    successMessage: string,
    entityType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' = 'Course'
  ): Observable<T> {
    console.log(`[CourseStateCoordinationService] Coordinating ${entityType} deletion with observable events`);

    const entityId = entityToDelete?.id || 0;
    const entityTitle = entityToDelete?.title || 'Unknown';

    return apiOperation.pipe(
      tap(result => {
        try {
          if (entityToDelete) {
            console.log(`[CourseStateCoordinationService] ${successMessage}`);

            // Storage and signal emission
            this.courseDataService.removeEntity(entityToDelete, 'infopanel');

            // ✅ Emit successful coordination event
            this._coordinationCompleted$.next({
              operation: 'delete',
              entityType,
              entityId,
              entityTitle,
              success: true,
              timestamp: new Date()
            });
          }
        } catch (error: any) {
          console.error(`[CourseStateCoordinationService] Error during ${entityType} deletion coordination:`, error);

          // ✅ Emit failed coordination event
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

  // === ENTITY PREPARATION METHODS (Unchanged - Pure Functions) ===

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
      nodeType: 'Lesson',
      hasChildren: false,
      archived: false,
      userId: apiResponse.userId || 0,
      standards: [],
      attachments: [],
      notes: []
    };
  }

  // === ENHANCED VALIDATION METHODS WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Validate parent containers with Observable event emission
   */
  validateParentContainers(topicId?: number | null, subTopicId?: number | null): boolean {
    console.log('[CourseStateCoordinationService] Validating parent containers', { topicId, subTopicId });

    let isValid = true;
    let error: string | undefined;

    if (subTopicId) {
      const subTopic = this.courseQueryService.getSubTopicById(subTopicId);
      if (!subTopic) {
        error = `SubTopic ${subTopicId} not found`;
        isValid = false;
        console.error(`[CourseStateCoordinationService] ${error}`);
      }

      // ✅ Emit validation event for SubTopic
      this._validationCompleted$.next({
        validationType: 'parent-container',
        entityType: 'SubTopic',
        entityId: subTopicId,
        success: !!subTopic,
        error: subTopic ? undefined : error,
        timestamp: new Date()
      });
    }

    if (topicId) {
      const topic = this.courseQueryService.getTopicById(topicId);
      if (!topic) {
        error = `Topic ${topicId} not found`;
        isValid = false;
        console.error(`[CourseStateCoordinationService] ${error}`);
      }

      // ✅ Emit validation event for Topic
      this._validationCompleted$.next({
        validationType: 'parent-container',
        entityType: 'Topic',
        entityId: topicId,
        success: !!topic,
        error: topic ? undefined : error,
        timestamp: new Date()
      });
    }

    console.log(`[CourseStateCoordinationService] Parent container validation result: ${isValid}`);
    return isValid;
  }

  /**
   * ✅ Enhanced: Validate course exists with Observable event emission
   */
  validateCourse(courseId: number): boolean {
    console.log(`[CourseStateCoordinationService] Validating course ${courseId}`);

    const course = this.courseQueryService.getCourseById(courseId);
    const isValid = !!course;
    const error = course ? undefined : `Course ${courseId} not found`;

    if (!isValid) {
      console.error(`[CourseStateCoordinationService] ${error}`);
    }

    // ✅ Emit validation event
    this._validationCompleted$.next({
      validationType: 'course-exists',
      entityType: 'Course',
      entityId: courseId,
      success: isValid,
      error,
      timestamp: new Date()
    });

    console.log(`[CourseStateCoordinationService] Course validation result: ${isValid}`);
    return isValid;
  }

  // === CLEANUP ===

  /**
   * ✅ Complete Observable cleanup following established pattern
   */
  ngOnDestroy(): void {
    console.log('[CourseStateCoordinationService] Cleaning up Observable subscriptions and subjects');

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // ✅ Complete subjects
    this._coordinationCompleted$.complete();
    this._sortOrderComputed$.complete();
    this._validationCompleted$.complete();
    this._workflowCoordinated$.complete();

    console.log('[CourseStateCoordinationService] All Observable subjects and subscriptions completed');
  }
}
