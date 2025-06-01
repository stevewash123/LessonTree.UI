/* src/app/lessontree/calendar/services/calendar-configuration.service.ts - COMPLETE FILE */
// RESPONSIBILITY: Manages FullCalendar configuration options and calendar-specific settings.
// DOES NOT: Handle events, state management, or API calls - pure configuration service.
// CALLED BY: LessonCalendarComponent for calendar setup and configuration updates.
import { Injectable, inject, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';

import { ScheduleStateService } from './schedule-state.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarConfigurationService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly nodeSelectionService = inject(NodeSelectionService);

  // Removed hover system - keeping configuration utilities

  constructor() {
    console.log('[CalendarConfigurationService] Initialized');
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

  // Create base calendar options
  createCalendarOptions(
    eventClickHandler: (arg: any) => void,
    dateClickHandler: (arg: any) => void,
    eventDropHandler: (arg: any) => void,
    dateContextMenuHandler?: (date: Date, jsEvent: MouseEvent) => void
  ): CalendarOptions {
    console.log('[CalendarConfigurationService] Creating calendar options with right-click system');
  
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      dayCellDidMount: (arg) => this.handleDayCellMount(arg, dateContextMenuHandler),
      eventDidMount: (info) => this.handleEventMount(info, eventClickHandler),
      events: [],
      eventClick: eventClickHandler,
      dateClick: dateClickHandler,
      editable: true,
      eventDrop: eventDropHandler,
      selectable: true,
      selectMirror: false,
      hiddenDays: []
    };
  }

  // Handle day cell mounting with right-click listeners
  private handleDayCellMount(arg: any, dateContextMenuHandler?: (date: Date, jsEvent: MouseEvent) => void): void {
    if (dateContextMenuHandler) {
      // Add right-click listener for context menu
      arg.el.addEventListener('contextmenu', (jsEvent: MouseEvent) => {
        jsEvent.preventDefault();
        console.log(`[CalendarConfigurationService] Right-click detected on date: ${format(arg.date, 'yyyy-MM-dd')}`);
        dateContextMenuHandler(arg.date, jsEvent);
      });
    }
  }

  // Handle event mounting with styling only
  private handleEventMount(info: any, eventClickHandler: (arg: any) => void): void {
    this.setDayCellBackgroundColor(info);
    // Note: Event right-click can be added here if needed later
  }

  // Helper method to get any event for a specific date (replaces getLessonEventOnDate)
  getEventForDate(date: Date, calendarApi: any): any | null {
    if (!calendarApi) return null;
    
    // Format the date to match FullCalendar's date format
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get all events on this date
    const eventsOnDate = calendarApi.getEvents().filter((event: any) => {
      if (!event.start) return false;
      const eventDateStr = event.start.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
    
    // Return the first event (should be only one per day in your system)
    const dayEvent = eventsOnDate[0] || null;
    
    if (dayEvent) {
      const extendedProps = dayEvent.extendedProps || {};
      console.log(`[CalendarConfigurationService] Found event for date ${dateStr}:`, {
        title: dayEvent.title,
        specialCode: extendedProps.specialCode,
        hasLesson: !!extendedProps.lesson
      });
    }
    
    return dayEvent;
  }

  // Get day type from event data
  getDayTypeFromEvent(event: any): 'lesson' | 'ntd' | 'error' | 'unknown' {
    if (!event) return 'unknown';
    
    const extendedProps = event.extendedProps || {};
    const specialCode = extendedProps.specialCode;
    const lesson = extendedProps.lesson;
    
    if (specialCode === 'Error Day') {
      return 'error';
    } else if (specialCode && !lesson) {
      return 'ntd'; // Non-Teaching Day
    } else if (lesson && !specialCode) {
      return 'lesson';
    }
    
    return 'unknown';
  }

  // Set day cell background color using DOM manipulation
  private setDayCellBackgroundColor(info: any): void {
    const event = info.event;
    const extendedProps = event.extendedProps || {};
    const specialCode = extendedProps.specialCode;
    const lesson = extendedProps.lesson;
    
    const dayCell = info.el.closest('.fc-daygrid-day');
    if (!dayCell) return;
    
    // Check for lesson selection
    const selectedNode = this.nodeSelectionService.selectedNode();
    const isSelectedLesson = selectedNode?.nodeType === 'Lesson' && 
                             lesson && 
                             selectedNode.id === lesson.id;
    
    const dayCellElement = dayCell as HTMLElement;
    
    if (isSelectedLesson) {
      dayCellElement.style.backgroundColor = '#bbdefb';
      dayCellElement.style.border = '2px solid #1976d2';
      console.log('[CalendarConfigurationService] Applied selection highlighting');
    } else {
      dayCellElement.style.border = '';
      
      if (specialCode === 'Error Day') {
        dayCellElement.style.backgroundColor = '#ffebee';
      } else if (specialCode) {
        dayCellElement.style.backgroundColor = '#fff8e1';
      } else {
        dayCellElement.style.backgroundColor = '#e3f2fd';
      }
    }
    
    // Style event content to blend with day cell
    if (specialCode === 'Error Day' || specialCode) {
      info.el.style.backgroundColor = 'transparent';
      info.el.style.border = 'none';
    } else {
      info.el.style.backgroundColor = isSelectedLesson ? '#bbdefb' : '#e3f2fd';
      info.el.style.border = 'none';
    }
  }

  // Update day cell highlighting when selection changes
  updateDayCellSelectionHighlighting(): void {
    const selectedNode = this.nodeSelectionService.selectedNode();
    const selectedLessonId = selectedNode?.nodeType === 'Lesson' ? selectedNode.id : null;
    
    console.log('[CalendarConfigurationService] Updating day cell selection highlighting');
    
    const dayCells = document.querySelectorAll('.fc-daygrid-day');
    
    dayCells.forEach(dayCell => {
      const eventsInDay = dayCell.querySelectorAll('.fc-event');
      let hasSelectedLesson = false;
      let dayContentType = 'empty';
      
      eventsInDay.forEach(eventEl => {
        const fcEventEl = eventEl as any;
        if (fcEventEl.fcSeg && fcEventEl.fcSeg.eventRange && fcEventEl.fcSeg.eventRange.def) {
          const event = fcEventEl.fcSeg.eventRange.def;
          const extendedProps = event.extendedProps || {};
          const lesson = extendedProps.lesson;
          const specialCode = extendedProps.specialCode;
          
          if (specialCode === 'Error Day') {
            dayContentType = 'error';
          } else if (specialCode) {
            dayContentType = 'special';
          } else if (lesson) {
            dayContentType = 'lesson';
            if (selectedLessonId && lesson.id === selectedLessonId) {
              hasSelectedLesson = true;
            }
          }
        }
      });
      
      const dayCellElement = dayCell as HTMLElement;
      
      if (hasSelectedLesson) {
        dayCellElement.style.backgroundColor = '#bbdefb';
        dayCellElement.style.border = '2px solid #1976d2';
      } else {
        dayCellElement.style.border = '';
        
        switch (dayContentType) {
          case 'error':
            dayCellElement.style.backgroundColor = '#ffebee';
            break;
          case 'special':
            dayCellElement.style.backgroundColor = '#fff8e1';
            break;
          case 'lesson':
            dayCellElement.style.backgroundColor = '#e3f2fd';
            break;
          default:
            dayCellElement.style.backgroundColor = '';
            break;
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