// calendar-refresh.service.ts
// RESPONSIBILITY: Calendar refresh coordination for cross-service communication
// DOES: Coordinates calendar refresh events when schedule data changes
// LOCATION: /calendar/services/integration/ (Cross-domain coordination)

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface CalendarRefreshEvent {
  reason: 'schedule-updated' | 'lesson-moved' | 'special-day-changed' | 'configuration-changed';
  scope: 'full' | 'current-view' | 'events-only';
  scheduleId?: number;
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

  // === REFRESH TRIGGERS ===

  /**
   * Request full calendar refresh (complete reload)
   */
  requestFullRefresh(reason: CalendarRefreshEvent['reason'], scheduleId?: number): void {
    console.log('[CalendarRefreshService] 🔄 Full refresh requested:', { reason, scheduleId });

    const refreshEvent = {
      reason,
      scope: 'full' as const,
      scheduleId,
      timestamp: new Date()
    };

    console.log('[CalendarRefreshService] 📡 About to emit refresh event:', refreshEvent);
    this.refreshRequestedSubject.next(refreshEvent);
    console.log('[CalendarRefreshService] ✅ Refresh event emitted successfully');
  }

  /**
   * Request current view refresh (reload current month/week)
   */
  requestCurrentViewRefresh(reason: CalendarRefreshEvent['reason'], scheduleId?: number): void {
    console.log('[CalendarRefreshService] Current view refresh requested:', { reason, scheduleId });

    this.refreshRequestedSubject.next({
      reason,
      scope: 'current-view',
      scheduleId,
      timestamp: new Date()
    });
  }

  /**
   * Request events-only refresh (keep calendar position, reload events)
   */
  requestEventsRefresh(reason: CalendarRefreshEvent['reason'], scheduleId?: number): void {
    console.log('[CalendarRefreshService] Events refresh requested:', { reason, scheduleId });

    this.refreshRequestedSubject.next({
      reason,
      scope: 'events-only',
      scheduleId,
      timestamp: new Date()
    });
  }

  // === SPECIFIC REFRESH METHODS ===

  /**
   * Refresh after schedule update
   */
  refreshAfterScheduleUpdate(scheduleId: number): void {
    this.requestCurrentViewRefresh('schedule-updated', scheduleId);
  }

  /**
   * Refresh after lesson repositioning (receives courseId, looks up schedule)
   */
  refreshAfterLessonMove(courseId: number): void {
    console.log('[CalendarRefreshService] Lesson move detected for course:', courseId);

    // TODO: Get current schedule from state and verify course is in configuration
    // For now, use generic current view refresh
    this.requestCurrentViewRefresh('lesson-moved');
  }

  /**
   * Refresh after special day changes
   */
  refreshAfterSpecialDayChange(scheduleId: number): void {
    this.requestCurrentViewRefresh('special-day-changed', scheduleId);
  }

  /**
   * Refresh after configuration changes
   */
  refreshAfterConfigurationChange(): void {
    console.log('[CalendarRefreshService] 🔄 Configuration change refresh triggered');

    const refreshEvent = {
      reason: 'configuration-changed' as const,
      scope: 'full' as const,
      scheduleId: undefined,
      timestamp: new Date()
    };

    console.log('[CalendarRefreshService] 📡 Emitting configuration change event:', refreshEvent);
    this.refreshRequestedSubject.next(refreshEvent);
    console.log('[CalendarRefreshService] ✅ Configuration change event emitted');
  }
}
