// calendar-date.service.ts - FIXED: FullCalendar API timing
// RESPONSIBILITY: Date calculations and FullCalendar navigation
// DOES: Active date calculation, calendar navigation, date validation
// CALLED BY: CalendarInitializationService
// LOCATION: /calendar/services/core/

import { Injectable, inject } from '@angular/core';
import { LayoutModeService } from '../../../lesson-tree-container/layout-mode.service';

export interface DateCalculationResult {
  activeDate: Date;
  reason: 'today-in-range' | 'start-date-fallback';
  configurationDateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface CalendarNavigationCallbacks {
  getCalendarApi: () => any;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarDateService {

  private calendarCallbacks: CalendarNavigationCallbacks | null = null;
  private layoutModeService = inject(LayoutModeService);

  constructor() {
    console.log('[CalendarDateService] Date calculation and navigation service initialized with LayoutModeService');
  }

  // === INITIALIZATION ===

  /**
   * Initialize with calendar callbacks for navigation
   */
  initialize(callbacks: CalendarNavigationCallbacks): void {
    this.calendarCallbacks = callbacks;
    console.log('[CalendarDateService] Initialized with calendar callbacks');
  }

  // === CORE BUSINESS LOGIC: ACTIVE DATE CALCULATION ===

  /**
   * Calculate active date from configuration
   * EXTRACTED FROM: LessonCalendarComponent.setInitialCalendarDate()
   * Business Rules:
   *  - If TODAY is within schedule range → use TODAY
   *  - Otherwise → use schedule start date
   */
  calculateActiveDate(configuration: any): Date {
    const today = new Date();
    const scheduleStart = new Date(configuration.startDate);
    const scheduleEnd = new Date(configuration.endDate);

    console.log('[CalendarDateService] 📅 Calculating active date:', {
      today: today.toDateString(),
      scheduleStart: scheduleStart.toDateString(),
      scheduleEnd: scheduleEnd.toDateString()
    });

    let activeDate: Date;
    let reason: 'today-in-range' | 'start-date-fallback';

    // CORE BUSINESS RULE: Check if today is within schedule range
    if (today >= scheduleStart && today <= scheduleEnd) {
      activeDate = today;
      reason = 'today-in-range';
      console.log('[CalendarDateService] ✅ Using TODAY - within schedule range');
    } else {
      activeDate = scheduleStart;
      reason = 'start-date-fallback';
      console.log('[CalendarDateService] ✅ Using SCHEDULE START - today outside range');
    }

    console.log('[CalendarDateService] 🎯 Active date determined:', {
      activeDate: activeDate.toDateString(),
      reason
    });

    return activeDate;
  }

  /**
   * Calculate active date with detailed result
   */
  calculateActiveDateDetailed(configuration: any): DateCalculationResult {
    const activeDate = this.calculateActiveDate(configuration);
    const today = new Date();
    const scheduleStart = new Date(configuration.startDate);
    const scheduleEnd = new Date(configuration.endDate);

    const reason: 'today-in-range' | 'start-date-fallback' =
      (today >= scheduleStart && today <= scheduleEnd) ? 'today-in-range' : 'start-date-fallback';

    return {
      activeDate,
      reason,
      configurationDateRange: {
        startDate: scheduleStart,
        endDate: scheduleEnd
      }
    };
  }

  // === FULLCALENDAR NAVIGATION ===

  /**
   * Update the current view date (called during navigation) - delegates to LayoutModeService
   */
  updateCurrentViewDate(date: Date): void {
    this.layoutModeService.setCurrentCalendarDate(date);
    console.log('[CalendarDateService] 📅 Current view date delegated to LayoutModeService:', {
      newCurrentDate: date.toDateString()
    });
  }

  /**
   * Get current calendar date - prefers LayoutModeService tracking over FullCalendar API
   * Returns the date the calendar is currently showing
   */
  getCurrentCalendarDate(): Date | null {
    console.log('[CalendarDateService] 🔍 ===== GET CURRENT CALENDAR DATE START =====');
    
    // First, try LayoutModeService preserved date
    const preservedDate = this.layoutModeService.getCurrentCalendarDate();
    if (preservedDate) {
      console.log('[CalendarDateService] ✅ Using LayoutModeService preserved date:', {
        preservedDate: preservedDate.toDateString(),
        source: 'layout-mode-service'
      });
      console.log('[CalendarDateService] 🔍 ===== GET CURRENT CALENDAR DATE END (PRESERVED) =====');
      return preservedDate;
    }

    console.log('[CalendarDateService] ⚠️ No preserved date in LayoutModeService, falling back to FullCalendar API');
    
    if (!this.calendarCallbacks) {
      console.warn('[CalendarDateService] ⚠️ Cannot get current date - no calendar callbacks set');
      console.log('[CalendarDateService] 🔍 ===== GET CURRENT CALENDAR DATE END (NO CALLBACKS) =====');
      return null;
    }

    const calendarApi = this.calendarCallbacks.getCalendarApi();
    if (!calendarApi) {
      console.warn('[CalendarDateService] ⚠️ Cannot get current date - calendar API not available');
      console.log('[CalendarDateService] 🔍 ===== GET CURRENT CALENDAR DATE END (NO API) =====');
      return null;
    }

    const currentDate = calendarApi.getDate();
    console.log('[CalendarDateService] ✅ SUCCESS: Retrieved current calendar date from API:', {
      currentDate: currentDate.toDateString(),
      currentDateISO: currentDate.toISOString(),
      view: calendarApi.view?.type || 'unknown',
      viewTitle: calendarApi.view?.title || 'unknown',
      source: 'fullcalendar-api'
    });

    // Store this in LayoutModeService for future preservation
    this.layoutModeService.setCurrentCalendarDate(currentDate);

    console.log('[CalendarDateService] 🔍 ===== GET CURRENT CALENDAR DATE END (API SUCCESS) =====');
    return currentDate;
  }

  /**
   * Set FullCalendar to show specific date - FIXED: Wait for API readiness
   * EXTRACTED FROM: LessonCalendarComponent.setInitialCalendarDate()
   */
  async setCalendarDate(targetDate: Date): Promise<boolean> {
    console.log('[CalendarDateService] 🚀 === CALENDAR NAVIGATION DEBUG START ===');
    console.log('[CalendarDateService] 📋 Navigation request details:', {
      targetDate: targetDate.toDateString(),
      targetDateISO: targetDate.toISOString(),
      dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
      hasCallbacks: !!this.calendarCallbacks
    });

    if (!this.calendarCallbacks) {
      console.error('[CalendarDateService] ❌ Cannot navigate - no calendar callbacks set');
      return false;
    }

    // FIXED: Wait for FullCalendar API to be ready
    const calendarApi = await this.waitForCalendarApi();
    if (!calendarApi) {
      console.error('[CalendarDateService] ❌ Cannot navigate - calendar API timeout after waiting');
      return false;
    }

    // 🔍 DEBUG: Check calendar's current state BEFORE navigation
    const beforeDate = calendarApi.getDate();
    console.log('[CalendarDateService] 📊 Calendar state BEFORE navigation:', {
      currentDate: beforeDate.toDateString(),
      currentDateISO: beforeDate.toISOString(),
      view: calendarApi.view.type,
      title: calendarApi.view.title
    });

    console.log('[CalendarDateService] 🧭 Executing gotoDate()...');

    try {
      calendarApi.gotoDate(targetDate);
      console.log('[CalendarDateService] ✅ gotoDate() call completed without error');

      // 🔍 DEBUG: Immediate check after navigation
      const immediateDate = calendarApi.getDate();
      console.log('[CalendarDateService] 📊 Calendar state IMMEDIATELY after navigation:', {
        currentDate: immediateDate.toDateString(),
        currentDateISO: immediateDate.toISOString(),
        view: calendarApi.view.type,
        title: calendarApi.view.title,
        navigationWorked: immediateDate.toDateString() === targetDate.toDateString()
      });

      // Verify navigation worked after short delay
      setTimeout(() => {
        const currentDate = calendarApi.getDate();
        const navigationSuccess = this.areDatesInSameMonth(targetDate, currentDate);
        
        console.log('[CalendarDateService] 📊 Calendar navigation FINAL verification (50ms later):', {
          targetDate: targetDate.toDateString(),
          currentDate: currentDate.toDateString(),
          sameMonth: navigationSuccess,
          datesDifferBy: Math.abs(currentDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24) // days
        });

        if (!navigationSuccess) {
          console.error('[CalendarDateService] ❌ NAVIGATION FAILED: Calendar did not navigate to target date');
        }
      }, 50);

      console.log('[CalendarDateService] 🏁 === CALENDAR NAVIGATION DEBUG END ===');
      return true;

    } catch (error) {
      console.error('[CalendarDateService] ❌ Calendar navigation failed:', error);
      console.log('[CalendarDateService] 🏁 === CALENDAR NAVIGATION DEBUG END (ERROR) ===');
      return false;
    }
  }

  /**
   * FIXED: Wait for FullCalendar API to become available
   * Polls every 50ms for up to 2 seconds
   */
  private async waitForCalendarApi(timeoutMs: number = 2000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 50;

    while (Date.now() - startTime < timeoutMs) {
      if (!this.calendarCallbacks) {
        console.warn('[CalendarDateService] ⚠️ Calendar callbacks not set while waiting for API');
        await this.delay(pollInterval);
        continue;
      }

      const calendarApi = this.calendarCallbacks.getCalendarApi();
      if (calendarApi) {
        console.log('[CalendarDateService] ✅ FullCalendar API ready after', Date.now() - startTime, 'ms');
        return calendarApi;
      }

      // Wait before next poll
      await this.delay(pollInterval);
    }

    console.error('[CalendarDateService] ❌ FullCalendar API timeout after', timeoutMs, 'ms');
    return null;
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * SYNCHRONOUS version for backwards compatibility (deprecated)
   * @deprecated Use setCalendarDate() instead
   */
  setCalendarDateSync(targetDate: Date): boolean {
    if (!this.calendarCallbacks) {
      console.error('[CalendarDateService] ❌ Cannot navigate - no calendar callbacks set');
      return false;
    }

    const calendarApi = this.calendarCallbacks.getCalendarApi();
    if (!calendarApi) {
      console.error('[CalendarDateService] ❌ Cannot navigate - calendar API not available');
      return false;
    }

    console.log('[CalendarDateService] 🧭 Navigating calendar to:', targetDate.toDateString());

    try {
      calendarApi.gotoDate(targetDate);
      return true;
    } catch (error) {
      console.error('[CalendarDateService] ❌ Calendar navigation failed:', error);
      return false;
    }
  }

  // === DATE RANGE CALCULATIONS ===

  /**
   * Get month range for a specific date (for pagination)
   */
  getMonthRange(date: Date): { start: Date; end: Date } {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    console.log('[CalendarDateService] 📊 Month range calculated:', {
      inputDate: date.toDateString(),
      startOfMonth: startOfMonth.toDateString(),
      endOfMonth: endOfMonth.toDateString(),
      daysInMonth: endOfMonth.getDate()
    });

    return {
      start: startOfMonth,
      end: endOfMonth
    };
  }

  /**
   * Get week range for a specific date
   */
  getWeekRange(date: Date, startDayOfWeek: number = 1): { start: Date; end: Date } {
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek - startDayOfWeek;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      start: startOfWeek,
      end: endOfWeek
    };
  }

  // === DATE VALIDATION ===

  /**
   * Check if date is within configuration range
   */
  isDateInConfigurationRange(date: Date, configuration: any): boolean {
    const scheduleStart = new Date(configuration.startDate);
    const scheduleEnd = new Date(configuration.endDate);

    return date >= scheduleStart && date <= scheduleEnd;
  }

  /**
   * Check if date is a teaching day
   */
  isTeachingDay(date: Date, teachingDays: string[]): boolean {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return teachingDays.includes(dayName);
  }

  /**
   * Find next teaching day from given date
   */
  findNextTeachingDay(fromDate: Date, teachingDays: string[], maxDaysToSearch: number = 14): Date | null {
    let currentDate = new Date(fromDate);

    for (let i = 0; i < maxDaysToSearch; i++) {
      if (this.isTeachingDay(currentDate, teachingDays)) {
        return new Date(currentDate);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null; // No teaching day found within search range
  }

  // === UTILITY METHODS ===

  /**
   * Check if two dates are in the same month
   */
  private areDatesInSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth();
  }

  /**
   * Format date for logging
   */
  formatDateForLogging(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get days between two dates
   */
  getDaysBetween(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Check if date is in the future
   */
  isFuture(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    return date > today;
  }

  /**
   * Check if date is in the past
   */
  isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date < today;
  }

  // === DEBUG METHODS ===

  /**
   * Get debug information about date calculations
   */
  getDebugInfo(configuration?: any): any {
    const today = new Date();

    let calculationResult = null;
    if (configuration) {
      calculationResult = this.calculateActiveDateDetailed(configuration);
    }

    return {
      dateService: {
        initialized: !!this.calendarCallbacks,
        canNavigateCalendar: !!this.calendarCallbacks?.getCalendarApi,
        currentTime: today.toISOString()
      },
      lastCalculation: calculationResult ? {
        activeDate: calculationResult.activeDate.toDateString(),
        reason: calculationResult.reason,
        configRange: {
          start: calculationResult.configurationDateRange.startDate.toDateString(),
          end: calculationResult.configurationDateRange.endDate.toDateString()
        },
        todayStatus: {
          isToday: this.isToday(calculationResult.activeDate),
          isFuture: this.isFuture(calculationResult.activeDate),
          isPast: this.isPast(calculationResult.activeDate)
        }
      } : null
    };
  }

  /**
   * Test date calculation with mock configuration
   */
  testDateCalculation(mockConfig: { startDate: string; endDate: string }): DateCalculationResult {
    console.log('[CalendarDateService] 🧪 Testing date calculation with mock config');
    return this.calculateActiveDateDetailed(mockConfig);
  }
}
