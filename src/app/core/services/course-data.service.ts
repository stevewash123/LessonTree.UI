// src/app/core/services/course-data.service.ts - Phase 1 + Generic Mutations (Validated)
import { Injectable, signal, computed } from '@angular/core';
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
  
  // Phase 2: Computed Signals for reactive filtering and derived state
  readonly filteredCourses = computed(() => {
    const courses = this._courses();
    const courseFilter = this._courseFilter();
    const visibilityFilter = this._visibilityFilter();
    
    return courses.filter(course => {
      // Apply course filter (active/archived/both)
      if (courseFilter === 'active' && course.archived) return false;
      if (courseFilter === 'archived' && !course.archived) return false;
      // 'both' includes all courses regardless of archived status
      
      // Apply visibility filter
      if (visibilityFilter === 'private' && course.visibility !== 'Private') return false;
      if (visibilityFilter === 'team' && course.visibility === 'Private') return false;
      // Note: 'team' filter includes both 'Team' and 'Public' courses
      
      return true;
    });
  });

  // Simple active courses filter for TreeWrapper and LessonCalendar
  readonly activeCourses = computed(() => {
    return this._courses().filter(course => !course.archived);
  });

  readonly coursesCount = computed(() => this.filteredCourses().length);
  readonly hasData = computed(() => this.coursesCount() > 0);
  readonly isEmpty = computed(() => this.coursesCount() === 0);

  readonly courseStats = computed(() => {
    const allCourses = this._courses();
    const filteredCourses = this.filteredCourses();
    
    return {
      total: allCourses.length,
      filtered: filteredCourses.length,
      active: allCourses.filter(c => !c.archived).length,
      archived: allCourses.filter(c => c.archived).length,
      byVisibility: {
        private: allCourses.filter(c => c.visibility === 'Private').length,
        team: allCourses.filter(c => c.visibility === 'Team').length,
        public: allCourses.filter(c => c.visibility === 'Public').length
      },
      currentFilter: {
        courseFilter: this._courseFilter(),
        visibilityFilter: this._visibilityFilter()
      }
    };
  });
  
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

  // === SIGNAL EMISSION METHODS ===
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
    this._courseFilter.set(filter);
  }

  setVisibilityFilter(filter: 'private' | 'team'): void {
    this._visibilityFilter.set(filter);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  // === GENERIC MUTATION HELPERS ===
  
  /**
   * Update courses signal with new data and timestamp
   */
  private updateSignal(newCourses: Course[]): void {
    this._courses.set(newCourses);
    this._lastUpdated.set(new Date());
  }

  /**
   * Generic helper to find and update any entity in the courses tree
   */
  private mutateTree<T extends TreeData>(
    entity: T, 
    operation: 'add' | 'update' | 'remove'
  ): void {
    const currentCourses = this._courses();
    const newCourses = this.processCoursesArray(currentCourses, entity, operation);
    this.updateSignal(newCourses);
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
    
    return courses.map(course => {
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
        return courses.map(c => c.id === course.id ? course : c);
      case 'remove':
        return courses.filter(c => c.id !== course.id);
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
      newCourse.topics = (newCourse.topics || []).map(topic => 
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
        return topics.map(t => t.id === topic.id ? topic : t);
      case 'remove':
        return topics.filter(t => t.id !== topic.id);
    }
  }

  /**
   * Handle mutations within a specific topic
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
      const lesson = entity as unknown as LessonDetail;
      
      // Lesson belongs directly to this topic
      if (lesson.topicId === topic.id && !lesson.subTopicId) {
        newTopic.lessons = this.mutateLessonArray(newTopic.lessons || [], lesson, operation);
        return newTopic;
      }
      
      // Lesson belongs to a subtopic within this topic
      if (lesson.subTopicId) {
        newTopic.subTopics = (newTopic.subTopics || []).map(subTopic => 
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
        return subTopics.map(st => st.id === subTopic.id ? subTopic : st);
      case 'remove':
        return subTopics.filter(st => st.id !== subTopic.id);
    }
  }

  /**
   * Handle mutations within a specific subtopic
   */
  private mutateSubTopic(subTopic: SubTopic, lesson: LessonDetail, operation: 'add' | 'update' | 'remove'): SubTopic {
    if (lesson.subTopicId === subTopic.id) {
      const newSubTopic = { ...subTopic };
      newSubTopic.lessons = this.mutateLessonArray(newSubTopic.lessons || [], lesson, operation);
      return newSubTopic;
    }
    return subTopic;
  }

  /**
   * Handle lesson array mutations
   */
  private mutateLessonArray(lessons: Lesson[], lesson: LessonDetail, operation: 'add' | 'update' | 'remove'): Lesson[] {
    switch (operation) {
      case 'add':
        return [...lessons, lesson];
      case 'update':
        return lessons.map(l => l.id === lesson.id ? lesson : l);
      case 'remove':
        return lessons.filter(l => l.id !== lesson.id);
    }
  }

  // === DATA ACCESS METHODS (backward compatible) ===
  getCourses(): Course[] {
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
          if (topic.lessons) {
            const lesson = topic.lessons.find(l => l.id === lessonId);
            if (lesson) return lesson;
          }
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

  // === SIMPLIFIED PUBLIC MUTATION METHODS ===

  setCourses(courses: Course[]): void {
    console.log('[CourseDataService] Setting courses via signal', {
      count: courses.length,
      timestamp: new Date().toISOString()
    });
    this.updateSignal([...courses]);
  }

  addCourse(course: Course): void {
    console.log('[CourseDataService] Adding course', {
      courseId: course.id,
      title: course.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(course, 'add');
  }

  updateCourse(updatedCourse: Course): void {
    console.log('[CourseDataService] Updating course', {
      courseId: updatedCourse.id,
      title: updatedCourse.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(updatedCourse, 'update');
  }

  removeCourse(courseId: number): void {
    console.log('[CourseDataService] Removing course', {
      courseId,
      timestamp: new Date().toISOString()
    });
    const course = this.getCourseById(courseId);
    if (course) {
      this.mutateTree(course, 'remove');
    }
  }

  addTopicToCourse(topic: Topic): void {
    console.log('[CourseDataService] Adding topic to course', {
      topicId: topic.id,
      courseId: topic.courseId,
      title: topic.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(topic, 'add');
  }

  updateTopicInCourse(updatedTopic: Topic): void {
    console.log('[CourseDataService] Updating topic in course', {
      topicId: updatedTopic.id,
      courseId: updatedTopic.courseId,
      title: updatedTopic.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(updatedTopic, 'update');
  }

  removeTopicFromCourse(topicId: number): void {
    console.log('[CourseDataService] Removing topic from course', {
      topicId,
      timestamp: new Date().toISOString()
    });
    const topic = this.getTopicById(topicId);
    if (topic) {
      this.mutateTree(topic, 'remove');
    }
  }

  addSubTopicToTopic(subTopic: SubTopic): void {
    console.log('[CourseDataService] Adding subtopic to topic', {
      subTopicId: subTopic.id,
      topicId: subTopic.topicId,
      title: subTopic.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(subTopic, 'add');
  }

  updateSubTopicInTopic(updatedSubTopic: SubTopic): void {
    console.log('[CourseDataService] Updating subtopic in topic', {
      subTopicId: updatedSubTopic.id,
      topicId: updatedSubTopic.topicId,
      title: updatedSubTopic.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(updatedSubTopic, 'update');
  }

  removeSubTopicFromTopic(subTopicId: number): void {
    console.log('[CourseDataService] Removing subtopic from topic', {
      subTopicId,
      timestamp: new Date().toISOString()
    });
    const subTopic = this.getSubTopicById(subTopicId);
    if (subTopic) {
      this.mutateTree(subTopic, 'remove');
    }
  }

  addLessonToParent(lesson: LessonDetail): void {
    console.log('[CourseDataService] Adding lesson to parent', {
      lessonId: lesson.id,
      subTopicId: lesson.subTopicId,
      topicId: lesson.topicId,
      title: lesson.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(lesson, 'add');
  }

  updateLessonInParent(updatedLesson: LessonDetail): void {
    console.log('[CourseDataService] Updating lesson in parent', {
      lessonId: updatedLesson.id,
      subTopicId: updatedLesson.subTopicId,
      topicId: updatedLesson.topicId,
      title: updatedLesson.title,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(updatedLesson, 'update');
  }

  removeLessonFromParent(lessonId: number): void {
    console.log('[CourseDataService] Removing lesson from parent', {
      lessonId,
      timestamp: new Date().toISOString()
    });
    const lesson = this.getLessonById(lessonId);
    if (lesson) {
      this.mutateTree(lesson as LessonDetail, 'remove');
    }
  }
}