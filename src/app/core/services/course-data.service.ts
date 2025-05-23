// src/app/core/services/course-data.service.ts - Phase 1: Core Data Signals
import { Injectable, signal } from '@angular/core';
import { Course } from '../../models/course';
import { TreeData } from '../../models/tree-node';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseDataService {
  // Phase 1: Core Data Signals
  private readonly _courses = signal<Course[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _courseFilter = signal<'active' | 'archived' | 'both'>('active');
  private readonly _visibilityFilter = signal<'private' | 'team'>('private');
  private readonly _lastUpdated = signal<Date | null>(null);
  
  // Readonly accessors for core signals
  readonly courses = this._courses.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly courseFilter = this._courseFilter.asReadonly();
  readonly visibilityFilter = this._visibilityFilter.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  
  // Existing signals for node state changes (unchanged)
  readonly nodeAdded = signal<TreeData | null>(null);
  readonly nodeEdited = signal<TreeData | null>(null);
  readonly nodeDeleted = signal<TreeData | null>(null);
  readonly nodeMoved = signal<{node: TreeData, source: string, target: string} | null>(null);

  constructor() {
    console.log('[CourseDataService] Service initialized with Phase 1 signals', { 
      timestamp: new Date().toISOString() 
    });
  }

  // === SIGNAL EMISSION METHODS (unchanged) ===
  emitNodeAdded(node: TreeData): void {
    this.nodeAdded.set(node);
  }

  emitNodeEdited(node: TreeData): void {
    this.nodeEdited.set(node);
  }

  emitNodeDeleted(node: TreeData): void {
    this.nodeDeleted.set(node);
  }

  emitNodeMoved(event: {node: TreeData, source: string, target: string}): void {
    this.nodeMoved.set(event);
  }

  // === FILTER STATE METHODS ===
  setFilters(courseFilter: 'active' | 'archived' | 'both', visibilityFilter: 'private' | 'team'): void {
    console.log('[CourseDataService] Setting filters', {
      courseFilter,
      visibilityFilter,
      timestamp: new Date().toISOString()
    });
    
    this._courseFilter.set(courseFilter);
    this._visibilityFilter.set(visibilityFilter);
  }

  setCourseFilter(filter: 'active' | 'archived' | 'both'): void {
    console.log('[CourseDataService] Setting course filter', {
      filter,
      timestamp: new Date().toISOString()
    });
    
    this._courseFilter.set(filter);
  }

  setVisibilityFilter(filter: 'private' | 'team'): void {
    console.log('[CourseDataService] Setting visibility filter', {
      filter,
      timestamp: new Date().toISOString()
    });
    
    this._visibilityFilter.set(filter);
  }

  // === LOADING STATE METHODS ===
  setLoading(loading: boolean): void {
    this._loading.set(loading);
    console.log('[CourseDataService] Loading state changed', {
      loading,
      timestamp: new Date().toISOString()
    });
  }

  // === DATA ACCESS METHODS (backward compatible) ===
  getCourses(): Course[] {
    // Backward compatible - returns current courses from signal
    return [...this._courses()];
  }

  getCourseById(id: number): Course | null {
    return this._courses().find(course => course.id === id) ?? null;
  }

  getTopicById(topicId: number): Topic | null {
    for (const course of this._courses()) {
      if (course.topics) {
        const topic = course.topics.find(t => t.id === topicId);
        if (topic) return topic;
      }
    }
    return null;
  }

  getSubTopicById(subTopicId: number): SubTopic | null {
    for (const course of this._courses()) {
      if (course.topics) {
        for (const topic of course.topics) {
          if (topic.subTopics) {
            const subTopic = topic.subTopics.find(st => st.id === subTopicId);
            if (subTopic) return subTopic;
          }
        }
      }
    }
    return null;
  }

  getLessonById(lessonId: number): Lesson | null {
    for (const course of this._courses()) {
      if (course.topics) {
        for (const topic of course.topics) {
          // Check lessons under topic
          if (topic.lessons) {
            const lesson = topic.lessons.find(l => l.id === lessonId);
            if (lesson) return lesson;
          }
          // Check lessons under subtopics
          if (topic.subTopics) {
            for (const subTopic of topic.subTopics) {
              if (subTopic.lessons) {
                const lesson = subTopic.lessons.find(l => l.id === lessonId);
                if (lesson) return lesson;
              }
            }
          }
        }
      }
    }
    return null;
  }

  // === DATA MUTATION METHODS (now using signals) ===
  setCourses(courses: Course[]): void {
    console.log('[CourseDataService] Setting courses via signal', {
      count: courses.length,
      timestamp: new Date().toISOString()
    });
    
    this._courses.set([...courses]); // Immutable update
    this._lastUpdated.set(new Date());
  }

  addCourse(course: Course): void {
    console.log('[CourseDataService] Adding course via signal', {
      courseId: course.id,
      title: course.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    this._courses.set([...currentCourses, course]); // Immutable update
    this._lastUpdated.set(new Date());
  }

  updateCourse(updatedCourse: Course): void {
    console.log('[CourseDataService] Updating course via signal', {
      courseId: updatedCourse.id,
      title: updatedCourse.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    const index = currentCourses.findIndex(c => c.id === updatedCourse.id);
    
    if (index !== -1) {
      const newCourses = [...currentCourses];
      newCourses[index] = updatedCourse;
      this._courses.set(newCourses); // Immutable update
      this._lastUpdated.set(new Date());
    }
  }

  removeCourse(courseId: number): void {
    console.log('[CourseDataService] Removing course via signal', {
      courseId,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    const newCourses = currentCourses.filter(c => c.id !== courseId);
    this._courses.set(newCourses); // Immutable update
    this._lastUpdated.set(new Date());
  }

  addTopicToCourse(topic: Topic): void {
    console.log('[CourseDataService] Adding topic to course via signal', {
      topicId: topic.id,
      courseId: topic.courseId,
      title: topic.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    const courseIndex = currentCourses.findIndex(c => c.id === topic.courseId);
    
    if (courseIndex !== -1) {
      const newCourses = [...currentCourses];
      const course = { ...newCourses[courseIndex] };
      
      if (!course.topics) course.topics = [];
      course.topics = [...course.topics, topic];
      
      newCourses[courseIndex] = course;
      this._courses.set(newCourses); // Immutable update
      this._lastUpdated.set(new Date());
    }
  }

  updateTopicInCourse(updatedTopic: Topic): void {
    console.log('[CourseDataService] Updating topic in course via signal', {
      topicId: updatedTopic.id,
      courseId: updatedTopic.courseId,
      title: updatedTopic.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    const courseIndex = currentCourses.findIndex(c => c.id === updatedTopic.courseId);
    
    if (courseIndex !== -1 && currentCourses[courseIndex].topics) {
      const newCourses = [...currentCourses];
      const course = { ...newCourses[courseIndex] };
      
      const topicIndex = course.topics!.findIndex(t => t.id === updatedTopic.id);
      if (topicIndex !== -1) {
        course.topics = [...course.topics!];
        course.topics[topicIndex] = updatedTopic;
        
        newCourses[courseIndex] = course;
        this._courses.set(newCourses); // Immutable update
        this._lastUpdated.set(new Date());
      }
    }
  }

  removeTopicFromCourse(topicId: number): void {
    console.log('[CourseDataService] Removing topic from course via signal', {
      topicId,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
      const course = currentCourses[courseIndex];
      if (course.topics) {
        const topicIndex = course.topics.findIndex(t => t.id === topicId);
        if (topicIndex !== -1) {
          const newCourses = [...currentCourses];
          const updatedCourse = { ...course };
          updatedCourse.topics = course.topics.filter(t => t.id !== topicId);
          
          newCourses[courseIndex] = updatedCourse;
          this._courses.set(newCourses); // Immutable update
          this._lastUpdated.set(new Date());
          return;
        }
      }
    }
  }

  addSubTopicToTopic(subTopic: SubTopic): void {
    console.log('[CourseDataService] Adding subtopic to topic via signal', {
      subTopicId: subTopic.id,
      topicId: subTopic.topicId,
      title: subTopic.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
      const course = currentCourses[courseIndex];
      if (course.topics) {
        const topicIndex = course.topics.findIndex(t => t.id === subTopic.topicId);
        if (topicIndex !== -1) {
          const newCourses = [...currentCourses];
          const updatedCourse = { ...course };
          updatedCourse.topics = [...course.topics];
          
          const topic = { ...updatedCourse.topics[topicIndex] };
          if (!topic.subTopics) topic.subTopics = [];
          topic.subTopics = [...topic.subTopics, subTopic];
          
          updatedCourse.topics[topicIndex] = topic;
          newCourses[courseIndex] = updatedCourse;
          this._courses.set(newCourses); // Immutable update
          this._lastUpdated.set(new Date());
          return;
        }
      }
    }
  }

  updateSubTopicInTopic(updatedSubTopic: SubTopic): void {
    console.log('[CourseDataService] Updating subtopic in topic via signal', {
      subTopicId: updatedSubTopic.id,
      topicId: updatedSubTopic.topicId,
      title: updatedSubTopic.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
      const course = currentCourses[courseIndex];
      if (course.topics) {
        const topicIndex = course.topics.findIndex(t => t.id === updatedSubTopic.topicId);
        if (topicIndex !== -1 && course.topics[topicIndex].subTopics) {
          const subTopicIndex = course.topics[topicIndex].subTopics!.findIndex(st => st.id === updatedSubTopic.id);
          if (subTopicIndex !== -1) {
            const newCourses = [...currentCourses];
            const updatedCourse = { ...course };
            updatedCourse.topics = [...course.topics];
            
            const topic = { ...updatedCourse.topics[topicIndex] };
            topic.subTopics = [...topic.subTopics!];
            topic.subTopics[subTopicIndex] = updatedSubTopic;
            
            updatedCourse.topics[topicIndex] = topic;
            newCourses[courseIndex] = updatedCourse;
            this._courses.set(newCourses); // Immutable update
            this._lastUpdated.set(new Date());
            return;
          }
        }
      }
    }
  }

  removeSubTopicFromTopic(subTopicId: number): void {
    console.log('[CourseDataService] Removing subtopic from topic via signal', {
      subTopicId,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
      const course = currentCourses[courseIndex];
      if (course.topics) {
        for (let topicIndex = 0; topicIndex < course.topics.length; topicIndex++) {
          const topic = course.topics[topicIndex];
          if (topic.subTopics) {
            const subTopicIndex = topic.subTopics.findIndex(st => st.id === subTopicId);
            if (subTopicIndex !== -1) {
              const newCourses = [...currentCourses];
              const updatedCourse = { ...course };
              updatedCourse.topics = [...course.topics];
              
              const updatedTopic = { ...topic };
              updatedTopic.subTopics = topic.subTopics.filter(st => st.id !== subTopicId);
              
              updatedCourse.topics[topicIndex] = updatedTopic;
              newCourses[courseIndex] = updatedCourse;
              this._courses.set(newCourses); // Immutable update
              this._lastUpdated.set(new Date());
              return;
            }
          }
        }
      }
    }
  }

  addLessonToParent(lesson: LessonDetail): void {
    console.log('[CourseDataService] Adding lesson to parent via signal', {
      lessonId: lesson.id,
      subTopicId: lesson.subTopicId,
      topicId: lesson.topicId,
      title: lesson.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    if (lesson.subTopicId) {
      // Add to subtopic
      for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
        const course = currentCourses[courseIndex];
        if (course.topics) {
          for (let topicIndex = 0; topicIndex < course.topics.length; topicIndex++) {
            const topic = course.topics[topicIndex];
            if (topic.subTopics) {
              const subTopicIndex = topic.subTopics.findIndex(st => st.id === lesson.subTopicId);
              if (subTopicIndex !== -1) {
                const newCourses = [...currentCourses];
                const updatedCourse = { ...course };
                updatedCourse.topics = [...course.topics];
                
                const updatedTopic = { ...topic };
                updatedTopic.subTopics = [...topic.subTopics];
                
                const subTopic = { ...updatedTopic.subTopics[subTopicIndex] };
                if (!subTopic.lessons) subTopic.lessons = [];
                subTopic.lessons = [...subTopic.lessons, lesson];
                
                updatedTopic.subTopics[subTopicIndex] = subTopic;
                updatedCourse.topics[topicIndex] = updatedTopic;
                newCourses[courseIndex] = updatedCourse;
                this._courses.set(newCourses); // Immutable update
                this._lastUpdated.set(new Date());
                return;
              }
            }
          }
        }
      }
    } else if (lesson.topicId) {
      // Add to topic
      for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
        const course = currentCourses[courseIndex];
        if (course.topics) {
          const topicIndex = course.topics.findIndex(t => t.id === lesson.topicId);
          if (topicIndex !== -1) {
            const newCourses = [...currentCourses];
            const updatedCourse = { ...course };
            updatedCourse.topics = [...course.topics];
            
            const topic = { ...updatedCourse.topics[topicIndex] };
            if (!topic.lessons) topic.lessons = [];
            topic.lessons = [...topic.lessons, lesson];
            
            updatedCourse.topics[topicIndex] = topic;
            newCourses[courseIndex] = updatedCourse;
            this._courses.set(newCourses); // Immutable update
            this._lastUpdated.set(new Date());
            return;
          }
        }
      }
    }
  }

  updateLessonInParent(updatedLesson: LessonDetail): void {
    console.log('[CourseDataService] Updating lesson in parent via signal', {
      lessonId: updatedLesson.id,
      subTopicId: updatedLesson.subTopicId,
      topicId: updatedLesson.topicId,
      title: updatedLesson.title,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    if (updatedLesson.subTopicId) {
      // Update in subtopic
      for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
        const course = currentCourses[courseIndex];
        if (course.topics) {
          for (let topicIndex = 0; topicIndex < course.topics.length; topicIndex++) {
            const topic: Topic = course.topics[topicIndex];
            if (topic.subTopics) {
              const subTopicIndex = topic.subTopics.findIndex(st => st.id === updatedLesson.subTopicId);
              if (subTopicIndex !== -1 && topic.subTopics[subTopicIndex].lessons) {
                const lessonIndex = topic.subTopics[subTopicIndex].lessons!.findIndex(l => l.id === updatedLesson.id);
                if (lessonIndex !== -1) {
                  const newCourses = [...currentCourses];
                  const updatedCourse = { ...course };
                  updatedCourse.topics = [...course.topics];
                  
                  const updatedTopic = { ...topic };
                  updatedTopic.subTopics = [...topic.subTopics];
                  
                  const subTopic = { ...updatedTopic.subTopics[subTopicIndex] };
                  subTopic.lessons = [...subTopic.lessons!];
                  subTopic.lessons[lessonIndex] = updatedLesson;
                  
                  updatedTopic.subTopics[subTopicIndex] = subTopic;
                  updatedCourse.topics[topicIndex] = updatedTopic;
                  newCourses[courseIndex] = updatedCourse;
                  this._courses.set(newCourses); // Immutable update
                  this._lastUpdated.set(new Date());
                  return;
                }
              }
            }
          }
        }
      }
    } else if (updatedLesson.topicId) {
      // Update in topic
      for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
        const course = currentCourses[courseIndex];
        if (course.topics) {
          const topicIndex = course.topics.findIndex(t => t.id === updatedLesson.topicId);
          if (topicIndex !== -1 && course.topics[topicIndex].lessons) {
            const lessonIndex = course.topics[topicIndex].lessons!.findIndex(l => l.id === updatedLesson.id);
            if (lessonIndex !== -1) {
              const newCourses = [...currentCourses];
              const updatedCourse = { ...course };
              updatedCourse.topics = [...course.topics];
              
              const topicToUpdate: Topic = { ...updatedCourse.topics[topicIndex] };
              topicToUpdate.lessons = [...topicToUpdate.lessons!];
              topicToUpdate.lessons[lessonIndex] = updatedLesson;
              
              updatedCourse.topics[topicIndex] = topicToUpdate;
              newCourses[courseIndex] = updatedCourse;
              this._courses.set(newCourses); // Immutable update
              this._lastUpdated.set(new Date());
              return;
            }
          }
        }
      }
    }
  }

  removeLessonFromParent(lessonId: number): void {
    console.log('[CourseDataService] Removing lesson from parent via signal', {
      lessonId,
      timestamp: new Date().toISOString()
    });
    
    const currentCourses = this._courses();
    
    for (let courseIndex = 0; courseIndex < currentCourses.length; courseIndex++) {
      const course = currentCourses[courseIndex];
      if (course.topics) {
        for (let topicIndex = 0; topicIndex < course.topics.length; topicIndex++) {
          const topic = course.topics[topicIndex];
          
          // Check lessons under topic
          if (topic.lessons) {
            const lessonIndex = topic.lessons.findIndex(l => l.id === lessonId);
            if (lessonIndex !== -1) {
              const newCourses = [...currentCourses];
              const updatedCourse = { ...course };
              updatedCourse.topics = [...course.topics];
              
              const updatedTopic = { ...topic };
              updatedTopic.lessons = topic.lessons.filter(l => l.id !== lessonId);
              
              updatedCourse.topics[topicIndex] = updatedTopic;
              newCourses[courseIndex] = updatedCourse;
              this._courses.set(newCourses); // Immutable update
              this._lastUpdated.set(new Date());
              return;
            }
          }
          
          // Check lessons under subtopics
          if (topic.subTopics) {
            for (let subTopicIndex = 0; subTopicIndex < topic.subTopics.length; subTopicIndex++) {
              const subTopic = topic.subTopics[subTopicIndex];
              if (subTopic.lessons) {
                const lessonIndex = subTopic.lessons.findIndex(l => l.id === lessonId);
                if (lessonIndex !== -1) {
                  const newCourses = [...currentCourses];
                  const updatedCourse = { ...course };
                  updatedCourse.topics = [...course.topics];
                  
                  const updatedTopic = { ...topic };
                  updatedTopic.subTopics = [...topic.subTopics];
                  
                  const updatedSubTopic = { ...subTopic };
                  updatedSubTopic.lessons = subTopic.lessons.filter(l => l.id !== lessonId);
                  
                  updatedTopic.subTopics[subTopicIndex] = updatedSubTopic;
                  updatedCourse.topics[topicIndex] = updatedTopic;
                  newCourses[courseIndex] = updatedCourse;
                  this._courses.set(newCourses); // Immutable update
                  this._lastUpdated.set(new Date());
                  return;
                }
              }
            }
          }
        }
      }
    }
  }
}