// **NEW FILE** - CalendarRefreshService - Unified Refresh Pattern
// RESPONSIBILITY: Single observable for all calendar refresh needs
// PATTERN: Any change → single signal → reload current page
// BENEFIT: Dramatically simplified from multiple observables

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface CalendarRefreshRequest {
  reason: string; // For debugging: 'lesson-moved', 'special-day-added', 'manual', etc.
  timestamp: Date;
  currentDate?: Date; // Optional: specific date range to refresh
  courseId?: number; // Optional: affected course for future optimizations
}

@Injectable({
  providedIn: 'root'
})
export class CalendarRefreshService {

  // ✅ SINGLE OBSERVABLE for all refresh needs
  private readonly _refreshNeeded$ = new Subject<CalendarRefreshRequest>();
  readonly refreshNeeded$ = this._refreshNeeded$.asObservable();

  constructor() {
    console.log('[CalendarRefreshService] Unified refresh service initialized');
  }

  // ✅ SINGLE METHOD for all change types
  requestRefresh(reason: string, currentDate?: Date, courseId?: number): void {
    const request: CalendarRefreshRequest = {
      reason,
      timestamp: new Date(),
      currentDate,
      courseId
    };

    console.log('[CalendarRefreshService] Refresh requested:', request);
    this._refreshNeeded$.next(request);
  }

  // Convenience methods for common scenarios (all call requestRefresh)
  refreshAfterLessonChange(changeType: string, courseId?: number): void {
    this.requestRefresh(`lesson-${changeType}`, undefined, courseId);
  }

  refreshAfterSpecialDayChange(changeType: string): void {
    this.requestRefresh(`special-day-${changeType}`);
  }

  refreshAfterConfigurationChange(): void {
    this.requestRefresh('configuration-changed');
  }

  refreshManual(): void {
    this.requestRefresh('manual-refresh');
  }

  refreshAfterApiError(): void {
    this.requestRefresh('api-error-recovery');
  }
}
