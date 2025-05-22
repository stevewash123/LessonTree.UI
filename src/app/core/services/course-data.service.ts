// src/app/core/services/course-data.service.ts (partial)
import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ToastrService } from 'ngx-toastr';
import { Course } from '../../models/course';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { NodeMovedEvent, TreeData } from '../../models/tree-node';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseDataService {
  private courses: Course[] = [];
  private courseFilter: 'active' | 'archived' | 'both' = 'active';
  private visibilityFilter: 'private' | 'team' = 'private';
  
  // Signals for node state changes
  readonly nodeAdded = signal<TreeData | null>(null);
  readonly nodeEdited = signal<TreeData | null>(null);
  readonly nodeDeleted = signal<TreeData | null>(null);
  readonly nodeMoved = signal<{node: TreeData, source: string, target: string} | null>(null);
  

  constructor(
    private apiService: ApiService,
    private toastr: ToastrService
  ) {
    console.log('[CourseDataService] Service initialized', { timestamp: new Date().toISOString() });
    // Load courses initially
    this.loadCourses().subscribe();
  }

  private getNodeTitle(node: TreeData): string {
    switch (node.nodeType) {
      case 'Course':
        return (node as Course).title;
      case 'Topic':
        return (node as Topic).title;
      case 'SubTopic':
        return (node as SubTopic).title;
      case 'Lesson':
        return (node as LessonDetail).title;
      default:
        return 'Unknown';
    }
  }

  // Get all courses (returns a copy to prevent external mutation)
  getCourses(): Course[] {
    return [...this.courses];
  }

  // Get a specific course by ID
  getCourseById(id: number): Course | null {
    return this.courses.find(course => course.id === id) ?? null;
  }

  // Load courses with optional filters
  loadCourses(
    courseFilter: 'active' | 'archived' | 'both' = this.courseFilter,
    visibilityFilter: 'private' | 'team' = this.visibilityFilter
  ): Observable<Course[]> {
    console.log('[CourseDataService] Loading courses', {
      courseFilter,
      visibilityFilter,
      timestamp: new Date().toISOString()
    });

    this.courseFilter = courseFilter;
    this.visibilityFilter = visibilityFilter;

    return this.apiService.getCourses(courseFilter, visibilityFilter).pipe(
      tap(courses => {
        this.courses = courses;
        console.log('[CourseDataService] Courses loaded successfully:', 
          courses.map(c => ({ id: c.id, title: c.title })),
          { timestamp: new Date().toISOString() }
        );
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to load courses:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to load courses: ' + err.message, 'Error');
        // Return empty array on error but don't update this.courses
        return of([]);
      })
    );
  }

  // Create a new course
  createCourse(course: Course): Observable<Course> {
    console.log('[CourseDataService] Creating course:', {
      title: course.title,
      timestamp: new Date().toISOString()
    });
    
    return this.apiService.createCourse(course).pipe(
      tap(createdCourse => {
        console.log('[CourseDataService] Course created successfully:', {
          id: createdCourse.id,
          title: createdCourse.title,
          timestamp: new Date().toISOString()
        });
        
        // Add to local courses array
        this.courses.push(createdCourse);
        
        // Signal that a node was added
        this.nodeAdded.set(createdCourse);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to create course:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create course: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Update an existing course
  updateCourse(course: Course): Observable<Course> {
    console.log('[CourseDataService] Updating course:', {
      id: course.id,
      title: course.title,
      timestamp: new Date().toISOString()
    });
    
    return this.apiService.updateCourse(course).pipe(
      tap(updatedCourse => {
        console.log('[CourseDataService] Course updated successfully:', {
          id: updatedCourse.id,
          title: updatedCourse.title,
          timestamp: new Date().toISOString()
        });
        
        // Update in local courses array
        const index = this.courses.findIndex(c => c.id === updatedCourse.id);
        if (index !== -1) {
          this.courses[index] = updatedCourse;
        }
        
        // Signal that a node was edited
        this.nodeEdited.set(updatedCourse);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to update course:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update course: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Create a new topic
  createTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseDataService] Creating topic:', { 
      title: topic.title, 
      courseId: topic.courseId,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.createTopic(topic).pipe(
      tap(createdTopic => {
        console.log('[CourseDataService] Topic created successfully:', { 
          id: createdTopic.id, 
          title: createdTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        // Update local state
        this.updateCourseWithNewTopic(createdTopic);
        
        // Signal that a node was added
        this.nodeAdded.set(createdTopic);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to create topic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create topic: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Update an existing topic
  updateTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseDataService] Updating topic:', { 
      id: topic.id, 
      title: topic.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.updateTopic(topic).pipe(
      tap(updatedTopic => {
        console.log('[CourseDataService] Topic updated successfully:', { 
          id: updatedTopic.id, 
          title: updatedTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        // Update local state
        this.updateCourseWithEditedTopic(updatedTopic);
        
        // Signal that a node was edited
        this.nodeEdited.set(updatedTopic);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to update topic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update topic: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Create a new subtopic
  createSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseDataService] Creating subtopic:', { 
      title: subtopic.title, 
      topicId: subtopic.topicId,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.createSubTopic(subtopic).pipe(
      tap(createdSubTopic => {
        console.log('[CourseDataService] SubTopic created successfully:', { 
          id: createdSubTopic.id, 
          title: createdSubTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        // Update local state
        this.updateTopicWithNewSubtopic(createdSubTopic);
        
        // Signal that a node was added
        this.nodeAdded.set(createdSubTopic);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to create subtopic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create subtopic: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Update an existing subtopic
  updateSubTopic(subtopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseDataService] Updating subtopic:', { 
      id: subtopic.id, 
      title: subtopic.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.updateSubTopic(subtopic).pipe(
      tap(updatedSubTopic => {
        console.log('[CourseDataService] SubTopic updated successfully:', { 
          id: updatedSubTopic.id, 
          title: updatedSubTopic.title,
          timestamp: new Date().toISOString() 
        });
        
        // Update local state
        this.updateTopicWithEditedSubtopic(updatedSubTopic);
        
        // Signal that a node was edited
        this.nodeEdited.set(updatedSubTopic);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to update subtopic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update subtopic: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Create a new lesson
  createLesson(lesson: LessonDetail): Observable<LessonDetail> {
    console.log('[CourseDataService] Creating lesson:', { 
      title: lesson.title, 
      topicId: lesson.topicId,
      subTopicId: lesson.subTopicId,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.createLesson(lesson).pipe(
      // Use map operator correctly with proper type annotation
      map((createdLesson: any): LessonDetail => {
        // We need to return something immediately as LessonDetail
        const lessonDetailResult = createdLesson as LessonDetail;
        
        // Fetch the full lesson details asynchronously 
        this.apiService.get<LessonDetail>(`lesson/${createdLesson.id}`).subscribe({
          next: (fullLesson) => {
            console.log('[CourseDataService] Lesson created and details fetched successfully:', { 
              id: fullLesson.id, 
              title: fullLesson.title,
              timestamp: new Date().toISOString() 
            });
            
            // Update local state
            if (fullLesson.subTopicId) {
              this.updateSubtopicWithNewLesson(fullLesson);
            } else if (fullLesson.topicId) {
              this.updateTopicWithNewLesson(fullLesson);
            }
            
            // Signal that a node was added
            this.nodeAdded.set(fullLesson);
          },
          error: (error) => {
            console.error('[CourseDataService] Error fetching lesson details after creation:', error, { timestamp: new Date().toISOString() });
            // Still signal with the basic lesson
            this.nodeAdded.set(lessonDetailResult);
          }
        });
        
        // Return the created lesson with correct type
        return lessonDetailResult;
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to create lesson:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to create lesson: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Update an existing lesson
  updateLesson(lesson: LessonDetail): Observable<LessonDetail> {
    console.log('[CourseDataService] Updating lesson:', { 
      id: lesson.id, 
      title: lesson.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.apiService.updateLesson(lesson).pipe(
      tap(updatedLesson => {
        console.log('[CourseDataService] Lesson updated successfully:', { 
          id: updatedLesson.id, 
          title: updatedLesson.title,
          timestamp: new Date().toISOString() 
        });
        
        // Update local state
        if (updatedLesson.subTopicId) {
          this.updateSubtopicWithEditedLesson(updatedLesson);
        } else if (updatedLesson.topicId) {
          this.updateTopicWithEditedLesson(updatedLesson);
        }
        
        // Signal that a node was edited
        this.nodeEdited.set(updatedLesson);
      }),
      catchError(err => {
        console.error('[CourseDataService] Failed to update lesson:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to update lesson: ' + err.message, 'Error');
        throw err; // Re-throw so the component can handle it
      })
    );
  }

  // Private helper method to update local state after creating a topic
  private updateCourseWithNewTopic(topic: Topic): void {
    const courseId = topic.courseId;
    const course = this.courses.find(c => c.id === courseId);
    
    if (course) {
      // Initialize topics array if it doesn't exist
      if (!course.topics) {
        course.topics = [];
      }
      
      // Add the new topic to the course
      course.topics.push(topic);
      
      console.log(`[CourseDataService] Added topic to local course data:`, {
        courseId,
        topicId: topic.id,
        topicTitle: topic.title,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn(`[CourseDataService] Could not find course ${courseId} to add topic to`);
    }
  }

  // Private helper method to update local state after editing a topic
  private updateCourseWithEditedTopic(topic: Topic): void {
    const courseId = topic.courseId;
    const course = this.courses.find(c => c.id === courseId);
    
    if (course && course.topics) {
      // Find and update the topic in the course's topics array
      const topicIndex = course.topics.findIndex(t => t.id === topic.id);
      
      if (topicIndex !== -1) {
        course.topics[topicIndex] = topic;
        
        console.log(`[CourseDataService] Updated topic in local course data:`, {
          courseId,
          topicId: topic.id,
          topicTitle: topic.title,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`[CourseDataService] Could not find topic ${topic.id} in course ${courseId} to update`);
      }
    } else {
      console.warn(`[CourseDataService] Could not find course ${courseId} or course has no topics`);
    }
  }

  // Private helper method to update local state after creating a subtopic
  private updateTopicWithNewSubtopic(subtopic: SubTopic): void {
    const topicId = subtopic.topicId;
    
    // Find the course containing this topic
    for (const course of this.courses) {
      if (!course.topics) continue;
      
      const topic = course.topics.find(t => t.id === topicId);
      if (topic) {
        // Initialize subtopics array if it doesn't exist
        if (!topic.subTopics) {
          topic.subTopics = [];
        }
        
        // Add the new subtopic to the topic
        topic.subTopics.push(subtopic);
        
        console.log(`[CourseDataService] Added subtopic to local topic data:`, {
          courseId: course.id,
          topicId,
          subtopicId: subtopic.id,
          subtopicTitle: subtopic.title,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }
    
    console.warn(`[CourseDataService] Could not find topic ${topicId} to add subtopic to`);
  }

  // Private helper method to update local state after editing a subtopic
  private updateTopicWithEditedSubtopic(subtopic: SubTopic): void {
    const topicId = subtopic.topicId;
    
    // Find the course containing this topic
    for (const course of this.courses) {
      if (!course.topics) continue;
      
      const topic = course.topics.find(t => t.id === topicId);
      if (topic && topic.subTopics) {
        // Find and update the subtopic in the topic's subtopics array
        const subtopicIndex = topic.subTopics.findIndex(s => s.id === subtopic.id);
        
        if (subtopicIndex !== -1) {
          topic.subTopics[subtopicIndex] = subtopic;
          
          console.log(`[CourseDataService] Updated subtopic in local topic data:`, {
            courseId: course.id,
            topicId,
            subtopicId: subtopic.id,
            subtopicTitle: subtopic.title,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }
    
    console.warn(`[CourseDataService] Could not find topic ${topicId} or subtopic ${subtopic.id} to update`);
  }

  // Private helper method to update local state after creating a lesson in a subtopic
  private updateSubtopicWithNewLesson(lesson: LessonDetail): void {
    const subtopicId = lesson.subTopicId!;
    
    // Find the subtopic
    outerLoop: for (const course of this.courses) {
      if (!course.topics) continue;
      
      for (const topic of course.topics) {
        if (!topic.subTopics) continue;
        
        const subtopic = topic.subTopics.find(s => s.id === subtopicId);
        if (subtopic) {
          // Initialize lessons array if it doesn't exist
          if (!subtopic.lessons) {
            subtopic.lessons = [];
          }
          
          // Add the new lesson to the subtopic
          subtopic.lessons.push(lesson);
          
          console.log(`[CourseDataService] Added lesson to local subtopic data:`, {
            courseId: course.id,
            topicId: topic.id,
            subtopicId,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            timestamp: new Date().toISOString()
          });
          break outerLoop;
        }
      }
    }
  }

  // Private helper method to update local state after creating a lesson in a topic
  private updateTopicWithNewLesson(lesson: LessonDetail): void {
    const topicId = lesson.topicId!;
    
    // Find the topic
    for (const course of this.courses) {
      if (!course.topics) continue;
      
      const topic = course.topics.find(t => t.id === topicId);
      if (topic) {
        // Initialize lessons array if it doesn't exist
        if (!topic.lessons) {
          topic.lessons = [];
        }
        
        // Add the new lesson to the topic
        topic.lessons.push(lesson);
        
        console.log(`[CourseDataService] Added lesson to local topic data:`, {
          courseId: course.id,
          topicId,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }
    
    console.warn(`[CourseDataService] Could not find topic ${topicId} to add lesson to`);
  }

  // Private helper method to update local state after editing a lesson in a subtopic
  private updateSubtopicWithEditedLesson(lesson: LessonDetail): void {
    const subtopicId = lesson.subTopicId!;
    
    // Find the subtopic
    outerLoop: for (const course of this.courses) {
      if (!course.topics) continue;
      
      for (const topic of course.topics) {
        if (!topic.subTopics) continue;
        
        const subtopic = topic.subTopics.find(s => s.id === subtopicId);
        if (subtopic && subtopic.lessons) {
          // Find and update the lesson in the subtopic's lessons array
          const lessonIndex = subtopic.lessons.findIndex(l => l.id === lesson.id);
          
          if (lessonIndex !== -1) {
            subtopic.lessons[lessonIndex] = lesson;
            
            console.log(`[CourseDataService] Updated lesson in local subtopic data:`, {
              courseId: course.id,
              topicId: topic.id,
              subtopicId,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              timestamp: new Date().toISOString()
            });
            break outerLoop;
          }
        }
      }
    }
  }

  // Private helper method to update local state after editing a lesson in a topic
  private updateTopicWithEditedLesson(lesson: LessonDetail): void {
    const topicId = lesson.topicId!;
    
    // Find the topic
    for (const course of this.courses) {
      if (!course.topics) continue;
      
      const topic = course.topics.find(t => t.id === topicId);
      if (topic && topic.lessons) {
        // Find and update the lesson in the topic's lessons array
        const lessonIndex = topic.lessons.findIndex(l => l.id === lesson.id);
        
        if (lessonIndex !== -1) {
          topic.lessons[lessonIndex] = lesson;
          
          console.log(`[CourseDataService] Updated lesson in local topic data:`, {
            courseId: course.id,
            topicId,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }
    
    console.warn(`[CourseDataService] Could not find topic ${topicId} or lesson ${lesson.id} to update`);
  }

    moveNode(event: NodeMovedEvent): Observable<boolean> {
    const { node, sourceParentId, sourceParentType, targetParentId, targetParentType, sourceCourseId, targetCourseId } = event;
    
    console.log(`[CourseDataService] Moving ${node.nodeType} ${this.getNodeTitle(node)} (ID: ${node.id})`, { 
        sourceParentType,
        sourceParentId,
        targetParentType,
        targetParentId,
        sourceCourseId,
        targetCourseId,
        timestamp: new Date().toISOString() 
    });
    
    // Handle special case: Topic moving between courses
    if (node.nodeType === 'Topic' && targetCourseId) {
        return this.apiService.moveTopic(node.id, targetCourseId).pipe(
        tap(() => {
            console.log(`[CourseDataService] Successfully moved topic ${this.getNodeTitle(node)} between courses`, { 
            timestamp: new Date().toISOString() 
            });
            
            // Signal the move
            this.nodeMoved.set({
            node,
            source: sourceParentType ? `${sourceParentType}:${sourceParentId}` : `Course:${sourceCourseId}`,
            target: `Course:${targetCourseId}`
            });
            
            // Show success message
            if (sourceCourseId && targetCourseId) {
            const sourceCourse = this.getCourseById(sourceCourseId);
            const targetCourse = this.getCourseById(targetCourseId);
            if (sourceCourse && targetCourse) {
                this.toastr.success(`Moved Topic "${this.getNodeTitle(node)}" from Course "${sourceCourse.title}" to Course "${targetCourse.title}"`);
            } else {
                this.toastr.success(`Moved Topic "${this.getNodeTitle(node)}" successfully`);
            }
            }
            
            // Reload courses to get fresh data
            this.loadCourses().subscribe();
            
            return true;
        }),
        catchError(err => {
            console.error('[CourseDataService] Failed to move topic between courses:', err, { 
            timestamp: new Date().toISOString() 
            });
            this.toastr.error('Failed to move topic: ' + err.message, 'Error');
            return of(false);
        })
        );
    }
    
    // Handle lesson moves (could be to subtopic or topic)
    if (node.nodeType === 'Lesson') {
        let targetSubTopicId: number | undefined = undefined;
        let targetTopicId: number | undefined = undefined;
        
        if (targetParentType === 'SubTopic') {
        targetSubTopicId = targetParentId;
        } else if (targetParentType === 'Topic') {
        targetTopicId = targetParentId;
        }
        
        return this.apiService.moveLesson(node.id, targetSubTopicId, targetTopicId).pipe(
        tap(() => {
            console.log('[CourseDataService] Successfully moved lesson', {
            lessonId: node.id,
            targetSubTopicId,
            targetTopicId,
            timestamp: new Date().toISOString()
            });
            
            // Signal the move
            this.nodeMoved.set({
            node,
            source: sourceParentType ? `${sourceParentType}:${sourceParentId}` : 'Unknown',
            target: targetSubTopicId ? `SubTopic:${targetSubTopicId}` : 
                    targetTopicId ? `Topic:${targetTopicId}` : 'Unknown'
            });
            
            // Show success message
            this.toastr.success(`Moved Lesson "${this.getNodeTitle(node)}" successfully`);
            
            // Reload courses to get fresh data
            this.loadCourses().subscribe();
            
            return true;
        }),
        catchError(err => {
            console.error('[CourseDataService] Failed to move lesson:', err, { 
            timestamp: new Date().toISOString() 
            });
            this.toastr.error('Failed to move lesson: ' + err.message, 'Error');
            return of(false);
        })
        );
    }
    
    // Handle SubTopic moves (always to a Topic)
    if (node.nodeType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
        return this.apiService.moveSubTopic(node.id, targetParentId).pipe(
        tap(() => {
            console.log(`[CourseDataService] Successfully moved subtopic ${this.getNodeTitle(node)}`, { 
            timestamp: new Date().toISOString() 
            });
            
            // Signal the move
            this.nodeMoved.set({
            node,
            source: sourceParentType ? `${sourceParentType}:${sourceParentId}` : 'Unknown',
            target: `Topic:${targetParentId}`
            });
            
            // Show success message
            this.toastr.success(`Moved SubTopic "${this.getNodeTitle(node)}" successfully`);
            
            // Reload courses to get fresh data
            this.loadCourses().subscribe();
            
            return true;
        }),
        catchError(err => {
            console.error('[CourseDataService] Failed to move subtopic:', err, { 
            timestamp: new Date().toISOString() 
            });
            this.toastr.error('Failed to move subtopic: ' + err.message, 'Error');
            return of(false);
        })
        );
    }
    
    // If we reach here, it's an unsupported move type
    console.error('[CourseDataService] Unsupported move operation', event, { timestamp: new Date().toISOString() });
    this.toastr.error('Unsupported move operation', 'Error');
    return of(false);
    }

    deleteCourse(courseId: number): Observable<boolean> {
    console.log('[CourseDataService] Deleting course:', { courseId, timestamp: new Date().toISOString() });
    
    return this.apiService.deleteCourse(courseId).pipe(
        tap(() => {
        console.log('[CourseDataService] Course deleted successfully:', { courseId, timestamp: new Date().toISOString() });
        
        // Remove from local courses array
        const courseIndex = this.courses.findIndex(c => c.id === courseId);
        if (courseIndex !== -1) {
            const deletedCourse = this.courses[courseIndex];
            this.courses.splice(courseIndex, 1);
            
            // Signal that a node was deleted
            this.nodeDeleted.set(deletedCourse);
            
            this.toastr.success(`Course "${deletedCourse.title}" deleted successfully`);
        }
        }),
        map(() => true),
        catchError(err => {
        console.error('[CourseDataService] Failed to delete course:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete course: ' + err.message, 'Error');
        return of(false);
        })
    );
    }
    
    deleteTopic(topicId: number): Observable<boolean> {
    console.log('[CourseDataService] Deleting topic:', { topicId, timestamp: new Date().toISOString() });
    
    return this.apiService.deleteTopic(topicId).pipe(
        tap(() => {
        console.log('[CourseDataService] Topic deleted successfully:', { topicId, timestamp: new Date().toISOString() });
        
        // Find and remove from local courses array
        let deletedTopic: Topic | null = null;
        for (const course of this.courses) {
            if (course.topics) {
            const topicIndex = course.topics.findIndex(t => t.id === topicId);
            if (topicIndex !== -1) {
                deletedTopic = course.topics[topicIndex];
                course.topics.splice(topicIndex, 1);
                break;
            }
            }
        }
        
        if (deletedTopic) {
            // Signal that a node was deleted
            this.nodeDeleted.set(deletedTopic);
            this.toastr.success(`Topic "${deletedTopic.title}" deleted successfully`);
        }
        }),
        map(() => true),
        catchError(err => {
        console.error('[CourseDataService] Failed to delete topic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete topic: ' + err.message, 'Error');
        return of(false);
        })
    );
    }
    
    deleteSubTopic(subTopicId: number): Observable<boolean> {
    console.log('[CourseDataService] Deleting subtopic:', { subTopicId, timestamp: new Date().toISOString() });
    
    return this.apiService.deleteSubTopic(subTopicId).pipe(
        tap(() => {
        console.log('[CourseDataService] SubTopic deleted successfully:', { subTopicId, timestamp: new Date().toISOString() });
        
        // Find and remove from local courses array
        let deletedSubTopic: SubTopic | null = null;
        outerLoop: for (const course of this.courses) {
            if (course.topics) {
            for (const topic of course.topics) {
                if (topic.subTopics) {
                const subTopicIndex = topic.subTopics.findIndex(st => st.id === subTopicId);
                if (subTopicIndex !== -1) {
                    deletedSubTopic = topic.subTopics[subTopicIndex];
                    topic.subTopics.splice(subTopicIndex, 1);
                    break outerLoop;
                }
                }
            }
            }
        }
        
        if (deletedSubTopic) {
            // Signal that a node was deleted
            this.nodeDeleted.set(deletedSubTopic);
            this.toastr.success(`SubTopic "${deletedSubTopic.title}" deleted successfully`);
        }
        }),
        map(() => true),
        catchError(err => {
        console.error('[CourseDataService] Failed to delete subtopic:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to delete subtopic: ' + err.message, 'Error');
        return of(false);
        })
    );
    }
    
    deleteLesson(lessonId: number): Observable<boolean> {
        console.log('[CourseDataService] Deleting lesson:', { lessonId, timestamp: new Date().toISOString() });
        
        return this.apiService.deleteLesson(lessonId).pipe(
        tap(() => {
            console.log('[CourseDataService] Lesson deleted successfully:', { lessonId, timestamp: new Date().toISOString() });
            
            // Find and remove from local courses array
            let deletedLesson: Lesson | null = null;  // Changed from LessonDetail to Lesson
            outerLoop: for (const course of this.courses) {
            if (course.topics) {
                for (const topic of course.topics) {
                // Check lessons directly under topic
                if (topic.lessons) {
                    const lessonIndex = topic.lessons.findIndex(l => l.id === lessonId);
                    if (lessonIndex !== -1) {
                    deletedLesson = topic.lessons[lessonIndex];
                    topic.lessons.splice(lessonIndex, 1);
                    break outerLoop;
                    }
                }
                
                // Check lessons under subtopics
                if (topic.subTopics) {
                    for (const subTopic of topic.subTopics) {
                    if (subTopic.lessons) {
                        const lessonIndex = subTopic.lessons.findIndex(l => l.id === lessonId);
                        if (lessonIndex !== -1) {
                        deletedLesson = subTopic.lessons[lessonIndex];
                        subTopic.lessons.splice(lessonIndex, 1);
                        break outerLoop;
                        }
                    }
                    }
                }
                }
            }
            }
            
            if (deletedLesson) {
            // Signal that a node was deleted - cast to TreeData since it extends from it
            this.nodeDeleted.set(deletedLesson as TreeData);
            this.toastr.success(`Lesson "${deletedLesson.title}" deleted successfully`);
            }
        }),
        map(() => true),
        catchError(err => {
            console.error('[CourseDataService] Failed to delete lesson:', err, { timestamp: new Date().toISOString() });
            this.toastr.error('Failed to delete lesson: ' + err.message, 'Error');
            return of(false);
        })
        );
    }
}