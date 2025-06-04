// RESPONSIBILITY: Coordinates calendar state reactions and delegates to appropriate services for calendar component.
// DOES NOT: Handle UI interactions, direct API calls, or template logic - pure reactive coordination service.
// CALLED BY: LessonCalendarComponent for managing reactive state coordination.
import { Injectable, effect, signal } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from './schedule-state.service';
import { SchedulePersistenceService } from './schedule-persistence.service';
import { CalendarEventService } from './calendar-event.service';
import { CalendarConfigurationService } from './calendar-configuration.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { CourseCrudService } from '../../../core/services/course-crud.service';
import { ScheduleEvent } from '../../../models/schedule';

export interface CalendarRefreshCallbacks {
  getCalendarApi: () => any;
  getCalendarOptions: () => CalendarOptions;
  setCalendarOptions: (options: CalendarOptions) => void;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarCoordinationService {
  private readonly _initialized = signal<boolean>(false);
  private _callbacks: CalendarRefreshCallbacks | null = null;

  constructor(
    private scheduleStateService: ScheduleStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private calendarConfigService: CalendarConfigurationService,
    private nodeSelectionService: NodeSelectionService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService
  ) {
    console.log('[CalendarCoordinationService] Initialized for reactive state coordination');
  }

  // Initialize the coordination service with calendar refresh callbacks
  initialize(callbacks: CalendarRefreshCallbacks): void {
    console.log('[CalendarCoordinationService] initialize');
    
    this._callbacks = callbacks;
    this._initialized.set(true);

    // Set up core reactive effects
    this.setupCourseSelectionEffect();
    this.setupCalendarEventsEffect();
    this.setupCalendarDateEffect();
    this.setupCalendarConfigurationEffect();
    this.setupLessonSelectionHighlightEffect();
    this.setupScheduleVersionEffect();
  }

  // === REACTIVE EFFECTS ===

  // Effect: Highlight selected lessons in calendar via DOM manipulation
  private setupLessonSelectionHighlightEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;
  
      const selectedNode = this.nodeSelectionService.selectedNode();
      const selectionSource = this.nodeSelectionService.selectionSource();
      
      // Only highlight for lesson selections from tree (avoid circular highlighting from calendar clicks)
      if (selectedNode?.nodeType === 'Lesson' && selectionSource === 'tree') {
        this.calendarConfigService.updateEventSelectionHighlighting();
      } else if (!selectedNode || selectedNode.nodeType !== 'Lesson') {
        this.calendarConfigService.updateEventSelectionHighlighting();
      }
    });
  }

  // Effect: React to schedule version changes for refresh triggering
  private setupScheduleVersionEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const scheduleVersion = this.scheduleStateService.scheduleVersion();
      const scheduleEvents = this.scheduleStateService.currentScheduleEvents();
      const courseId = this.getActiveCourseId();

      if (courseId && scheduleEvents.length > 0) {
        this.refreshCalendarEventsOnly(courseId, scheduleEvents);
      } else {
        this.refreshCalendarEventsOnly(null, []);
      }
    });
  }

  // Effect: React to course selection changes AND ensure schedule is loaded for any course context
  private setupCourseSelectionEffect(): void {
    effect(() => {
      const selectedNode = this.nodeSelectionService.selectedNode();
      const activeCourseId = this.nodeSelectionService.activeCourseId();
      
      // Load schedules whenever we have a courseId, regardless of selection type
      if (activeCourseId) {
        const currentSchedule = this.scheduleStateService.selectedSchedule();
        const hasScheduleForCourse = currentSchedule && currentSchedule.courseId === activeCourseId;
        
        if (!hasScheduleForCourse || selectedNode?.nodeType === 'Course') {
          // Load schedules if: 1) No schedule exists for this course, OR 2) Course was directly selected
          this.schedulePersistenceService.loadSchedulesForCourse(activeCourseId).subscribe({
            next: () => console.log(`[CalendarCoordinationService] Schedules loaded for course ${activeCourseId}`),
            error: (error: any) => console.error(`[CalendarCoordinationService] Failed to load schedules:`, error)
          });
        }
      }
    });
  }

  // Effect: Update calendar events when schedule changes
  private setupCalendarEventsEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;
  
      const scheduleEvents = this.scheduleStateService.currentScheduleEvents();
      const selectedNode = this.nodeSelectionService.selectedNode();
      const courseId = selectedNode ? selectedNode.courseId : null;
      
      if (courseId && scheduleEvents.length > 0) {
        this.refreshCalendarEventsOnly(courseId, scheduleEvents);
      } else {
        this.refreshCalendarEventsOnly(null, []);
      }
    });
  }

  // Effect: Update calendar date when schedule changes
  private setupCalendarDateEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const schedule = this.scheduleStateService.selectedSchedule();
      
      if (schedule?.startDate) {
        this.updateCalendarDate(new Date(schedule.startDate));
      }
    });
  }

  // Effect: Update calendar configuration when schedule changes
  private setupCalendarConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const schedule = this.scheduleStateService.selectedSchedule();
      
      const hiddenDays = this.calendarConfigService.getCurrentHiddenDays();
      this.updateHiddenDays(hiddenDays);
    });
  }

  // === PRIVATE HELPER METHODS ===

  // Get current course ID helper
  private getActiveCourseId(): number | null {
    const activeCourseId = this.nodeSelectionService.activeCourseId();
    const activeCourse = activeCourseId ? this.courseDataService.getCourseById(activeCourseId) : null;
    return activeCourse ? activeCourse.id : null;
  }

  // Refresh calendar events only - handles both populated and empty states
  private refreshCalendarEventsOnly(courseId: number | null, scheduleEvents: ScheduleEvent[]): void {
    if (!this._callbacks) return;

    if (courseId && scheduleEvents.length > 0) {
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents, courseId);
      const currentOptions = this._callbacks.getCalendarOptions();
      this._callbacks.setCalendarOptions({ ...currentOptions, events });
    } else {
      const currentOptions = this._callbacks.getCalendarOptions();
      this._callbacks.setCalendarOptions({ ...currentOptions, events: [] });
    }

    // Trigger calendar re-render
    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.refetchEvents();
    }
  }

  // Update calendar date
  private updateCalendarDate(date: Date): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, initialDate: date });
    
    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.gotoDate(date);
    }
  }

  // Update hidden days
  private updateHiddenDays(hiddenDays: number[]): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, hiddenDays });
    
    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.setOption('hiddenDays', hiddenDays);
    }
  }

  // === PUBLIC API METHODS ===

  // Get current course data
  getCurrentCourse(): any | null {
    const activeCourseId = this.nodeSelectionService.activeCourseId();
    return activeCourseId ? this.courseDataService.getCourseById(activeCourseId) : null;
  }

  // Check if courses are available
  hasCoursesAvailable(): boolean {
    return this.courseCrudService.hasCoursesAvailable();
  }

  // Get active course count
  getActiveCourseCount(): number {
    return this.courseCrudService.getActiveCourseCount();
  }

  // Refresh schedule and events - loads fresh schedule data
  refreshScheduleAndEvents(courseId: number | null): void {
    console.log('[CalendarCoordinationService] refreshScheduleAndEvents');
    
    if (courseId) {
      this.schedulePersistenceService.loadSchedulesForCourse(courseId).subscribe();
    }
  }

  // Cleanup method for component destruction
  cleanup(): void {
    console.log('[CalendarCoordinationService] cleanup');
    
    this._callbacks = null;
    this._initialized.set(false);
  }

  // Get debug information for troubleshooting
  getDebugInfo() {
    const activeCourseId = this.nodeSelectionService.activeCourseId();
    const activeCourse = activeCourseId ? this.courseDataService.getCourseById(activeCourseId) : null;
    
    return {
      initialized: this._initialized(),
      hasCallbacks: !!this._callbacks,
      activeCourseId: activeCourseId,
      activeCourseTitle: activeCourse?.title || null,
      hasSelection: this.nodeSelectionService.hasSelection(),
      selectedNodeType: this.nodeSelectionService.selectedNodeType(),
      selectionSource: this.nodeSelectionService.selectionSource(),
      availableCoursesCount: this.getActiveCourseCount(),
      hasData: this.hasCoursesAvailable()
    };
  }
}