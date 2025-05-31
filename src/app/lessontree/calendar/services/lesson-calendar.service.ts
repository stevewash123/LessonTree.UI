// RESPONSIBILITY: Handles HTTP API operations for schedules and schedule days (CRUD operations).
// DOES NOT: Manage state, transform data, or handle UI logic - pure API service.
// CALLED BY: ScheduleStateService and ScheduleDayService for persistence operations.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Schedule, ScheduleConfigUpdateResource, ScheduleDay, ScheduleDaysUpdateResource } from '../../../models/schedule';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LessonCalendarService {
  private apiUrl: string = environment.apiUrl + '/api';

  constructor(private http: HttpClient) {}

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
        if (camelKey === 'scheduleDays') {
          value = Array.isArray(value) ? value : [];
        }

        acc[camelKey] = this.transformKeysToCamelCaseAndEnsureArrays(value);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  getSchedule(scheduleId: number): Observable<Schedule> {
    console.log(`[LessonCalendarService] Fetching schedule ID ${scheduleId}`, { timestamp: new Date().toISOString() });
    return this.http.get<Schedule>(`${this.apiUrl}/schedule/${scheduleId}`).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap(() => console.log(`[LessonCalendarService] Fetched schedule ID ${scheduleId}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to fetch schedule ID ${scheduleId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  getScheduleByCourse(courseId: number): Observable<Schedule | null> {
    console.log(`[LessonCalendarService] Fetching schedules for course ID ${courseId}`, { timestamp: new Date().toISOString() });
    return this.http.get<Schedule[]>(`${this.apiUrl}/schedule/course/${courseId}`).pipe(
      map(response => this.transformResponse<Schedule[]>(response)),
      tap((schedules) => console.log(`[LessonCalendarService] Fetched ${schedules.length} schedules for course ID ${courseId}`, { timestamp: new Date().toISOString() })),
      map((schedules: Schedule[]) => schedules.length > 0 ? schedules[0] : null),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to fetch schedules for course ID ${courseId}: ${error.message}`, { timestamp: new Date().toISOString() });
        return of(null);
      })
    );
  }

  getSchedulesByCourse(courseId: number): Observable<Schedule[]> {
    console.log(`[LessonCalendarService] Fetching schedules for course ID ${courseId}`, { timestamp: new Date().toISOString() });
    return this.http.get<Schedule[]>(`${this.apiUrl}/schedule/course/${courseId}`).pipe(
      map(response => this.transformResponse<Schedule[]>(response)),
      tap((schedules) => console.log(`[LessonCalendarService] Fetched ${schedules.length} schedules for course ID ${courseId}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to fetch schedules for course ID ${courseId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  createSchedule(schedule: Schedule): Observable<Schedule> {
    console.log(`[LessonCalendarService] Creating schedule for course ID ${schedule.courseId}`, { 
      title: schedule.title,
      hasScheduleDays: (schedule.scheduleDays?.length || 0) > 0,
      timestamp: new Date().toISOString() 
    });
    return this.http.post<Schedule>(`${this.apiUrl}/schedule`, schedule).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((newSchedule) => console.log(`[LessonCalendarService] Created schedule ID ${newSchedule.id}`)),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to create schedule: ${error.message}`);
        throw error;
      })
    );
  }

  addScheduleDay(scheduleDay: ScheduleDay): Observable<ScheduleDay> {
    console.log(`[LessonCalendarService] Adding schedule day for schedule ID ${scheduleDay.scheduleId} on ${scheduleDay.date}`, { timestamp: new Date().toISOString() });
    return this.http.post<ScheduleDay>(`${this.apiUrl}/schedule/day`, scheduleDay).pipe(
      map(response => this.transformResponse<ScheduleDay>(response)),
      tap((newDay) => console.log(`[LessonCalendarService] Added schedule day ID ${newDay.id} for schedule ID ${scheduleDay.scheduleId}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to add schedule day for schedule ID ${scheduleDay.scheduleId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  updateScheduleDay(scheduleDay: ScheduleDay): Observable<ScheduleDay> {
    console.log(`[LessonCalendarService] Updating schedule day ID ${scheduleDay.id} for schedule ID ${scheduleDay.scheduleId}`, { timestamp: new Date().toISOString() });
    return this.http.put<ScheduleDay>(`${this.apiUrl}/schedule/day`, scheduleDay).pipe(
      map(response => this.transformResponse<ScheduleDay>(response)),
      tap((updatedDay) => console.log(`[LessonCalendarService] Updated schedule day ID ${updatedDay.id}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to update schedule day ID ${scheduleDay.id}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  deleteScheduleDay(scheduleDayId: number): Observable<void> {
    console.log(`[LessonCalendarService] Deleting schedule day ID ${scheduleDayId}`, { timestamp: new Date().toISOString() });
    return this.http.delete<void>(`${this.apiUrl}/schedule/day/${scheduleDayId}`).pipe(
      tap(() => console.log(`[LessonCalendarService] Deleted schedule day ID ${scheduleDayId}`, { timestamp: new Date().toISOString() })),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to delete schedule day ID ${scheduleDayId}: ${error.message}`, { timestamp: new Date().toISOString() });
        throw error;
      })
    );
  }

  // lesson-calendar.service.ts - ADD these methods

updateScheduleConfig(config: ScheduleConfigUpdateResource): Observable<Schedule> {
    console.log(`[LessonCalendarService] Updating schedule config ID ${config.id}`, { 
      isLocked: config.isLocked,
      timestamp: new Date().toISOString() 
    });
    return this.http.put<Schedule>(`${this.apiUrl}/schedule/${config.id}/config`, config).pipe(
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
  
  updateScheduleDays(scheduleId: number, scheduleDays: ScheduleDay[]): Observable<Schedule> {
    console.log(`[LessonCalendarService] Updating schedule days for ID ${scheduleId}`, { 
      dayCount: scheduleDays.length,
      timestamp: new Date().toISOString() 
    });
    
    const payload: ScheduleDaysUpdateResource = {
      scheduleId,
      scheduleDays
    };
    
    return this.http.put<Schedule>(`${this.apiUrl}/schedule/${scheduleId}/days`, payload).pipe(
      map(response => this.transformResponse<Schedule>(response)),
      tap((updatedSchedule) => console.log(`[LessonCalendarService] Updated schedule days ID ${updatedSchedule.id}`)),
      catchError((error) => {
        console.error(`[LessonCalendarService] Failed to update schedule days: ${error.message}`);
        throw error;
      })
    );
  }
  
  
}