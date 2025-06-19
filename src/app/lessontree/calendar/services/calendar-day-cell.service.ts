// **COMPLETE FILE** - New calendar-day-cell.service.ts
// RESPONSIBILITY: Handle day cell mounting, styling, and teaching day indicators
// DOES NOT: Manage configuration data, handle events, or business logic
// CALLED BY: CalendarConfigurationService for dayCellDidMount setup

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CalendarDayCellService {

  constructor() {
    console.log('[CalendarDayCellService] Initialized for day cell styling and indicators');
  }

  // === DAY CELL MOUNTING AND STYLING ===

  /**
   * Handle complete day cell mounting with teaching day styling
   */
  mountDayCell(
    arg: any,
    teachingDays: string[],
    periodsPerDay: number
  ): void {
    const dayEl = arg.el;
    const date = arg.date;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const isTeachingDay = teachingDays.includes(dayName);
    
    // Apply teaching day styling
    this.styleTeachingDay(dayEl, isTeachingDay);
    
    // Add period indicators for teaching days
    if (isTeachingDay) {
      this.addPeriodIndicator(dayEl, periodsPerDay);
    }
    
    // Setup day cell interaction
    this.setupDayCellInteraction(dayEl, date, isTeachingDay);
  }

  /**
   * Apply teaching day vs non-teaching day styling
   */
  private styleTeachingDay(dayElement: HTMLElement, isTeachingDay: boolean): void {
    if (isTeachingDay) {
      dayElement.classList.add('teaching-day');
      dayElement.classList.remove('non-teaching-day');
    } else {
      dayElement.classList.add('non-teaching-day');
      dayElement.classList.remove('teaching-day');
    }
  }

  /**
   * Add period count indicator to teaching days
   */
  private addPeriodIndicator(dayElement: HTMLElement, periodsPerDay: number): void {
    // Check if indicator already exists to avoid duplicates
    if (dayElement.querySelector('.period-count-indicator')) {
      return;
    }
    
    const periodIndicator = this.createPeriodIndicator(periodsPerDay);
    dayElement.appendChild(periodIndicator);
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
   * Create weekend/holiday indicator
   */
  createSpecialDayIndicator(type: 'weekend' | 'holiday' | 'break', label?: string): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = `special-day-indicator ${type}-indicator`;
    indicator.textContent = label || type.charAt(0).toUpperCase() + type.slice(1);
    
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
    
    return indicator;
  }

  /**
   * Update period count for existing day cell
   */
  updatePeriodCount(dayElement: HTMLElement, newPeriodsPerDay: number): void {
    const existingIndicator = dayElement.querySelector('.period-count-indicator');
    if (existingIndicator) {
      existingIndicator.textContent = `${newPeriodsPerDay} periods`;
    }
  }

  /**
   * Highlight specific date ranges (like current week, selected range, etc.)
   */
  highlightDateRange(
    startDate: Date, 
    endDate: Date, 
    highlightClass: string,
    calendarApi: any
  ): void {
    // This would work with FullCalendar API to highlight date ranges
    const dayElements = calendarApi.el.querySelectorAll('.fc-daygrid-day, .fc-timegrid-day');
    
    dayElements.forEach((dayEl: HTMLElement) => {
      const dateStr = dayEl.getAttribute('data-date');
      if (dateStr) {
        const cellDate = new Date(dateStr);
        if (cellDate >= startDate && cellDate <= endDate) {
          dayEl.classList.add(highlightClass);
        } else {
          dayEl.classList.remove(highlightClass);
        }
      }
    });
  }

  /**
   * Clear all day cell highlights
   */
  clearHighlights(calendarApi: any, highlightClass?: string): void {
    const selector = highlightClass ? `.${highlightClass}` : '[class*="highlight"]';
    const highlightedElements = calendarApi.el.querySelectorAll(selector);
    
    highlightedElements.forEach((el: HTMLElement) => {
      if (highlightClass) {
        el.classList.remove(highlightClass);
      } else {
        // Remove all highlight classes
        el.className = el.className.replace(/\bhighlight\S*/g, '');
      }
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
        supportedFeatures: [
          'teachingDayIndicators',
          'periodCountDisplay',
          'specialDayMarkers',
          'dateRangeHighlighting'
        ]
      }
    };
  }
}