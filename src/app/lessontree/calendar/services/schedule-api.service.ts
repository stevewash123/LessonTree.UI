// **COMPLETE FILE** - schedule-api.service.ts
// RESPONSIBILITY: Handles HTTP API operations for schedules and schedule events (CRUD operations).
// DOES NOT: Manage state, transform data, or handle UI logic - pure API service.
// CALLED BY: ScheduleStateService and ScheduleEventService for persistence operations.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
    Schedule, 
    ScheduleCreateResource
} from '../../../models/schedule';
import { environment } from '../../../../environments/environment';
import { ScheduleEventCreateResource, ScheduleEvent, ScheduleEventUpdateResource, ScheduleEventsUpdateResource } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleApiService {
  private apiUrl: string = environment.apiUrl + '/api';

  constructor(private http: HttpClient) {
    console.log('[ScheduleApiService] Initialized for Schedule and ScheduleEvent API operations');
  }

  // === SCHEDULE OPERATIONS (Generated Events) ===

  getActiveSchedule(): Observable<Schedule | null> {
    console.log('[ScheduleApiService] Fetching active schedule for current user');
    
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
    console.log('[ScheduleApiService] Creating schedule', { 
      title: scheduleCreate.title,
      timestamp: new Date().toISOString() 
    });
    
    return this.http.post<Schedule>(`${this.apiUrl}/Schedule`, scheduleCreate).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((newSchedule) => console.log(`[ScheduleApiService] Created schedule ID ${newSchedule.id}`)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to create schedule: ${error.message}`);
        throw error;
      })
    );
  }

  updateScheduleEvents(scheduleId: number, scheduleEvents: ScheduleEvent[]): Observable<Schedule> {
    console.log(`[ScheduleApiService] Updating schedule events for ID ${scheduleId}`, { 
      eventCount: scheduleEvents.length,
      timestamp: new Date().toISOString() 
    });
    
    return this.http.put<Schedule>(`${this.apiUrl}/Schedule/${scheduleId}/events`, scheduleEvents).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((updatedSchedule) => console.log(`[ScheduleApiService] Updated schedule events ID ${updatedSchedule.id}`)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to update schedule events: ${error.message}`);
        throw error;
      })
    );
  }

  deleteSchedule(scheduleId: number): Observable<void> {
    console.log(`[ScheduleApiService] Deleting schedule ID ${scheduleId}`);
    
    return this.http.delete<void>(`${this.apiUrl}/Schedule`).pipe(
      tap(() => console.log(`[ScheduleApiService] Deleted active schedule`)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to delete schedule: ${error.message}`);
        throw error;
      })
    );
  }

  getSchedule(scheduleId: number): Observable<Schedule> {
    console.log(`[ScheduleApiService] Fetching schedule ID ${scheduleId}`, { timestamp: new Date().toISOString() });
    return this.http.get<Schedule>(`${this.apiUrl}/Schedule/${scheduleId}`).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((schedule) => console.log(`[ScheduleApiService] Fetched schedule ID ${scheduleId}`, { 
        title: schedule.title,
        eventCount: schedule.scheduleEvents?.length || 0,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to fetch schedule ID ${scheduleId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  // === SPECIAL DAY OPERATIONS ===

  getSpecialDays(scheduleId: number): Observable<any[]> {
    console.log(`[ScheduleApiService] Fetching special days for schedule ID ${scheduleId}`);
    return this.http.get<any[]>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays`).pipe(
      map(response => this.transformResponse<any[]>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to fetch special days: ${error.message}`);
        throw error;
      })
    );
  }

  createSpecialDay(scheduleId: number, specialDay: any): Observable<any> {
    console.log(`[ScheduleApiService] Creating special day for schedule ID ${scheduleId}`);
    return this.http.post<any>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays`, specialDay).pipe(
      map(response => this.transformResponse<any>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to create special day: ${error.message}`);
        throw error;
      })
    );
  }

  updateSpecialDay(scheduleId: number, specialDayId: number, specialDay: any): Observable<any> {
    console.log(`[ScheduleApiService] Updating special day ID ${specialDayId} for schedule ID ${scheduleId}`);
    return this.http.put<any>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays/${specialDayId}`, specialDay).pipe(
      map(response => this.transformResponse<any>(response)),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to update special day: ${error.message}`);
        throw error;
      })
    );
  }

  deleteSpecialDay(scheduleId: number, specialDayId: number): Observable<void> {
    console.log(`[ScheduleApiService] Deleting special day ID ${specialDayId} for schedule ID ${scheduleId}`);
    return this.http.delete<void>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays/${specialDayId}`).pipe(
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to delete special day: ${error.message}`);
        throw error;
      })
    );
  }

  // === SCHEDULE EVENT CRUD OPERATIONS ===

  addScheduleEvent(scheduleEvent: ScheduleEventCreateResource): Observable<ScheduleEvent> {
    console.log(`[ScheduleApiService] Adding schedule event for schedule ID ${scheduleEvent.scheduleId}`, { 
      date: scheduleEvent.date,
      period: scheduleEvent.period,
      lessonId: scheduleEvent.lessonId,
      eventType: scheduleEvent.eventType,
      timestamp: new Date().toISOString() 
    });
    return this.http.post<ScheduleEvent>(`${this.apiUrl}/ScheduleEvent`, scheduleEvent).pipe(
      map(response => this.transformResponse<ScheduleEvent>(response)),
      tap((newEvent) => console.log(`[ScheduleApiService] Added schedule event ID ${newEvent.id}`, {
        period: newEvent.period,
        lessonId: newEvent.lessonId,
        eventType: newEvent.eventType,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to add schedule event: ${error.message}`);
        throw error;
      })
    );
  }
  
  updateScheduleEvent(scheduleEvent: ScheduleEventUpdateResource): Observable<ScheduleEvent> {
    console.log(`[ScheduleApiService] Updating schedule event ID ${scheduleEvent.id}`, { 
      period: scheduleEvent.period,
      lessonId: scheduleEvent.lessonId,
      eventType: scheduleEvent.eventType,
      timestamp: new Date().toISOString() 
    });
    return this.http.put<ScheduleEvent>(`${this.apiUrl}/ScheduleEvent/${scheduleEvent.id}`, scheduleEvent).pipe(
      map(response => this.transformResponse<ScheduleEvent>(response)),
      tap((updatedEvent) => console.log(`[ScheduleApiService] Updated schedule event ID ${updatedEvent.id}`, {
        period: updatedEvent.period,
        timestamp: new Date().toISOString() 
      })),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to update schedule event: ${error.message}`);
        throw error;
      })
    );
  }

  deleteScheduleEvent(scheduleEventId: number): Observable<void> {
    console.log(`[ScheduleApiService] Deleting schedule event ID ${scheduleEventId}`, { timestamp: new Date().toISOString() });
    return this.http.delete<void>(`${this.apiUrl}/ScheduleEvent/${scheduleEventId}`).pipe(
      tap(() => console.log(`[ScheduleApiService] Deleted schedule event ID ${scheduleEventId}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[ScheduleApiService] Failed to delete schedule event ID ${scheduleEventId}: ${error.message}`, { timestamp: new Date().toISOString() });
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

  // === HELPER METHODS ===

  getDebugInfo(): any {
    return {
      apiUrl: this.apiUrl,
      endpointsAvailable: [
        'Schedule CRUD (Generated Events)',
        'ScheduleEvent CRUD', 
        'Special Day Operations',
        'Bulk Event Operations'
      ]
    };
  }

  // === DEPRECATED METHODS - FOR BACKWARD COMPATIBILITY ===

//   /** @deprecated Use getActiveSchedule() instead */
//   getMasterScheduleForUser(): Observable<Schedule | null> {
//     console.warn('[ScheduleApiService] getMasterScheduleForUser is deprecated, use getActiveSchedule');
//     return this.getActiveSchedule();
//   }

//   /** @deprecated Use createSchedule() instead */
//   createMasterSchedule(scheduleCreate: ScheduleCreateResource): Observable<Schedule> {
//     console.warn('[ScheduleApiService] createMasterSchedule is deprecated, use createSchedule');
//     return this.createSchedule(scheduleCreate);
//   }

//   /** @deprecated Use updateScheduleEvents() instead */
//   updateMasterScheduleEvents(scheduleId: number, scheduleEvents: ScheduleEvent[]): Observable<Schedule> {
//     console.warn('[ScheduleApiService] updateMasterScheduleEvents is deprecated, use updateScheduleEvents');
//     return this.updateScheduleEvents(scheduleId, scheduleEvents);
//   }

//   /** @deprecated Use deleteSchedule() instead */
//   deleteMasterSchedule(scheduleId: number): Observable<void> {
//     console.warn('[ScheduleApiService] deleteMasterSchedule is deprecated, use deleteSchedule');
//     return this.deleteSchedule(scheduleId);
//   }

//   /** @deprecated This method should not be used - use ScheduleConfigurationApiService instead */
//   updateScheduleConfig(config: Schedule): Observable<Schedule> {
//     console.error('[ScheduleApiService] updateScheduleConfig is deprecated - use ScheduleConfigurationApiService.updateConfiguration instead');
//     throw new Error('updateScheduleConfig is deprecated - use ScheduleConfigurationApiService.updateConfiguration instead');
//   }
}