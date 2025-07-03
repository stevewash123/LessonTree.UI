// **TEMPORARY FACADE** - CourseCrudService - Delegates to Split Services
// RESPONSIBILITY: Temporary facade to maintain backward compatibility during migration
// DOES NOT: Contain business logic (delegates everything to split services)
// CALLED BY: Existing components during migration period - WILL BE DELETED after migration

import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';

import { CourseCrudBusinessService } from '../business/course-crud-business.service';
import { CourseCrudCoordinationService } from '../coordination/course-crud-coordination.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { LessonDetail } from '../../../models/lesson';

// Re-export types for backward compatibility
export type {
  EntitySaveCompletedEvent,
  EntitySaveErrorEvent,
  CourseSaveCompletedEvent,
  TopicSaveCompletedEvent,
  SubTopicSaveCompletedEvent,
  LessonSaveCompletedEvent,
  LessonSaveErrorEvent,
  CrudCoordinationEvent
} from '../coordination/course-crud-coordination.service';

@Injectable({
  providedIn: 'root'
})
export class CourseCrudService implements OnDestroy {

  constructor(
    private business: CourseCrudBusinessService,
    private coordination: CourseCrudCoordinationService
  ) {
    console.log('[CourseCrudService] FACADE PATTERN - Delegating to split services');
    console.log('[CourseCrudService] Business Service:', !!this.business);
    console.log('[CourseCrudService] Coordination Service:', !!this.coordination);
  }

  // === OBSERVABLE STREAMS - Delegate to Coordination Service ===

  get courseSaveCompleted$() {
    return this.coordination.courseSaveCompleted$;
  }

  get lessonSaveCompleted$() {
    return this.coordination.lessonSaveCompleted$;
  }

  get lessonSaveError$() {
    return this.coordination.lessonSaveError$;
  }


  // === COURSE OPERATIONS ===

  loadCourses(): Observable<Course[]> {
    console.log('[CourseCrudService] FACADE: Delegating loadCourses to business service');
    return this.business.loadCourses();
  }

  createCourse(course: Course): Observable<Course> {
    console.log('[CourseCrudService] FACADE: Delegating createCourse to business service');
    return this.business.createCourse(course);
  }

  updateCourse(course: Course): Observable<Course> {
    console.log('[CourseCrudService] FACADE: Delegating updateCourse to business service');
    return this.business.updateCourse(course);
  }

  deleteCourse(courseId: number): Observable<void> {
    console.log('[CourseCrudService] FACADE: Delegating deleteCourse to business service');
    return this.business.deleteCourse(courseId);
  }

  // === TOPIC OPERATIONS ===

  createTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseCrudService] FACADE: Delegating createTopic to business service');
    return this.business.createTopic(topic);
  }


  updateTopic(topic: Topic): Observable<Topic> {
    console.log('[CourseCrudService] FACADE: Delegating updateTopic to business service');
    return this.business.updateTopic(topic);
  }

  deleteTopic(topicId: number): Observable<void> {
    console.log('[CourseCrudService] FACADE: Delegating deleteTopic to business service');
    return this.business.deleteTopic(topicId);
  }

  // === SUBTOPIC OPERATIONS ===

  createSubTopic(subTopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseCrudService] FACADE: Delegating createSubTopic to business service');
    return this.business.createSubTopic(subTopic);
  }

  updateSubTopic(subTopic: SubTopic): Observable<SubTopic> {
    console.log('[CourseCrudService] FACADE: Delegating updateSubTopic to business service');
    return this.business.updateSubTopic(subTopic);
  }

  deleteSubTopic(subTopicId: number): Observable<void> {
    console.log('[CourseCrudService] FACADE: Delegating deleteSubTopic to business service');
    return this.business.deleteSubTopic(subTopicId);
  }

  // === LESSON OPERATIONS ===


  createLessonWithEvents(lessonDetail: LessonDetail): void {
    console.log('[CourseCrudService] FACADE: Delegating createLessonWithEvents to coordination service');
    this.coordination.createLessonWithEvents(lessonDetail);
  }

  updateLessonWithEvents(lessonDetail: LessonDetail): void {
    console.log('[CourseCrudService] FACADE: Delegating updateLessonWithEvents to coordination service');
    this.coordination.updateLessonWithEvents(lessonDetail);
  }

  deleteLesson(lessonId: number): Observable<void> {
    console.log('[CourseCrudService] FACADE: Delegating deleteLesson to business service');
    return this.business.deleteLesson(lessonId);
  }

  // === CLEANUP - Delegate to Coordination Service ===

  ngOnDestroy(): void {
    console.log('[CourseCrudService] FACADE: Delegating cleanup to coordination service');
    // Only coordination service has subscriptions to clean up
    this.coordination.ngOnDestroy();
  }
}
