// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { Topic } from '../../models/topic'; // Import interfaces
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl + '/api';

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`).pipe(
      map(response => {
        let data = response;
        if (response && typeof response === 'object' && '$values' in response) {
          data = (response as any).$values;
        }
        const transformedData = this.transformKeysToCamelCaseAndEnsureArrays(data);
        return transformedData as T;
      }),
      catchError(error => {
        this.handleError(error);
        return of((Array.isArray([]) ? [] : {}) as T);
      })
    );
  }

  // Determine endpoint by type T using type guards
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

  private isTopic(entity: any): entity is Topic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && typeof entity.description === 'string' && 
           Array.isArray(entity.subTopics);
  }

  private isSubTopic(entity: any): entity is SubTopic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && (entity.description === undefined || typeof entity.description === 'string') && 
           Array.isArray(entity.lessons);
  }

  private isLesson(entity: any): entity is Lesson {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && typeof entity.content === 'string' && 
           typeof entity.subTopicId === 'number' && Array.isArray(entity.documents);
  }

  put<T>(entity: T): Observable<T> {
    const endpoint = this.getEndpoint(entity);
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, entity).pipe(
      catchError(error => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
      catchError(error => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`).pipe(
      catchError(error => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

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
        if (camelKey === 'subTopics' || camelKey === 'lessons' || camelKey === 'topics' || camelKey === 'documents') {
          value = Array.isArray(value) ? value : [];
        }

        acc[camelKey] = this.transformKeysToCamelCaseAndEnsureArrays(value);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  private handleError(error: any) {
    const message = error.error?.message || error.message || 'An unexpected error occurred';
    this.toastr.error(message, 'Error');
  }
}