// RESPONSIBILITY: Course state coordination, sort order computation, and state synchronization after API operations
// DOES NOT: Handle HTTP operations, user feedback, or direct API calls - delegates to CRUD service
// CALLED BY: CourseCrudService for business logic coordination

import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CourseDataService } from '../../shared/services/course-data.service';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { LessonDetail } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseStateCoordinationService {

  constructor(
    private courseDataService: CourseDataService
  ) {
    console.log('[CourseStateCoordinationService] Service initialized for business logic coordination');
  }

  // === SORT ORDER COMPUTATION ===

  /**
   * Compute next sort order for topics within a course
   */
  computeTopicSortOrder(courseId: number): number {
    const course = this.courseDataService.getCourseById(courseId);
    if (course?.topics) {
      const maxSortOrder = Math.max(...course.topics.map(t => t.sortOrder), -1);
      return maxSortOrder + 1;
    }
    return 0; // First topic in course
  }

  /**
   * Compute unified sort order for items within a Topic or SubTopic container
   * For lessons: pass topicId if direct to topic, or pass topicId + subTopicId if in subtopic
   * For subtopics: pass topicId only
   */
  computeUnifiedSortOrder(topicId?: number | null, subTopicId?: number | null): number {
    if (subTopicId) {
      // Lesson going into a SubTopic - find max sort order within that SubTopic
      const subTopic = this.courseDataService.getSubTopicById(subTopicId);
      
      if (subTopic?.lessons) {
        // Filter out any null/undefined sortOrder values
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
      const topic = this.courseDataService.getTopicById(topicId);
      
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

  // === STATE COORDINATION METHODS ===

  /**
   * Coordinate course creation with state synchronization
   */
  coordinateCourseCreation<T>(
    apiOperation: Observable<T>, 
    createdEntity: T,
    successMessage: string
  ): Observable<T> {
    return apiOperation.pipe(
      tap(result => {
        this.courseDataService.addEntity(result as any, 'infopanel');
        console.log(`[CourseStateCoordinationService] ${successMessage}:`, result);
      })
    );
  }

  /**
   * Coordinate entity updates with state synchronization
   */
  coordinateEntityUpdate<T>(
    apiOperation: Observable<T>,
    successMessage: string
  ): Observable<T> {
    return apiOperation.pipe(
      tap(result => {
        this.courseDataService.updateEntity(result as any, 'infopanel');
        console.log(`[CourseStateCoordinationService] ${successMessage}:`, result);
      })
    );
  }

  /**
   * Coordinate entity deletion with state synchronization
   */
  coordinateEntityDeletion<T>(
    apiOperation: Observable<T>,
    entityToDelete: any,
    successMessage: string
  ): Observable<T> {
    return apiOperation.pipe(
      tap(result => {
        if (entityToDelete) {
          this.courseDataService.removeEntity(entityToDelete, 'infopanel');
          console.log(`[CourseStateCoordinationService] ${successMessage}:`, entityToDelete);
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
      description: course.description ?? '', // Ensure string, not undefined
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
      ...originalLesson, // Use original lesson data
      id: apiResponse.id, // Use API-assigned ID
      sortOrder: computedSortOrder, // Use our computed sort order
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
      const subTopic = this.courseDataService.getSubTopicById(subTopicId);
      if (!subTopic) {
        console.error(`[CourseStateCoordinationService] SubTopic ${subTopicId} not found`);
        return false;
      }
    }
    
    if (topicId) {
      const topic = this.courseDataService.getTopicById(topicId);
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
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      console.error(`[CourseStateCoordinationService] Course ${courseId} not found`);
      return false;
    }
    return true;
  }
}