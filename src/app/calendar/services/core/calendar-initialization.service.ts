// calendar-initialization.service.ts - FIXED REDUNDANT API CALLS
// FIX: Load schedule once and cache, eliminate redundant getActiveSchedule() calls

import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

// State Services (clean)
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';

// API Services
import { ScheduleApiService } from '../api/schedule-api.service';

// Calendar Services
import { CalendarDateService } from './calendar-date.service';
import { CalendarEventLoaderService } from './calendar-event-loader.service';
import { CalendarDisplayService } from './calendar-display.service';

// Modal Component
import { ScheduleConfigComponent } from '../../../schedule-config/schedule-config.component';

export interface InitializationResult {
  success: boolean;
  hasConfiguration: boolean;
  hasSchedule: boolean;
  hasEvents: boolean;
  activeDate: Date | null;
  eventCount: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarInitializationService {

  // ✅ FIXED: Cache schedule to prevent redundant API calls
  private cachedSchedule: any | null = null;

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleApiService: ScheduleApiService,
    private calendarDateService: CalendarDateService,
    private calendarEventLoaderService: CalendarEventLoaderService,
    private calendarDisplayService: CalendarDisplayService,
    private dialog: MatDialog
  ) {
    console.log('[CalendarInitializationService] Calendar orchestrator initialized');
  }

  // === MAIN INITIALIZATION WORKFLOW ===

  /**
   * Complete calendar initialization workflow
   * ✅ FIXED: Single schedule load, then configuration discovery
   */
  initializeCalendar(): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 🚀 Starting 5-step calendar initialization');

