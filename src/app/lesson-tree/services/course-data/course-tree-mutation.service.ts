// RESPONSIBILITY: Pure tree mutation logic for course hierarchy. Handles all add/update/remove operations.
// DOES NOT: Handle data storage, queries, or signal emission.
// CALLED BY: CourseDataService

import { Injectable } from '@angular/core';
import { Course } from '../../../models/course';
import { Lesson, LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { TreeData } from '../../../models/tree-node';
import { CourseDataStorageService } from './course-data-storage.service';

@Injectable({
  providedIn: 'root'
})
export class CourseTreeMutationService {
  
  constructor(private readonly storageService: CourseDataStorageService) {
    console.log('[CourseTreeMutationService] Tree mutation service initialized');
  }

  // === GENERIC MUTATION HELPERS ===
  
  /**
   * Generic helper to find and update any entity in the courses tree
   */
  mutateTree<T extends TreeData>(
    entity: T, 
    operation: 'add' | 'update' | 'remove'
  ): void {
    const currentCourses = this.storageService.getCurrentCourses();
    const newCourses = this.processCoursesArray(currentCourses, entity, operation);
    this.storageService.updateCourses(newCourses);
  }

  /**
   * Process the courses array, routing to appropriate handler based on entity type
   */
  private processCoursesArray<T extends TreeData>(
    courses: Course[], 
    entity: T, 
    operation: 'add' | 'update' | 'remove'
  ): Course[] {
    if (entity.nodeType === 'Course') {
      return this.mutateCourseArray(courses, entity as Course, operation);
    }
    
    return courses.map((course: Course) => {
      if (course.id === entity.courseId) {
        return this.mutateCourse(course, entity, operation);
      }
      return course;
    });
  }

  /**
   * Handle course-level mutations (add/update/remove entire courses)
   */
  private mutateCourseArray(courses: Course[], course: Course, operation: 'add' | 'update' | 'remove'): Course[] {
    switch (operation) {
      case 'add':
        return [...courses, course];
      case 'update':
        return courses.map((c: Course) => c.id === course.id ? course : c);
      case 'remove':
        return courses.filter((c: Course) => c.id !== course.id);
    }
  }

  /**
   * Handle mutations within a specific course
   */
  private mutateCourse<T extends TreeData>(course: Course, entity: T, operation: 'add' | 'update' | 'remove'): Course {
    const newCourse = { ...course };
    
    if (entity.nodeType === 'Topic') {
      newCourse.topics = this.mutateTopicArray(newCourse.topics || [], entity as Topic, operation);
      return newCourse;
    }
    
    if (entity.nodeType === 'SubTopic' || entity.nodeType === 'Lesson') {
      newCourse.topics = (newCourse.topics || []).map((topic: Topic) => 
        this.mutateTopic(topic, entity, operation)
      );
      return newCourse;
    }
    
    return newCourse;
  }

  /**
   * Handle topic array mutations
   */
  private mutateTopicArray(topics: Topic[], topic: Topic, operation: 'add' | 'update' | 'remove'): Topic[] {
    switch (operation) {
      case 'add':
        return [...topics, topic];
      case 'update':
        return topics.map((t: Topic) => t.id === topic.id ? topic : t);
      case 'remove':
        return topics.filter((t: Topic) => t.id !== topic.id);
    }
  }

  /**
   * Handle mutations within a specific topic - FIXED: Proper lesson type handling
   */
  private mutateTopic<T extends TreeData>(topic: Topic, entity: T, operation: 'add' | 'update' | 'remove'): Topic {
    const newTopic = { ...topic };
    
    if (entity.nodeType === 'SubTopic') {
      const subTopic = entity as unknown as SubTopic;
      if (subTopic.topicId === topic.id) {
        newTopic.subTopics = this.mutateSubTopicArray(newTopic.subTopics || [], subTopic, operation);
      }
      return newTopic;
    }
    
    if (entity.nodeType === 'Lesson') {
      // FIXED: Accept both Lesson and LessonDetail, but store as Lesson
      const lesson = entity as unknown as Lesson | LessonDetail;
      
      // Lesson belongs directly to this topic
      if (lesson.topicId === topic.id && !lesson.subTopicId) {
        const basicLesson = this.toLessonBasic(lesson);
        newTopic.lessons = this.mutateLessonArray(newTopic.lessons || [], basicLesson, operation);
        return newTopic;
      }
      
      // Lesson belongs to a subtopic within this topic
      if (lesson.subTopicId) {
        newTopic.subTopics = (newTopic.subTopics || []).map((subTopic: SubTopic) => 
          this.mutateSubTopic(subTopic, lesson, operation)
        );
      }
    }
    
    return newTopic;
  }

  /**
   * Handle subtopic array mutations
   */
  private mutateSubTopicArray(subTopics: SubTopic[], subTopic: SubTopic, operation: 'add' | 'update' | 'remove'): SubTopic[] {
    switch (operation) {
      case 'add':
        return [...subTopics, subTopic];
      case 'update':
        return subTopics.map((st: SubTopic) => st.id === subTopic.id ? subTopic : st);
      case 'remove':
        return subTopics.filter((st: SubTopic) => st.id !== subTopic.id);
    }
  }

  /**
   * Handle mutations within a specific subtopic - FIXED: Proper lesson type handling
   */
  private mutateSubTopic(subTopic: SubTopic, lesson: Lesson | LessonDetail, operation: 'add' | 'update' | 'remove'): SubTopic {
    if (lesson.subTopicId === subTopic.id) {
      const newSubTopic = { ...subTopic };
      const basicLesson = this.toLessonBasic(lesson);
      newSubTopic.lessons = this.mutateLessonArray(newSubTopic.lessons || [], basicLesson, operation);
      return newSubTopic;
    }
    return subTopic;
  }

  /**
   * Handle lesson array mutations - FIXED: Only work with Lesson type
   */
  private mutateLessonArray(lessons: Lesson[], lesson: Lesson, operation: 'add' | 'update' | 'remove'): Lesson[] {
    switch (operation) {
      case 'add':
        return [...lessons, lesson];
      case 'update':
        return lessons.map((l: Lesson) => l.id === lesson.id ? lesson : l);
      case 'remove':
        return lessons.filter((l: Lesson) => l.id !== lesson.id);
    }
  }

  /**
   * Convert LessonDetail to basic Lesson for tree storage
   */
  private toLessonBasic(lesson: Lesson | LessonDetail): Lesson {
    return {
      id: lesson.id,
      nodeId: lesson.nodeId,
      courseId: lesson.courseId,
      subTopicId: lesson.subTopicId,
      topicId: lesson.topicId,
      title: lesson.title,
      objective: lesson.objective,
      nodeType: 'Lesson',
      description: lesson.description,
      archived: lesson.archived,
      visibility: lesson.visibility,
      userId: lesson.userId,
      sortOrder: lesson.sortOrder,
      hasChildren: false
    } as Lesson;
  }

  // === PUBLIC MUTATION METHODS ===

  addEntity<T extends TreeData>(entity: T): void {
    console.log('[CourseTreeMutationService] Adding entity', {
      entityType: entity.nodeType,
      entityId: entity.nodeId,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'add');
  }

  updateEntity<T extends TreeData>(entity: T): void {
    console.log('[CourseTreeMutationService] Updating entity', {
      entityType: entity.nodeType,
      entityId: entity.nodeId,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'update');
  }

  removeEntity<T extends TreeData>(entity: T): void {
    console.log('[CourseTreeMutationService] Removing entity', {
      entityType: entity.nodeType,
      entityId: entity.nodeId,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'remove');
  }
}