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

    /** Maps visibility string to its corresponding VisibilityType enum integer value */
    private mapVisibilityToEnum(visibility: string | undefined): number {
        const visibilityMap: { [key: string]: number } = {
            'Private': 0, // VisibilityType.Private
            'Team': 1,    // VisibilityType.Team
            'Public': 2   // VisibilityType.Public
        };
        return visibility ? visibilityMap[visibility] ?? 0 : 0; // Default to Private (0) if undefined or invalid
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
    
    /** Create a new Course */
    createCourse(course: Course): Observable<Course> {
        console.log('ApiService: POST createCourse', {
            url: `${this.baseUrl}/course`,
            body: course,
            timestamp: new Date().toISOString()
        });
        return this.http.post<Course>(`${this.baseUrl}/course`, course).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Update a Course (immediate properties only) */
    updateCourse(course: Partial<Course>): Observable<Course> {
        const body = {
            id: course.id,
            title: course.title,
            description: course.description,
            visibility: this.mapVisibilityToEnum(course.visibility)
        };
        console.log('ApiService: PUT updateCourse', {
            url: `${this.baseUrl}/course/${course.id}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.put<Course>(`${this.baseUrl}/course/${course.id}`, body).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Create a new Topic */
    createTopic(topic: Topic): Observable<Topic> {
        console.log('ApiService: POST createTopic', {
            url: `${this.baseUrl}/topic`,
            body: topic,
            timestamp: new Date().toISOString()
        });
        return this.http.post<Topic>(`${this.baseUrl}/topic`, topic).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Update a Topic (immediate properties only) */
    updateTopic(topic: Partial<Topic>): Observable<Topic> {
        const body = {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            visibility: this.mapVisibilityToEnum(topic.visibility)
        };
        console.log('ApiService: PUT updateTopic', {
            url: `${this.baseUrl}/topic/${topic.id}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.put<Topic>(`${this.baseUrl}/topic/${topic.id}`, body).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Create a new SubTopic */
    createSubTopic(subTopic: SubTopic): Observable<SubTopic> {
        console.log('ApiService: POST createSubTopic', {
            url: `${this.baseUrl}/subtopic`,
            body: subTopic,
            timestamp: new Date().toISOString()
        });
        return this.http.post<SubTopic>(`${this.baseUrl}/subtopic`, subTopic).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Update a SubTopic (immediate properties only) */
    updateSubTopic(subTopic: Partial<SubTopic>): Observable<SubTopic> {
        const body = {
            id: subTopic.id,
            title: subTopic.title,
            description: subTopic.description,
            visibility: this.mapVisibilityToEnum(subTopic.visibility)
        };
        console.log('ApiService: PUT updateSubTopic', {
            url: `${this.baseUrl}/subtopic/${subTopic.id}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.put<SubTopic>(`${this.baseUrl}/subtopic/${subTopic.id}`, body).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Create a new Lesson */
    createLesson(lesson: Lesson): Observable<Lesson> {
        console.log('ApiService: POST createLesson', {
            url: `${this.baseUrl}/lesson`,
            body: lesson,
            timestamp: new Date().toISOString()
        });
        return this.http.post<Lesson>(`${this.baseUrl}/lesson`, lesson).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /** Update a Lesson (immediate properties only) */
    updateLesson(lesson: Partial<LessonDetail>): Observable<LessonDetail> {
        const body = {
            id: lesson.id,
            title: lesson.title,
            visibility: this.mapVisibilityToEnum(lesson.visibility),
            teamId: lesson.teamId,
            level: lesson.level,
            objective: lesson.objective,
            materials: lesson.materials,
            classTime: lesson.classTime,
            methods: lesson.methods,
            specialNeeds: lesson.specialNeeds,
            assessment: lesson.assessment
        };
        console.log('ApiService: PUT updateLesson', {
            url: `${this.baseUrl}/lesson/${lesson.id}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.put<LessonDetail>(`${this.baseUrl}/lesson/${lesson.id}`, body).pipe(
            catchError(error => this.handleError(error))
        );
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

    /** Move a lesson to a new subtopic or topic */
    moveLesson(lessonId: number, newSubTopicId?: number, newTopicId?: number): Observable<any> {
        const body = { lessonId, newSubTopicId, newTopicId };
        console.log('ApiService: POST moveLesson', {
            url: `${this.baseUrl}/lesson/move`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.post<any>(`${this.baseUrl}/lesson/move`, body).pipe(
            catchError(error => this.handleError(error))
        );
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

    /** Create a new Note */
    createNote(note: Partial<Note>): Observable<Note> {
        const body = {
            content: note.content,
            visibility: this.mapVisibilityToEnum(note.visibility),
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

    /** Update an existing Note */
    updateNote(note: Partial<Note>): Observable<Note> {
        const body = {
            id: note.id,
            content: note.content,
            visibility: this.mapVisibilityToEnum(note.visibility),
            teamId: note.teamId,
            courseId: note.courseId,
            topicId: note.topicId,
            subTopicId: note.subTopicId,
            lessonId: note.lessonId
        };
        console.log('ApiService: PUT updateNote', {
            url: `${this.baseUrl}/note/${note.id}`,
            body,
            timestamp: new Date().toISOString()
        });
        return this.http.put<Note>(`${this.baseUrl}/note/${note.id}`, body).pipe(
            map(response => this.transformResponse<Note>(response)),
            catchError(error => this.handleError(error))
        );
    }

    /** Delete a Note */
    deleteNote(id: number): Observable<void> {
        return this.delete<void>(`note/${id}`);
    }

    getStandards(): Observable<Standard[]> {
        return this.get<Standard[]>('standard');
    }

    /** Fetch a standard by ID */
    getStandard(id: number): Observable<Standard> {
        return this.get<Standard>(`standard/${id}`);
    }

    /** Create a new Standard */
    createStandard(standard: Partial<Standard>): Observable<Standard> {
        const body = {
            title: standard.title,
            courseId: standard.courseId,
            topicId: standard.topicId,
            description: standard.description,
            standardType: standard.standardType
        };
        return this.post<Standard>('standard', body);
    }

    /** Update a Standard */
    updateStandard(standard: Partial<Standard>): Observable<void> {
        const body = {
            id: standard.id,
            title: standard.title,
            courseId: standard.courseId,
            topicId: standard.topicId,
            description: standard.description,
            standardType: standard.standardType
        };
        return this.put<void>(`standard/${standard.id}`, body);
    }

    /** Delete a Standard */
    deleteStandard(id: number): Observable<void> {
        return this.delete<void>(`standard/${id}`);
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