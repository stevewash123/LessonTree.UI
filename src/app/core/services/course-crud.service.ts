// src/app/core/services/course-crud.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CourseDataService } from './course-data.service';
import { ToastrService } from 'ngx-toastr';
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
        console.log('[CourseCrudService] Service initialized', { timestamp: new Date().toISOString() });
        
        // Load courses initially when service is created
        this.loadCourses().subscribe({
          next: (courses) => {
            console.log('[CourseCrudService] Initial courses loaded:', courses.length, { timestamp: new Date().toISOString() });
          },
          error: (error) => {
            console.error('[CourseCrudService] Failed to load initial courses:', error, { timestamp: new Date().toISOString() });
          }
        });
      }

  // === COURSE OPERATIONS ===

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
        this.courseDataService.setCourses(courses);
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
    
    return this.apiService.createCourse(course).pipe(
      tap(createdCourse => {
        console.log('[CourseCrudService] Course created successfully:', {
          id: createdCourse.id,
          title: createdCourse.title,
          timestamp: new Date().toISOString()
        });
        
        // Add to data service
        this.courseDataService.addCourse(createdCourse);
        
        // Signal that a node was added
        this.courseDataService.emitNodeAdded(createdCourse);
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
        
        // Update in data service
        this.courseDataService.updateCourse(updatedCourse);
        
        // Signal that a node was edited
        this.courseDataService.emitNodeEdited(updatedCourse);
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
    
    return this.apiService.deleteCourse(courseId).pipe(
      tap(() => {
        console.log('[CourseCrudService] Course deleted successfully:', { courseId, timestamp: new Date().toISOString() });
        
        // Get the course before deletion for signaling
        const deletedCourse = this.courseDataService.getCourseById(courseId);
        
        // Remove from data service
        this.courseDataService.removeCourse(courseId);
        
        if (deletedCourse) {
          // Signal that a node was deleted
          this.courseDataService.emitNodeDeleted(deletedCourse);
          this.toastr.success(`Course "${deletedCourse.title}" deleted successfully`);
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

  // === TOPIC OPERATIONS ===

  createTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseCrudService] Creating topic:', { 
      title: topic.title, 
      courseId: topic.courseId,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.createTopic(topic).pipe(
      tap(createdTopic => {
        console.log('[CourseCrudService] Topic created successfully:', { 
          id: createdTopic.id, 
          title: createdTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        // Update data service
        this.courseDataService.addTopicToCourse(createdTopic);
        
        // Signal that a node was added
        this.courseDataService.emitNodeAdded(createdTopic);
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
        
        // Update data service
        this.courseDataService.updateTopicInCourse(updatedTopic);
        
        // Signal that a node was edited
        this.courseDataService.emitNodeEdited(updatedTopic);
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
    
    return this.apiService.deleteTopic(topicId).pipe(
      tap(() => {
        console.log('[CourseCrudService] Topic deleted successfully:', { topicId, timestamp: new Date().toISOString() });
        
        // Get the topic before deletion for signaling
        const deletedTopic = this.courseDataService.getTopicById(topicId);
        
        // Remove from data service
        this.courseDataService.removeTopicFromCourse(topicId);
        
        if (deletedTopic) {
          // Signal that a node was deleted
          this.courseDataService.emitNodeDeleted(deletedTopic);
          this.toastr.success(`Topic "${deletedTopic.title}" deleted successfully`);
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

  // === SUBTOPIC OPERATIONS ===

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
        
        // Update data service
        this.courseDataService.addSubTopicToTopic(createdSubTopic);
        
        // Signal that a node was added
        this.courseDataService.emitNodeAdded(createdSubTopic);
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
        
        // Update data service
        this.courseDataService.updateSubTopicInTopic(updatedSubTopic);
        
        // Signal that a node was edited
        this.courseDataService.emitNodeEdited(updatedSubTopic);
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
    
    return this.apiService.deleteSubTopic(subTopicId).pipe(
      tap(() => {
        console.log('[CourseCrudService] SubTopic deleted successfully:', { subTopicId, timestamp: new Date().toISOString() });
        
        // Get the subtopic before deletion for signaling
        const deletedSubTopic = this.courseDataService.getSubTopicById(subTopicId);
        
        // Remove from data service
        this.courseDataService.removeSubTopicFromTopic(subTopicId);
        
        if (deletedSubTopic) {
          // Signal that a node was deleted
          this.courseDataService.emitNodeDeleted(deletedSubTopic);
          this.toastr.success(`SubTopic "${deletedSubTopic.title}" deleted successfully`);
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

  // === LESSON OPERATIONS ===

  createLesson(lesson: LessonDetail): Observable<LessonDetail> {
    console.log('[CourseCrudService] Creating lesson:', { 
      title: lesson.title, 
      topicId: lesson.topicId,
      subTopicId: lesson.subTopicId,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.createLesson(lesson).pipe(
      map((createdLesson: any): LessonDetail => {
        const lessonDetailResult = createdLesson as LessonDetail;
        
        // Fetch the full lesson details asynchronously 
        this.apiService.get<LessonDetail>(`lesson/${createdLesson.id}`).subscribe({
          next: (fullLesson) => {
            console.log('[CourseCrudService] Lesson created and details fetched successfully:', { 
              id: fullLesson.id, 
              title: fullLesson.title,
              timestamp: new Date().toISOString() 
            });
            
            // Update data service
            this.courseDataService.addLessonToParent(fullLesson);
            
            // Signal that a node was added
            this.courseDataService.emitNodeAdded(fullLesson);
          },
          error: (error) => {
            console.error('[CourseCrudService] Error fetching lesson details after creation:', error, { timestamp: new Date().toISOString() });
            // Still signal with the basic lesson
            this.courseDataService.emitNodeAdded(lessonDetailResult);
          }
        });
        
        return lessonDetailResult;
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
        
        // Update data service
        this.courseDataService.updateLessonInParent(updatedLesson);
        
        // Signal that a node was edited
        this.courseDataService.emitNodeEdited(updatedLesson);
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
    
    return this.apiService.deleteLesson(lessonId).pipe(
      tap(() => {
        console.log('[CourseCrudService] Lesson deleted successfully:', { lessonId, timestamp: new Date().toISOString() });
        
        // Get the lesson before deletion for signaling
        const deletedLesson = this.courseDataService.getLessonById(lessonId);
        
        // Remove from data service
        this.courseDataService.removeLessonFromParent(lessonId);
        
        if (deletedLesson) {
          // Signal that a node was deleted
          this.courseDataService.emitNodeDeleted(deletedLesson);
          this.toastr.success(`Lesson "${deletedLesson.title}" deleted successfully`);
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