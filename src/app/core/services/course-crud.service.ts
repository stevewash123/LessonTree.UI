// RESPONSIBILITY: Handles CRUD API operations, error handling, user feedback (toasts), course management logic, and schedule loading coordination.
// DOES NOT: Manage data state or emit signals directly - delegates to CourseDataService.
// CALLED BY: InfoPanel components for CRUD operations, LessonCalendarComponent for course management

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from './api.service';
import { CourseDataService } from './course-data.service';
import { NodeSelectionService } from './node-selection.service';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseCrudService {
  // Injected services
  private readonly nodeSelectionService = inject(NodeSelectionService);
  
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

  // === COURSE MANAGEMENT METHODS (NEW) ===

  /**
   * Get the first available active course for default selection
   */
  getFirstAvailableCourse(): Course | null {
    const activeCourses = this.courseDataService.activeCourses();
    
    if (activeCourses.length === 0) {
      console.warn('[CourseCrudService] No active courses available for default selection', { 
        timestamp: new Date().toISOString() 
      });
      return null;
    }

    const firstCourse = activeCourses[0];
    console.log('[CourseCrudService] Found first available course', {
      courseId: firstCourse.id,
      courseTitle: firstCourse.title,
      timestamp: new Date().toISOString()
    });

    return firstCourse;
  }

  /**
   * Select the first available course programmatically
   */
  selectFirstAvailableCourse(source: 'calendar' | 'programmatic' = 'programmatic'): boolean {
    const firstCourse = this.getFirstAvailableCourse();
    
    if (!firstCourse) {
      console.warn('[CourseCrudService] Cannot select first course - no courses available', { 
        timestamp: new Date().toISOString() 
      });
      return false;
    }

    console.log('[CourseCrudService] Selecting first available course', {
      courseId: firstCourse.id,
      courseTitle: firstCourse.title,
      source,
      timestamp: new Date().toISOString()
    });

    this.nodeSelectionService.selectById(firstCourse.id, 'Course', source);
    return true;
  }

  /**
   * Load courses and optionally select first available
   */
  loadCoursesAndSelectFirst(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private',
    autoSelectFirst: boolean = true,
    selectionSource: 'calendar' | 'programmatic' = 'programmatic'
  ): Observable<Course[]> {
    console.log('[CourseCrudService] Loading courses with auto-selection', {
      courseFilter,
      visibilityFilter,
      autoSelectFirst,
      selectionSource,
      timestamp: new Date().toISOString()
    });

    return this.loadCourses(courseFilter, visibilityFilter).pipe(
        tap(courses => {
            if (autoSelectFirst && courses.length > 0) {
              // Only auto-select if nothing is currently selected
              const hasSelection = this.nodeSelectionService.hasSelection();
              
              if (!hasSelection) {
                console.log('[CourseCrudService] Auto-selecting first course after load', {
                  coursesLoaded: courses.length,
                  hasSelection,
                  timestamp: new Date().toISOString()
                });
                
                this.selectFirstAvailableCourse(selectionSource);
              } else {
                console.log('[CourseCrudService] Skipping auto-selection - node already selected', {
                  selectedNodeType: this.nodeSelectionService.selectedNodeType(),
                  selectedNodeId: this.nodeSelectionService.selectedNodeId(),
                  timestamp: new Date().toISOString()
                });
              }
            }
          })
    );
  }

  /**
   * Check if courses are available for calendar/tree operations
   */
  hasCoursesAvailable(): boolean {
    return this.courseDataService.activeCourses().length > 0;
  }

  /**
   * Get course count for display/logging
   */
  getActiveCourseCount(): number {
    return this.courseDataService.activeCourses().length;
  }

  /**
   * Get course by ID with error handling
   */
  getCourseByIdSafely(courseId: number): Course | null {
    const course = this.courseDataService.getCourseById(courseId);
    
    if (!course) {
      console.warn('[CourseCrudService] Course not found', {
        courseId,
        availableCourses: this.courseDataService.activeCourses().map(c => c.id),
        timestamp: new Date().toISOString()
      });
    }

    return course;
  }

  /**
   * Validate course selection context for calendar operations
   */
  validateCourseSelection(): { isValid: boolean; courseId?: number; course?: Course; error?: string } {
    const selectedNode = this.nodeSelectionService.selectedNode();
    
    if (!selectedNode) {
      return { 
        isValid: false, 
        error: 'No course selected' 
      };
    }

    if (selectedNode.nodeType !== 'Course') {
      return { 
        isValid: false, 
        error: `Selected node is ${selectedNode.nodeType}, not Course` 
      };
    }

    const courseId = selectedNode.id;
    const course = this.getCourseByIdSafely(courseId);

    if (!course) {
      return { 
        isValid: false, 
        courseId, 
        error: 'Selected course not found in data' 
      };
    }

    return { 
      isValid: true, 
      courseId, 
      course 
    };
  }

  // === COURSE OPERATIONS (EXISTING) ===

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
    
    // Remove type assertion - let TypeScript infer the correct type
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

  // === TOPIC OPERATIONS ===
  
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
    
    // Remove type assertion - let TypeScript infer the correct type
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

  // === SUBTOPIC OPERATIONS ===
  
  createSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseCrudService] Creating subtopic:', { 
      title: subtopic.title, 
      topicId: subtopic.topicId,
      timestamp: new Date().toISOString() 
    });
    
    // SubTopic API already expects full object with VisibilityType enum - no transformation needed
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

  // === LESSON OPERATIONS ===
  
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
    
    // Remove type assertion - let TypeScript infer the correct type
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