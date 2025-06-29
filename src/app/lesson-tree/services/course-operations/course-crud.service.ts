// RESPONSIBILITY: Pure CRUD API operations, error handling, and user feedback for course entities
// DOES NOT: Handle course management, selection logic, or business rules - delegates to specialized services
// CALLED BY: InfoPanel components for CRUD operations

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../shared/services/api.service';
import { Course } from '../../../models/course';
import { LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { CourseDataService, OperationMetadata } from '../course-data/course-data.service';
import { CourseStateCoordinationService } from './course-state-coordination.service';

@Injectable({
  providedIn: 'root'
})
export class CourseCrudService {
  
  constructor(
    private apiService: ApiService,
    private courseDataService: CourseDataService,
    private courseStateCoordination: CourseStateCoordinationService,
    private toastr: ToastrService
  ) {
    console.log('[CourseCrudService] Service initialized for pure CRUD operations');
    
    // Auto-load courses on service initialization
    this.autoLoadCourses();
  }
  
  private autoLoadCourses(): void {
    this.loadCourses('active', 'private').subscribe({
      next: (courses) => {
        // Auto-load success - no logging needed
      },
      error: (error) => {
        console.error('[CourseCrudService] Auto-load failed:', error);
        // Don't show toastr error for auto-load - it's called during app initialization
      }
    });
  }

  // === COURSE CRUD OPERATIONS ===

  loadCourses(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private'
  ): Observable<Course[]> {
    return this.apiService.getCourses(courseFilter, visibilityFilter).pipe(
      tap(courses => {
        this.courseDataService.setCourses(courses, 'initialization');
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to load courses:', err);
        this.toastr.error('Failed to load courses: ' + err.message, 'Error');
        return of([]);
      })
    );
  }

  createCourse(course: Course): Observable<Course> {
    const coursePayload = this.courseStateCoordination.prepareCourseForCreation(course);
    
    return this.courseStateCoordination.coordinateCourseCreation(
      this.apiService.createCourse(coursePayload),
      course,
      `Course "${course.title}" created successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`Course "${course.title}" created successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create course:', err);
        this.toastr.error('Failed to create course: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateCourse(course: Course): Observable<Course> {
    return this.courseStateCoordination.coordinateEntityUpdate(
      this.apiService.updateCourse(course),
      `Course "${course.title}" updated successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`Course "${course.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update course:', err);
        this.toastr.error('Failed to update course: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteCourse(courseId: number): Observable<boolean> {
    const courseToDelete = this.courseDataService.getCourseById(courseId);
    
    return this.courseStateCoordination.coordinateEntityDeletion(
      this.apiService.deleteCourse(courseId),
      courseToDelete,
      `Course "${courseToDelete?.title}" deleted successfully`
    ).pipe(
      tap(() => {
        if (courseToDelete) {
          this.toastr.success(`Course "${courseToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete course:', err);
        this.toastr.error('Failed to delete course: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  // === TOPIC CRUD OPERATIONS ===
  
  createTopic(topic: Topic): Observable<Topic> {
    const topicPayload = this.courseStateCoordination.prepareTopicForCreation(topic);
    
    return this.courseStateCoordination.coordinateCourseCreation(
      this.apiService.createTopic(topicPayload),
      topic,
      `Topic "${topic.title}" created successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`Topic "${topic.title}" created successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create topic:', err);
        this.toastr.error('Failed to create topic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateTopic(topic: Topic): Observable<Topic> {
    return this.courseStateCoordination.coordinateEntityUpdate(
      this.apiService.updateTopic(topic),
      `Topic "${topic.title}" updated successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`Topic "${topic.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update topic:', err);
        this.toastr.error('Failed to update topic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteTopic(topicId: number): Observable<boolean> {
    const topicToDelete = this.courseDataService.getTopicById(topicId);
    
    return this.courseStateCoordination.coordinateEntityDeletion(
      this.apiService.deleteTopic(topicId),
      topicToDelete,
      `Topic "${topicToDelete?.title}" deleted successfully`
    ).pipe(
      tap(() => {
        if (topicToDelete) {
          this.toastr.success(`Topic "${topicToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete topic:', err);
        this.toastr.error('Failed to delete topic: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  // === SUBTOPIC CRUD OPERATIONS ===
  
  createSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    const subtopicWithSortOrder = this.courseStateCoordination.prepareSubTopicForCreation(subtopic);
    
    return this.courseStateCoordination.coordinateCourseCreation(
      this.apiService.createSubTopic(subtopicWithSortOrder),
      subtopic,
      `SubTopic "${subtopic.title}" created successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`SubTopic "${subtopic.title}" created successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create subtopic:', err);
        this.toastr.error('Failed to create subtopic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    return this.courseStateCoordination.coordinateEntityUpdate(
      this.apiService.updateSubTopic(subtopic),
      `SubTopic "${subtopic.title}" updated successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`SubTopic "${subtopic.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update subtopic:', err);
        this.toastr.error('Failed to update subtopic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteSubTopic(subTopicId: number): Observable<boolean> {
    const subTopicToDelete = this.courseDataService.getSubTopicById(subTopicId);
    
    return this.courseStateCoordination.coordinateEntityDeletion(
      this.apiService.deleteSubTopic(subTopicId),
      subTopicToDelete,
      `SubTopic "${subTopicToDelete?.title}" deleted successfully`
    ).pipe(
      tap(() => {
        if (subTopicToDelete) {
          this.toastr.success(`SubTopic "${subTopicToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete subtopic:', err);
        this.toastr.error('Failed to delete subtopic: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  // === LESSON CRUD OPERATIONS ===
  
  createLesson(lesson: LessonDetail): Observable<LessonDetail> {
    const lessonPayload = this.courseStateCoordination.prepareLessonForCreation(lesson);
    const computedSortOrder = lessonPayload.sortOrder;
    
    console.log(`[CourseCrudService] Creating lesson with computed sortOrder: ${computedSortOrder}`);
    
    // ✅ ENHANCED: Create operation metadata for tree dispatcher
    const operationMetadata: OperationMetadata = {
      userAction: 'ADD_LESSON_BUTTON',
      parentNodeId: lesson.subTopicId ? `ST_${lesson.subTopicId}` : `T_${lesson.topicId}`,
      insertPosition: undefined // Let tree determine best position based on sortOrder
    };
    
    return this.courseStateCoordination.coordinateCourseCreation(
      this.apiService.createLesson(lessonPayload),
      lesson,
      `Lesson "${lesson.title}" created successfully`,
      'USER_ADD',           // ✅ NEW: operation type for tree dispatcher  
      operationMetadata     // ✅ NEW: metadata for incremental updates
    ).pipe(
      tap(() => {
        this.toastr.success(`Lesson "${lesson.title}" created successfully`);
      }),
      map(createdLesson => {
        // Return the lesson with computed sort order
        return this.courseStateCoordination.createFullLessonEntity(
          lesson,
          createdLesson,
          computedSortOrder
        );
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create lesson:', err);
        this.toastr.error('Failed to create lesson: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateLesson(lesson: LessonDetail): Observable<LessonDetail> {
    return this.courseStateCoordination.coordinateEntityUpdate(
      this.apiService.updateLesson(lesson),
      `Lesson "${lesson.title}" updated successfully`
    ).pipe(
      tap(() => {
        this.toastr.success(`Lesson "${lesson.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update lesson:', err);
        this.toastr.error('Failed to update lesson: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteLesson(lessonId: number): Observable<boolean> {
    const lessonToDelete = this.courseDataService.getLessonById(lessonId);
    
    return this.courseStateCoordination.coordinateEntityDeletion(
      this.apiService.deleteLesson(lessonId),
      lessonToDelete,
      `Lesson "${lessonToDelete?.title}" deleted successfully`
    ).pipe(
      tap(() => {
        if (lessonToDelete) {
          this.toastr.success(`Lesson "${lessonToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete lesson:', err);
        this.toastr.error('Failed to delete lesson: ' + err.message, 'Error');
        return of(false);
      })
    );
  }
}