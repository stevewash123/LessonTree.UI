// **COMPLETE FILE** - Cleaned calendar-day-cell.service.ts
// RESPONSIBILITY: Pure day cell DOM manipulation and styling for calendar display
// DOES NOT: Observable coordination, complex event emission, subscription management
// CALLED BY: CalendarConfigurationService for dayCellDidMount setup

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CalendarDayCellService {

  constructor() {
    console.log('[CalendarDayCellService] Initialized for pure day cell DOM manipulation');
  }

  // === DAY CELL MOUNTING AND STYLING ===

  /**
   * Handle complete day cell mounting with DOM styling setup
   */
  mountDayCell(
    arg: any,
    teachingDays: string[],
    periodsPerDay: number
  ): void {
    console.log('[CalendarDayCellService] Mounting day cell with DOM styling');

    const dayEl = arg.el;
    const date = arg.date;
    const dateString = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const isTeachingDay = teachingDays.includes(dayName);

    // Apply teaching day styling
    this.styleTeachingDay(dayEl, isTeachingDay, date, dateString);

    // Add period indicators for teaching days
    if (isTeachingDay) {
      this.addPeriodIndicator(dayEl, periodsPerDay, date, dateString);
    }

    // Setup basic day cell interaction
    this.setupDayCellInteraction(dayEl, date, isTeachingDay);

    console.log('[CalendarDayCellService] Day cell mounted with styling:', {
      date: dateString,
      isTeachingDay,
      periodsPerDay
    });
  }

  /**
   * Apply teaching day styling to day element
   */
  private styleTeachingDay(
    dayElement: HTMLElement,
    isTeachingDay: boolean,
    date: Date,
    dateString: string
  ): void {
    if (isTeachingDay) {
      dayElement.classList.add('teaching-day');
      dayElement.classList.remove('non-teaching-day');
    } else {
      dayElement.classList.add('non-teaching-day');
      dayElement.classList.remove('teaching-day');
    }

    console.log('[CalendarDayCellService] Applied teaching day styling:', {
      date: dateString,
      isTeachingDay
    });
  }

  /**
   * Add period indicator to day cell
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
    dayElement.appendChild(periodIndicator);

    console.log('[CalendarDayCellService] Period indicator added:', {
      date: dateString,
      periodsPerDay
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

  // === SPECIAL DAY INDICATORS ===

  /**
   * Create special day indicator element
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

    if (date) {
      console.log('[CalendarDayCellService] Special day indicator created:', {
        type,
        label: finalLabel,
        date: date.toISOString().split('T')[0]
      });
    }

    return indicator;
  }

  // === UTILITY METHODS ===

  /**
   * Update period count for existing day cell
   */
  updatePeriodCount(dayElement: HTMLElement, newPeriodsPerDay: number): void {
    const existingIndicator = dayElement.querySelector('.period-count-indicator');
    if (existingIndicator) {
      existingIndicator.textContent = `${newPeriodsPerDay} periods`;
      console.log('[CalendarDayCellService] Period count updated:', { newPeriodsPerDay });
    }
  }

  /**
   * Apply custom styling to day cell
   */
  applyCustomStyling(dayElement: HTMLElement, styleClass: string): void {
    dayElement.classList.add(styleClass);
  }

  /**
   * Remove custom styling from day cell
   */
  removeCustomStyling(dayElement: HTMLElement, styleClass: string): void {
    dayElement.classList.remove(styleClass);
  }

  /**
   * Check if day cell has teaching day styling
   */
  isTeachingDayStyled(dayElement: HTMLElement): boolean {
    return dayElement.classList.contains('teaching-day');
  }

  /**
   * Get period count from day cell indicator
   */
  getPeriodCountFromIndicator(dayElement: HTMLElement): number | null {
    const indicator = dayElement.querySelector('.period-count-indicator');
    if (indicator && indicator.textContent) {
      const match = indicator.textContent.match(/(\d+) periods/);
      return match ? parseInt(match[1], 10) : null;
    }
    return null;
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
        supportedFeatures: [
          'teachingDayIndicators',
          'periodCountDisplay',
          'specialDayMarkers',
          'customStyling',
          'accessibilityAttributes'
        ],
        cleanedUp: {
          observablePatterns: 'removed',
          subscriptionManagement: 'removed',
          complexEventInterfaces: 'removed',
          lineCount: 'reduced ~50%'
        }
      }
    };
  }

  /**
   * Cleanup method for manual cleanup if needed
   */
  cleanup(): void {
    console.log('[CalendarDayCellService] Manual cleanup completed');
  }
}
