// **COMPLETE FILE** - Fixed course-state-coordination.service.ts
// RESPONSIBILITY: Course state coordination, sort order computation, and state synchronization after API operations
// DOES NOT: Handle HTTP operations, user feedback, or direct API calls - delegates to CRUD service
// CALLED BY: CourseCrudService for business logic coordination

import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Course } from '../../../models/course';
import { LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { CourseQueryService } from '../course-data/course-query.service';
import { CourseDataService, OperationType, OperationMetadata } from '../course-data/course-data.service';

@Injectable({
  providedIn: 'root'
})
export class CourseStateCoordinationService {

  constructor(
    private courseQueryService: CourseQueryService,
    private courseDataService: CourseDataService  // ✅ ADDED: For proper storage + signal coordination
  ) {
    console.log('[CourseStateCoordinationService] Service initialized for business logic coordination');
  }

  // === SORT ORDER COMPUTATION ===

  /**
   * Compute next sort order for topics within a course
   */
  computeTopicSortOrder(courseId: number): number {
    const course = this.courseQueryService.getCourseById(courseId);
    if (course?.topics) {
      const maxSortOrder = Math.max(...course.topics.map(t => t.sortOrder), -1);
      return maxSortOrder + 1;
    }
    return 0; // First topic in course
  }

  /**
   * Compute unified sort order for items within a Topic or SubTopic container
   */
  computeUnifiedSortOrder(topicId?: number | null, subTopicId?: number | null): number {
    if (subTopicId) {
      // Lesson going into a SubTopic - find max sort order within that SubTopic
      const subTopic = this.courseQueryService.getSubTopicById(subTopicId);

      if (subTopic?.lessons) {
        const validSortOrders = subTopic.lessons
          .map(l => l.sortOrder)
          .filter(order => order !== null && order !== undefined);

        const maxSortOrder = validSortOrders.length > 0 ? Math.max(...validSortOrders) : -1;
        return maxSortOrder + 1;
      }
      return 0; // First lesson in SubTopic
    }

    if (topicId) {
      // Item going directly into a Topic - use unified sort order across ALL Topic children
      const topic = this.courseQueryService.getTopicById(topicId);

      if (topic) {
        const allSortOrders: number[] = [];

        // Add SubTopic sort orders
        if (topic.subTopics) {
          const subTopicOrders = topic.subTopics
            .map(st => st.sortOrder)
            .filter(order => order !== null && order !== undefined);
          allSortOrders.push(...subTopicOrders);
        }

        // Add direct lesson sort orders
        if (topic.lessons) {
          const lessonOrders = topic.lessons
            .map(l => l.sortOrder)
            .filter(order => order !== null && order !== undefined);
          allSortOrders.push(...lessonOrders);
        }

        const maxSort = allSortOrders.length > 0 ? Math.max(...allSortOrders) : -1;
        return maxSort + 1;
      }
      return 0; // First item in Topic
    }

    console.warn('[CourseStateCoordinationService] computeUnifiedSortOrder: No valid parent container provided');
    return 0;
  }

  // === STATE COORDINATION METHODS - FIXED ===

  /**
   * Coordinate course creation with state synchronization - FIXED
   */
  coordinateCourseCreation<T>(
    apiOperation: Observable<T>,
    createdEntity: T,
    successMessage: string,
    operationType: OperationType = 'USER_ADD',
    metadata?: OperationMetadata
  ): Observable<T> {
    return apiOperation.pipe(
      tap(result => {
        console.log(`[CourseStateCoordinationService] ${successMessage}`);

        // ✅ FIXED: Use CourseDataService to handle both storage AND signal emission
        // This was the critical bug causing the infinite loop - we were bypassing storage updates
        this.courseDataService.addEntity(
          result as any,
          'infopanel',
          operationType,
          metadata
        );
      })
    );
  }

  /**
   * Coordinate entity updates with state synchronization - FIXED
   */
  coordinateEntityUpdate<T>(
    apiOperation: Observable<T>,
    successMessage: string
  ): Observable<T> {
    return apiOperation.pipe(
      tap(result => {
        console.log(`[CourseStateCoordinationService] ${successMessage}`);

        // ✅ FIXED: Use CourseDataService to handle both storage AND signal emission
        this.courseDataService.updateEntity(result as any, 'infopanel');
      })
    );
  }

  /**
   * Coordinate entity deletion with state synchronization - FIXED
   */
  coordinateEntityDeletion<T>(
    apiOperation: Observable<T>,
    entityToDelete: any,
    successMessage: string
  ): Observable<T> {
    return apiOperation.pipe(
      tap(result => {
        if (entityToDelete) {
          console.log(`[CourseStateCoordinationService] ${successMessage}`);

          // ✅ FIXED: Use CourseDataService to handle both storage AND signal emission
          this.courseDataService.removeEntity(entityToDelete, 'infopanel');
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
      nodeType: 'Lesson',
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
   * Validate that required parent containers exist
   */
  validateParentContainers(topicId?: number | null, subTopicId?: number | null): boolean {
    if (subTopicId) {
      const subTopic = this.courseQueryService.getSubTopicById(subTopicId);
      if (!subTopic) {
        console.error(`[CourseStateCoordinationService] SubTopic ${subTopicId} not found`);
        return false;
      }
    }

    if (topicId) {
      const topic = this.courseQueryService.getTopicById(topicId);
      if (!topic) {
        console.error(`[CourseStateCoordinationService] Topic ${topicId} not found`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate course exists before operations
   */
  validateCourse(courseId: number): boolean {
    const course = this.courseQueryService.getCourseById(courseId);
    if (!course) {
      console.error(`[CourseStateCoordinationService] Course ${courseId} not found`);
      return false;
    }
    return true;
  }
}