    // ✅ FIXED: Load schedule ONCE at the beginning
    return this.loadScheduleOnce().pipe(
      switchMap(schedule => {
        if (!schedule) {
          return this.handleNoSchedule();
        }

        // Extract configuration from schedule (embedded)
        const config = (schedule as any)?.scheduleConfiguration;
        if (!config) {
          return this.handleNoConfiguration();
        }

        console.log('[CalendarInitializationService] ✅ Valid configuration found:', {
          configId: config.id,
          startDate: config.startDate,
          endDate: config.endDate
        });

        // Store configuration in state
        this.scheduleConfigurationStateService.setActiveConfiguration(config);

        return this.step3_CalculateActiveDate(schedule, config);
      }),
      catchError(error => {
        console.error('[CalendarInitializationService] ❌ Initialization failed:', error);
        return of({
          success: false,
          hasConfiguration: false,
          hasSchedule: false,
          hasEvents: false,
          activeDate: null,
          eventCount: 0,
          error: error.message || 'Initialization failed'
        });
      })
    );
  }

  // === STEP 1: LOAD SCHEDULE ONCE ===

  /**
   * ✅ FIXED: Load schedule only once and cache it
   * Eliminates redundant API calls
   */
  private loadScheduleOnce(): Observable<any | null> {
    console.log('[CalendarInitializationService] 📋 STEP 1: Load Schedule Once');

    // Check if we already have schedule in state or cache
    const stateSchedule = this.scheduleStateService.getSchedule();
    if (stateSchedule?.id) {
      console.log('[CalendarInitializationService] ✅ Using schedule from state:', stateSchedule.id);
      this.cachedSchedule = stateSchedule;
      return of(stateSchedule);
    }

    if (this.cachedSchedule) {
      console.log('[CalendarInitializationService] ✅ Using cached schedule:', this.cachedSchedule.id);
      return of(this.cachedSchedule);
    }

    // Load from API only once
    console.log('[CalendarInitializationService] 📡 Loading schedule from API (one time only)');
    return this.scheduleApiService.getActiveSchedule().pipe(
      tap(schedule => {
        if (schedule) {
          console.log('[CalendarInitializationService] ✅ Schedule loaded and cached:', {
            scheduleId: schedule.id,
            title: schedule.title
          });

          // Cache the schedule to prevent redundant calls
          this.cachedSchedule = schedule;

          // Store in state service
          this.scheduleStateService.setSchedule(schedule, false);
        } else {
          console.log('[CalendarInitializationService] ❌ No active schedule found');
        }
      }),
      catchError(error => {
        console.error('[CalendarInitializationService] ❌ Failed to load schedule:', error);
        return of(null);
      })
    );
  }

  // === STEP 3: ACTIVE DATE CALCULATION (Steps 2 combined into 1) ===

  /**
   * STEP 3: Determine which date the calendar should show
   * Rule: If TODAY within range → TODAY, else → startDate
   */
  private step3_CalculateActiveDate(schedule: any, config: any): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 📅 STEP 3: Active Date Calculation');

    const activeDate = this.calculateActiveDate(config);

    console.log('[CalendarInitializationService] ✅ Active date calculated:', {
      activeDate: activeDate.toDateString(),
      rule: this.isDateInConfigurationRange(new Date(), config) ? 'TODAY (in range)' : 'START DATE (out of range)'
    });

    return this.step4_NavigateCalendar(schedule, config, activeDate);
  }

  /**
   * Calculate active date using business rules
   * UPDATED: Find first teaching day on or after start date
   */
  private calculateActiveDate(config: any): Date {
    const today = new Date();

    // If TODAY is within schedule range, use TODAY
    if (this.isDateInConfigurationRange(today, config)) {
      return today;
    }

    // Otherwise, find first teaching day on or after start date
    const startDate = new Date(config.startDate);
    return this.findFirstTeachingDay(startDate, config);
  }

  /**
   * Find first teaching day on or after the given date
   */
  private findFirstTeachingDay(fromDate: Date, config: any): Date {
    // teachingDays is string[] according to ScheduleConfiguration model
    const teachingDays: string[] = config.teachingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    console.log('[CalendarInitializationService] 🔍 Teaching days from config:', teachingDays);

    // Convert day names to numbers
    const teachingDayNumbers = teachingDays
      .map(dayName => this.dayNameToNumber(dayName))
      .filter(dayNum => dayNum !== -1);

    console.log('[CalendarInitializationService] 📅 Teaching day numbers:', teachingDayNumbers);

    // Start from the given date and find first teaching day
    let currentDate = new Date(fromDate);
    let attempts = 0;

    while (attempts < 7) { // Max 1 week search
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.

      if (teachingDayNumbers.includes(dayOfWeek)) {
        console.log('[CalendarInitializationService] 📅 First teaching day found:', {
          searchStarted: fromDate.toDateString(),
          firstTeachingDay: currentDate.toDateString(),
          dayOfWeek: this.getDayName(dayOfWeek)
        });
        return currentDate;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      attempts++;
    }

    // Fallback to original date if no teaching day found
    console.warn('[CalendarInitializationService] ⚠️ No teaching day found, using start date');
    return fromDate;
  }

  // === STEP 4: CALENDAR NAVIGATION ===

  /**
   * STEP 4: Set FullCalendar to show the active date's month
   */
  private step4_NavigateCalendar(schedule: any, config: any, activeDate: Date): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 🎯 STEP 4: Calendar Navigation');

    // FIXED: Use async navigation and handle Promise properly
    return from(this.calendarDateService.setCalendarDate(activeDate)).pipe(
      tap(navigationSuccess => {
        if (navigationSuccess) {
          console.log('[CalendarInitializationService] ✅ Calendar navigated to:', {
            activeDate: activeDate.toDateString(),
            month: `${activeDate.getFullYear()}-${activeDate.getMonth() + 1}`
          });
        } else {
          console.warn('[CalendarInitializationService] ⚠️ Calendar navigation failed - proceeding anyway');
        }
      }),
      switchMap(() => this.step5_ConditionalEventLoading(schedule, activeDate)),
      catchError(error => {
        console.error('[CalendarInitializationService] ❌ Step 4 navigation error:', error);
        // Continue to Step 5 even if navigation fails
        return this.step5_ConditionalEventLoading(schedule, activeDate);
      })
    );
  }

  // === STEP 5: CONDITIONAL EVENT LOADING ===

  /**
   * STEP 5: Conditional event loading based on view mode
   * OPTIMIZED: Skip for week view since navigation already loads events
   * FUTURE: Enable for month view when month view button is added
   */
  private step5_ConditionalEventLoading(schedule: any, activeDate: Date): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 📊 STEP 5: Conditional Event Loading');

    // TODO: When month view is added, get actual view mode from service
    const currentViewMode = 'week'; // Hard-coded for now, will be dynamic later

    if (currentViewMode === 'week') {
      console.log('[CalendarInitializationService] ⚡ OPTIMIZED: Skipping Step 5 - week navigation already loaded events');

      // Return success immediately - navigation has already loaded the events
      return of({
        success: true,
        hasConfiguration: true,
        hasSchedule: true,
        hasEvents: true, // Assume navigation loaded events
        activeDate: activeDate,
        eventCount: 0 // Will be updated by navigation event loading
      });
    }

    // FUTURE: When month view is implemented, this path will execute
    console.log('[CalendarInitializationService] 📅 Loading additional events for month view');
    return this.step5_LoadMonthEvents(schedule, activeDate);
  }

  /**
   * FUTURE: Month event loading for when month view is implemented
   * Currently unused but ready for month view feature
   */
  private step5_LoadMonthEvents(schedule: any, activeDate: Date): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 📅 STEP 5: Month Event Loading');

    // Calculate month range for active date
    const monthRange = this.calendarDateService.getMonthRange(activeDate);

    console.log('[CalendarInitializationService] 📅 Loading events for month range:', {
      scheduleId: schedule.id,
      startOfMonth: monthRange.start.toDateString(),
      endOfMonth: monthRange.end.toDateString()
    });

    return this.calendarEventLoaderService.loadEventsForMonth(schedule.id, activeDate).pipe(
      tap(events => {
        console.log('[CalendarInitializationService] ✅ Month events loaded:', {
          eventCount: events.length,
          month: `${activeDate.getFullYear()}-${activeDate.getMonth() + 1}`,
          performance: events.length <= 200 ? 'Excellent (≤200 events)' : 'Heavy (>200 events)'
        });

        // Display events using CalendarDisplayService
        const displayResult = this.calendarDisplayService.updateCalendarEvents(events);

        if (!displayResult.success) {
          console.error('[CalendarInitializationService] ❌ Failed to display events:', displayResult.error);
        }
      }),
      map(events => ({
        success: true,
        hasConfiguration: true,
        hasSchedule: true,
        hasEvents: events.length > 0,
        activeDate: activeDate,
        eventCount: events.length
      })),
      catchError(error => {
        console.error('[CalendarInitializationService] ❌ Failed to load month events:', error);
        return of({
          success: false,
          hasConfiguration: true,
          hasSchedule: true,
          hasEvents: false,
          activeDate: activeDate,
          eventCount: 0,
          error: 'Failed to load events'
        });
      })
    );
  }

  // === ERROR HANDLERS ===

  /**
   * ✅ FIXED: Handle case where no schedule exists
   */
  private handleNoSchedule(): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] ❌ No schedule found - need to create one');
    return this.handleNoConfiguration(); // Same flow - open config modal
  }

  /**
   * Handle case where no valid configuration exists
   * Rule 3: Open configuration modal
   */
  private handleNoConfiguration(): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 🔧 RULE 3: Opening configuration modal');

    return from(this.openConfigurationModal()).pipe(
      switchMap(modalResult => {
        if (modalResult?.saved) {
          console.log('[CalendarInitializationService] ✅ Configuration created - restarting process');
          // Clear cache and restart
          this.cachedSchedule = null;
          return this.initializeCalendar(); // Restart from Step 1
        } else {
          console.log('[CalendarInitializationService] ❌ Configuration modal cancelled');
          return of({
            success: false,
            hasConfiguration: false,
            hasSchedule: false,
            hasEvents: false,
            activeDate: null,
            eventCount: 0,
            error: 'Configuration required'
          });
        }
      })
    );
  }

  /**
   * Open configuration modal and wait for result
   */
  private openConfigurationModal(): Promise<any> {
    console.log('[CalendarInitializationService] 📋 Opening configuration modal');

    const dialogRef = this.dialog.open(ScheduleConfigComponent, {
      width: '900px',
      maxWidth: '95vw',
      height: '80vh',
      maxHeight: '700px',
      panelClass: 'custom-dialog-container',
      disableClose: false
    });

    return dialogRef.afterClosed().toPromise();
  }

  // === UTILITY METHODS ===

  /**
   * Check if date falls within configuration range
   */
  private isDateInConfigurationRange(date: Date, config: any): boolean {
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    return date >= startDate && date <= endDate;
  }

  /**
   * Convert day name to number
   */
  private dayNameToNumber(dayName: string): number {
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    return dayMap[dayName] !== undefined ? dayMap[dayName] : -1;
  }

  /**
   * Get day name for logging
   */
  private getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }

  /**
   * Check if calendar is ready for use
   */
  isCalendarReady(): boolean {
    const hasConfig = this.scheduleConfigurationStateService.hasActiveConfiguration();
    const hasSchedule = this.scheduleStateService.hasActiveSchedule();
    const hasEvents = this.calendarDisplayService.hasEvents();

    return hasConfig && hasSchedule && hasEvents;
  }

  /**
   * Get current initialization status
   */
  getInitializationStatus(): {
    hasConfiguration: boolean;
    hasSchedule: boolean;
    hasEvents: boolean;
    eventCount: number;
  } {
    return {
      hasConfiguration: this.scheduleConfigurationStateService.hasActiveConfiguration(),
      hasSchedule: this.scheduleStateService.hasActiveSchedule(),
      hasEvents: this.calendarDisplayService.hasEvents(),
      eventCount: this.calendarDisplayService.eventCount()
    };
  }

  /**
   * Force re-initialization (useful for debugging)
   * ✅ FIXED: Clear cache
   */
  forceReinitialize(): Observable<InitializationResult> {
    console.log('[CalendarInitializationService] 🔄 Forcing re-initialization - clearing all state');

    // Clear existing state AND cache
    this.scheduleStateService.clearSchedule();
    this.scheduleConfigurationStateService.setActiveConfiguration(null);
    this.calendarDisplayService.clearCalendarEvents();
    this.cachedSchedule = null; // ✅ FIXED: Clear cache

    // Start fresh from Step 1
    return this.initializeCalendar();
  }
}
