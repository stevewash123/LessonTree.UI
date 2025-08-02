// **COMPLETE FILE** - ScheduleApiService - Pure HTTP Operations
// RESPONSIBILITY: HTTP API operations for schedules, schedule events, and special days
// SCOPE: Pure API calls and response transformation only (no Observable coordination)
// RATIONALE: API services should handle HTTP operations without event emission complexity

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  Schedule,
  ScheduleCreateResource
} from '../../../models/schedule';
import { environment } from '../../../../environments/environment';
import { ScheduleEventCreateResource, ScheduleEvent, ScheduleEventUpdateResource } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleApiService {
  private apiUrl: string = environment.apiUrl + '/api';

  constructor(private http: HttpClient) {
    console.log('[ScheduleApiService] Pure HTTP API service initialized');
  }

  // === SCHEDULE OPERATIONS ===

  getActiveSchedule(): Observable<Schedule | null> {
    console.log('[ScheduleApiService] Fetching active schedule');

    return this.http.get<Schedule>(`${this.apiUrl}/Schedule`).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      catchError((error) => {
        if (error.status === 404) {
          console.log('[ScheduleApiService] No active schedule found for current user');
          return of(null);
        }

        console.error(`[ScheduleApiService] Failed to fetch active schedule: ${error.message}`);
        throw error;
      })
    );
  }

  createSchedule(scheduleCreate: ScheduleCreateResource): Observable<Schedule> {
    console.log('[ScheduleApiService] Creating schedule');

    return this.http.post<Schedule>(`${this.apiUrl}/Schedule`, scheduleCreate).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to create schedule: ${error.message}`);
        throw error;
      })
    );
  }

  updateScheduleEvents(scheduleId: number, scheduleEvents: ScheduleEvent[]): Observable<Schedule> {
    console.log(`[ScheduleApiService] Updating ${scheduleEvents.length} schedule events`);

    return this.http.put<Schedule>(`${this.apiUrl}/Schedule/${scheduleId}/events`, scheduleEvents).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to update schedule events: ${error.message}`);
        throw error;
      })
    );
  }

  deleteSchedule(scheduleId: number): Observable<void> {
    console.log(`[ScheduleApiService] Deleting schedule ID: ${scheduleId}`);

    return this.http.delete<void>(`${this.apiUrl}/Schedule`).pipe(
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to delete schedule: ${error.message}`);
        throw error;
      })
    );
  }

  getSchedule(scheduleId: number): Observable<Schedule> {
    console.log(`[ScheduleApiService] Fetching schedule ID: ${scheduleId}`);

    return this.http.get<Schedule>(`${this.apiUrl}/Schedule/${scheduleId}`).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to fetch schedule ID ${scheduleId}: ${error.message}`);
        throw error;
      })
    );
  }

  // === SCHEDULE EVENT OPERATIONS ===

  updateScheduleEvent(scheduleEvent: ScheduleEventUpdateResource): Observable<ScheduleEvent> {
    console.log(`[ScheduleApiService] Updating schedule event ID: ${scheduleEvent.id}`);

    return this.http.put<ScheduleEvent>(`${this.apiUrl}/ScheduleEvent/${scheduleEvent.id}`, scheduleEvent).pipe(
      map(response => this.transformResponse<ScheduleEvent>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to update schedule event: ${error.message}`);
        throw error;
      })
    );
  }

  // === SPECIAL DAY OPERATIONS ===

  createSpecialDay(scheduleId: number, specialDay: any): Observable<any> {
    console.log(`[ScheduleApiService] Creating special day for schedule ID: ${scheduleId}`);

    return this.http.post<any>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays`, specialDay).pipe(
      map(response => this.transformResponse<any>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to create special day: ${error.message}`);
        throw error;
      })
    );
  }

  updateSpecialDay(scheduleId: number, specialDayId: number, specialDay: any): Observable<any> {
    console.log(`[ScheduleApiService] Updating special day ID: ${specialDayId}`);

    return this.http.put<any>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays/${specialDayId}`, specialDay).pipe(
      map(response => this.transformResponse<any>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to update special day: ${error.message}`);
        throw error;
      })
    );
  }

  deleteSpecialDay(scheduleId: number, specialDayId: number): Observable<void> {
    console.log(`[ScheduleApiService] Deleting special day ID: ${specialDayId}`);

    return this.http.delete<void>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays/${specialDayId}`).pipe(
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to delete special day: ${error.message}`);
        throw error;
      })
    );
  }

  getScheduleEventsByDateRange(startDate: Date, endDate: Date): Observable<ScheduleEvent[]> {
    console.log('[ScheduleApiService] Fetching schedule events by date range:', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.http.get<ScheduleEvent[]>(`${this.apiUrl}/Schedule/events`, {
      params: {
        startDate: startDateStr,
        endDate: endDateStr
      }
    }).pipe(
      map(response => this.transformResponse<ScheduleEvent[]>(response)),
      catchError((error) => {
        console.error('[ScheduleApiService] Failed to fetch schedule events by date range:', error.message);
        return of([]); // Return empty array on error
      })
    );
  }

  // === UTILITY METHODS ===

  /** Transforms API response data, handling $values and converting keys to camelCase */
  private transformResponse<T>(response: any): T {
    let data = response;
    if (response && typeof response === 'object' && '$values' in response) {
      data = (response as any).$values;
    }
    return this.transformKeysToCamelCaseAndEnsureArrays(data) as T;
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

        // Handle scheduleEvents array
        if (camelKey === 'scheduleEvents') {
          value = Array.isArray(value) ? value : [];
        }

        acc[camelKey] = this.transformKeysToCamelCaseAndEnsureArrays(value);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  // === DEBUG HELPER ===

  getDebugInfo(): any {
    return {
      apiUrl: this.apiUrl,
      endpointsAvailable: [
        'Schedule CRUD Operations',
        'ScheduleEvent Operations',
        'Special Day Operations'
      ],
      serviceType: 'Pure HTTP API'
    };
  }
}
