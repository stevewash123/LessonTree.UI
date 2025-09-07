// RESPONSIBILITY: Manages FullCalendar configuration options and calendar-specific settings for  schedule.
// DOES NOT: Handle events, state management, or API calls - pure configuration service.
// CALLED BY: LessonCalendarComponent for calendar setup and configuration updates.
import { Injectable, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { UserService } from '../../../user-config/user.service';
import { parseTeachingDaysToArray } from '../../../shared/utils/shared.utils';
import { CalendarEventInteractionService } from './calendar-event-interaction.service';
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

  createCalendarOptions(
    handleEventClick: (arg: any) => void,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void,
    handleEventDrop: (arg: any) => void,
    handleDatesSet?: (dateInfo: { start: Date; end: Date; view: any }) => void, // NEW: Navigation callback
    initialDate?: Date  // 🔧 NEW: Set initial calendar date to prevent wrong week requests
  ): CalendarOptions {
    const periodsCount = this.periodsPerDay();
    
    if (initialDate) {
      console.log('[CalendarConfigurationService] 🎯 Setting initial calendar date:', {
        initialDate: initialDate.toDateString(),
        initialDateISO: initialDate.toISOString(),
        dayOfWeek: initialDate.toLocaleDateString('en-US', { weekday: 'long' })
      });
    } else {
      console.log('[CalendarConfigurationService] ⚠️ No initial date provided - calendar will use default');
    }

    return {
      plugins: [timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      initialDate: initialDate, // 🔧 FIXED: Set initial date to prevent wrong week calculation
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

      // === VIEW-SPECIFIC CONFIGURATION ===
      views: {
        timeGrid: {
          allDaySlot: false,  // ✅ CRITICAL: Hide All Day row in TimeGrid views
          slotDuration: '01:00:00',
          slotMinTime: '08:00:00',
          slotMaxTime: `${8 + periodsCount}:00:00`,
          eventMinHeight: 70,  // ✅ UPDATED: Increased from 20px to match CSS styling for better event fill
          expandRows: true,    // Make rows expand to fill space
        }
      },

      // === GLOBAL CONFIGURATION ===
      height: 'auto',
      hiddenDays: this.hiddenDays(),

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

      // === EVENT HANDLERS ===
      eventClick: handleEventClick,
      eventDrop: handleEventDrop,

      // === NAVIGATION CALLBACK (NEW) ===
      datesSet: (dateInfo) => {
        console.log('[CalendarConfigurationService] 📅 Calendar navigation detected:', {
          start: dateInfo.start.toDateString(),
          end: dateInfo.end.toDateString(),
          view: dateInfo.view.type
        });

        // Call the navigation handler if provided
        if (handleDatesSet) {
          handleDatesSet({
            start: dateInfo.start,
            end: dateInfo.end,
            view: dateInfo.view
          });
        }
      },

      // === CALENDAR BEHAVIOR ===
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
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



  // Cleanup method
  cleanup(): void {
    console.log('[CalendarConfigurationService] Cleanup completed');
  }


}
