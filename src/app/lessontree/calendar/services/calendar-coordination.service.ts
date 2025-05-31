// RESPONSIBILITY: Coordinates calendar state reactions and delegates to appropriate services for calendar component.
// DOES NOT: Handle UI interactions, direct API calls, or template logic - pure coordination service.
// CALLED BY: LessonCalendarComponent for managing complex reactive state coordination.
import { Injectable, effect, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from './schedule-state.service';
import { CalendarEventService } from './calendar-event.service';
import { CalendarConfigurationService } from './calendar-configuration.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { CourseCrudService } from '../../../core/services/course-crud.service';
import { parseId } from '../../../core/utils/type-conversion.utils';

export interface CalendarRefreshCallbacks {
  getCalendarApi: () => any;
  getCalendarOptions: () => CalendarOptions;
  setCalendarOptions: (options: CalendarOptions) => void;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarCoordinationService {
  // Private signal to track initialization
  private readonly _initialized = signal<boolean>(false);
  private _callbacks: CalendarRefreshCallbacks | null = null;

  constructor(
    private scheduleStateService: ScheduleStateService,
    private calendarEventService: CalendarEventService,
    private calendarConfigService: CalendarConfigurationService,
    private nodeSelectionService: NodeSelectionService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService
  ) {
    console.log('[CalendarCoordinationService] Initialized');
  }

  /**
   * Initialize the coordination service with calendar refresh callbacks
   */
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
  }

  // Effect: React to schedule version changes for explicit refresh triggering
  private setupScheduleVersionEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const scheduleVersion = this.scheduleStateService.scheduleVersion();
      const scheduleDays = this.scheduleStateService.currentScheduleDays();
      const selectedCourse = this.nodeSelectionService.selectedCourse();
      const courseId = selectedCourse ? parseId(selectedCourse.id) : null;

      console.log(`[CalendarCoordinationService] Schedule version changed: ${scheduleVersion}`, {
        courseId,
        scheduleDaysCount: scheduleDays.length,
        timestamp: new Date().toISOString()
      });

      // Force refresh calendar events when schedule version changes
      if (courseId && scheduleDays.length > 0) {
        this.refreshCalendarEventsOnly(courseId, scheduleDays);
      } else {
        this.refreshCalendarEventsOnly(null, []);
      }
    });
  }

  /**
   * Effect: React to course selection changes
   */
  private setupCourseSelectionEffect(): void {
    effect(() => {
      const selectedCourse = this.nodeSelectionService.selectedCourse();
      
      if (selectedCourse) {
        const courseId = parseId(selectedCourse.id);
        console.log(`[CalendarCoordinationService] Course selected: ${courseId}`, {
          courseTitle: selectedCourse.title,
          selectionSource: this.nodeSelectionService.selectionSource(),
          timestamp: new Date().toISOString()
        });
        
        this.scheduleStateService.loadSchedulesForCourse(courseId).subscribe({
          next: () => {
            console.log(`[CalendarCoordinationService] Schedules loaded for course ${courseId}`, {
              timestamp: new Date().toISOString()
            });
          },
          error: (error) => {
            console.error(`[CalendarCoordinationService] Failed to load schedules for course ${courseId}:`, error, {
              timestamp: new Date().toISOString()
            });
          }
        });
      } else {
        console.log('[CalendarCoordinationService] No course selected, attempting auto-selection', {
          hasCoursesAvailable: this.courseCrudService.hasCoursesAvailable(),
          timestamp: new Date().toISOString()
        });
        
        // Use course service for default selection
        if (this.courseCrudService.hasCoursesAvailable()) {
          this.courseCrudService.selectFirstAvailableCourse('calendar');
        }
      }
    });
  }

  /**
   * Effect: Update calendar events when schedule changes
   */
  private setupCalendarEventsEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const scheduleDays = this.scheduleStateService.currentScheduleDays();
      const selectedCourse = this.nodeSelectionService.selectedCourse();
      const courseId = selectedCourse ? parseId(selectedCourse.id) : null;
      
      if (courseId && scheduleDays.length > 0) {
        console.log(`[CalendarCoordinationService] Updating calendar events for course ${courseId}`, {
          scheduleDaysCount: scheduleDays.length,
          timestamp: new Date().toISOString()
        });
        
        this.refreshCalendarEventsOnly(courseId, scheduleDays);
      } else {
        console.log('[CalendarCoordinationService] Clearing calendar events', {
          courseId,
          scheduleDaysCount: scheduleDays.length,
          timestamp: new Date().toISOString()
        });
        
        this.refreshCalendarEventsOnly(null, []);
      }
    });
  }

  /**
   * Effect: Update calendar date when schedule changes
   */
  private setupCalendarDateEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const schedule = this.scheduleStateService.selectedSchedule();
      
      if (schedule?.startDate) {
        console.log(`[CalendarCoordinationService] Updating calendar date to: ${schedule.startDate}`, {
          timestamp: new Date().toISOString()
        });
        
        this.updateCalendarDate(new Date(schedule.startDate));
      }
    });
  }

  /**
   * Effect: Update calendar configuration when schedule changes
   */
  private setupCalendarConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const schedule = this.scheduleStateService.selectedSchedule();
      
      console.log('[CalendarCoordinationService] Updating calendar configuration for schedule change', {
        scheduleId: schedule?.id || 'none',
        timestamp: new Date().toISOString()
      });
      
      // Get updated configuration from service
      const hiddenDays = this.calendarConfigService.getCurrentHiddenDays();
      this.updateHiddenDays(hiddenDays);
    });
  }

  /**
   * Effect: React to courses data changes
   */
  private setupCourseDataChangesEffect(): void {
    effect(() => {
      const nodeAddedInfo = this.courseDataService.nodeAdded();
      const nodeDeletedInfo = this.courseDataService.nodeDeleted();
      const coursesCount = this.courseCrudService.getActiveCourseCount();
      
      console.log(`[CalendarCoordinationService] Courses data potentially changed`, {
        coursesCount,
        nodeAdded: nodeAddedInfo?.node.nodeType || null,
        nodeDeleted: nodeDeletedInfo?.node.nodeType || null,
        addedSource: nodeAddedInfo?.source || null,
        deletedSource: nodeDeletedInfo?.source || null,
        currentSelection: this.nodeSelectionService.selectedNodeType(),
        timestamp: new Date().toISOString()
      });
      
      // Use NodeSelectionService to check if we have a course selected
      if (coursesCount > 0 && !this.nodeSelectionService.selectedCourse()) {
        console.log('[CalendarCoordinationService] Courses available but none selected, auto-selecting', {
          timestamp: new Date().toISOString()
        });
        this.courseCrudService.selectFirstAvailableCourse('calendar');
      }
    });
  }

  /**
   * Effect: React to lesson moves for calendar optimization
   */
  private setupLessonMovesEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const movedInfo = this.courseDataService.nodeMoved();
      const selectedCourse = this.nodeSelectionService.selectedCourse();
      const currentCourseId = selectedCourse ? parseId(selectedCourse.id) : null;
      
      if (movedInfo?.node.nodeType === 'Lesson' && movedInfo.node.courseId === currentCourseId) {
        console.log(`[CalendarCoordinationService] Lesson moved in current course`, {
          lessonId: movedInfo.node.nodeId,
          changeSource: movedInfo.changeSource,
          currentCourseId,
          timestamp: new Date().toISOString()
        });
        
        if (movedInfo.changeSource === 'tree') {
          // Tree move - refresh events only, schedule structure unchanged
          const scheduleDays = this.scheduleStateService.currentScheduleDays();
          this.refreshCalendarEventsOnly(currentCourseId, scheduleDays);
        } else if (movedInfo.changeSource === 'calendar') {
          // Calendar-initiated move - full schedule refresh
          this.refreshScheduleAndEvents(currentCourseId);
        }
      }
    });
  }

  /**
   * Get current course ID from NodeSelectionService
   */
  getCurrentCourseId(): number | null {
    const selectedCourse = this.nodeSelectionService.selectedCourse();
    return selectedCourse ? parseId(selectedCourse.id) : null;
  }

  /**
   * Get current course data
   */
  getCurrentCourse(): any | null {
    const selectedCourse = this.nodeSelectionService.selectedCourse();
    if (!selectedCourse) return null;
    
    const courseId = parseId(selectedCourse.id);
    return this.courseDataService.getCourseById(courseId);
  }

  /**
   * Check if courses are available
   */
  hasCoursesAvailable(): boolean {
    return this.courseCrudService.hasCoursesAvailable();
  }

  /**
   * Get active course count
   */
  getActiveCourseCount(): number {
    return this.courseCrudService.getActiveCourseCount();
  }

  /**
   * Load courses and ensure selection
   */
  loadCoursesAndEnsureSelection(): Observable<any[]> {
    return this.courseCrudService.loadCoursesAndSelectFirst('active', 'private', true, 'calendar');
  }

  /**
   * Cleanup method for component destruction
   */
  cleanup(): void {
    console.log('[CalendarCoordinationService] Cleaning up', {
      timestamp: new Date().toISOString()
    });
    
    this._callbacks = null;
    this._initialized.set(false);
  }

  // === CALENDAR CALLBACK METHODS (MOVED FROM COMPONENT) ===

  /**
   * Refresh calendar events only - handles both populated and empty states
   */
  private refreshCalendarEventsOnly(courseId: number | null, scheduleDays: any[]): void {
    if (!this._callbacks) return;

    if (courseId && scheduleDays.length > 0) {
      console.log('[CalendarCoordinationService] Refreshing calendar events only');
      const events = this.calendarEventService.mapScheduleDaysToEvents(scheduleDays, courseId);
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

  /**
   * Refresh schedule and events - loads fresh schedule data
   */
  private refreshScheduleAndEvents(courseId: number | null): void {
    if (courseId) {
      console.log('[CalendarCoordinationService] Refreshing schedule and events');
      this.scheduleStateService.loadSchedulesForCourse(courseId).subscribe();
    }
  }

  /**
   * Update calendar date
   */
  private updateCalendarDate(date: Date): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, initialDate: date });
    
    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.gotoDate(date);
    }
  }

  /**
   * Update calendar options
   */
  private updateCalendarOptions(options: CalendarOptions): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, ...options });
  }

  /**
   * Update hidden days
   */
  private updateHiddenDays(hiddenDays: number[]): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, hiddenDays });
    
    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.setOption('hiddenDays', hiddenDays);
    }
  }

  /**
   * Refetch events from calendar
   */
  private refetchEvents(): void {
    if (!this._callbacks) return;

    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.refetchEvents();
    }
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo() {
    const selectedCourse = this.nodeSelectionService.selectedCourse();
    
    return {
      initialized: this._initialized(),
      hasCallbacks: !!this._callbacks,
      selectedCourseId: selectedCourse ? parseId(selectedCourse.id) : null,
      selectedCourseTitle: selectedCourse?.title || null,
      hasSelection: this.nodeSelectionService.hasSelection(),
      selectedNodeType: this.nodeSelectionService.selectedNodeType(),
      selectionSource: this.nodeSelectionService.selectionSource(),
      availableCoursesCount: this.getActiveCourseCount(),
      hasData: this.hasCoursesAvailable(),
      timestamp: new Date().toISOString()
    };
  }
}