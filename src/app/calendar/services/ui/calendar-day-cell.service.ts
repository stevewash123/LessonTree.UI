// **COMPLETE FILE** - Enhanced calendar-day-cell.service.ts with Observable patterns
// RESPONSIBILITY: Handle day cell mounting, styling, and teaching day indicators with Observable events
// DOES NOT: Manage configuration data, handle events, or business logic
// CALLED BY: CalendarConfigurationService for dayCellDidMount setup

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';

// ✅ Event interfaces for Observable pattern
export interface DayCellMountedEvent {
  date: Date;
  dateString: string;
  dayName: string;
  isTeachingDay: boolean;
  periodsPerDay: number;
  indicatorsAdded: string[];
  timestamp: Date;
}

export interface TeachingDayStyledEvent {
  date: Date;
  dateString: string;
  styleApplied: 'teaching-day' | 'non-teaching-day';
  classesAdded: string[];
  classesRemoved: string[];
  timestamp: Date;
}

export interface PeriodIndicatorEvent {
  date: Date;
  dateString: string;
  periodsPerDay: number;
  indicatorCreated: boolean;
  indicatorText: string;
  timestamp: Date;
}

export interface SpecialDayIndicatorEvent {
  date: Date;
  dateString: string;
  indicatorType: 'weekend' | 'holiday' | 'break';
  label: string;
  indicatorCreated: boolean;
  timestamp: Date;
}

