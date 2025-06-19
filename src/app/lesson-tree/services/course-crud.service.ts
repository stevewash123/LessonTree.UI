// RESPONSIBILITY: Pure CRUD API operations, error handling, and user feedback for course entities
// DOES NOT: Handle course management, selection logic, or business rules - delegates to specialized services
// CALLED BY: InfoPanel components for CRUD operations

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../shared/services/api.service';
import { CourseDataService } from '../../shared/services/course-data.service';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseCrudService {
  
    constructor(
        private apiService: ApiService,
        private courseDataService: CourseDataService,
        private toastr: ToastrService
      ) {
        console.log('[CourseCrudService] Service initialized for pure CRUD operations', { 
          timestamp: new Date().toISOString() 
        });
        
        // Auto-load courses on service initialization (restored from original CourseDataService)
        this.autoLoadCourses();
      }
      
      private autoLoadCourses(): void {
        console.log('[CourseCrudService] Auto-loading courses on service initialization', {
          timestamp: new Date().toISOString()
        });
      
        this.loadCourses('active', 'private').subscribe({
          next: (courses) => {
            console.log('[CourseCrudService] Auto-load completed', {
              count: courses.length,
              courses: courses.map(c => ({ id: c.id, title: c.title })),
              timestamp: new Date().toISOString()
            });
          },
          error: (error) => {
            console.error('[CourseCrudService] Auto-load failed:', error, {
              timestamp: new Date().toISOString()
            });
            // Don't show toastr error for auto-load - it's called during app initialization
          }
        });
      }

  // === COURSE CRUD OPERATIONS ===

  loadCourses(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private'
  ): Observable<Course[]> {
    console.log('[CourseCrudService] Loading courses', {
      courseFilter,
      visibilityFilter,
      timestamp: new Date().toISOString()
    });

    return this.apiService.getCourses(courseFilter, visibilityFilter).pipe(
      tap(courses => {
        this.courseDataService.setCourses(courses, 'initialization');
        console.log('[CourseCrudService] Courses loaded successfully:', 
          courses.map(c => ({ id: c.id, title: c.title })),
          { timestamp: new Date().toISOString() }
        );
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to load courses:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to load courses: ' + err.message, 'Error');
        return of([]);
      })
    );
  }

  createCourse(course: Course): Observable<Course> {
    console.log('[CourseCrudService] Creating course:', {
      title: course.title,
      timestamp: new Date().toISOString()
    });
    
    // Transform UI model to API payload - ensure description is never undefined
    const courseCreatePayload = {
      title: course.title,
      description: course.description ?? '', // Fix: ensure string, not undefined
      visibility: course.visibility || 'Private'
    };
    
    console.log('[CourseCrudService] Course create payload:', courseCreatePayload);
    
    return this.apiService.createCourse(courseCreatePayload).pipe(
      tap(createdCourse => {
        console.log('[CourseCrudService] Course created successfully:', {
          id: createdCourse.id,
          title: createdCourse.title,
          timestamp: new Date().toISOString()
        });
        
        this.courseDataService.addEntity(createdCourse, 'infopanel');
        this.toastr.success(`Course "${createdCourse.title}" created successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create course:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create course: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateCourse(course: Course): Observable<Course> {
    console.log('[CourseCrudService] Updating course:', {
      id: course.id,
      title: course.title,
      timestamp: new Date().toISOString()
    });
    
    return this.apiService.updateCourse(course).pipe(
      tap(updatedCourse => {
        console.log('[CourseCrudService] Course updated successfully:', {
          id: updatedCourse.id,
          title: updatedCourse.title,
          timestamp: new Date().toISOString()
        });
        
        this.courseDataService.updateEntity(updatedCourse, 'infopanel');
        this.toastr.success(`Course "${updatedCourse.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update course:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update course: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteCourse(courseId: number): Observable<boolean> {
    console.log('[CourseCrudService] Deleting course:', { courseId, timestamp: new Date().toISOString() });
    
    const courseToDelete = this.courseDataService.getCourseById(courseId);
    
    return this.apiService.deleteCourse(courseId).pipe(
      tap(() => {
        console.log('[CourseCrudService] Course deleted successfully:', { courseId, timestamp: new Date().toISOString() });
        
        if (courseToDelete) {
          this.courseDataService.removeEntity(courseToDelete, 'infopanel');
          this.toastr.success(`Course "${courseToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete course:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete course: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  // === TOPIC CRUD OPERATIONS ===
  
  createTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseCrudService] Creating topic:', { 
      title: topic.title, 
      courseId: topic.courseId,
      timestamp: new Date().toISOString() 
    });
    
    // Transform UI model to API payload - ensure description is never undefined
    const topicCreatePayload = {
      title: topic.title,
      description: topic.description ?? '', // Fix: ensure string, not undefined
      courseId: topic.courseId,
      visibility: topic.visibility || 'Private',
      sortOrder: topic.sortOrder || 0
    };
    
    console.log('[CourseCrudService] Topic create payload:', topicCreatePayload);
    
    return this.apiService.createTopic(topicCreatePayload).pipe(
      tap(createdTopic => {
        console.log('[CourseCrudService] Topic created successfully:', { 
          id: createdTopic.id, 
          title: createdTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        this.courseDataService.addEntity(createdTopic, 'infopanel');
        this.toastr.success(`Topic "${createdTopic.title}" created successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create topic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create topic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseCrudService] Updating topic:', { 
      id: topic.id, 
      title: topic.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.updateTopic(topic).pipe(
      tap(updatedTopic => {
        console.log('[CourseCrudService] Topic updated successfully:', { 
          id: updatedTopic.id, 
          title: updatedTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        this.courseDataService.updateEntity(updatedTopic, 'infopanel');
        this.toastr.success(`Topic "${updatedTopic.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update topic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update topic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteTopic(topicId: number): Observable<boolean> {
    console.log('[CourseCrudService] Deleting topic:', { topicId, timestamp: new Date().toISOString() });
    
    const topicToDelete = this.courseDataService.getTopicById(topicId);
    
    return this.apiService.deleteTopic(topicId).pipe(
      tap(() => {
        console.log('[CourseCrudService] Topic deleted successfully:', { topicId, timestamp: new Date().toISOString() });
        
        if (topicToDelete) {
          this.courseDataService.removeEntity(topicToDelete, 'infopanel');
          this.toastr.success(`Topic "${topicToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete topic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete topic: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  // === SUBTOPIC CRUD OPERATIONS ===
  
  createSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseCrudService] Creating subtopic:', { 
      title: subtopic.title, 
      topicId: subtopic.topicId,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.createSubTopic(subtopic).pipe(
      tap(createdSubTopic => {
        console.log('[CourseCrudService] SubTopic created successfully:', { 
          id: createdSubTopic.id, 
          title: createdSubTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        this.courseDataService.addEntity(createdSubTopic, 'infopanel');
        this.toastr.success(`SubTopic "${createdSubTopic.title}" created successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create subtopic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create subtopic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseCrudService] Updating subtopic:', { 
      id: subtopic.id, 
      title: subtopic.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.updateSubTopic(subtopic).pipe(
      tap(updatedSubTopic => {
        console.log('[CourseCrudService] SubTopic updated successfully:', { 
          id: updatedSubTopic.id, 
          title: updatedSubTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        this.courseDataService.updateEntity(updatedSubTopic, 'infopanel');
        this.toastr.success(`SubTopic "${updatedSubTopic.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update subtopic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update subtopic: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteSubTopic(subTopicId: number): Observable<boolean> {
    console.log('[CourseCrudService] Deleting subtopic:', { subTopicId, timestamp: new Date().toISOString() });
    
    const subTopicToDelete = this.courseDataService.getSubTopicById(subTopicId);
    
    return this.apiService.deleteSubTopic(subTopicId).pipe(
      tap(() => {
        console.log('[CourseCrudService] SubTopic deleted successfully:', { subTopicId, timestamp: new Date().toISOString() });
        
        if (subTopicToDelete) {
          this.courseDataService.removeEntity(subTopicToDelete, 'infopanel');
          this.toastr.success(`SubTopic "${subTopicToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete subtopic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete subtopic: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  // === LESSON CRUD OPERATIONS ===
  
  createLesson(lesson: LessonDetail): Observable<LessonDetail> {
    console.log('[CourseCrudService] Creating lesson:', { 
      title: lesson.title, 
      topicId: lesson.topicId,
      subTopicId: lesson.subTopicId,
      timestamp: new Date().toISOString() 
    });
    
    // Transform UI model to API payload - only required properties
    const lessonCreatePayload = {
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
      sortOrder: lesson.sortOrder || 0
    };
    
    console.log('[CourseCrudService] Lesson create payload:', lessonCreatePayload);
    
    return this.apiService.createLesson(lessonCreatePayload).pipe(
      map((createdLesson: LessonDetail): LessonDetail => {
        
        // Fetch the full lesson details asynchronously for complete data
        this.apiService.get<LessonDetail>(`lesson/${createdLesson.id}`).subscribe({
          next: (fullLesson) => {
            console.log('[CourseCrudService] Lesson created and details fetched successfully:', { 
              id: fullLesson.id, 
              title: fullLesson.title,
              timestamp: new Date().toISOString() 
            });
            
            this.courseDataService.addEntity(fullLesson, 'infopanel');
            this.toastr.success(`Lesson "${fullLesson.title}" created successfully`);
          },
          error: (error) => {
            console.error('[CourseCrudService] Error fetching lesson details after creation:', error, { timestamp: new Date().toISOString() });
            this.courseDataService.addEntity(createdLesson, 'infopanel');
            this.toastr.success(`Lesson "${createdLesson.title}" created successfully`);
          }
        });
        
        return createdLesson;
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to create lesson:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create lesson: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  updateLesson(lesson: LessonDetail): Observable<LessonDetail> {
    console.log('[CourseCrudService] Updating lesson:', { 
      id: lesson.id, 
      title: lesson.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.updateLesson(lesson).pipe(
      tap(updatedLesson => {
        console.log('[CourseCrudService] Lesson updated successfully:', { 
          id: updatedLesson.id, 
          title: updatedLesson.title,
          timestamp: new Date().toISOString() 
        });
        
        this.courseDataService.updateEntity(updatedLesson, 'infopanel');
        this.toastr.success(`Lesson "${updatedLesson.title}" updated successfully`);
      }),
      catchError(err => {
        console.error('[CourseCrudService] Failed to update lesson:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update lesson: ' + err.message, 'Error');
        throw err;
      })
    );
  }
  
  deleteLesson(lessonId: number): Observable<boolean> {
    console.log('[CourseCrudService] Deleting lesson:', { lessonId, timestamp: new Date().toISOString() });
    
    const lessonToDelete = this.courseDataService.getLessonById(lessonId);
    
    return this.apiService.deleteLesson(lessonId).pipe(
      tap(() => {
        console.log('[CourseCrudService] Lesson deleted successfully:', { lessonId, timestamp: new Date().toISOString() });
        
        if (lessonToDelete) {
          this.courseDataService.removeEntity(lessonToDelete as LessonDetail, 'infopanel');
          this.toastr.success(`Lesson "${lessonToDelete.title}" deleted successfully`);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('[CourseCrudService] Failed to delete lesson:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete lesson: ' + err.message, 'Error');
        return of(false);
      })
    );
  }
}