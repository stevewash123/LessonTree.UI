// RESPONSIBILITY: Handles HTTP communication with the API, data transformation, and error handling with toasts.
// DOES NOT: Manage application state or business logic - delegates to services.
// CALLED BY: CourseCrudService and other services that need API communication.

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';
import { Course } from '../../models/course';
import { Attachment } from '../../models/attachment';
import { Note } from '../../models/note';
import { Standard } from '../../models/standard';

interface ApiOptions {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    params?: HttpParams | { [param: string]: string | string[] };
    suppressToast?: boolean;
    customErrorMessage?: string;
}

// Create payload interfaces that match the API expectations
interface CourseCreatePayload {
    title: string;
    description: string;
    visibility: string;
}

interface TopicCreatePayload {
    title: string;
    description: string;
    courseId: number;
    visibility: string;
    sortOrder: number;
}

interface LessonCreatePayload {
    title: string;
    subTopicId?: number | null;
    topicId?: number | null;
    visibility: string;
    level?: string | null;
    objective: string;
    materials?: string | null;
    classTime?: string | null;
    methods?: string | null;
    specialNeeds?: string | null;
    assessment?: string | null;
    sortOrder: number;
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
        console.error('ApiService: Error details', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            timestamp: new Date().toISOString()
        });
        return throwError(() => error);
    }

    /** Generic GET method with data transformation and error handling */
    get<T>(endpoint: string, options?: ApiOptions): Observable<T> {
        console.log('ApiService: GET', {
            url: `${this.baseUrl}/${endpoint}`,
            options,
            timestamp: new Date().toISOString()
        });
        return this.http.get<T>(`${this.baseUrl}/${endpoint}`, options).pipe(
            map(response => this.transformResponse<T>(response)),
            catchError(error => this.handleError(error, options))
        );
    }

    /** Generic DELETE method */
    delete<T>(endpoint: string, options?: ApiOptions): Observable<T> {
        console.log('ApiService: DELETE', {
            url: `${this.baseUrl}/${endpoint}`,
            options,
            timestamp: new Date().toISOString()
        });
        return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, options).pipe(
            catchError(error => this.handleError(error, options))
        );
    }

    /** Generic POST method */
    post<T>(endpoint: string, body: any, options?: ApiOptions): Observable<T> {
        console.log('ApiService: POST', {
            url: `${this.baseUrl}/${endpoint}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body, options).pipe(
            map(response => this.transformResponse<T>(response)),
            catchError(error => this.handleError(error, options))
        );
    }

    /** Generic PUT method */
    put<T>(endpoint: string, body: any, options?: ApiOptions): Observable<T> {
        console.log('ApiService: PUT', {
            url: `${this.baseUrl}/${endpoint}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, options).pipe(
            map(response => this.transformResponse<T>(response)),
            catchError(error => this.handleError(error, options))
        );
    }

    /** Fetch courses with filtering by archived status and visibility */
    getCourses(courseFilter: 'active' | 'archived' | 'both', visibilityFilter: 'private' | 'team' | null): Observable<Course[]> {
        let params = new HttpParams();

        // Filter by archived status
        if (courseFilter === 'active') {
            params = params.set('filter', 'Active');
        } else if (courseFilter === 'archived') {
            params = params.set('filter', 'Archived');
        } // 'both' means no filter parameter

        // Map visibility filter to API enum values
        if (visibilityFilter) {
            const visibilityMap: { [key: string]: number } = {
                'private': 0, // VisibilityType.Private
                'team': 1     // VisibilityType.Team
            };
            params = params.set('visibility', visibilityMap[visibilityFilter].toString());
        }

        const options: ApiOptions = { params };
        console.log('ApiService: Fetching courses', {
            url: `${this.baseUrl}/course`,
            params: params.toString(),
            timestamp: new Date().toISOString()
        });
        return this.get<Course[]>('course', options);
    }

    /** Create a new Course - accepts create payload */
    createCourse(coursePayload: CourseCreatePayload): Observable<Course> {
        console.log('ApiService: POST createCourse', {
            url: `${this.baseUrl}/course`,
            body: coursePayload,
            timestamp: new Date().toISOString()
        });

        // Send payload directly - no conversion needed
        return this.http.post<Course>(`${this.baseUrl}/course`, coursePayload).pipe(
            map(response => this.transformResponse<Course>(response)),
            catchError(error => this.handleError(error))
        );
    }

    moveLesson(
        lessonId: number,
        targetSubTopicId?: number,
        targetTopicId?: number,
        relativeToId?: number,
        position?: 'before' | 'after',
        relativeToType?: 'Lesson' | 'SubTopic'
      ): Observable<any> {
        const payload: any = {
          lessonId,
          newSubTopicId: targetSubTopicId,
          newTopicId: targetTopicId
        };

        // Add positioning parameters if provided
        if (relativeToId !== undefined) {
          payload.relativeToId = relativeToId;
          payload.position = position;
          payload.relativeToType = relativeToType;
        }

        console.log('[ApiService] Moving lesson:', payload);
        return this.post('Lesson/move', payload);
      }

      // REMOVE this method (if it exists):
      /*
      updateLessonSortOrder(lessonId: number, sortOrder: number): Observable<any> {
        // ... remove this entire method
      }

    /** Move a subtopic to a new topic */
    moveSubTopic(subTopicId: number, newTopicId: number): Observable<any> {
        const body = { subTopicId, newTopicId };
        console.log('ApiService: POST moveSubTopic', {
            url: `${this.baseUrl}/subtopic/move`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.post<any>(`${this.baseUrl}/subtopic/move`, body).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Move a topic to a new course */
    moveTopic(topicId: number, newCourseId: number): Observable<any> {
        const body = { topicId, newCourseId };
        console.log('ApiService: POST moveTopic', {
            url: `${this.baseUrl}/topic/move`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.post<any>(`${this.baseUrl}/topic/move`, body).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Upload an attachment for a lesson */
    uploadAttachment(lessonId: number, file: File): Observable<Attachment> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        const url = `${this.baseUrl}/lesson/${lessonId}/attachments`;
        console.log('ApiService: POST uploadAttachment', {
            url,
            fileName: file.name,
            timestamp: new Date().toISOString()
        });
        return this.http.post<Attachment>(url, formData).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Create a new user */
    createUser(user: { username: string; password: string }): Observable<any> {
        console.log('ApiService: POST createUser', {
            url: `${this.baseUrl}/account/register`,
            body: user,
            timestamp: new Date().toISOString()
        });
        return this.http.post<any>(`${this.baseUrl}/account/register`, user).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Create a new Note */
    createNote(note: Partial<Note>): Observable<Note> {
        const body = {
            content: note.content,
            visibility: note.visibility,
            teamId: note.teamId,
            courseId: note.courseId,
            topicId: note.topicId,
            subTopicId: note.subTopicId,
            lessonId: note.lessonId
        };
        console.log('ApiService: POST createNote', {
            url: `${this.baseUrl}/note`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.post<Note>(`${this.baseUrl}/note`, body).pipe(
            map(response => this.transformResponse<Note>(response)),
            catchError(error => this.handleError(error))
        );
    }


    /** Delete a Note */
    deleteNote(id: number): Observable<void> {
        return this.delete<void>(`note/${id}`);
    }

    /** Fetch standards by course ID with optional district ID */
    getStandardsByCourse(courseId: number, districtId?: number): Observable<Standard[]> {
        let params = new HttpParams().set('courseId', courseId.toString());
        if (districtId !== undefined) {
            params = params.set('districtId', districtId.toString());
        }
        const options: ApiOptions = { params };
        return this.get<Standard[]>(`standard/course/${courseId}`, options);
    }

    // === NEW SECURE USER ENDPOINTS ===

  /** Get current user's profile */
  getCurrentUserProfile(): Observable<any> {
      console.log('ApiService: GET getCurrentUserProfile', {
        url: `${this.baseUrl}/user/profile`,
        timestamp: new Date().toISOString()
      });
      return this.get<any>('user/profile');
    }

  /** Update current user's profile */
  updateCurrentUserProfile(userData: any): Observable<any> {
    const body = {
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      district: userData.district
    };

    console.log('ApiService: PUT updateCurrentUserProfile', {
      url: `${this.baseUrl}/user/profile`,
      body,
      timestamp: new Date().toISOString()
    });

    return this.put<any>('user/profile', body);
  }

  /** Get current user's configuration */
  getCurrentUserConfiguration(): Observable<any> {
    console.log('ApiService: GET getCurrentUserConfiguration', {
      url: `${this.baseUrl}/user/configuration`,
      timestamp: new Date().toISOString()
    });
    return this.get<any>('user/configuration');
  }

  /** Update current user's configuration */
  updateCurrentUserConfiguration(configuration: any): Observable<any> {
    const body = {
      schoolYear: configuration.schoolYear,
      periodsPerDay: configuration.periodsPerDay,
      periodAssignments: configuration.periodAssignments,
      startDate: configuration.startDate,
      endDate: configuration.endDate
    };

    console.log('ApiService: PUT updateCurrentUserConfiguration', {
      url: `${this.baseUrl}/user/configuration`,
      body,
      timestamp: new Date().toISOString()
    });

    return this.put<any>('user/configuration', body);
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
                // Transform visibility from number to string
                if (camelKey === 'visibility' && typeof value === 'number') {
                    const visibilityMap: { [key: number]: string } = {
                        0: 'Private',
                        1: 'Team',
                        2: 'Public'
                    };
                    value = visibilityMap[value] || 'Private'; // Default to 'Private' if unknown
                }

                acc[camelKey] = this.transformKeysToCamelCaseAndEnsureArrays(value);
                return acc;
            }, {} as any);
        }
        return obj;
    }
}