export interface DateRangeHighlightEvent {
  startDate: Date;
  endDate: Date;
  highlightClass: string;
  cellsAffected: number;
  operation: 'highlight' | 'clear';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarDayCellService implements OnDestroy {

  // ✅ Observable event emissions
  private readonly _dayCellMounted = new Subject<DayCellMountedEvent>();
  private readonly _teachingDayStyled = new Subject<TeachingDayStyledEvent>();
  private readonly _periodIndicatorAdded = new Subject<PeriodIndicatorEvent>();
  private readonly _specialDayIndicatorAdded = new Subject<SpecialDayIndicatorEvent>();
  private readonly _dateRangeHighlighted = new Subject<DateRangeHighlightEvent>();

  // Public observables
  readonly dayCellMounted$ = this._dayCellMounted.asObservable();
  readonly teachingDayStyled$ = this._teachingDayStyled.asObservable();
  readonly periodIndicatorAdded$ = this._periodIndicatorAdded.asObservable();
  readonly specialDayIndicatorAdded$ = this._specialDayIndicatorAdded.asObservable();
  readonly dateRangeHighlighted$ = this._dateRangeHighlighted.asObservable();

  // ✅ Subscription management (for potential future Observable consumption)
  private subscriptions = new Subscription();

  constructor() {
    console.log('[CalendarDayCellService] Enhanced with Observable patterns for day cell coordination');
  }

  // === DAY CELL MOUNTING AND STYLING ===

  /**
   * ✅ Enhanced: Handle complete day cell mounting with Observable emission
   */
  mountDayCell(
    arg: any,
    teachingDays: string[],
    periodsPerDay: number
  ): void {
    console.log('[CalendarDayCellService] Mounting day cell with Observable event emission');

    const dayEl = arg.el;
    const date = arg.date;
    const dateString = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const isTeachingDay = teachingDays.includes(dayName);

    const indicatorsAdded: string[] = [];

    // Apply teaching day styling
    this.styleTeachingDay(dayEl, isTeachingDay, date, dateString);

    // Add period indicators for teaching days
    if (isTeachingDay) {
      this.addPeriodIndicator(dayEl, periodsPerDay, date, dateString);
      indicatorsAdded.push('period-count');
    }

    // Setup day cell interaction
    this.setupDayCellInteraction(dayEl, date, isTeachingDay);
    indicatorsAdded.push('interaction-setup');

    // ✅ Emit Observable event
    this._dayCellMounted.next({
      date,
      dateString,
      dayName,
      isTeachingDay,
      periodsPerDay,
      indicatorsAdded,
      timestamp: new Date()
    });

    console.log('[CalendarDayCellService] Day cell mounted and event emitted', {
      date: dateString,
      isTeachingDay,
      indicatorsAdded
    });
  }

  /**
   * ✅ Enhanced: Apply teaching day styling with Observable emission
   */
  private styleTeachingDay(
    dayElement: HTMLElement,
    isTeachingDay: boolean,
    date: Date,
    dateString: string
  ): void {
    const classesAdded: string[] = [];
    const classesRemoved: string[] = [];

    if (isTeachingDay) {
      dayElement.classList.add('teaching-day');
      dayElement.classList.remove('non-teaching-day');
      classesAdded.push('teaching-day');
      classesRemoved.push('non-teaching-day');
    } else {
      dayElement.classList.add('non-teaching-day');
      dayElement.classList.remove('teaching-day');
      classesAdded.push('non-teaching-day');
      classesRemoved.push('teaching-day');
    }

    // ✅ Emit Observable event
    this._teachingDayStyled.next({
      date,
      dateString,
      styleApplied: isTeachingDay ? 'teaching-day' : 'non-teaching-day',
      classesAdded,
      classesRemoved,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced: Add period indicator with Observable emission
   */
  private addPeriodIndicator(
    dayElement: HTMLElement,
    periodsPerDay: number,
    date: Date,
    dateString: string
  ): void {
    // Check if indicator already exists to avoid duplicates
    if (dayElement.querySelector('.period-count-indicator')) {
      console.log('[CalendarDayCellService] Period indicator already exists, skipping');
      return;
    }

    const periodIndicator = this.createPeriodIndicator(periodsPerDay);
    const indicatorText = `${periodsPerDay} periods`;
    dayElement.appendChild(periodIndicator);

    // ✅ Emit Observable event
    this._periodIndicatorAdded.next({
      date,
      dateString,
      periodsPerDay,
      indicatorCreated: true,
      indicatorText,
      timestamp: new Date()
    });

    console.log('[CalendarDayCellService] Period indicator added and event emitted', {
      date: dateString,
      periodsPerDay,
      indicatorText
    });
  }

  /**
   * Create period count indicator element
   */
  private createPeriodIndicator(periodsPerDay: number): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'period-count-indicator';
    indicator.textContent = `${periodsPerDay} periods`;

    // Basic styling - detailed styling should be in CSS
    indicator.style.cssText = `
      font-size: 0.7em;
      color: #666;
      position: absolute;
      bottom: 2px;
      right: 2px;
      background: rgba(255, 255, 255, 0.8);
      padding: 1px 3px;
      border-radius: 2px;
      pointer-events: none;
    `;

    return indicator;
  }

  /**
   * Setup day cell interaction and accessibility
   */
  private setupDayCellInteraction(dayElement: HTMLElement, date: Date, isTeachingDay: boolean): void {
    // Add accessibility attributes
    dayElement.setAttribute('data-teaching-day', isTeachingDay.toString());
    dayElement.setAttribute('data-date', date.toISOString().split('T')[0]);

    // Add interaction classes for CSS styling
    dayElement.classList.add('calendar-day-cell');

    if (isTeachingDay) {
      dayElement.classList.add('interactive-teaching-day');
    }
  }

  /**
   * ✅ Enhanced: Create special day indicator with Observable emission
   */
  createSpecialDayIndicator(
    type: 'weekend' | 'holiday' | 'break',
    label?: string,
    date?: Date
  ): HTMLElement {
    const indicator = document.createElement('div');
    const finalLabel = label || type.charAt(0).toUpperCase() + type.slice(1);
    indicator.className = `special-day-indicator ${type}-indicator`;
    indicator.textContent = finalLabel;

    // Type-specific styling
    let backgroundColor = '#f5f5f5';
    let textColor = '#666';

    switch (type) {
      case 'weekend':
        backgroundColor = '#e3f2fd';
        textColor = '#1976d2';
        break;
      case 'holiday':
        backgroundColor = '#fff3e0';
        textColor = '#f57c00';
        break;
      case 'break':
        backgroundColor = '#f3e5f5';
        textColor = '#7b1fa2';
        break;
    }

    indicator.style.cssText = `
      font-size: 0.65em;
      color: ${textColor};
      background: ${backgroundColor};
      position: absolute;
      top: 2px;
      left: 2px;
      padding: 1px 4px;
      border-radius: 3px;
      pointer-events: none;
      font-weight: 500;
    `;

    // ✅ Emit Observable event if date provided
    if (date) {
      this._specialDayIndicatorAdded.next({
        date,
        dateString: date.toISOString().split('T')[0],
        indicatorType: type,
        label: finalLabel,
        indicatorCreated: true,
        timestamp: new Date()
      });

      console.log('[CalendarDayCellService] Special day indicator created and event emitted', {
        type,
        label: finalLabel,
        date: date.toISOString().split('T')[0]
      });
    }

    return indicator;
  }

  /**
   * Update period count for existing day cell
   */
  updatePeriodCount(dayElement: HTMLElement, newPeriodsPerDay: number): void {
    const existingIndicator = dayElement.querySelector('.period-count-indicator');
    if (existingIndicator) {
      existingIndicator.textContent = `${newPeriodsPerDay} periods`;

      // Could emit update event here if needed
      console.log('[CalendarDayCellService] Period count updated', {
        newPeriodsPerDay
      });
    }
  }

  /**
   * ✅ Enhanced: Highlight date range with Observable emission
   */
  highlightDateRange(
    startDate: Date,
    endDate: Date,
    highlightClass: string,
    calendarApi: any
  ): void {
    console.log('[CalendarDayCellService] Highlighting date range with Observable event emission');

    // This would work with FullCalendar API to highlight date ranges
    const dayElements = calendarApi.el.querySelectorAll('.fc-daygrid-day, .fc-timegrid-day');
    let cellsAffected = 0;

    dayElements.forEach((dayEl: HTMLElement) => {
      const dateStr = dayEl.getAttribute('data-date');
      if (dateStr) {
        const cellDate = new Date(dateStr);
        if (cellDate >= startDate && cellDate <= endDate) {
          dayEl.classList.add(highlightClass);
          cellsAffected++;
        } else {
          dayEl.classList.remove(highlightClass);
        }
      }
    });

    // ✅ Emit Observable event
    this._dateRangeHighlighted.next({
      startDate,
      endDate,
      highlightClass,
      cellsAffected,
      operation: 'highlight',
      timestamp: new Date()
    });

    console.log('[CalendarDayCellService] Date range highlighted and event emitted', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      highlightClass,
      cellsAffected
    });
  }

  /**
   * ✅ Enhanced: Clear highlights with Observable emission
   */
  clearHighlights(calendarApi: any, highlightClass?: string): void {
    console.log('[CalendarDayCellService] Clearing highlights with Observable event emission');

    const selector = highlightClass ? `.${highlightClass}` : '[class*="highlight"]';
    const highlightedElements = calendarApi.el.querySelectorAll(selector);
    let cellsAffected = 0;

    highlightedElements.forEach((el: HTMLElement) => {
      if (highlightClass) {
        el.classList.remove(highlightClass);
      } else {
        // Remove all highlight classes
        el.className = el.className.replace(/\bhighlight\S*/g, '');
      }
      cellsAffected++;
    });

    // ✅ Emit Observable event
    this._dateRangeHighlighted.next({
      startDate: new Date(), // Placeholder for clear operation
      endDate: new Date(),   // Placeholder for clear operation
      highlightClass: highlightClass || 'all',
      cellsAffected,
      operation: 'clear',
      timestamp: new Date()
    });

    console.log('[CalendarDayCellService] Highlights cleared and event emitted', {
      highlightClass: highlightClass || 'all',
      cellsAffected
    });
  }

  // === DEBUG AND UTILITY ===

  /**
   * Get debug info about day cell setup
   */
  getDebugInfo(): any {
    return {
      dayCellService: {
        initialized: true,
        canStyleDayCells: true,
        observablePatterns: {
          dayCellMounted: true,
          teachingDayStyled: true,
          periodIndicatorAdded: true,
          specialDayIndicatorAdded: true,
          dateRangeHighlighted: true
        },
        supportedFeatures: [
          'teachingDayIndicators',
          'periodCountDisplay',
          'specialDayMarkers',
          'dateRangeHighlighting',
          'observableEventEmission'
        ]
      }
    };
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[CalendarDayCellService] Cleaning up Observable subscriptions and subjects');

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // ✅ Complete subjects
    this._dayCellMounted.complete();
    this._teachingDayStyled.complete();
    this._periodIndicatorAdded.complete();
    this._specialDayIndicatorAdded.complete();
    this._dateRangeHighlighted.complete();

    console.log('[CalendarDayCellService] All Observable subjects and subscriptions completed');
  }
}
