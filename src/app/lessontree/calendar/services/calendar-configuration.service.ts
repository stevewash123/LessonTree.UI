// RESPONSIBILITY: Manages FullCalendar configuration options and calendar-specific settings for master schedule.
// DOES NOT: Handle events, state management, or API calls - pure configuration service.
// CALLED BY: LessonCalendarComponent for calendar setup and configuration updates.
import { Injectable, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleStateService } from './schedule-state.service';
import { UserService } from '../../../core/services/user.service';
import { parseTeachingDaysToArray } from '../../../models/utils/shared.utils';

// Constants for default schedule configuration
const DEFAULT_TEACHING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SCHOOL_YEAR_START_MONTH = 7; // August (0-indexed)
const SCHOOL_YEAR_START_DAY = 1;
const SCHOOL_YEAR_END_MONTH = 5; // June (0-indexed) 
const SCHOOL_YEAR_END_DAY = 15;

@Injectable({
  providedIn: 'root'
})
export class CalendarConfigurationService {
  // Computed teaching days for calendar display from master schedule
  readonly teachingDays = computed(() => {
    const masterSchedule = this.scheduleStateService.getMasterSchedule();
    if (!masterSchedule?.teachingDays) {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    return parseTeachingDaysToArray(masterSchedule.teachingDays);
  });

  // Computed hidden days for FullCalendar (0=Sunday, 1=Monday, etc.)
  readonly hiddenDays = computed(() => {
    const teaching = this.teachingDays();
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hiddenDayNumbers = allDays
      .filter(day => !teaching.includes(day))
      .map(day => dayMap[day as keyof typeof dayMap]);
    
    console.log(`[CalendarConfigurationService] Teaching: ${teaching.join(', ')}, Hidden: ${hiddenDayNumbers.join(', ')}`);
    return hiddenDayNumbers;
  });

  // Computed periods per day from user configuration
  readonly periodsPerDay = computed(() => {
    const userConfig = this.userService.getUserConfiguration();
    return userConfig?.periodsPerDay || 6;
  });

  constructor(
    private scheduleStateService: ScheduleStateService,
    private userService: UserService
  ) {
    console.log('[CalendarConfigurationService] Initialized for master schedule configuration');
  }

  
  // Get default date range for current school year
  getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const currentYear = new Date().getFullYear();
    return {
      startDate: new Date(currentYear, SCHOOL_YEAR_START_MONTH, SCHOOL_YEAR_START_DAY),
      endDate: new Date(currentYear + 1, SCHOOL_YEAR_END_MONTH, SCHOOL_YEAR_END_DAY)
    };
  }

  // Get default teaching days
  getDefaultTeachingDays(): string[] {
    return [...DEFAULT_TEACHING_DAYS];
  }

  // Get school year for a given date
  getSchoolYearForDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // School year runs from August to July
    if (month >= SCHOOL_YEAR_START_MONTH) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  // Get current school year
  getCurrentSchoolYear(): string {
    return this.getSchoolYearForDate(new Date());
  }

