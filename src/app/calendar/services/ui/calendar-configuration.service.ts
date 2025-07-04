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

        // Add context menu support to day cells
        if (arg.el) {
          const contextHandler = (e: Event) => {
            const mouseEvent = e as MouseEvent;

            // Only handle context menu if not clicking on an event
            if (!(e.target as Element).closest('.fc-event')) {
              mouseEvent.preventDefault();
              mouseEvent.stopPropagation();

              console.log('[CalendarConfiguration] Day cell context menu triggered for:', arg.date);

              // Create a synthetic event info for day cell context
              const dayContextInfo = {
                date: arg.date,
                el: arg.el,
                view: arg.view
              };

              // Call the context menu handler with day context
              handleEventContextMenu(dayContextInfo, mouseEvent);
            }
          };

          arg.el.addEventListener('contextmenu', contextHandler, { passive: false });
          (arg.el as any).__dayContextHandler = contextHandler;
        }
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



  // Cleanup method
  cleanup(): void {
    console.log('[CalendarConfigurationService] Cleanup completed');
  }


}
