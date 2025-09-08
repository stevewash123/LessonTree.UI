// calendar-refresh.service.ts
// RESPONSIBILITY: Calendar refresh coordination for cross-service communication
// DOES: Coordinates calendar refresh events when schedule data changes
// LOCATION: /calendar/services/integration/ (Cross-domain coordination)

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface CalendarRefreshEvent {
  scope: 'full' | 'course-specific';
  reason: string; // Human-readable reason for debugging
  courseId?: number; // Only present for course-specific refreshes
  scheduleId?: number; // Schedule context (for compatibility)
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarRefreshService {

  // === REFRESH EVENT STREAM ===

  private readonly refreshRequestedSubject = new Subject<CalendarRefreshEvent>();
  readonly refreshRequested$: Observable<CalendarRefreshEvent> = this.refreshRequestedSubject.asObservable();

  constructor() {
    console.log('[CalendarRefreshService] Calendar refresh coordination service initialized');
  }

  // === SIMPLIFIED REFRESH API ===

  /**
   * Refresh calendar for all courses (configuration changes, special days)
   */
  refreshCalendar(): void {
    console.log('[CalendarRefreshService] 🔄 Full calendar refresh requested');

    const refreshEvent: CalendarRefreshEvent = {
      scope: 'full',
      reason: 'calendar-configuration-change',
      timestamp: new Date()
    };

    console.log('[CalendarRefreshService] 📡 Emitting full refresh event:', refreshEvent);
    this.refreshRequestedSubject.next(refreshEvent);
    console.log('[CalendarRefreshService] ✅ Full refresh event emitted');
  }

  /**
   * Refresh calendar for a specific course (lesson/topic/subtopic changes)
   */
  refreshCalendarForCourse(courseId: number): void {
    console.log('[CalendarRefreshService] 🔄 Course-specific refresh requested for course:', courseId);

    const refreshEvent: CalendarRefreshEvent = {
      scope: 'course-specific',
      reason: 'course-data-change',
      courseId,
      timestamp: new Date()
    };

    console.log('[CalendarRefreshService] 📡 Emitting course-specific refresh event:', refreshEvent);
    this.refreshRequestedSubject.next(refreshEvent);
    console.log('[CalendarRefreshService] ✅ Course-specific refresh event emitted');
  }
}
