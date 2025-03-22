import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { Attachment } from '../../models/attachment';

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
  private handleError(error: any) {
    const message = error.error?.message || error.message || 'An unexpected error occurred';
    this.toastr.error(message, 'Error');
    return throwError(() => error);
  }

  /** Generic GET method with data transformation and error handling */
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`).pipe(
      map(response => this.transformResponse<T>(response)),
      catchError(error => {
        this.handleError(error);
        return of((Array.isArray([]) ? [] : {}) as T);
      })
    );
  }

  /** Generic PUT method with consistent base URL usage */
  put<T>(entity: T): Observable<T> {
    const endpoint = this.getEndpoint(entity);
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, entity).pipe(
      catchError(this.handleError)
    );
  }

  /** Generic POST method with consistent base URL usage */
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
      catchError(this.handleError)
    );
  }

  /** Generic DELETE method with consistent base URL usage */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Move a lesson to a new subtopic */
  moveLesson(lessonId: number, newSubTopicId: number): Observable<any> {
    return this.post<any>('Lesson/move', { lessonId, newSubTopicId });
  }

  /** Move a subtopic to a new topic */
  moveSubTopic(subTopicId: number, newTopicId: number): Observable<any> {
    return this.post<any>('SubTopic/move', { subTopicId, newTopicId });
  }

  /** Move a topic to a new course */
  moveTopic(topicId: number, newCourseId: number): Observable<any> {
    return this.post<any>('Topic/move', { topicId, newCourseId });
  }

  /** Upload an attachment for a lesson */
  uploadAttachment(lessonId: number, file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const url = `${this.baseUrl}/Lesson/${lessonId}/document`;
    return this.http.post<Attachment>(url, formData).pipe(
      catchError(this.handleError)
    );
  }

  /** Fetch topics by course ID with transformation and error handling */
  getTopicsByCourse(courseId: number): Observable<Topic[]> {
    const url = `${this.baseUrl}/topic/byCourse/${courseId}`;
    return this.http.get<Topic[]>(url).pipe(
      map(response => this.transformResponse<Topic[]>(response)),
      catchError(error => {
        this.handleError(error);
        return of([] as Topic[]);
      })
    );
  }

  /** Fetch subtopics by topic ID with transformation and error handling */
  getSubtopicsByTopic(topicId: number): Observable<SubTopic[]> {
    const url = `${this.baseUrl}/subtopic/byTopic/${topicId}`;
    return this.http.get<SubTopic[]>(url).pipe(
      map(response => this.transformResponse<SubTopic[]>(response)),
      catchError(error => {
        this.handleError(error);
        return of([] as SubTopic[]);
      })
    );
  }

  /** Fetch lessons by subtopic ID with transformation and error handling */
  getLessonsBySubtopic(subTopicId: number): Observable<Lesson[]> {
    const url = `${this.baseUrl}/lesson/bySubtopic/${subTopicId}`;
    return this.http.get<Lesson[]>(url).pipe(
      map(response => this.transformResponse<Lesson[]>(response)),
      catchError(error => {
        this.handleError(error);
        return of([] as Lesson[]);
      })
    );
  }

  /** Fetch lessons by topic ID with transformation and error handling */
  getLessonsByTopic(topicId: number): Observable<Lesson[]> {
    const url = `${this.baseUrl}/lesson/byTopic/${topicId}`;
    return this.http.get<Lesson[]>(url).pipe(
      map(response => this.transformResponse<Lesson[]>(response)),
      catchError(error => {
        this.handleError(error);
        return of([] as Lesson[]);
      })
    );
  }

  /** Determine the endpoint based on entity type */
  private getEndpoint<T>(entity: T): string {
    if (this.isTopic(entity)) {
      return `topic/${(entity as Topic).id}`;
    } else if (this.isSubTopic(entity)) {
      return `subTopic/${(entity as SubTopic).id}`;
    } else if (this.isLesson(entity)) {
      return `lesson/${(entity as Lesson).id}`;
    }
    throw new Error('Unsupported entity type');
  }

  /** Type guard for Topic */
  private isTopic(entity: any): entity is Topic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' &&
           typeof entity.title === 'string' && typeof entity.description === 'string' &&
           Array.isArray(entity.subTopics);
  }

  /** Type guard for SubTopic */
  private isSubTopic(entity: any): entity is SubTopic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' &&
           typeof entity.title === 'string' && (entity.description === undefined || typeof entity.description === 'string') &&
           Array.isArray(entity.lessons);
  }

  /** Type guard for Lesson */
  private isLesson(entity: any): entity is Lesson {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' &&
           typeof entity.title === 'string' && typeof entity.content === 'string' &&
           typeof entity.subTopicId === 'number' && Array.isArray(entity.attachments);
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