  // Create base calendar options - EVENT-BASED ONLY
  createCalendarOptions(
    eventClickHandler: (arg: any) => void,
    eventContextMenuHandler: (event: any, jsEvent: MouseEvent) => void,
    eventDropHandler: (arg: any) => void
  ): CalendarOptions {
    console.log('[CalendarConfigurationService] Creating calendar options for master schedule');

    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: this.getOptimalCalendarView(),
      dayCellDidMount: (arg) => this.handleDayCellMount(arg),
      eventDidMount: (info) => this.handleEventMount(info, eventClickHandler, eventContextMenuHandler),
      events: [],
      eventClick: () => {}, // Disabled - we use DOM listeners
      editable: true,
      eventDrop: eventDropHandler,
      selectable: false, // No date selection for master schedule
      selectMirror: false,
      hiddenDays: this.hiddenDays(),
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      slotMinTime: '07:00:00',
      slotMaxTime: '18:00:00',
      allDaySlot: false,
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        omitZeroMinute: false
      }
    };
  }

  // Handle day cell mounting - DISPLAY ONLY (no interactions)
  private handleDayCellMount(arg: any): void {
    // Basic styling for day cells - no interaction handlers
    const dayEl = arg.el;
    
    // Add period count display for teaching days
    const date = arg.date;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (this.teachingDays().includes(dayName)) {
      dayEl.classList.add('teaching-day');
      
      // Add period count indicator
      const periodCount = this.periodsPerDay();
      const periodIndicator = document.createElement('div');
      periodIndicator.className = 'period-count-indicator';
      periodIndicator.textContent = `${periodCount} periods`;
      dayEl.appendChild(periodIndicator);
    } else {
      dayEl.classList.add('non-teaching-day');
    }
    
    console.log('[CalendarConfigurationService] Day cell mounted with master schedule styling');
  }

  // Handle event mounting - FULL EVENT INTERACTION with period colors
  private handleEventMount(
    info: any, 
    eventClickHandler: (arg: any) => void,
    eventContextMenuHandler: (event: any, jsEvent: MouseEvent) => void
  ): void {
    console.log('[CalendarConfigurationService] Event mounted, attaching DOM listeners with period colors');
    
    // LEFT CLICK: Direct event interaction
    info.el.addEventListener('click', (jsEvent: MouseEvent) => {
      jsEvent.stopPropagation();
      console.log('[CalendarConfigurationService] Event left-clicked via DOM listener');
      
      const eventClickArg = this.createEventClickArg(info, jsEvent);
      eventClickHandler(eventClickArg);
    });
    
    // RIGHT CLICK: Context menu
    info.el.addEventListener('contextmenu', (jsEvent: MouseEvent) => {
      jsEvent.preventDefault();
      jsEvent.stopPropagation();
      console.log('[CalendarConfigurationService] Event right-clicked via DOM listener');
      
      eventContextMenuHandler(info, jsEvent);
    });
    
    // Apply master schedule event styling with period colors
    this.applyMasterScheduleEventStyling(info);
  }

  // Helper: Create FullCalendar-compatible EventClickArg from DOM event
  private createEventClickArg(info: any, jsEvent: MouseEvent): any {
    return {
      event: info.event,
      jsEvent: jsEvent,
      el: info.el,
      view: info.view
    };
  }

  // Apply master schedule event styling with period colors and type indicators
  private applyMasterScheduleEventStyling(info: any): void {
    const event = info.event;
    const extendedProps = event.extendedProps || {};
    const scheduleEvent = extendedProps.scheduleEvent;
    const periodAssignment = extendedProps.periodAssignment;
    
    // Clear any default styling
    info.el.style.backgroundColor = '';
    info.el.style.border = '';
    info.el.style.color = '';
    
    // Apply period colors if available
    if (periodAssignment) {
      info.el.style.backgroundColor = periodAssignment.backgroundColor;
      info.el.style.color = periodAssignment.fontColor;
      info.el.style.borderColor = periodAssignment.fontColor;
      info.el.style.borderWidth = '2px';
    }
    
    // Apply CSS classes based on event type
    if (scheduleEvent) {
      const eventType = scheduleEvent.eventType;
      const eventCategory = scheduleEvent.eventCategory;
      
      // Clear existing event type classes
      info.el.classList.remove('calendar-event-lesson', 'calendar-event-special-period', 
                              'calendar-event-special-day', 'calendar-event-error');
      
      if (eventCategory === 'Lesson') {
        info.el.classList.add('calendar-event-lesson');
      } else if (eventCategory === 'SpecialPeriod') {
        info.el.classList.add('calendar-event-special-period');
      } else if (eventCategory === 'SpecialDay') {
        info.el.classList.add('calendar-event-special-day');
      } else if (eventType === 'Error') {
        info.el.classList.add('calendar-event-error');
        // Override colors for error events to be more prominent
        info.el.style.backgroundColor = '#ffebee';
        info.el.style.color = '#d32f2f';
        info.el.style.borderColor = '#f44336';
      }
    }
    
    // Ensure events are clickable and distinct
    info.el.style.cursor = 'pointer';
    info.el.style.position = 'relative';
    info.el.style.zIndex = '1';
    info.el.style.fontSize = '0.85em';
    
    // Add period number badge
    const period = extendedProps.period;
    if (period) {
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
      info.el.style.position = 'relative';
      info.el.appendChild(periodBadge);
    }
    
    console.log('[CalendarConfigurationService] Applied master schedule styling with period colors');
  }

  // Update calendar options with current master schedule data
  updateCalendarOptionsForMasterSchedule(options: CalendarOptions): CalendarOptions {
    const masterSchedule = this.scheduleStateService.getMasterSchedule();
    if (!masterSchedule) {
      console.log('[CalendarConfigurationService] No master schedule available for options update');
      return options;
    }

    console.log('[CalendarConfigurationService] Updating options for master schedule');

    if (masterSchedule.startDate) {
      options.initialDate = new Date(masterSchedule.startDate);
    }

    options.hiddenDays = this.hiddenDays();
    options.initialView = this.getOptimalCalendarView();
    
    return options;
  }

  // Get current teaching days from master schedule
  getCurrentTeachingDays(): string[] {
    return this.teachingDays();
  }

  // Get current hidden days for FullCalendar
  getCurrentHiddenDays(): number[] {
    return this.hiddenDays();
  }

  // Check if a specific day is a teaching day
  isTeachingDay(dayName: string): boolean {
    return this.teachingDays().includes(dayName);
  }

  // Get day name from date
  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Check if date falls on a teaching day
  isDateOnTeachingDay(date: Date): boolean {
    const dayName = this.getDayName(date);
    return this.isTeachingDay(dayName);
  }

  // Get default calendar view based on teaching days and periods
  getOptimalCalendarView(): string {
    const teachingDaysCount = this.teachingDays().length;
    const periodsCount = this.periodsPerDay();
    
    // If many periods or few teaching days, use week view for better visibility
    if (periodsCount >= 7 || teachingDaysCount <= 3) {
      return 'timeGridWeek';
    }
    
    return 'dayGridMonth';
  }

  // Get master schedule configuration summary
  getMasterScheduleConfigSummary(): {
    teachingDays: string[];
    hiddenDays: number[];
    periodsPerDay: number;
    hasSchedule: boolean;
    optimalView: string;
  } {
    return {
      teachingDays: this.getCurrentTeachingDays(),
      hiddenDays: this.getCurrentHiddenDays(),
      periodsPerDay: this.periodsPerDay(),
      hasSchedule: this.scheduleStateService.hasActiveSchedule(),
      optimalView: this.getOptimalCalendarView()
    };
  }

  // Cleanup method
  cleanup(): void {
    console.log('[CalendarConfigurationService] Cleanup completed');
  }
}