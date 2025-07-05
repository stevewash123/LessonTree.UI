// **COMPLETE FILE** - course-data/course-tree-mutation.service.ts
// RESPONSIBILITY: Pure tree mutation logic for course hierarchy. Handles all add/update/remove operations.
// DOES NOT: Handle data storage, queries, or signal emission.
// CALLED BY: CourseDataService

import { Injectable } from '@angular/core';
import { Course } from '../../../models/course';
import { Lesson, LessonDetail } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { Entity } from '../../../models/entity';
import { CourseDataStorageService } from './course-data-storage.service';

@Injectable({
  providedIn: 'root'
})
export class CourseTreeMutationService {

  constructor(private readonly storageService: CourseDataStorageService) {
    console.log('[CourseTreeMutationService] Tree mutation service initialized');
  }

  // === TYPE GUARDS ===

  private isCourseEntity(entity: Entity): entity is Course {
    return entity.entityType === 'Course';
  }

  private isTopicEntity(entity: Entity): entity is Topic {
    return entity.entityType === 'Topic';
  }

  private isSubTopicEntity(entity: Entity): entity is SubTopic {
    return entity.entityType === 'SubTopic';
  }

  private isLessonEntity(entity: Entity): entity is Lesson {
    return entity.entityType === 'Lesson';
  }

  // === GENERIC MUTATION HELPERS ===

  /**
   * Generic helper to find and update any entity in the courses tree
   */
  mutateTree<T extends Entity>(
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
  private processCoursesArray<T extends Entity>(
    courses: Course[],
    entity: T,
    operation: 'add' | 'update' | 'remove'
  ): Course[] {
    // ✅ FIXED: Use type guard instead of unsafe casting
    if (this.isCourseEntity(entity)) {
      return this.mutateCourseArray(courses, entity, operation);
    }

    return courses.map((course: Course) => {
      const entityCourseId = this.getEntityCourseId(entity);
      if (course.id === entityCourseId) {
        return this.mutateCourse(course, entity, operation);
      }
      return course;
    });
  }

  /**
   * Extract courseId from any Entity type
   */
  private getEntityCourseId(entity: Entity): number {
    switch (entity.entityType) {
      case 'Course':
        return entity.id;
      case 'Topic':
        return (entity as Topic).courseId;
      case 'SubTopic':
        return (entity as SubTopic).courseId;
      case 'Lesson':
        return (entity as Lesson).courseId;
      default:
        return 0;
    }
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
  private mutateCourse<T extends Entity>(course: Course, entity: T, operation: 'add' | 'update' | 'remove'): Course {
    const updatedCourse = course.clone();

    // ✅ FIXED: Use type guard instead of unsafe casting
    if (this.isTopicEntity(entity)) {
      updatedCourse.topics = this.mutateTopicArray(updatedCourse.topics || [], entity, operation);
      return updatedCourse;
    }

    if (this.isSubTopicEntity(entity) || this.isLessonEntity(entity)) {
      updatedCourse.topics = (updatedCourse.topics || []).map((topic: Topic) =>
        this.mutateTopic(topic, entity, operation)
      );
      return updatedCourse;
    }

    return updatedCourse;
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
   * Handle mutations within a specific topic
   */
  private mutateTopic<T extends Entity>(topic: Topic, entity: T, operation: 'add' | 'update' | 'remove'): Topic {
    const updatedTopic = topic.clone();

    // ✅ FIXED: Use type guard instead of unsafe casting
    if (this.isSubTopicEntity(entity)) {
      if (entity.topicId === topic.id) {
        updatedTopic.subTopics = this.mutateSubTopicArray(updatedTopic.subTopics || [], entity, operation);
      }
      return updatedTopic;
    }

    // ✅ FIXED: Use type guard for lesson handling
    if (this.isLessonEntity(entity)) {
      // Lesson belongs directly to this topic
      if (entity.topicId === topic.id && !entity.subTopicId) {
        const basicLesson = this.toLessonBasic(entity);
        updatedTopic.lessons = this.mutateLessonArray(updatedTopic.lessons || [], basicLesson, operation);
        return updatedTopic;
      }

      // Lesson belongs to a subtopic within this topic
      if (entity.subTopicId) {
        updatedTopic.subTopics = (updatedTopic.subTopics || []).map((subTopic: SubTopic) =>
          this.mutateSubTopic(subTopic, entity, operation)
        );
      }
    }

    return updatedTopic;
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
   * Handle mutations within a specific subtopic
   */
  private mutateSubTopic(subTopic: SubTopic, lesson: Lesson, operation: 'add' | 'update' | 'remove'): SubTopic {
    if (lesson.subTopicId === subTopic.id) {
      const updatedSubTopic = subTopic.clone();
      const basicLesson = this.toLessonBasic(lesson);
      updatedSubTopic.lessons = this.mutateLessonArray(updatedSubTopic.lessons || [], basicLesson, operation);
      return updatedSubTopic;
    }
    return subTopic;
  }

  /**
   * Handle lesson array mutations
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
    // ✅ Use proper Lesson constructor instead of object literal
    return new Lesson({
      id: lesson.id,
      courseId: lesson.courseId,
      subTopicId: lesson.subTopicId,
      topicId: lesson.topicId,
      title: lesson.title,
      objective: lesson.objective,
      description: lesson.description,
      archived: lesson.archived,
      visibility: lesson.visibility,
      userId: lesson.userId,
      sortOrder: lesson.sortOrder
    });
  }

  // === PUBLIC MUTATION METHODS ===

  addEntity<T extends Entity>(entity: T): void {
    console.log('[CourseTreeMutationService] Adding entity', {
      entityType: entity.entityType,
      entityId: entity.id,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'add');
  }

  updateEntity<T extends Entity>(entity: T): void {
    console.log('[CourseTreeMutationService] Updating entity', {
      entityType: entity.entityType,
      entityId: entity.id,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'update');
  }

  removeEntity<T extends Entity>(entity: T): void {
    console.log('[CourseTreeMutationService] Removing entity', {
      entityType: entity.entityType,
      entityId: entity.id,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'remove');
  }
}
