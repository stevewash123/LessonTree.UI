// calendar-aware-api.service.ts
// RESPONSIBILITY: Wrapper around ApiService that automatically adds calendar context for optimization
// DOES: Provides optimized API methods that include calendar date ranges when available
// CALLED BY: NodeOperationsService and other services that need calendar-optimized operations

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CalendarContextService, CalendarOptimizationPayload } from '../../calendar/services/integration/calendar-context.service';
import { environment } from '../../../environments/environment';

// ✅ EXTENDED INTERFACES: Add calendar optimization to existing payloads
interface LessonMoveOptimizedResource {
  lessonId: number;
  newSubTopicId?: number | null;
  newTopicId?: number | null;
  afterSiblingId?: number | null;
  // Calendar optimization fields
  calendarStartDate?: string;
  calendarEndDate?: string;
  requestPartialScheduleUpdate?: boolean;
}

interface LessonCreateOptimizedResource {
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
  // Calendar optimization fields
  calendarStartDate?: string;
  calendarEndDate?: string;
  requestPartialScheduleUpdate?: boolean;
}

interface LessonDeleteOptimizedRequest {
  lessonId: number;
  // Calendar optimization fields
  calendarStartDate?: string;
  calendarEndDate?: string;
  requestPartialScheduleUpdate?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarAwareApiService {

  private apiService = inject(ApiService);
  private calendarContext = inject(CalendarContextService);
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  constructor() {
    console.log('[CalendarAwareApiService] Calendar-aware API wrapper initialized');
  }

  // ===== LESSON OPERATIONS WITH CALENDAR OPTIMIZATION =====

  /**
   * ✅ OPTIMIZED: Move lesson with automatic calendar context
   * Falls back to regular move if no calendar context available
   */
  moveLessonOptimized(
    lessonId: number,
    targetSubTopicId?: number,
    targetTopicId?: number,
    afterSiblingId?: number
  ): Observable<any> {
    console.log('[CalendarAwareApiService] 🚚 Moving lesson with calendar optimization:', {
      lessonId,
      targetSubTopicId,
      targetTopicId,
      afterSiblingId,
      canOptimize: this.calendarContext.canOptimize()
    });

    // Get calendar optimization payload
    const calendarPayload = this.calendarContext.getOptimizationPayload('week');

    if (calendarPayload) {
      // Use optimized endpoint with calendar context
      const optimizedResource: LessonMoveOptimizedResource = {
        lessonId,
        newSubTopicId: targetSubTopicId || null,
        newTopicId: targetTopicId || null,
        afterSiblingId: afterSiblingId || null,
        calendarStartDate: calendarPayload.calendarStartDate,
        calendarEndDate: calendarPayload.calendarEndDate,
        requestPartialScheduleUpdate: calendarPayload.requestPartialScheduleUpdate
      };

      console.log('[CalendarAwareApiService] ✅ Using move-optimized endpoint with calendar context');
      return this.http.post<any>(`${this.baseUrl}/api/lesson/move-optimized`, optimizedResource);
    } else {
      // Fallback to regular move endpoint
      console.log('[CalendarAwareApiService] ⚠️ No calendar context, using regular move endpoint');
      return this.apiService.moveLesson(
        lessonId,
        targetSubTopicId,
        targetTopicId,
        afterSiblingId,
        undefined, // position
        undefined  // relativeToType
      );
    }
  }

  /**
   * ✅ OPTIMIZED: Create lesson with automatic calendar context
   * Falls back to regular creation if no calendar context available
   */
  createLessonOptimized(lessonData: any): Observable<any> {
    console.log('[CalendarAwareApiService] ➕ Creating lesson with calendar optimization:', {
      title: lessonData.title,
      canOptimize: this.calendarContext.canOptimize()
    });

    // Get calendar optimization payload
    const calendarPayload = this.calendarContext.getOptimizationPayload('week');

    if (calendarPayload) {
      // Use optimized endpoint with calendar context
      const optimizedResource: LessonCreateOptimizedResource = {
        ...lessonData,
        calendarStartDate: calendarPayload.calendarStartDate,
        calendarEndDate: calendarPayload.calendarEndDate,
        requestPartialScheduleUpdate: calendarPayload.requestPartialScheduleUpdate
      };

      console.log('[CalendarAwareApiService] ✅ Using create-optimized endpoint with calendar context');
      return this.http.post<any>(`${this.baseUrl}/api/lesson/create-optimized`, optimizedResource);
    } else {
      // Fallback to regular creation endpoint
      console.log('[CalendarAwareApiService] ⚠️ No calendar context, using regular create endpoint');
      return this.http.post<any>(`${this.baseUrl}/api/lesson`, lessonData);
    }
  }

  /**
   * ✅ OPTIMIZED: Delete lesson with automatic calendar context
   * Falls back to regular deletion if no calendar context available
   */
  deleteLessonOptimized(lessonId: number): Observable<any> {
    console.log('[CalendarAwareApiService] ❌ Deleting lesson with calendar optimization:', {
      lessonId,
      canOptimize: this.calendarContext.canOptimize()
    });

    // Get calendar optimization payload
    const calendarPayload = this.calendarContext.getOptimizationPayload('week');

    if (calendarPayload) {
      // Use optimized endpoint with calendar context
      const optimizedRequest: LessonDeleteOptimizedRequest = {
        lessonId,
        calendarStartDate: calendarPayload.calendarStartDate,
        calendarEndDate: calendarPayload.calendarEndDate,
        requestPartialScheduleUpdate: calendarPayload.requestPartialScheduleUpdate
      };

      console.log('[CalendarAwareApiService] ✅ Using delete-optimized endpoint with calendar context');
      // Use HTTP client directly for DELETE with body
      return this.http.request<any>('DELETE', `${this.baseUrl}/api/lesson/delete-optimized`, { body: optimizedRequest });
    } else {
      // Fallback to regular deletion endpoint
      console.log('[CalendarAwareApiService] ⚠️ No calendar context, using regular delete endpoint');
      return this.http.delete<any>(`${this.baseUrl}/api/lesson/${lessonId}`);
    }
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Check if calendar optimization is currently available
   */
  isOptimizationAvailable(): boolean {
    return this.calendarContext.canOptimize();
  }

  /**
   * Get current calendar context for debugging
   */
  getCurrentCalendarContext(): any {
    return this.calendarContext.getDebugInfo();
  }

  /**
   * Force refresh of calendar context
   */
  refreshCalendarContext(): void {
    this.calendarContext.refreshContext();
  }

  // ===== PASSTHROUGH METHODS (Non-optimized operations) =====

  /**
   * Regular API operations that don't need calendar optimization
   * These pass through directly to ApiService
   */

  // Getters - no optimization needed
  getLesson(id: number): Observable<any> {
    return this.apiService.get<any>(`/api/lesson/${id}`);
  }

  getLessons(): Observable<any> {
    return this.apiService.get<any>('/api/lesson');
  }

  // Updates - could be optimized in the future
  updateLesson(lessonData: any): Observable<any> {
    // TODO: Could add calendar optimization for lesson updates
    return this.apiService.put<any>(`/api/lesson/${lessonData.id}`, lessonData);
  }

  // Course operations - no optimization needed currently
  getCourses(): Observable<any> {
    return this.apiService.getCourses('active', null);
  }

  createCourse(courseData: any): Observable<any> {
    return this.apiService.createCourse(courseData);
  }

  // Topic operations
  moveTopicOptimized(
    topicId: number,
    targetCourseId: number,
    afterSiblingId?: number
  ): Observable<any> {
    // TODO: Implement optimized topic move
    return this.apiService.moveTopic(
      topicId,
      targetCourseId,
      afterSiblingId,
      undefined, // position
      undefined  // relativeToType
    );
  }

  // SubTopic operations
  moveSubTopicOptimized(
    subTopicId: number,
    targetTopicId: number,
    afterSiblingId?: number
  ): Observable<any> {
    // TODO: Implement optimized subtopic move
    return this.apiService.moveSubTopic(
      subTopicId,
      targetTopicId,
      afterSiblingId,
      undefined, // position
      undefined  // relativeToType
    );
  }

  // ===== DEBUG METHODS =====

  /**
   * Test calendar-aware API functionality
   */
  testCalendarIntegration(): void {
    console.log('[CalendarAwareApiService] 🧪 === CALENDAR INTEGRATION TEST ===');
    console.log('Calendar Context:', this.getCurrentCalendarContext());
    console.log('Optimization Available:', this.isOptimizationAvailable());
    console.log('Optimization Payload:', this.calendarContext.getOptimizationPayload('week'));
    console.log('[CalendarAwareApiService] 🧪 === END TEST ===');
  }
}