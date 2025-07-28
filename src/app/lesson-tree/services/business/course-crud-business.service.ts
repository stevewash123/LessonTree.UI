// **COMPLETE FILE** - CourseCrudBusinessService - Pure HTTP Operations
// RESPONSIBILITY: Pure CRUD HTTP operations for all course entities (Course, Topic, SubTopic, Lesson)
// DOES NOT: Handle Observable events, user feedback, or cross-service coordination
// CALLED BY: CourseCrudCoordinationService and direct component usage for basic CRUD

import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { LessonDetail } from '../../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseCrudBusinessService {

  constructor(
    private apiService: ApiService,
    private courseDataService: CourseDataService
  ) {
    console.log('[CourseCrudBusinessService] Initialized - Pure HTTP operations only');
  }

  // === COURSE OPERATIONS ===

  loadCourses(): Observable<Course[]> {
    console.log('[CourseCrudBusinessService] Loading courses');

    return this.apiService.get<Course[]>('Course').pipe(
      tap((courses: Course[]) => {
        console.log(`[CourseCrudBusinessService] Loaded ${courses.length} courses`);
        this.courseDataService.setCourses(courses);
      }),
      catchError((error) => {
        console.error('[CourseCrudBusinessService] Error loading courses', error);
        return throwError(() => error);
      })
    );
  }

  createCourse(course: Course): Observable<Course> {
    console.log(`[CourseCrudBusinessService] Creating course: ${course.title}`);

    return this.apiService.post<Course>('Course', course).pipe(
      tap((createdCourse: Course) => {
        console.log(`[CourseCrudBusinessService] Course created: ${createdCourse.title} (ID: ${createdCourse.id})`);

        // ✅ FIXED: Convert API response to proper class instance
        const courseInstance = new Course(createdCourse);
        this.courseDataService.addEntity(courseInstance, 'infopanel', 'USER_ADD');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error creating course: ${course.title}`, error);
        return throwError(() => error);
      })
    );
  }

  updateCourse(course: Course): Observable<Course> {
    console.log(`[CourseCrudBusinessService] Updating course: ${course.title}`);

    return this.apiService.put<Course>(`Course/${course.id}`, course).pipe(
      tap((updatedCourse: Course) => {
        console.log(`[CourseCrudBusinessService] Course updated: ${updatedCourse.title}`);

        // ✅ FIXED: Convert API response to proper class instance
        const courseInstance = new Course(updatedCourse);
        this.courseDataService.updateEntity(courseInstance, 'infopanel');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error updating course: ${course.title}`, error);
        return throwError(() => error);
      })
    );
  }

  deleteCourse(courseId: number): Observable<void> {
    console.log(`[CourseCrudBusinessService] Deleting course ID: ${courseId}`);

    return this.apiService.delete<void>(`Course/${courseId}`).pipe(
      tap(() => {
        console.log(`[CourseCrudBusinessService] Course deleted: ID ${courseId}`);
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error deleting course ID: ${courseId}`, error);
        return throwError(() => error);
      })
    );
  }

  getCourseById(courseId: number): Observable<Course> {
    console.log(`[CourseCrudBusinessService] Fetching course ID: ${courseId}`);

    return this.apiService.get<Course>(`Course/${courseId}`).pipe(
      tap((course: Course) => {
        console.log(`[CourseCrudBusinessService] Course fetched: ${course.title} (ID: ${course.id})`);
        // Note: getCourseById doesn't add to data service, it just fetches
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error fetching course ID: ${courseId}`, error);
        return throwError(() => error);
      })
    );
  }

  // === TOPIC OPERATIONS ===

  createTopic(topic: Topic): Observable<Topic> {
    console.log(`[CourseCrudBusinessService] Creating topic: ${topic.title}`);

    return this.apiService.post<Topic>('Topic', topic).pipe(
      tap((createdTopic: Topic) => {
        console.log(`[CourseCrudBusinessService] Topic created: ${createdTopic.title} (ID: ${createdTopic.id})`);

        // ✅ FIXED: Convert API response to proper class instance
        const topicInstance = new Topic(createdTopic);
        this.courseDataService.addEntity(topicInstance, 'infopanel', 'USER_ADD');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error creating topic: ${topic.title}`, error);
        return throwError(() => error);
      })
    );
  }

  updateTopic(topic: Topic): Observable<Topic> {
    console.log(`[CourseCrudBusinessService] Updating topic: ${topic.title}`);

    return this.apiService.put<Topic>(`Topic/${topic.id}`, topic).pipe(
      tap((updatedTopic: Topic) => {
        console.log(`[CourseCrudBusinessService] Topic updated: ${updatedTopic.title}`);

        // ✅ FIXED: Convert API response to proper class instance
        const topicInstance = new Topic(updatedTopic);
        this.courseDataService.updateEntity(topicInstance, 'infopanel');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error updating topic: ${topic.title}`, error);
        return throwError(() => error);
      })
    );
  }

  deleteTopic(topicId: number): Observable<void> {
    console.log(`[CourseCrudBusinessService] Deleting topic ID: ${topicId}`);

    return this.apiService.delete<void>(`Topic/${topicId}`).pipe(
      tap(() => {
        console.log(`[CourseCrudBusinessService] Topic deleted: ID ${topicId}`);
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error deleting topic ID: ${topicId}`, error);
        return throwError(() => error);
      })
    );
  }

  // === SUBTOPIC OPERATIONS ===

  createSubTopic(subTopic: SubTopic): Observable<SubTopic> {
    console.log(`[CourseCrudBusinessService] Creating subtopic: ${subTopic.title}`);

    return this.apiService.post<SubTopic>('SubTopic', subTopic).pipe(
      tap((createdSubTopic: SubTopic) => {
        console.log(`[CourseCrudBusinessService] SubTopic created: ${createdSubTopic.title} (ID: ${createdSubTopic.id})`);

        // ✅ FIXED: Convert API response to proper class instance
        const subTopicInstance = new SubTopic(createdSubTopic);
        this.courseDataService.addEntity(subTopicInstance, 'infopanel', 'USER_ADD');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error creating subtopic: ${subTopic.title}`, error);
        return throwError(() => error);
      })
    );
  }

  updateSubTopic(subTopic: SubTopic): Observable<SubTopic> {
    console.log(`[CourseCrudBusinessService] Updating subtopic: ${subTopic.title}`);

    return this.apiService.put<SubTopic>(`SubTopic/${subTopic.id}`, subTopic).pipe(
      tap((updatedSubTopic: SubTopic) => {
        console.log(`[CourseCrudBusinessService] SubTopic updated: ${updatedSubTopic.title}`);

        // ✅ FIXED: Convert API response to proper class instance
        const subTopicInstance = new SubTopic(updatedSubTopic);
        this.courseDataService.updateEntity(subTopicInstance, 'infopanel');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error updating subtopic: ${subTopic.title}`, error);
        return throwError(() => error);
      })
    );
  }

  deleteSubTopic(subTopicId: number): Observable<void> {
    console.log(`[CourseCrudBusinessService] Deleting subtopic ID: ${subTopicId}`);

    return this.apiService.delete<void>(`SubTopic/${subTopicId}`).pipe(
      tap(() => {
        console.log(`[CourseCrudBusinessService] SubTopic deleted: ID ${subTopicId}`);
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error deleting subtopic ID: ${subTopicId}`, error);
        return throwError(() => error);
      })
    );
  }

  // === LESSON OPERATIONS ===

  createLesson(lessonDetail: LessonDetail): Observable<LessonDetail> {
    console.log(`[CourseCrudBusinessService] Creating lesson: ${lessonDetail.title}`);

    return this.apiService.post<LessonDetail>('Lesson', lessonDetail).pipe(
      tap((createdLesson: LessonDetail) => {
        console.log(`[CourseCrudBusinessService] Lesson created: ${createdLesson.title} (ID: ${createdLesson.id})`);

        // ✅ FIXED: Convert API response to proper class instance
        const lessonInstance = new LessonDetail(createdLesson);
        this.courseDataService.addEntity(lessonInstance, 'infopanel', 'USER_ADD');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error creating lesson: ${lessonDetail.title}`, error);
        return throwError(() => error);
      })
    );
  }

  updateLesson(lessonDetail: LessonDetail): Observable<LessonDetail> {
    console.log(`[CourseCrudBusinessService] Updating lesson: ${lessonDetail.title}`);

    return this.apiService.put<LessonDetail>(`Lesson/${lessonDetail.id}`, lessonDetail).pipe(
      tap((updatedLesson: LessonDetail) => {
        console.log(`[CourseCrudBusinessService] Lesson updated: ${updatedLesson.title}`);

        // ✅ FIXED: Convert API response to proper class instance
        const lessonInstance = new LessonDetail(updatedLesson);
        this.courseDataService.updateEntity(lessonInstance, 'infopanel');
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error updating lesson: ${lessonDetail.title}`, error);
        return throwError(() => error);
      })
    );
  }

  deleteLesson(lessonId: number): Observable<void> {
    console.log(`[CourseCrudBusinessService] Deleting lesson ID: ${lessonId}`);

    return this.apiService.delete<void>(`Lesson/${lessonId}`).pipe(
      tap(() => {
        console.log(`[CourseCrudBusinessService] Lesson deleted: ID ${lessonId}`);
      }),
      catchError((error) => {
        console.error(`[CourseCrudBusinessService] Error deleting lesson ID: ${lessonId}`, error);
        return throwError(() => error);
      })
    );
  }
}
