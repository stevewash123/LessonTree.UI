// **COMPLETE FILE** - lesson-calendar.service.ts
// RESPONSIBILITY: Handles HTTP API operations for schedules and schedule events (CRUD operations).
// DOES NOT: Manage state, transform data, or handle UI logic - pure API service.
// CALLED BY: ScheduleStateService and ScheduleEventService for persistence operations.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
    Schedule, 
    ScheduleCreateResource,  
    ScheduleConfigUpdateResource
} from '../../../models/schedule';
import { environment } from '../../../../environments/environment';
import { ScheduleEventCreateResource, ScheduleEvent, ScheduleEventUpdateResource, ScheduleEventsUpdateResource } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleApiService {
  private apiUrl: string = environment.apiUrl + '/api';

  constructor(private http: HttpClient) {
    console.log('[LessonCalendarService] Initialized for ScheduleEvent API operations');
  }

  // === MASTER SCHEDULE OPERATIONS - UPDATED TO USE EXISTING ENDPOINTS ===

  getMasterScheduleForUser(): Observable<Schedule | null> {
    console.log('[LessonCalendarService] Fetching master schedule for current user');
    
    return this.http.get<Schedule>(`${this.apiUrl}/User/masterSchedule`).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      catchError((error) => {
        if (error.status === 404) {
          console.log('[LessonCalendarService] No master schedule found for current user');
          return of(null);
        }
        console.error(`[LessonCalendarService] Failed to fetch master schedule: ${error.message}`);
        throw error;
      })
    );
  }
  
  createMasterSchedule(scheduleCreate: ScheduleCreateResource): Observable<Schedule> {
    console.log('[LessonCalendarService] Creating master schedule', { 
      title: scheduleCreate.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.http.post<Schedule>(`${this.apiUrl}/User/masterSchedule`, scheduleCreate).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((newSchedule) => console.log(`[LessonCalendarService] Created master schedule ID ${newSchedule.id}`)),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to create master schedule: ${error.message}`);
        throw error;
      })
    );
  }

  updateMasterScheduleEvents(scheduleId: number, scheduleEvents: ScheduleEvent[]): Observable<Schedule> {
    console.log(`[LessonCalendarService] Updating master schedule events for ID ${scheduleId}`, { 
      eventCount: scheduleEvents.length,
      timestamp: new Date().toISOString() 
    });
    
    return this.http.put<Schedule>(`${this.apiUrl}/User/masterSchedule/${scheduleId}/events`, scheduleEvents).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((updatedSchedule) => console.log(`[LessonCalendarService] Updated master schedule events ID ${updatedSchedule.id}`)),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to update master schedule events: ${error.message}`);
        throw error;
      })
    );
  }

  deleteMasterSchedule(scheduleId: number): Observable<void> {
    console.log(`[LessonCalendarService] Deleting master schedule ID ${scheduleId}`);
    
    return this.http.delete<void>(`${this.apiUrl}/User/masterSchedule/${scheduleId}`).pipe(
      tap(() => console.log(`[LessonCalendarService] Deleted master schedule ID ${scheduleId}`)),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to delete master schedule: ${error.message}`);
        throw error;
      })
    );
  }

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

  // === SCHEDULE CRUD OPERATIONS (for non-master schedules) ===

  getSchedule(scheduleId: number): Observable<Schedule> {
    console.log(`[LessonCalendarService] Fetching schedule ID ${scheduleId}`, { timestamp: new Date().toISOString() });
    return this.http.get<Schedule>(`${this.apiUrl}/Schedule/${scheduleId}`).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((schedule) => console.log(`[LessonCalendarService] Fetched schedule ID ${scheduleId}`, { 
        title: schedule.title,
        eventCount: schedule.scheduleEvents?.length || 0,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to fetch schedule ID ${scheduleId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  createSchedule(schedule: Schedule): Observable<Schedule> {
    console.log(`[LessonCalendarService] Creating schedule`, {
      title: schedule.title,
      hasScheduleEvents: (schedule.scheduleEvents?.length || 0) > 0,
      timestamp: new Date().toISOString() 
    });
    return this.http.post<Schedule>(`${this.apiUrl}/Schedule`, schedule).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((newSchedule) => console.log(`[LessonCalendarService] Created schedule ID ${newSchedule.id}`, {
        title: newSchedule.title,
        eventCount: newSchedule.scheduleEvents?.length || 0
      })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to create schedule: ${error.message}`);
        throw error;
      })
    );
  }

  updateScheduleConfig(config: ScheduleConfigUpdateResource): Observable<Schedule> {
    console.log(`[LessonCalendarService] Updating schedule config ID ${config.id}`, { 
      isLocked: config.isLocked,
      timestamp: new Date().toISOString() 
    });
    return this.http.put<Schedule>(`${this.apiUrl}/Schedule/${config.id}/config`, config).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((updatedSchedule) => console.log(`[LessonCalendarService] Updated schedule config ID ${updatedSchedule.id}`, { 
        isLocked: updatedSchedule.isLocked,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to update schedule config ID ${config.id}: ${error.message}`);
        throw error;
      })
    );
  }

  // === SCHEDULE EVENT CRUD OPERATIONS ===

  addScheduleEvent(scheduleEvent: ScheduleEventCreateResource): Observable<ScheduleEvent> {
    console.log(`[LessonCalendarService] Adding schedule event for schedule ID ${scheduleEvent.scheduleId}`, { 
      date: scheduleEvent.date,
      period: scheduleEvent.period,
      lessonId: scheduleEvent.lessonId,
      eventType: scheduleEvent.eventType,
      timestamp: new Date().toISOString() 
    });
    return this.http.post<ScheduleEvent>(`${this.apiUrl}/ScheduleEvent`, scheduleEvent).pipe(
      map(response => this.transformResponse<ScheduleEvent>(response)),
      tap((newEvent) => console.log(`[LessonCalendarService] Added schedule event ID ${newEvent.id}`, {
        period: newEvent.period,
        lessonId: newEvent.lessonId,
        eventType: newEvent.eventType,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to add schedule event: ${error.message}`);
        throw error;
      })
    );
  }
  
  updateScheduleEvent(scheduleEvent: ScheduleEventUpdateResource): Observable<ScheduleEvent> {
    console.log(`[LessonCalendarService] Updating schedule event ID ${scheduleEvent.id}`, { 
      period: scheduleEvent.period,
      lessonId: scheduleEvent.lessonId,
      eventType: scheduleEvent.eventType,
      timestamp: new Date().toISOString() 
    });
    return this.http.put<ScheduleEvent>(`${this.apiUrl}/ScheduleEvent/${scheduleEvent.id}`, scheduleEvent).pipe(
      map(response => this.transformResponse<ScheduleEvent>(response)),
      tap((updatedEvent) => console.log(`[LessonCalendarService] Updated schedule event ID ${updatedEvent.id}`, {
        period: updatedEvent.period,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to update schedule event: ${error.message}`);
        throw error;
      })
    );
  }

  deleteScheduleEvent(scheduleEventId: number): Observable<void> {
    console.log(`[LessonCalendarService] Deleting schedule event ID ${scheduleEventId}`, { timestamp: new Date().toISOString() });
    return this.http.delete<void>(`${this.apiUrl}/ScheduleEvent/${scheduleEventId}`).pipe(
      tap(() => console.log(`[LessonCalendarService] Deleted schedule event ID ${scheduleEventId}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to delete schedule event ID ${scheduleEventId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  updateScheduleEvents(scheduleId: number, scheduleEvents: ScheduleEvent[]): Observable<Schedule> {
    console.log(`[LessonCalendarService] Updating schedule events for ID ${scheduleId}`, { 
      eventCount: scheduleEvents.length,
      timestamp: new Date().toISOString() 
    });
    
    const payload: ScheduleEventsUpdateResource = {
      scheduleId,
      scheduleEvents
    };
    
    return this.http.put<Schedule>(`${this.apiUrl}/Schedule/${scheduleId}/events`, payload).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((updatedSchedule) => console.log(`[LessonCalendarService] Updated schedule events ID ${updatedSchedule.id}`, {
        eventCount: updatedSchedule.scheduleEvents?.length || 0,
        timestamp: new Date().toISOString()
      })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to update schedule events: ${error.message}`);
        throw error;
      })
    );
  }

  // === HELPER METHODS ===

  getDebugInfo(): any {
    return {
      apiUrl: this.apiUrl,
      endpointsAvailable: [
        'Master Schedule CRUD (User endpoints)',
        'Schedule CRUD (General)',
        'ScheduleEvent CRUD', 
        'Schedule Config Updates',
        'Bulk Event Operations'
      ]
    };
  }

  // DEPRECATED - Use updateMasterScheduleEvents instead
  updateMasterSchedule(schedule: Schedule): Observable<Schedule> {
    console.warn('[LessonCalendarService] updateMasterSchedule is deprecated, use updateMasterScheduleEvents');
    return this.updateMasterScheduleEvents(schedule.id, schedule.scheduleEvents || []);
  }
}