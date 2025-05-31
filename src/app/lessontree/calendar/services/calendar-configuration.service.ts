/* src/app/lessontree/calendar/services/calendar-configuration.service.ts - COMPLETE FILE */
// RESPONSIBILITY: Manages FullCalendar configuration options and calendar-specific settings.
// DOES NOT: Handle events, state management, or API calls - pure configuration service.
// CALLED BY: LessonCalendarComponent for calendar setup and configuration updates.
import { Injectable, inject, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, set } from 'date-fns';

import { ScheduleStateService } from './schedule-state.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { parseId } from '../../../core/utils/type-conversion.utils';

@Injectable({
  providedIn: 'root'
})
export class CalendarConfigurationService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly nodeSelectionService = inject(NodeSelectionService);

  constructor() {
    console.log('[CalendarConfigurationService] Initialized', { 
      timestamp: new Date().toISOString() 
    });
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
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };
    
    const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hiddenDayNumbers = allDays
      .filter(day => !teaching.includes(day))
      .map(day => dayMap[day as keyof typeof dayMap]);
    
    console.log(`[CalendarConfigurationService] Teaching days: ${teaching.join(', ')}, Hidden days: ${hiddenDayNumbers.join(', ')}`, {
      timestamp: new Date().toISOString()
    });
    
    return hiddenDayNumbers;
  });

  // Create base calendar options working WITH FullCalendar's design
  createCalendarOptions(
    eventClickHandler: (arg: any) => void,
    dateClickHandler: (arg: any) => void,
    eventDropHandler: (arg: any) => void,
    dateContextMenuHandler?: (date: Date, jsEvent: MouseEvent) => void // Add this parameter
  ): CalendarOptions {
    console.log('[CalendarConfigurationService] Creating calendar options with right-click support', {
      timestamp: new Date().toISOString()
    });
  
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      initialDate: set(new Date(), { month: 7, date: 1 }),
      firstDay: 1, // Monday = 1, Sunday = 0
      weekNumbers: false, // No week numbers
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      // Height and week control options
      height: 600,
      contentHeight: 500,
      fixedWeekCount: false, // Don't always show 6 weeks
      showNonCurrentDates: false, // Don't show dates from other months
      
      // Single event per day configuration
      dayMaxEvents: 1, // Only one event per day
      dayMaxEventRows: 1, // Only one row of events
      eventMaxStack: 1, // No stacking
      
      // Event display configuration
      eventDisplay: 'block',
      displayEventTime: false, // No time since these are all-day
      displayEventEnd: false,
      
      // Style day cells based on their events using FullCalendar's dayCellClassNames
      dayCellClassNames: (arg) => {
        return this.getDayCellClasses(arg);
      },
      
      // Use FullCalendar's eventContent to create custom DOM content
      eventContent: (arg) => {
        return this.createCustomEventContent(arg);
      },
      
      // Use FullCalendar's dayCellDidMount to add right-click listeners to day cells
      dayCellDidMount: (arg) => {
        this.styleDayCell(arg.el, arg.date);
        
        // Add right-click listener to day cells
        if (dateContextMenuHandler) {
          arg.el.addEventListener('contextmenu', (jsEvent: MouseEvent) => {
            jsEvent.preventDefault(); // Prevent browser context menu
            dateContextMenuHandler(arg.date, jsEvent);
          });
        }
      },
      
      // Use eventDidMount to add right-click listeners to events AND style day cells
      eventDidMount: (info) => {
        this.setDayCellBackgroundColor(info);
        
        // Add right-click listener to events
        if (info.el) {
          info.el.addEventListener('contextmenu', (jsEvent: MouseEvent) => {
            jsEvent.preventDefault(); // Prevent browser context menu
            
            // Create a fake EventClickArg for the context menu handler
            const fakeArg = {
              event: info.event,
              jsEvent: jsEvent,
              el: info.el,
              view: info.view
            };
            
            // Call the event click handler with right-click indication
            (jsEvent as any).which = 3; // Mark as right-click
            eventClickHandler(fakeArg);
          });
        }
      },
      
      // Interaction settings
      events: [],
      eventClick: eventClickHandler,
      dateClick: dateClickHandler,
      editable: true,
      eventDrop: eventDropHandler,
      selectable: true,
      selectMirror: false,
      
      hiddenDays: [] // Will be updated by calling component
    };
  }

  // Get CSS classes for day cells based on their events
  private getDayCellClasses(arg: any): string[] {
    const classes: string[] = ['lesson-day-cell'];
    const date = arg.date;
    
    // Find if there's an event for this day
    const events = arg.view.calendar.getEvents();
    const dayEvent = events.find((event: any) => {
      const eventDate = event.start;
      return eventDate && 
             eventDate.getDate() === date.getDate() && 
             eventDate.getMonth() === date.getMonth() && 
             eventDate.getFullYear() === date.getFullYear();
    });
    
    if (dayEvent) {
      const extendedProps = dayEvent.extendedProps || {};
      const specialCode = extendedProps.specialCode;
      
      if (specialCode === 'Error Day') {
        classes.push('error-day');
      } else if (specialCode) {
        classes.push('special-day');
      } else {
        classes.push('lesson-day');
      }
    } else {
      classes.push('empty-day');
    }
    
    return classes;
  }

  // Style day cells based on lesson content and selection state
  private styleDayCell(dayEl: HTMLElement, date: Date): void {
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule?.scheduleDays) {
      return;
    }
    
    // Find schedule day for this date
    const scheduleDay = currentSchedule.scheduleDays.find(day => 
      format(new Date(day.date), 'yyyy-MM-dd') === dateStr
    );
    
    if (!scheduleDay) {
      return;
    }
    
    // Check if this day's lesson matches the selected lesson
    const selectedLesson = this.nodeSelectionService.selectedLesson();
    const isSelectedLessonDay = selectedLesson && 
      scheduleDay.lessonId === parseId(selectedLesson.id);
    
    // Apply base styling based on lesson content using CSS classes
    if (scheduleDay.specialCode === 'Error Day') {
      dayEl.classList.add('error-day-cell');
    } else if (scheduleDay.specialCode) {
      dayEl.classList.add('special-day-cell');
    } else if (scheduleDay.lessonId) {
      dayEl.classList.add('lesson-day-cell');
    }
    
    // Apply selected lesson highlighting using CSS class
    if (isSelectedLessonDay) {
      dayEl.classList.add('selected-lesson-day');
      
      console.log('[CalendarConfigurationService] Highlighted selected lesson day', {
        date: dateStr,
        lessonId: scheduleDay.lessonId,
        selectedLessonId: selectedLesson?.id,
        timestamp: new Date().toISOString()
      });
    } else {
      // Remove the class if it was previously applied
      dayEl.classList.remove('selected-lesson-day');
    }
  }

  // Create custom event content using FullCalendar's recommended eventContent callback
  private createCustomEventContent(arg: any): { domNodes: Node[] } {
    const event = arg.event;
    const isWeekView = arg.view.type === 'timeGridWeek';
    
    // Get event details
    const extendedProps = event.extendedProps || {};
    const specialCode = extendedProps.specialCode;
    const lesson = extendedProps.lesson;
    
    // Create container element
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 8px;
      box-sizing: border-box;
      line-height: 1.3;
      word-wrap: break-word;
      white-space: normal;
      overflow: visible;
      font-size: ${isWeekView ? '14px' : '12px'};
      font-weight: 600;
      min-height: ${isWeekView ? '60px' : '40px'};
    `;
    
    // Set text color based on event type
    if (specialCode === 'Error Day') {
      container.style.color = '#d32f2f'; // Dark red text
      container.style.fontStyle = 'italic';
    } else if (specialCode) {
      container.style.color = '#e65100'; // Dark orange text
    } else {
      container.style.color = '#0d47a1'; // Dark blue text
    }
    
    if (lesson && isWeekView) {
      // Week view: Show title, objective, and method
      const title = document.createElement('div');
      title.style.cssText = `
        font-weight: 700;
        margin-bottom: 4px;
        word-wrap: break-word;
        white-space: normal;
        text-align: center;
      `;
      title.textContent = lesson.title || 'Untitled Lesson';
      
      const objective = document.createElement('div');
      objective.style.cssText = `
        font-size: 11px;
        font-weight: 500;
        margin-bottom: 2px;
        opacity: 0.9;
        word-wrap: break-word;
        white-space: normal;
        text-align: center;
      `;
      objective.textContent = lesson.objective ? `${lesson.objective.substring(0, 80)}${lesson.objective.length > 80 ? '...' : ''}` : '';
      
      const method = document.createElement('div');
      method.style.cssText = `
        font-size: 10px;
        font-weight: 400;
        opacity: 0.8;
        word-wrap: break-word;
        white-space: normal;
        text-align: center;
      `;
      method.textContent = lesson.methods ? `${lesson.methods.substring(0, 60)}${lesson.methods.length > 60 ? '...' : ''}` : '';
      
      container.appendChild(title);
      if (lesson.objective) container.appendChild(objective);
      if (lesson.methods) container.appendChild(method);
    } else {
      // Month view or non-lesson: Show only title with wrapping
      const title = document.createElement('div');
      title.style.cssText = `
        font-weight: 600;
        word-wrap: break-word;
        white-space: normal;
        text-align: center;
        line-height: 1.2;
        width: 100%;
      `;
      title.textContent = event.title;
      container.appendChild(title);
    }
    
    // Return the custom DOM nodes to FullCalendar
    return { domNodes: [container] };
  }

  // Set day cell background color using eventDidMount (FullCalendar's recommended approach)
  private setDayCellBackgroundColor(info: any): void {
    const event = info.event;
    const extendedProps = event.extendedProps || {};
    const specialCode = extendedProps.specialCode;
    
    // Find the parent day cell and set its background color
    const dayCell = info.el.closest('.fc-daygrid-day');
    if (dayCell) {
      if (specialCode === 'Error Day') {
        (dayCell as HTMLElement).style.backgroundColor = '#ffebee'; // Light red
      } else if (specialCode) {
        (dayCell as HTMLElement).style.backgroundColor = '#fff8e1'; // Light yellow
      } else {
        // For regular lessons, use light blue
        (dayCell as HTMLElement).style.backgroundColor = '#e3f2fd'; // Light blue
      }
    }
    
    // Make the event content blend with the day cell background
    if (specialCode === 'Error Day') {
      // Error events: transparent background so the light red day background shows through
      info.el.style.backgroundColor = 'transparent';
      info.el.style.border = 'none';
    } else if (specialCode) {
      // Special events: transparent background so the light yellow day background shows through
      info.el.style.backgroundColor = 'transparent';
      info.el.style.border = 'none';
    } else {
      // Regular lesson events: match the light blue day background exactly
      info.el.style.backgroundColor = '#e3f2fd'; // Same light blue as day cell
      info.el.style.border = 'none';
    }
  }

  // Update calendar options with current schedule data
  updateCalendarOptionsForSchedule(options: CalendarOptions, schedule: any): CalendarOptions {
    if (!schedule) {
      console.log('[CalendarConfigurationService] No schedule provided for options update', {
        timestamp: new Date().toISOString()
      });
      return options;
    }

    console.log('[CalendarConfigurationService] Updating calendar options for schedule', {
      scheduleId: schedule.id,
      startDate: schedule.startDate,
      timestamp: new Date().toISOString()
    });

    // Update initial date if schedule has start date
    if (schedule.startDate) {
      options.initialDate = new Date(schedule.startDate);
    }

    // Update hidden days based on teaching days
    const hiddenDays = this.hiddenDays();
    options.hiddenDays = hiddenDays;

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
    const teaching = this.teachingDays();
    return teaching.includes(dayName);
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
    
    if (teachingDaysCount <= 3) {
      return 'timeGridWeek';
    } else {
      return 'dayGridMonth';
    }
  }

  // Update calendar height dynamically
  updateCalendarHeight(calendarApi: any, maxWeeks: number = 5): void {
    if (!calendarApi) return;

    const heightConfig = {
      height: Math.min(600, maxWeeks * 100 + 100),
      contentHeight: Math.min(500, maxWeeks * 100),
    };

    console.log(`[CalendarConfigurationService] Updating calendar height for ${maxWeeks} weeks`, {
      height: heightConfig.height,
      contentHeight: heightConfig.contentHeight,
      timestamp: new Date().toISOString()
    });

    calendarApi.setOption('height', heightConfig.height);
    calendarApi.setOption('contentHeight', heightConfig.contentHeight);
  }

  // Validate calendar configuration
  validateConfiguration(options: CalendarOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.plugins || options.plugins.length === 0) {
      errors.push('Calendar plugins are required');
    }

    if (!options.initialView) {
      errors.push('Initial view must be specified');
    }

    if (options.hiddenDays && options.hiddenDays.length >= 7) {
      errors.push('Cannot hide all days of the week');
    }

    if (options.height && typeof options.height === 'number' && options.height < 200) {
      errors.push('Calendar height should be at least 200px');
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      console.warn('[CalendarConfigurationService] Configuration validation failed', {
        errors,
        timestamp: new Date().toISOString()
      });
    }

    return { isValid, errors };
  }

  // Log current configuration state (for debugging)
  logCurrentConfiguration(): void {
    const config = {
      design: 'day-cell-backgrounds-with-event-content',
      teachingDays: this.teachingDays(),
      hiddenDays: this.hiddenDays(),
      optimalView: this.getOptimalCalendarView(),
      schedule: this.scheduleStateService.selectedSchedule()?.id || 'none',
      timestamp: new Date().toISOString()
    };

    console.log('[CalendarConfigurationService] Current configuration state:', config);
  }
}