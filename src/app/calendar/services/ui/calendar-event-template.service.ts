// **COMPLETE FILE** - New calendar-event-template.service.ts
// RESPONSIBILITY: Generate HTML templates and styling for FullCalendar event display
// DOES NOT: Handle calendar configuration, API calls, or state management
// CALLED BY: CalendarConfigurationService for eventContent and eventDidMount

import { Injectable } from '@angular/core';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventTemplateService {

  constructor(private scheduleConfigurationStateService: ScheduleConfigurationStateService) {
    console.log('[CalendarEventTemplateService] Initialized for event template generation');
  }

  // === TEMPLATE GENERATION (CORE RESPONSIBILITY) ===

  /**
   * Generate HTML content for FullCalendar eventContent
   */
  generateEventHTML(scheduleEvent: any, periodAssignment: any): string {
    const textColor = periodAssignment?.fontColor || '#FFFFFF';
    
    // ERROR EVENTS - Special styling
    if (scheduleEvent?.eventType === 'Error') {
      return `
        <div class="custom-error-event" style="color: #d32f2f;">
          <div class="error-title">⚠️ Schedule Error</div>
        </div>
      `;
    }
    
    // LESSON EVENTS - Custom HTML with correct text color
    if (scheduleEvent?.lessonTitle) {
      const objectiveHtml = scheduleEvent.lessonObjective ? 
        `<div class="lesson-objective" style="color: ${textColor};">${scheduleEvent.lessonObjective}</div>` : 
        '';
      
      return `
        <div class="custom-lesson-event" style="color: ${textColor};">
          <div class="lesson-title">${scheduleEvent.lessonTitle}</div>
          ${objectiveHtml}
        </div>
      `;
    } 
    
    // OTHER EVENTS - Simple display with correct color
    return `
      <div class="custom-other-event" style="color: ${textColor};">
        <div class="event-title">${scheduleEvent?.eventType || 'Event'}</div>
      </div>
    `;
  }

  /**
   * Apply styling to event elements during eventDidMount
   */
  applyEventStyling(info: any): void {
    const extendedProps = info.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];
    
    // Apply period assignment background colors
    const periodAssignment = this.getPeriodAssignmentForEvent(scheduleEvent);
    
    if (periodAssignment && scheduleEvent?.eventType !== 'Error') {
      info.el.style.backgroundColor = periodAssignment.backgroundColor;
      info.el.style.borderColor = periodAssignment.backgroundColor;
      
      // Force text color on ALL text elements within the event
      const textColor = periodAssignment.fontColor || '#FFFFFF';
      const textElements = info.el.querySelectorAll('.fc-event-main, .custom-lesson-event, .lesson-title, .lesson-objective, .custom-other-event, .event-title');
      textElements.forEach((el: Element) => {
        (el as HTMLElement).style.setProperty('color', textColor, 'important');
      });
      
    } else if (scheduleEvent?.eventType === 'Error') {
      info.el.style.backgroundColor = '#ffebee';
      info.el.style.borderColor = '#f44336';
      
      // Force error text color
      const textElements = info.el.querySelectorAll('.fc-event-main, .custom-error-event');
      textElements.forEach((el: Element) => {
        (el as HTMLElement).style.setProperty('color', '#d32f2f', 'important');
      });
    }
    
    // Common styling
    info.el.style.cursor = 'pointer';
  }

  /**
   * Create period badge element
   */
  createPeriodBadge(period: number, periodAssignment: any): HTMLElement {
    const periodBadge = document.createElement('span');
    periodBadge.className = 'period-badge';
    periodBadge.textContent = `P${period}`;
    periodBadge.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: ${periodAssignment?.fontColor || '#333'};
      color: ${periodAssignment?.backgroundColor || '#fff'};
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      z-index: 2;
    `;
    return periodBadge;
  }

  /**
   * Apply teaching day styling to day cells
   */
  styleDayCell(dayEl: HTMLElement, date: Date, isTeachingDay: boolean, periodsPerDay: number): void {
    if (isTeachingDay) {
      dayEl.classList.add('teaching-day');
      
      // Add period count indicator
      const periodIndicator = document.createElement('div');
      periodIndicator.className = 'period-count-indicator';
      periodIndicator.textContent = `${periodsPerDay} periods`;
      dayEl.appendChild(periodIndicator);
    } else {
      dayEl.classList.add('non-teaching-day');
    }
  }

  /**
   * Apply CSS classes based on event type
   */
  applyEventTypeClasses(element: HTMLElement, scheduleEvent: any): void {
    // Clear existing event type classes
    element.classList.remove('calendar-event-lesson', 'calendar-event-special-period', 
                            'calendar-event-special-day', 'calendar-event-error');
    
    if (!scheduleEvent) return;
    
    const eventType = scheduleEvent.eventType;
    const eventCategory = scheduleEvent.eventCategory;
    
    if (eventCategory === 'Lesson') {
      element.classList.add('calendar-event-lesson');
    } else if (eventCategory === 'SpecialPeriod') {
      element.classList.add('calendar-event-special-period');
    } else if (eventCategory === 'SpecialDay') {
      element.classList.add('calendar-event-special-day');
    } else if (eventType === 'Error') {
      element.classList.add('calendar-event-error');
    }
  }

  // === HELPER METHODS ===

  /**
   * Get period assignment for styling lookup
   */
  private getPeriodAssignmentForEvent(scheduleEvent: any): any | null {
    if (!scheduleEvent?.period) return null;
    
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    if (!activeConfig?.periodAssignments) return null;
    
    return activeConfig.periodAssignments.find(
      (assignment: any) => assignment.period === scheduleEvent.period
    ) || null;
  }

  /**
   * Get debug info about template generation
   */
  getDebugInfo(): any {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    
    return {
      templateService: {
        initialized: true,
        canGenerateTemplates: true
      },
      activeConfiguration: {
        id: activeConfig?.id || null,
        periodAssignments: activeConfig?.periodAssignments?.length || 0
      }
    };
  }
}