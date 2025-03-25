import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { Course } from '../../models/course'; // Added Course import
import { Attachment } from '../../models/attachment';

interface ApiOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
  suppressToast?: boolean; // Allow suppressing toast notifications
  customErrorMessage?: string; // Custom error message for toasts
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl + '/api';

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  /** Transforms API response data, handling $values and converting keys to camelCase */
  private transformResponse<T>(response: any): T {
    let data = response;
    if (response && typeof response === 'object' && '$values' in response) {
      data = (response as any).$values;
    }
    return this.transformKeysToCamelCaseAndEnsureArrays(data) as T;
  }

  /** Displays error messages via ToastrService and re-throws the error */
  private handleError(error: any, options?: ApiOptions) {
    const message = options?.customErrorMessage || error.error?.message || error.message || 'An unexpected error occurred';
    if (!options?.suppressToast) {
      this.toastr.error(message, 'Error');
    }
    console.error('ApiService: Error details:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error
    });
    return throwError(() => error);
  }

  /** Generic GET method with data transformation and error handling */
  get<T>(endpoint: string, options?: ApiOptions): Observable<T> {
    console.log(`ApiService: GET request to ${this.baseUrl}/${endpoint}`);
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, options).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => this.handleError(error, options))
    );
  }

  /** Generic PUT method with explicit endpoint */
  put<T>(endpoint: string, body: any, options?: ApiOptions): Observable<T> {
    console.log(`ApiService: PUT request to ${this.baseUrl}/${endpoint}`, body);
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, options).pipe(
      catchError(error => this.handleError(error, options))
    );
  }

  /** Generic POST method */
  post<T>(endpoint: string, body: any, options?: ApiOptions): Observable<T> {
    console.log(`ApiService: POST request to ${this.baseUrl}/${endpoint}`, body);
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body, options).pipe(
      catchError(error => this.handleError(error, options))
    );
  }

  /** Generic DELETE method */
  delete<T>(endpoint: string, options?: ApiOptions): Observable<T> {
    console.log(`ApiService: DELETE request to ${this.baseUrl}/${endpoint}`);
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, options).pipe(
      catchError(error => this.handleError(error, options))
    );
  }

  /** Create a new Course */
  createCourse(course: Course): Observable<Course> {
    return this.post<Course>('course', course);
  }

  /** Create a new SubTopic */
  createSubTopic(subTopic: SubTopic): Observable<SubTopic> {
    return this.post<SubTopic>('subtopic', subTopic);
  }

  /** Create a new Lesson */
  createLesson(lesson: Lesson): Observable<Lesson> {
    return this.post<Lesson>('lesson', lesson);
  }

  /** Delete a Course */
  deleteCourse(courseId: number): Observable<void> {
    return this.delete<void>(`course/${courseId}`);
  }

  /** Delete a Topic */
  deleteTopic(topicId: number): Observable<void> {
    return this.delete<void>(`topic/${topicId}`);
  }

  /** Delete a SubTopic */
  deleteSubTopic(subTopicId: number): Observable<void> {
    return this.delete<void>(`subtopic/${subTopicId}`);
  }

  /** Delete a Lesson */
  deleteLesson(lessonId: number): Observable<void> {
    return this.delete<void>(`lesson/${lessonId}`);
  }

  /** Move a lesson to a new subtopic */
  moveLesson(lessonId: number, newSubTopicId: number): Observable<any> {
    return this.post<any>('lesson/move', { lessonId, newSubTopicId });
  }

  /** Move a subtopic to a new topic */
  moveSubTopic(subTopicId: number, newTopicId: number): Observable<any> {
    return this.post<any>('subtopic/move', { subTopicId, newTopicId });
  }

  /** Move a topic to a new course */
  moveTopic(topicId: number, newCourseId: number): Observable<any> {
    return this.post<any>('topic/move', { topicId, newCourseId });
  }

  /** Upload an attachment for a lesson */
  uploadAttachment(lessonId: number, file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const url = `${this.baseUrl}/lesson/${lessonId}/document`;
    console.log(`ApiService: Uploading attachment to ${url}`);
    return this.http.post<Attachment>(url, formData).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /** Fetch topics by course ID with transformation and error handling */
  getTopicsByCourse(courseId: number): Observable<Topic[]> {
    const url = `topic/byCourse/${courseId}`;
    return this.get<Topic[]>(url);
  }

  /** Fetch subtopics by topic ID with transformation and error handling */
  getSubtopicsByTopic(topicId: number): Observable<SubTopic[]> {
    const url = `subtopic/byTopic/${topicId}`;
    return this.get<SubTopic[]>(url);
  }

  /** Fetch lessons by subtopic ID with transformation and error handling */
  getLessonsBySubtopic(subTopicId: number): Observable<Lesson[]> {
    const url = `lesson/bySubtopic/${subTopicId}`;
    return this.get<Lesson[]>(url);
  }

  /** Fetch lessons by topic ID with transformation and error handling */
  getLessonsByTopic(topicId: number): Observable<Lesson[]> {
    const url = `lesson/byTopic/${topicId}`;
    return this.get<Lesson[]>(url);
  }

  /** Transform keys to camelCase and ensure specific fields are arrays */
  private transformKeysToCamelCaseAndEnsureArrays(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformKeysToCamelCaseAndEnsureArrays(item));
    }
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
        let value = obj[key];

        if (value && typeof value === 'object' && '$values' in value) {
          value = value.$values || [];
        }
        if (camelKey === 'subTopics' || camelKey === 'lessons' || camelKey === 'topics' || camelKey === 'attachments') {
          value = Array.isArray(value) ? value : [];
        }

        acc[camelKey] = this.transformKeysToCamelCaseAndEnsureArrays(value);
        return acc;
      }, {} as any);
    }
    return obj;
  }
}