// **SIMPLIFIED FIX** - CalendarCoordinationService - State-First Pattern
// PATTERN: Check state for schedule ID → Get schedule if missing → Use ID for operations
// ENHANCEMENT: Handles schedule ID retrieval internally

import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { CalendarManagementService } from '../business/calendar-managment.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { CalendarRefreshService } from '../business/calendar-refresh.service';
import { ScheduleStateService } from '../state/schedule-state.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarCoordinationService implements OnDestroy {

  private subscription = new Subscription();
  private currentViewDate: Date = new Date(); // Track current calendar view

  constructor(
    private managementService: CalendarManagementService,
    private scheduleApiService: ScheduleApiService,
    private calendarRefresh: CalendarRefreshService,
    private scheduleStateService: ScheduleStateService
  ) {
    console.log('[CalendarCoordinationService] State-first coordination service initialized');
    this.setupUnifiedSubscription();
  }

  // ✅ SINGLE SUBSCRIPTION for all refresh needs
  private setupUnifiedSubscription(): void {
    console.log('[CalendarCoordinationService] Setting up unified refresh subscription');

    this.subscription.add(
      this.calendarRefresh.refreshNeeded$.subscribe(async (request) => {
        console.log('[CalendarCoordinationService] Refresh request received:', {
          reason: request.reason,
          courseId: request.courseId,
          currentDate: this.currentViewDate.toISOString().split('T')[0]
        });

        await this.refreshCurrentPage(request.reason, request.courseId);
      })
    );
  }

  // ✅ SIMPLIFIED: Always ensure we have schedule ID before making API calls
  private async refreshCurrentPage(reason: string, courseId?: number): Promise<void> {
    console.log(`[CalendarCoordinationService] Refreshing current page (state-first)`, {
      reason,
      courseId,
      currentDate: this.currentViewDate.toISOString().split('T')[0]
    });

    try {
      // ✅ STEP 1: Ensure we have a schedule ID
      const scheduleId = await this.ensureScheduleId();

      if (!scheduleId) {
        console.warn('[CalendarCoordinationService] No schedule available - clearing calendar');
        this.managementService.refreshCalendarEventsOnly([]);
        return;
      }

      // ✅ STEP 2: Use schedule ID to get events for current date range
      const startOfMonth = new Date(this.currentViewDate.getFullYear(), this.currentViewDate.getMonth(), 1);
      const endOfMonth = new Date(this.currentViewDate.getFullYear(), this.currentViewDate.getMonth() + 1, 0);

      console.log('[CalendarCoordinationService] Loading events with schedule ID:', {
        scheduleId,
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0],
        reason
      });

      const scheduleEvents = await this.scheduleApiService.getScheduleEventsByDateRange(
        scheduleId,
        startOfMonth,
        endOfMonth
      ).toPromise();

      if (scheduleEvents && scheduleEvents.length > 0) {
        this.managementService.refreshCalendarEventsOnly(scheduleEvents);

        console.log(`[CalendarCoordinationService] ✅ Refreshed with ${scheduleEvents.length} events (reason: ${reason})`);
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

  // ✅ KEY METHOD: Ensure we have a schedule ID
  private async ensureScheduleId(): Promise<number | null> {
    // Check if we already have a schedule in state
    const currentSchedule = this.scheduleStateService.getSchedule();

    if (currentSchedule?.id) {
      console.log('[CalendarCoordinationService] Using schedule ID from state:', currentSchedule.id);
      return currentSchedule.id;
    }

    // If no schedule in state, load the active schedule
    console.log('[CalendarCoordinationService] No schedule in state - loading active schedule');

    try {
      const activeSchedule = await this.scheduleApiService.getActiveSchedule().toPromise();

      if (activeSchedule?.id) {
        // ✅ CRITICAL: Set the schedule in state for future use
        this.scheduleStateService.setSchedule(activeSchedule, false);
        console.log('[CalendarCoordinationService] ✅ Loaded and cached active schedule:', {
          scheduleId: activeSchedule.id,
          title: activeSchedule.title
        });
        return activeSchedule.id;
      } else {
        console.log('[CalendarCoordinationService] No active schedule found');
        return null;
      }
    } catch (error) {
      console.error('[CalendarCoordinationService] Failed to load active schedule:', error);
      return null;
    }
  }

  // ✅ Method to update current view date (for pagination)
  updateCurrentViewDate(date: Date): void {
    this.currentViewDate = date;
    console.log('[CalendarCoordinationService] Updated current view date:', {
      newDate: date.toISOString().split('T')[0],
      month: date.getMonth() + 1,
      year: date.getFullYear()
    });
  }

  // === EXISTING METHODS ===

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

  // ✅ Debug method
  getDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.getSchedule();

    return {
      pattern: 'state-first-pattern',
      scheduleInState: {
        hasSchedule: !!currentSchedule,
        scheduleId: currentSchedule?.id || null,
        scheduleTitle: currentSchedule?.title || null
      },
      currentViewDate: this.currentViewDate.toISOString().split('T')[0],
      nextRefreshWillUse: currentSchedule?.id ?
        `Existing schedule ID ${currentSchedule.id}` :
        'Will load active schedule first'
    };
  }

  // ✅ CLEANUP
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    console.log('[CalendarCoordinationService] State-first subscription cleaned up');
  }
}
