// **SIMPLIFIED FILE** - CalendarCoordinationService - Single Subscription Pattern
// PATTERN: One subscription → One refresh method → Load current page from API
// BENEFIT: Eliminates complex observable coordination

import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { CalendarManagementService } from '../business/calendar-managment.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import {CalendarRefreshService} from '../business/calendar-refresh.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarCoordinationService implements OnDestroy {

  private subscription = new Subscription();
  private currentViewDate: Date = new Date(); // Track current calendar view

  constructor(
    private managementService: CalendarManagementService,
    private scheduleApiService: ScheduleApiService,
    private calendarRefresh: CalendarRefreshService
  ) {
    console.log('[CalendarCoordinationService] Unified coordination service initialized');
    this.setupUnifiedSubscription();
  }

  // ✅ SINGLE SUBSCRIPTION for all refresh needs
  private setupUnifiedSubscription(): void {
    console.log('[CalendarCoordinationService] Setting up unified refresh subscription');

    this.subscription.add(
      this.calendarRefresh.refreshNeeded$.subscribe(async (request) => {
        console.log('[CalendarCoordinationService] Refresh request received:', {
          reason: request.reason,
          courseId: request.courseId, // ✅ LOG COURSE ID
          currentDate: this.currentViewDate.toISOString().split('T')[0]
        });

        // ✅ CURRENT: Unified refresh (ignore courseId for now)
        // ✅ FUTURE: Could use courseId for optimized filtering
        await this.refreshCurrentPage(request.reason, request.courseId);
      })
    );
  }

  // ✅ UNIFIED REFRESH METHOD - Loads current page from API
  private async refreshCurrentPage(reason: string, courseId?: number): Promise<void> {
    console.log(`[CalendarCoordinationService] Refreshing current page`, {
      reason,
      courseId,
      currentDate: this.currentViewDate.toISOString().split('T')[0]
    });

    try {
      // Calculate current month date range for pagination
      const startOfMonth = new Date(this.currentViewDate.getFullYear(), this.currentViewDate.getMonth(), 1);
      const endOfMonth = new Date(this.currentViewDate.getFullYear(), this.currentViewDate.getMonth() + 1, 0);

      console.log('[CalendarCoordinationService] Loading date range:', {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0],
        affectedCourse: courseId || 'all-courses'
      });

      // ✅ CURRENT: Load all events for date range
      // ✅ FUTURE: Could add courseId parameter for filtering
      const scheduleEvents = await this.scheduleApiService.getScheduleEventsByDateRange(
        startOfMonth,
        endOfMonth
        // TODO: Add courseId parameter when API supports it
        // courseId
      ).toPromise();

      if (scheduleEvents && scheduleEvents.length > 0) {
        // Transform to calendar format
        const calendarEvents = this.managementService.transformScheduleEventsToCalendar(scheduleEvents);

        // Update calendar display
        this.managementService.refreshCalendarEventsOnly(calendarEvents);

        console.log(`[CalendarCoordinationService] Refreshed with ${calendarEvents.length} events (reason: ${reason})`);
      } else {
        // Clear calendar if no events
        this.managementService.refreshCalendarEventsOnly([]);
        console.log(`[CalendarCoordinationService] No events found - calendar cleared (reason: ${reason})`);
      }

    } catch (error) {
      console.error('[CalendarCoordinationService] Failed to refresh current page:', error);

      // Clear calendar on error
      this.managementService.refreshCalendarEventsOnly([]);

      // Could emit error event if needed
      this.calendarRefresh.refreshAfterApiError();
    }
  }

  cleanup(): void {
    this.ngOnDestroy();
  }

  hasCoursesAvailable(): boolean {
    return this.managementService.hasCoursesAvailable();
  }

  getActiveCourseCount(): number {
    return this.managementService.getActiveCourseCount();
  }

  getCurrentCourse(): any | null {
    return this.managementService.getCurrentCourse();
  }

  scheduleReadyForDisplay() {
    return this.managementService.scheduleReadyForDisplay();
  }

  // ✅ CLEANUP
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    console.log('[CalendarCoordinationService] Unified subscription cleaned up');
  }
}
