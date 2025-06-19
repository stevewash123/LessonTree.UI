// RESPONSIBILITY: Manages course data state, signals, and reactive queries. Pure data layer with proper Lesson/LessonDetail separation.
// DOES NOT: Handle API calls, user feedback, or business logic.
// CALLED BY: CourseCrudService, TreeWrapper, Calendar, NodeOperationsService

import { Injectable, signal, computed } from '@angular/core';
import { Course } from '../../models/course';
import { TreeData } from '../../models/tree-node';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';

export type ChangeSource = 'tree' | 'calendar' | 'infopanel' | 'api' | 'initialization';

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
  
  // Signals for node state changes with source tracking
  readonly nodeAdded = signal<{node: TreeData, source: ChangeSource} | null>(null);
  readonly nodeEdited = signal<{node: TreeData, source: ChangeSource} | null>(null);
  readonly nodeDeleted = signal<{node: TreeData, source: ChangeSource} | null>(null);
  readonly nodeMoved = signal<{node: TreeData, sourceLocation: string, targetLocation: string, changeSource: ChangeSource} | null>(null);

  constructor() {
    console.log('[CourseDataService] Service initialized with Lesson/LessonDetail separation', { 
      timestamp: new Date().toISOString() 
    });
  }

  // === SIGNAL EMISSION METHODS (Updated with Source Tracking) ===
  emitNodeAdded(node: TreeData, source: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Node added', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      source,
      timestamp: new Date().toISOString()
    });
    this.nodeAdded.set({node, source});
  }

  emitNodeEdited(node: TreeData, source: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Node edited', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      source,
      timestamp: new Date().toISOString()
    });
    this.nodeEdited.set({node, source});
  }

  emitNodeDeleted(node: TreeData, source: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Node deleted', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      source,
      timestamp: new Date().toISOString()
    });
    this.nodeDeleted.set({node, source});
  }

  emitNodeMoved(event: {node: TreeData, sourceLocation: string, targetLocation: string}, changeSource: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Node moved', {
      nodeType: event.node.nodeType,
      nodeId: event.node.nodeId,
      sourceLocation: event.sourceLocation,
      targetLocation: event.targetLocation,
      changeSource,
      timestamp: new Date().toISOString()
    });
    this.nodeMoved.set({...event, changeSource});
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
    operation: 'add' | 'update' | 'remove',
    source: ChangeSource = 'api'
  ): void {
    const currentCourses = this._courses();
    const newCourses = this.processCoursesArray(currentCourses, entity, operation);
    this.updateSignal(newCourses);
    
    // Emit appropriate signal based on operation
    switch (operation) {
      case 'add':
        this.emitNodeAdded(entity, source);
        break;
      case 'update':
        this.emitNodeEdited(entity, source);
        break;
      case 'remove':
        this.emitNodeDeleted(entity, source);
        break;
    }
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
        return lessons.map(l => l.id === lesson.id ? lesson : l);
      case 'remove':
        return lessons.filter(l => l.id !== lesson.id);
    }
  }

  /**
   * Convert LessonDetail to basic Lesson for tree storage - NEW METHOD
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

  // === DATA ACCESS METHODS (Query Only) - UPDATED ===
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

  // UPDATED: Returns basic Lesson for tree operations
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

  // NEW: Returns LessonDetail by fetching full details from API via CRUD service
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

  // === PUBLIC MUTATION METHODS (Called by External Services Only) ===

  setCourses(courses: Course[], source: ChangeSource = 'initialization'): void {
    console.log('[CourseDataService] Setting courses via signal', {
      count: courses.length,
      source,
      timestamp: new Date().toISOString()
    });
    this.updateSignal([...courses]);
  }

  // Generic mutation methods - called by CourseCrudService, NodeOperationsService, etc.
  addEntity<T extends TreeData>(entity: T, source: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Adding entity', {
      entityType: entity.nodeType,
      entityId: entity.nodeId,
      source,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'add', source);
  }

  updateEntity<T extends TreeData>(entity: T, source: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Updating entity', {
      entityType: entity.nodeType,
      entityId: entity.nodeId,
      source,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'update', source);
  }

  removeEntity<T extends TreeData>(entity: T, source: ChangeSource = 'api'): void {
    console.log('[CourseDataService] Removing entity', {
      entityType: entity.nodeType,
      entityId: entity.nodeId,
      source,
      timestamp: new Date().toISOString()
    });
    this.mutateTree(entity, 'remove', source);
  }

  
  // Collect lessons from course hierarchy in proper order
  collectLessonsFromCourse(course: Course): Lesson[] {
    const lessons: Lesson[] = [];
    if (!course.topics) return lessons;

    const sortedTopics = [...course.topics].sort((a, b) => a.sortOrder - b.sortOrder);
    
    for (const topic of sortedTopics) {
      const topicLessons: Lesson[] = [];
      
      if (topic.lessons) {
        topicLessons.push(...topic.lessons);
      }
      
      if (topic.subTopics) {
        const sortedSubTopics = [...topic.subTopics].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const subTopic of sortedSubTopics) {
          if (subTopic.lessons) {
            topicLessons.push(...subTopic.lessons);
          }
        }
      }
      
      topicLessons.sort((a, b) => a.sortOrder - b.sortOrder);
      lessons.push(...topicLessons);
    }

    console.log(`[CourseDataService] Collected ${lessons.length} lessons from course ${course.title}`);
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
}