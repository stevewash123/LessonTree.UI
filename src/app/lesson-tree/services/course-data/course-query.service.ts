// RESPONSIBILITY: Read-only data access and queries for course hierarchy. Enhanced with lesson utilities.
// DOES NOT: Handle mutations, storage, or signal emission.
// CALLED BY: CourseDataService, TreeWrapper, InfoPanel components

import { Injectable } from '@angular/core';
import { CourseDataStorageService } from './course-data-storage.service';
import { Course } from '../../../models/course';
import { Lesson, LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';

@Injectable({
  providedIn: 'root'
})
export class CourseQueryService {
  
  constructor(private readonly storageService: CourseDataStorageService) {
    console.log('[CourseQueryService] Enhanced query service initialized');
  }

  // === DATA ACCESS METHODS ===
  
  getCourses(): Course[] {
    return this.storageService.getCoursesCopy();
  }

  getCourseById(id: number): Course | null {
    return this.storageService.getCurrentCourses().find((course: Course) => course.id === id) ?? null;
  }

  getTopicById(topicId: number): Topic | null {
    for (const course of this.storageService.getCurrentCourses()) {
      if (course.topics) {
        const topic = course.topics.find((t: Topic) => t.id === topicId);
        if (topic) return topic;
      }
    }
    return null;
  }

  getSubTopicById(subTopicId: number): SubTopic | null {
    for (const course of this.storageService.getCurrentCourses()) {
      if (course.topics) {
        for (const topic of course.topics) {
          if (topic.subTopics) {
            const subTopic = topic.subTopics.find((st: SubTopic) => st.id === subTopicId);
            if (subTopic) return subTopic;
          }
        }
      }
    }
    return null;
  }

  // Returns basic Lesson for tree operations
  getLessonById(lessonId: number): Lesson | null {
    for (const course of this.storageService.getCurrentCourses()) {
      if (course.topics) {
        for (const topic of course.topics) {
          if (topic.lessons) {
            const lesson = topic.lessons.find((l: Lesson) => l.id === lessonId);
            if (lesson) return lesson;
          }
          if (topic.subTopics) {
            for (const subTopic of topic.subTopics) {
              if (subTopic.lessons) {
                const lesson = subTopic.lessons.find((l: Lesson) => l.id === lessonId);
                if (lesson) return lesson;
              }
            }
          }
        }
      }
    }
    return null;
  }

  // Returns LessonDetail by fetching full details from API via CRUD service
  getLessonDetailById(lessonId: number): LessonDetail | null {
    // This method should be used by InfoPanel components
    // Implementation should delegate to API service for full details
    const basicLesson = this.getLessonById(lessonId);
    if (!basicLesson) return null;
    
    // For now, create a basic LessonDetail from Lesson
    // In practice, this should call API service for full details
    return {
      ...basicLesson,
      level: '',
      materials: '',
      classTime: '',
      methods: '',
      specialNeeds: '',
      assessment: '',
      standards: [],
      attachments: [],
      notes: []
    } as LessonDetail;
  }

  // === LESSON COLLECTION UTILITIES ===
  
  // Collect lessons from course hierarchy in proper order
  collectLessonsFromCourse(course: Course): Lesson[] {
    const lessons: Lesson[] = [];
    if (!course.topics) return lessons;
  
    const sortedTopics = [...course.topics].sort((a: Topic, b: Topic) => a.sortOrder - b.sortOrder);
    
    for (const topic of sortedTopics) {
      // Collect ALL children (subtopics + direct lessons) and sort by unified sortOrder
      const allChildren: Array<{type: 'SubTopic' | 'Lesson', item: any, sortOrder: number}> = [];
      
      // Add subtopics to unified list
      if (topic.subTopics) {
        topic.subTopics.forEach((subTopic: SubTopic) => {
          allChildren.push({
            type: 'SubTopic',
            item: subTopic,
            sortOrder: subTopic.sortOrder
          });
        });
      }
      
      // Add direct lessons to unified list
      if (topic.lessons) {
        topic.lessons.forEach((lesson: Lesson) => {
          allChildren.push({
            type: 'Lesson', 
            item: lesson,
            sortOrder: lesson.sortOrder
          });
        });
      }
      
      // Sort by unified sortOrder and process in order
      allChildren
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .forEach((child: any) => {
          if (child.type === 'Lesson') {
            // Direct lesson - add to collection
            lessons.push(child.item);
          } else if (child.type === 'SubTopic') {
            // SubTopic - add its lessons in sortOrder
            if (child.item.lessons) {
              const sortedSubTopicLessons = [...child.item.lessons]
                .sort((a: Lesson, b: Lesson) => a.sortOrder - b.sortOrder);
              lessons.push(...sortedSubTopicLessons);
            }
          }
        });
    }
  
    console.log(`[CourseQueryService] Collected ${lessons.length} lessons from course ${course.title} in unified order:`, 
      lessons.map((l: Lesson) => `${l.title}(${l.sortOrder})`).join(', '));
    
    return lessons;
  }

  // Get lesson count for a course (utility method)
  getLessonCountForCourse(courseId: number): number {
    const course = this.getCourseById(courseId);
    if (!course) return 0;
    
    return this.collectLessonsFromCourse(course).length;
  }

  // Validate course has lessons for scheduling
  validateCourseForScheduling(courseId: number): { hasLessons: boolean; lessonCount: number } {
    const course = this.getCourseById(courseId);
    if (!course) {
      return { hasLessons: false, lessonCount: 0 };
    }
    
    const lessons = this.collectLessonsFromCourse(course);
    return {
      hasLessons: lessons.length > 0,
      lessonCount: lessons.length
    };
  }

  // === ADDITIONAL QUERY UTILITIES ===

  getTopicsByCourseId(courseId: number): Topic[] {
    const course = this.getCourseById(courseId);
    return course?.topics ? [...course.topics].sort((a: Topic, b: Topic) => a.sortOrder - b.sortOrder) : [];
  }

  getSubTopicsByTopicId(topicId: number): SubTopic[] {
    const topic = this.getTopicById(topicId);
    return topic?.subTopics ? [...topic.subTopics].sort((a: SubTopic, b: SubTopic) => a.sortOrder - b.sortOrder) : [];
  }

  getLessonsByTopicId(topicId: number): Lesson[] {
    const topic = this.getTopicById(topicId);
    return topic?.lessons ? [...topic.lessons].sort((a: Lesson, b: Lesson) => a.sortOrder - b.sortOrder) : [];
  }

  getLessonsBySubTopicId(subTopicId: number): Lesson[] {
    const subTopic = this.getSubTopicById(subTopicId);
    return subTopic?.lessons ? [...subTopic.lessons].sort((a: Lesson, b: Lesson) => a.sortOrder - b.sortOrder) : [];
  }

  // Get all lessons across all courses
  getAllLessons(): Lesson[] {
    const allLessons: Lesson[] = [];
    for (const course of this.storageService.getCurrentCourses()) {
      allLessons.push(...this.collectLessonsFromCourse(course));
    }
    return allLessons;
  }

  // Find entities by nodeId (useful for tree operations)
  findEntityByNodeId(nodeId: string): { entity: any; type: string } | null {
    for (const course of this.storageService.getCurrentCourses()) {
      if (course.nodeId === nodeId) {
        return { entity: course, type: 'Course' };
      }
      
      if (course.topics) {
        for (const topic of course.topics) {
          if (topic.nodeId === nodeId) {
            return { entity: topic, type: 'Topic' };
          }
          
          if (topic.subTopics) {
            for (const subTopic of topic.subTopics) {
              if (subTopic.nodeId === nodeId) {
                return { entity: subTopic, type: 'SubTopic' };
              }
              
              if (subTopic.lessons) {
                for (const lesson of subTopic.lessons) {
                  if (lesson.nodeId === nodeId) {
                    return { entity: lesson, type: 'Lesson' };
                  }
                }
              }
            }
          }
          
          if (topic.lessons) {
            for (const lesson of topic.lessons) {
              if (lesson.nodeId === nodeId) {
                return { entity: lesson, type: 'Lesson' };
              }
            }
          }
        }
      }
    }
    return null;
  }
}