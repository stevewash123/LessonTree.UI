// RESPONSIBILITY: Manages FullCalendar configuration options and calendar-specific settings for  schedule.
// DOES NOT: Handle events, state management, or API calls - pure configuration service.
// CALLED BY: LessonCalendarComponent for calendar setup and configuration updates.
import { Injectable, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleStateService } from './schedule-state.service';
import { ScheduleConfigurationStateService } from './schedule-configuration-state.service';
import { UserService } from '../../../core/services/user.service';
import { parseTeachingDaysToArray } from '../../../models/utils/shared.utils';
import { CalendarEventInteractionService } from './calandar-event-interaction.service';
import { CalendarDayCellService } from './calendar-day-cell.service';
import { CalendarEventTemplateService } from './calendar-event-template.service';

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
  // Computed teaching days for calendar display from active configuration
  readonly teachingDays = computed(() => {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    if (!activeConfig?.teachingDays) {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    return parseTeachingDaysToArray(activeConfig.teachingDays);
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

  // Computed periods per day from active configuration
  readonly periodsPerDay = computed(() => {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    return activeConfig?.periodsPerDay || 6;
  });

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private userService: UserService,
    private templateService: CalendarEventTemplateService,
    private interactionService: CalendarEventInteractionService,
    private dayCellService: CalendarDayCellService
  ) {
    console.log('[CalendarConfigurationService] Initialized with extracted services');
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

  
  
  // Get current teaching days from active configuration
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


  // Get  schedule configuration summary
  getScheduleConfigSummary(): {
    teachingDays: string[];
    hiddenDays: number[];
    periodsPerDay: number;
    hasSchedule: boolean;
    optimalView: string;
    extractedServices: any;
  } {
    return {
      teachingDays: this.getCurrentTeachingDays(),
      hiddenDays: this.getCurrentHiddenDays(),
      periodsPerDay: this.periodsPerDay(),
      hasSchedule: this.scheduleStateService.hasActiveSchedule(),
      optimalView: this.getOptimalCalendarView(),
      extractedServices: {
        template: this.templateService.getDebugInfo(),
        interaction: this.interactionService.getDebugInfo(),
        dayCell: this.dayCellService.getDebugInfo()
      }
    };
  }
  
  
  /**
   * Update createCalendarOptions to use period configuration
   */
  // **REPLACEMENT** - Update createCalendarOptions in calendar-configuration.service.ts

  // **PARTIAL FILE** - Replace these methods in calendar-configuration.service.ts

  // **PARTIAL FILE** - Replace these methods in calendar-configuration.service.ts

  createCalendarOptions(
  handleEventClick: (arg: any) => void,
  handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void,
  handleEventDrop: (arg: any) => void
): CalendarOptions {
  const periodsCount = this.periodsPerDay();
  
  return {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    
    // === PERIOD CONFIGURATION ===
    slotLabelFormat: (date) => {
      const currentHour = date.date.hour;
      const startHour = 8;
      const periodNumber = currentHour - startHour + 1;
      
      if (periodNumber > 0 && periodNumber <= periodsCount) {
        return `Period ${periodNumber}`;
      }
      return '';
    },
    
    // === TIME CONFIGURATION ===
    height: 'auto',
    slotDuration: '01:00:00',
    slotMinTime: '08:00:00',
    slotMaxTime: `${8 + periodsCount}:00:00`,
    hiddenDays: this.hiddenDays(),
    expandRows: true,
    
    // === EVENT CONFIGURATION (Delegated) ===
    eventContent: (arg) => {
      const scheduleEvent = arg.event.extendedProps?.['scheduleEvent'];
      const periodAssignment = this.getPeriodAssignmentForEvent(scheduleEvent);
      const html = this.templateService.generateEventHTML(scheduleEvent, periodAssignment);
      return { html };
    },
    
    eventDidMount: (info) => {
      this.interactionService.mountEvent(info, handleEventContextMenu);
    },
    
    dayCellDidMount: (arg) => {
      this.dayCellService.mountDayCell(arg, this.teachingDays(), periodsCount);
    },
    
    // === EVENT HANDLERS ===
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    
    // === CALENDAR BEHAVIOR ===
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    allDaySlot: false,
    eventDisplay: 'block',
  };
}
    
  // **ADD THIS HELPER METHOD** to calendar-configuration.service.ts
  private getPeriodAssignmentForEvent(scheduleEvent: any): any | null {
    if (!scheduleEvent?.period) return null;
    
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    if (!activeConfig?.periodAssignments) return null;
    
    return activeConfig.periodAssignments.find(
      (assignment: any) => assignment.period === scheduleEvent.period
    ) || null;
  }
  
  /**
   * MODIFY EXISTING METHOD - Update getOptimalCalendarView to prefer week view
   */
  getOptimalCalendarView(): string {
    const teachingDaysCount = this.teachingDays().length;
    const periodsCount = this.periodsPerDay();
    
    // Always prefer week view for period-based display
    // Month view will be tweaked separately later
    return 'timeGridWeek';
  }
  
  /**
   * Get period configuration summary for debugging
   */
  getPeriodConfigSummary(): {
    periodsPerDay: number;
    periodSlots: string[];
    timeRange: { start: string; end: string };
    slotDuration: string;
  } {
    const periodsCount = this.periodsPerDay();
    const startHour = 8;
    const endHour = startHour + periodsCount;
    
    const periodSlots = [];
    for (let i = 1; i <= periodsCount; i++) {
      periodSlots.push(`Period ${i}`);
    }
    
    return {
      periodsPerDay: periodsCount,
      periodSlots,
      timeRange: {
        start: `${startHour.toString().padStart(2, '0')}:00:00`,
        end: `${endHour.toString().padStart(2, '0')}:00:00`
      },
      slotDuration: '01:00:00'
    };
  }

  // Cleanup method
  cleanup(): void {
    console.log('[CalendarConfigurationService] Cleanup completed');
  }

  
}