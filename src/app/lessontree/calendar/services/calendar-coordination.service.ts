// RESPONSIBILITY: Coordinates calendar state reactions and delegates to appropriate services for calendar component.
// DOES NOT: Handle UI interactions, direct API calls, or template logic - pure coordination service.
// CALLED BY: LessonCalendarComponent for managing complex reactive state coordination.
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
    console.log('[CalendarCoordinationService] Initialized for ScheduleEvent period-based calendars');
  }

  // Initialize the coordination service with calendar refresh callbacks
  initialize(callbacks: CalendarRefreshCallbacks): void {
    this._callbacks = callbacks;
    this._initialized.set(true);

    // Set up all reactive effects
    this.setupCourseSelectionEffect();
    this.setupCalendarEventsEffect();
    this.setupCalendarDateEffect();
    this.setupCalendarConfigurationEffect();
    this.setupCourseDataChangesEffect();
    this.setupLessonMovesEffect();
    this.setupScheduleVersionEffect();
    this.setupLessonSelectionHighlightEffect();
  }

  // Effect: Highlight selected lessons in calendar via DOM manipulation
  private setupLessonSelectionHighlightEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;
  
      const selectedNode = this.nodeSelectionService.selectedNode();
      const selectionSource = this.nodeSelectionService.selectionSource();
      
      // Only highlight for lesson selections from tree (avoid circular highlighting from calendar clicks)
      if (selectedNode?.nodeType === 'Lesson' && selectionSource === 'tree') {
        console.log('[CalendarCoordinationService] Highlighting lesson in calendar');
        this.calendarConfigService.updateEventSelectionHighlighting();
      } else if (!selectedNode || selectedNode.nodeType !== 'Lesson') {
        console.log('[CalendarCoordinationService] Clearing lesson highlighting');
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

      console.log(`[CalendarCoordinationService] Schedule version changed: ${scheduleVersion}`);

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
          console.log(`[CalendarCoordinationService] Loading schedules for course ${activeCourseId}`);
          
          this.schedulePersistenceService.loadSchedulesForCourse(activeCourseId).subscribe({
            next: () => console.log(`[CalendarCoordinationService] Schedules loaded for course ${activeCourseId}`),
            error: (error: any) => console.error(`[CalendarCoordinationService] Failed to load schedules:`, error)
          });
        } else {
          console.log(`[CalendarCoordinationService] Schedule already exists for course ${activeCourseId}, skipping reload`);
        }
      } else {
        console.log('[CalendarCoordinationService] No active course ID available');
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
        console.log(`[CalendarCoordinationService] Updating calendar events for course ${courseId}`);
        this.refreshCalendarEventsOnly(courseId, scheduleEvents);
      } else {
        console.log('[CalendarCoordinationService] Clearing calendar events');
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
        console.log('[CalendarCoordinationService] Updating calendar date');
        this.updateCalendarDate(new Date(schedule.startDate));
      }
    });
  }

  // Effect: Update calendar configuration when schedule changes
  private setupCalendarConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const schedule = this.scheduleStateService.selectedSchedule();
      console.log('[CalendarCoordinationService] Updating calendar configuration');
      
      const hiddenDays = this.calendarConfigService.getCurrentHiddenDays();
      this.updateHiddenDays(hiddenDays);
    });
  }

  // Effect: React to courses data changes
  private setupCourseDataChangesEffect(): void {
    effect(() => {
      const nodeAddedInfo = this.courseDataService.nodeAdded();
      const nodeDeletedInfo = this.courseDataService.nodeDeleted();
      const coursesCount = this.courseCrudService.getActiveCourseCount();
      
      console.log('[CalendarCoordinationService] Courses data potentially changed', {
        coursesCount,
        nodeAdded: nodeAddedInfo?.node.nodeType || null,
        nodeDeleted: nodeDeletedInfo?.node.nodeType || null
      });
      
      // Calendar never auto-selects - it only reacts to existing selections
    });
  }

  // Effect: React to lesson moves for calendar optimization
  private setupLessonMovesEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const movedInfo = this.courseDataService.nodeMoved();
      const currentCourseId = this.getActiveCourseId();
      
      if (movedInfo?.node.nodeType === 'Lesson' && movedInfo.node.courseId === currentCourseId) {
        console.log('[CalendarCoordinationService] Lesson moved in current course');
        
        if (movedInfo.changeSource === 'tree') {
          // Tree move - refresh events only, schedule structure unchanged
          const scheduleEvents = this.scheduleStateService.currentScheduleEvents();
          this.refreshCalendarEventsOnly(currentCourseId, scheduleEvents);
        } else if (movedInfo.changeSource === 'calendar') {
          // Calendar-initiated move - full schedule refresh
          this.refreshScheduleAndEvents(currentCourseId);
        }
      }
    });
  }

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
      console.log('[CalendarCoordinationService] Refreshing calendar events only');
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents, courseId);
      const currentOptions = this._callbacks.getCalendarOptions();
      this._callbacks.setCalendarOptions({ ...currentOptions, events });
    } else {
      console.log('[CalendarCoordinationService] Clearing calendar events');
      const currentOptions = this._callbacks.getCalendarOptions();
      this._callbacks.setCalendarOptions({ ...currentOptions, events: [] });
    }

    // Trigger calendar re-render
    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.refetchEvents();
    }
  }

  // Refresh schedule and events - loads fresh schedule data
  private refreshScheduleAndEvents(courseId: number | null): void {
    if (courseId) {
      console.log('[CalendarCoordinationService] Refreshing schedule and events');
      this.schedulePersistenceService.loadSchedulesForCourse(courseId).subscribe();
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

  // Get current course ID from NodeSelectionService
  getCurrentCourseId(): number | null {
    return this.nodeSelectionService.activeCourseId();
  }

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

  // Cleanup method for component destruction
  cleanup(): void {
    console.log('[CalendarCoordinationService] Cleaning up');
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