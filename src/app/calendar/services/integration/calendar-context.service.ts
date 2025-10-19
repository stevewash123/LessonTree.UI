// calendar-context.service.ts
// RESPONSIBILITY: Provide calendar date range context to any service that needs optimization
// DOES: Exposes current calendar view as observable/signal for cross-service integration
// LOCATION: /calendar/services/integration/ (Cross-domain coordination)

import { Injectable, computed, signal, inject } from '@angular/core';
import { CalendarDateService } from '../core/calendar-date.service';

export interface CalendarContext {
  currentDate: Date | null;
  weekRange: { start: Date; end: Date } | null;
  monthRange: { start: Date; end: Date } | null;
  isAvailable: boolean;
}

export interface CalendarOptimizationPayload {
  calendarStartDate?: string; // ISO format for API
  calendarEndDate?: string;   // ISO format for API
  requestPartialScheduleUpdate: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarContextService {

  private calendarDateService = inject(CalendarDateService);

  // ✅ REACTIVE STATE: Current calendar context as signal
  private _isCalendarActive = signal<boolean>(false);
  private _currentContext = signal<CalendarContext>({
    currentDate: null,
    weekRange: null,
    monthRange: null,
    isAvailable: false
  });

  // ✅ PUBLIC COMPUTED: Reactive calendar context
  readonly calendarContext = computed(() => this._currentContext());
  readonly isCalendarActive = computed(() => this._isCalendarActive());
  readonly hasDateRange = computed(() => this.calendarContext().isAvailable);

  constructor() {
    console.log('[CalendarContextService] Calendar context provider initialized');
  }

  // ===== CONTEXT MANAGEMENT =====

  /**
   * Mark calendar as active and available for optimization
   * Called by CalendarComponent during initialization
   */
  setCalendarActive(isActive: boolean): void {
    console.log('[CalendarContextService] Calendar active state:', isActive);
    this._isCalendarActive.set(isActive);

    if (isActive) {
      this.refreshContext();
    } else {
      this._currentContext.set({
        currentDate: null,
        weekRange: null,
        monthRange: null,
        isAvailable: false
      });
    }
  }

  /**
   * Refresh calendar context from CalendarDateService
   * Called when calendar navigation occurs
   */
  refreshContext(): void {
    console.log('[CalendarContextService] 🔄 Refreshing calendar context');

    const currentDate = this.calendarDateService.getCurrentCalendarDate();

    if (currentDate) {
      const weekRange = this.calendarDateService.getWeekRange(currentDate);
      const monthRange = this.calendarDateService.getMonthRange(currentDate);

      const context: CalendarContext = {
        currentDate,
        weekRange,
        monthRange,
        isAvailable: true
      };

      console.log('[CalendarContextService] ✅ Context updated:', {
        currentDate: currentDate.toDateString(),
        weekStart: weekRange.start.toDateString(),
        weekEnd: weekRange.end.toDateString()
      });

      this._currentContext.set(context);
    } else {
      console.log('[CalendarContextService] ⚠️ No current date available');
      this._currentContext.set({
        currentDate: null,
        weekRange: null,
        monthRange: null,
        isAvailable: false
      });
    }
  }

  // ===== API PAYLOAD GENERATION =====

  /**
   * Get calendar optimization payload for API calls
   * Returns null if no calendar context is available
   * ✅ UPDATED: Enhanced handling for calendar not-instantiated scenarios
   */
  getOptimizationPayload(viewMode: 'week' | 'month' = 'week'): CalendarOptimizationPayload | null {
    const context = this.calendarContext();
    const isCalendarActive = this.isCalendarActive();

    // ✅ NEW: First check if calendar is active/instantiated
    if (!isCalendarActive) {
      console.log('[CalendarContextService] ❌ Calendar not open/instantiated - returning null for optimization');
      return null;
    }

    if (!context.isAvailable) {
      console.log('[CalendarContextService] ❌ No calendar context available for optimization');
      return null;
    }

    const dateRange = viewMode === 'week' ? context.weekRange : context.monthRange;

    if (!dateRange) {
      console.log('[CalendarContextService] ❌ No date range available for viewMode:', viewMode);
      return null;
    }

    const payload: CalendarOptimizationPayload = {
      calendarStartDate: dateRange.start.toISOString(),
      calendarEndDate: dateRange.end.toISOString(),
      requestPartialScheduleUpdate: true
    };

    console.log('[CalendarContextService] ✅ Generated optimization payload:', {
      viewMode,
      startDate: dateRange.start.toDateString(),
      endDate: dateRange.end.toDateString()
    });

    return payload;
  }

  /**
   * Check if calendar optimization is currently possible
   * ✅ UPDATED: Also check if calendar is active/instantiated
   */
  canOptimize(): boolean {
    return this.isCalendarActive() && this.hasDateRange();
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Get current calendar week range
   */
  getCurrentWeekRange(): { start: Date; end: Date } | null {
    return this.calendarContext().weekRange;
  }

  /**
   * Get current calendar month range
   */
  getCurrentMonthRange(): { start: Date; end: Date } | null {
    return this.calendarContext().monthRange;
  }

  /**
   * Get current calendar date
   */
  getCurrentDate(): Date | null {
    return this.calendarContext().currentDate;
  }

  // ===== DEBUG METHODS =====

  /**
   * Get debug information about calendar context
   */
  getDebugInfo(): any {
    const context = this.calendarContext();

    return {
      isCalendarActive: this.isCalendarActive(),
      hasDateRange: this.hasDateRange(),
      currentDate: context.currentDate?.toDateString() || 'none',
      weekRange: context.weekRange ? {
        start: context.weekRange.start.toDateString(),
        end: context.weekRange.end.toDateString()
      } : null,
      monthRange: context.monthRange ? {
        start: context.monthRange.start.toDateString(),
        end: context.monthRange.end.toDateString()
      } : null,
      canOptimize: this.canOptimize()
    };
  }

  /**
   * Test calendar context with current state
   */
  testContext(): void {
    console.log('[CalendarContextService] 🧪 === CALENDAR CONTEXT TEST ===');
    console.log('Debug Info:', this.getDebugInfo());
    console.log('Optimization Payload (week):', this.getOptimizationPayload('week'));
    console.log('Optimization Payload (month):', this.getOptimizationPayload('month'));
    console.log('[CalendarContextService] 🧪 === END TEST ===');
  }
}