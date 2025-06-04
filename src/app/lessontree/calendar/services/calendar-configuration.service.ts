/* src/app/lessontree/calendar/services/calendar-configuration.service.ts - PHASE 2 COMPLETE */
// RESPONSIBILITY: Manages FullCalendar configuration options and calendar-specific settings.
// DOES NOT: Handle events, state management, or API calls - pure configuration service.
// CALLED BY: LessonCalendarComponent for calendar setup and configuration updates.
import { Injectable, inject, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleStateService } from './schedule-state.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarConfigurationService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly nodeSelectionService = inject(NodeSelectionService);

  constructor() {
    console.log('[CalendarConfigurationService] Initialized - event-based interactions only');
  }

  // Computed teaching days for calendar display
  readonly teachingDays = computed(() => {
    const schedule = this.scheduleStateService.selectedSchedule();
    if (!schedule?.teachingDays) {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    return schedule.teachingDays.split(',').map(day => day.trim());
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

  // Create base calendar options - EVENT-BASED ONLY
  createCalendarOptions(
    eventClickHandler: (arg: any) => void,
    eventContextMenuHandler: (event: any, jsEvent: MouseEvent) => void,
    eventDropHandler: (arg: any) => void
  ): CalendarOptions {
    console.log('[CalendarConfigurationService] Creating calendar options - event-based interactions only');

    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      dayCellDidMount: (arg) => this.handleDayCellMount(arg),
      eventDidMount: (info) => this.handleEventMount(info, eventClickHandler, eventContextMenuHandler),
      events: [],
      eventClick: () => {}, // Disabled - we use DOM listeners
      editable: true,
      eventDrop: eventDropHandler,
      selectable: false, // No date selection
      selectMirror: false,
      hiddenDays: []
    };
  }

  // Handle day cell mounting - DISPLAY ONLY (no interactions)
  private handleDayCellMount(arg: any): void {
    // Only basic styling for day cells - no interaction handlers
    console.log('[CalendarConfigurationService] Day cell mounted - display only');
  }

  // Handle event mounting - FULL EVENT INTERACTION
  private handleEventMount(
    info: any, 
    eventClickHandler: (arg: any) => void,
    eventContextMenuHandler: (event: any, jsEvent: MouseEvent) => void
  ): void {
    console.log('[CalendarConfigurationService] Event mounted, attaching DOM listeners');
    
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
    
    // Apply distinct event styling
    this.applyDistinctEventStyling(info);
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

  // Apply distinct event styling - NO DAY CELL BLENDING
  private applyDistinctEventStyling(info: any): void {
    const event = info.event;
    const extendedProps = event.extendedProps || {};
    const specialCode = extendedProps.specialCode;
    const lesson = extendedProps.lesson;
    
    // Clear any default styling
    info.el.style.backgroundColor = '';
    info.el.style.border = '';
    
    // Apply CSS classes for distinct event appearance
    if (specialCode === 'Error Day') {
      info.el.classList.add('calendar-event-error');
    } else if (specialCode && !lesson) {
      info.el.classList.add('calendar-event-special');
    } else if (lesson && !specialCode) {
      info.el.classList.add('calendar-event-lesson');
    } else {
      info.el.classList.add('calendar-event-default');
    }
    
    // Ensure events are clickable and distinct
    info.el.style.cursor = 'pointer';
    info.el.style.position = 'relative';
    info.el.style.zIndex = '1';
    
    console.log('[CalendarConfigurationService] Applied distinct styling to event');
  }

  // Update event selection highlighting - EVENT-LEVEL ONLY
  updateEventSelectionHighlighting(): void {
    console.log('[CalendarConfigurationService] Updating event selection highlighting');
    
    const selectedNode = this.nodeSelectionService.selectedNode();
    const selectedLessonId = selectedNode?.nodeType === 'Lesson' ? selectedNode.id : null;
    
    // Find all calendar events and update their styling
    const eventElements = document.querySelectorAll('.fc-event');
    
    eventElements.forEach(eventEl => {
      const fcEventEl = eventEl as any;
      
      // Access the event data through FullCalendar's internal structure
      if (fcEventEl.fcSeg && fcEventEl.fcSeg.eventRange && fcEventEl.fcSeg.eventRange.def) {
        const event = fcEventEl.fcSeg.eventRange.def;
        const extendedProps = event.extendedProps || {};
        const lesson = extendedProps.lesson;
        
        const isSelectedLesson = selectedLessonId && lesson && selectedNode?.id === lesson.id;
        
        // Apply selection highlighting to individual events
        if (isSelectedLesson) {
          eventEl.classList.add('calendar-event-selected');
        } else {
          eventEl.classList.remove('calendar-event-selected');
        }
      }
    });
  }
  // Update calendar options with current schedule data
  updateCalendarOptionsForSchedule(options: CalendarOptions, schedule: any): CalendarOptions {
    if (!schedule) return options;

    console.log('[CalendarConfigurationService] Updating options for schedule');

    if (schedule.startDate) {
      options.initialDate = new Date(schedule.startDate);
    }

    options.hiddenDays = this.hiddenDays();
    return options;
  }

  // Get current teaching days from schedule
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

  // Get default calendar view based on teaching days
  getOptimalCalendarView(): string {
    const teachingDaysCount = this.teachingDays().length;
    return teachingDaysCount <= 3 ? 'timeGridWeek' : 'dayGridMonth';
  }

  cleanup(): void {
    console.log('[CalendarConfigurationService] Cleanup completed');
  }
}