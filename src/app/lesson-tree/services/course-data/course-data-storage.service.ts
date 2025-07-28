// RESPONSIBILITY: Pure data storage and signal management. Foundation service for course data.
// DOES NOT: Handle mutations, queries, or business logic.
// CALLED BY: CourseTreeMutationService, CourseDataService, CourseQueryService

import { Injectable, signal, computed } from '@angular/core';
import { Course } from '../../../models/course';
import {Lesson} from '../../../models/lesson';
import {Topic} from '../../../models/topic';
import {SubTopic} from '../../../models/subTopic';

export type ChangeSource = 'tree' | 'calendar' | 'infopanel' | 'api' | 'initialization';

@Injectable({
  providedIn: 'root'
})
export class CourseDataStorageService {
  // Core Data Signals
  private readonly _courses = signal<Course[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _lastUpdated = signal<Date | null>(null);

  // Readonly accessors for core signals
  readonly courses = this._courses.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();

  // Basic computed signals
  readonly coursesCount = computed(() => this._courses().length);
  readonly hasData = computed(() => this.coursesCount() > 0);
  readonly isEmpty = computed(() => this.coursesCount() === 0);

  constructor() {
    console.log('[CourseDataStorageService] Pure data storage service initialized');
  }

  // === CORE STATE METHODS ===

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  /**
   * Update courses signal with new data and timestamp
   */
  updateCourses(newCourses: Course[]): void {
    this._courses.set(newCourses);
    this._lastUpdated.set(new Date());
  }

  setCourses(courses: any[], source: ChangeSource = 'initialization'): void {
    console.log('[CourseDataStorageService] Setting courses', {
      count: courses.length,
      source,
      timestamp: new Date().toISOString()
    });

    // ✅ FIXED: Convert all nested entities to proper class instances
    const courseInstances = courses.map(courseData => new Course({
      ...courseData,
      topics: courseData.topics?.map((topicData: any) => new Topic({
        ...topicData,
        lessons: topicData.lessons?.map((lessonData: any) => new Lesson(lessonData)),
        subTopics: topicData.subTopics?.map((subTopicData: any) => new SubTopic({
          ...subTopicData,
          lessons: subTopicData.lessons?.map((lessonData: any) => new Lesson(lessonData))
        }))
      }))
    }));

    this.updateCourses(courseInstances);
  }

  // === DATA ACCESS (Internal) ===

  /**
   * Get current courses array for internal service use
   * External consumers should use CourseQueryService
   */
  getCurrentCourses(): Course[] {
    return this._courses();
  }

  /**
   * Get courses array copy for safe external use
   */
  getCoursesCopy(): Course[] {
    return [...this._courses()];
  }
}
