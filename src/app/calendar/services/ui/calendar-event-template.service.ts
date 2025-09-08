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

    // SPECIAL DAY EVENTS - Custom styling with darker background and title
    if (scheduleEvent?.eventCategory === 'SpecialDay') {
      return `
        <div class="custom-special-day-event" style="color: ${textColor};">
          <div class="special-day-type">${scheduleEvent.eventType}</div>
          <div class="special-day-title">${scheduleEvent.comment || ''}</div>
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

    if (scheduleEvent?.eventCategory === 'SpecialDay' && periodAssignment) {
      // Special day events - use darker shade of period color
      const darkerColor = this.darkenColor(periodAssignment.backgroundColor, 0.3);
      info.el.style.backgroundColor = darkerColor;
      info.el.style.borderColor = darkerColor;

      // Force text color on special day elements
      const textColor = periodAssignment.fontColor || '#FFFFFF';
      const textElements = info.el.querySelectorAll('.fc-event-main, .custom-special-day-event, .special-day-type, .special-day-title');
      textElements.forEach((el: Element) => {
        (el as HTMLElement).style.setProperty('color', textColor, 'important');
      });

    } else if (periodAssignment && scheduleEvent?.eventType !== 'Error') {
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

  // === HELPER METHODS ===

  /**
   * Create contrast version of color that maintains hue but provides visual distinction
   */
  private darkenColor(hexColor: string, percentage: number): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Convert RGB to HSL to maintain hue
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    
    let h, s, l;
    l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    
    // Reduce lightness by percentage while maintaining hue and saturation
    l = Math.max(0, l - percentage);
    // Slightly increase saturation for more vibrant darker color
    s = Math.min(1, s + 0.1);
    
    // Convert HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const rFinal = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const gFinal = Math.round(hue2rgb(p, q, h) * 255);
    const bFinal = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    
    // Convert back to hex
    const darkHex = '#' + 
      rFinal.toString(16).padStart(2, '0') + 
      gFinal.toString(16).padStart(2, '0') + 
      bFinal.toString(16).padStart(2, '0');
    
    return darkHex;
  }

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
