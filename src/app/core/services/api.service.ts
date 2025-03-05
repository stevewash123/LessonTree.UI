import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl + '/api';

  constructor(private http: HttpClient, private toastr: ToastrService) { }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`).pipe(
      map(response => {
        let data = response;
        if (response && typeof response === 'object' && '$values' in response) {
          data = (response as any).$values;
        }

        // Transform PascalCase to camelCase recursively and ensure arrays
        const transformedData = this.transformKeysToCamelCaseAndEnsureArrays(data);
        return transformedData as T;
      }),
      catchError(error => {
        this.handleError(error);
        return of((Array.isArray([]) ? [] : {}) as T);
      })
    );
  }

  // Recursive function to transform PascalCase to camelCase and ensure arrays
  private transformKeysToCamelCaseAndEnsureArrays(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformKeysToCamelCaseAndEnsureArrays(item));
    }
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
        let value = obj[key];

        // Ensure nested arrays are unwrapped and always arrays
        if (value && typeof value === 'object' && '$values' in value) {
          value = value.$values || [];
        }
        // Ensure value is an array if it should be (based on context or model expectations)
        if (camelKey === 'subTopics' || camelKey === 'lessons' || camelKey === 'topics' || camelKey === 'documents') {
          value = Array.isArray(value) ? value : [];
        }

        acc[camelKey] = this.transformKeysToCamelCaseAndEnsureArrays(value);
        return acc;
      }, {} as any);
    }
    return obj; // Return primitives (string, number, etc.) unchanged
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
      catchError(error => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
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

  private handleError(error: any) {
    const message = error.error?.message || error.message || 'An unexpected error occurred';
    this.toastr.error(message, 'Error');
  }
}