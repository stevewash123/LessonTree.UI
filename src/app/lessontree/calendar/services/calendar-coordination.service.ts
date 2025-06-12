// RESPONSIBILITY: Coordinates master schedule state reactions and delegates to appropriate services for calendar component.
// DOES NOT: Handle UI interactions, direct API calls, or template logic - pure reactive coordination service.
// CALLED BY: LessonCalendarComponent for managing reactive state coordination.
import { Injectable, effect, signal } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from './schedule-state.service';
import { SchedulePersistenceService } from './schedule-persistence.service';
import { CalendarEventService } from './calendar-event.service';
import { UserService } from '../../../core/services/user.service';
import { CourseDataService } from '../../../core/services/course-data.service';

import { parseTeachingDaysToArray } from '../../../models/utils/shared.utils';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { CourseManagementService } from '../../../core/services/course-management.service';

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
    private userService: UserService,
    private courseDataService: CourseDataService,
    private courseManagementService: CourseManagementService,
  ) {
    console.log('[CalendarCoordinationService] Initialized for master schedule coordination');
  }

  // Initialize the coordination service with calendar refresh callbacks
  initialize(callbacks: CalendarRefreshCallbacks): void {
    console.log('[CalendarCoordinationService] initialize');
    
    this._callbacks = callbacks;
    this._initialized.set(true);

    // Set up reactive effects for master schedule
    this.setupUserConfigurationEffect();
    this.setupMasterScheduleEventsEffect();
    this.setupMasterScheduleDateEffect();
    this.setupMasterScheduleConfigurationEffect();
    this.setupScheduleVersionEffect();

    // Load master schedule on initialization
    this.loadMasterSchedule();
  }

  // === REACTIVE EFFECTS ===

  // Effect: Load master schedule when user configuration changes
  private setupUserConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized()) return;

      const userConfig = this.userService.getUserConfiguration();
      
      if (userConfig && userConfig.periodAssignments && userConfig.periodAssignments.length > 0) {
        console.log('[CalendarCoordinationService] User configuration updated, loading master schedule');
        this.loadMasterSchedule();
      } else {
        console.log('[CalendarCoordinationService] No user configuration, clearing master schedule');
        this.scheduleStateService.clearMasterSchedule();
        this.refreshCalendarEventsOnly([]);
      }
    });
  }

  // Effect: React to master schedule version changes for refresh triggering
  private setupScheduleVersionEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const scheduleVersion = this.scheduleStateService.scheduleVersion();
      const scheduleEvents = this.scheduleStateService.currentScheduleEvents();

      if (scheduleEvents.length > 0) {
        this.refreshCalendarEventsOnly(scheduleEvents);
      } else {
        this.refreshCalendarEventsOnly([]);
      }
    });
  }

  // Effect: Update calendar events when master schedule changes
  private setupMasterScheduleEventsEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;
  
      const scheduleEvents = this.scheduleStateService.currentScheduleEvents();
      
      if (scheduleEvents.length > 0) {
        this.refreshCalendarEventsOnly(scheduleEvents);
      } else {
        this.refreshCalendarEventsOnly([]);
      }
    });
  }

  // Effect: Update calendar date when master schedule changes
  private setupMasterScheduleDateEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const masterSchedule = this.scheduleStateService.getMasterSchedule();
      
      if (masterSchedule?.startDate) {
        this.updateCalendarDate(new Date(masterSchedule.startDate));
      }
    });
  }

  // Effect: Update calendar configuration when master schedule changes
  private setupMasterScheduleConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const masterSchedule = this.scheduleStateService.getMasterSchedule();
      
      if (masterSchedule?.teachingDays) {
        const teachingDaysArray = parseTeachingDaysToArray(masterSchedule.teachingDays);
        const hiddenDays = this.calculateHiddenDays(teachingDaysArray);
        this.updateHiddenDays(hiddenDays);
      }
    });
  }

  // === PRIVATE HELPER METHODS ===

  // Load master schedule for current user
  private loadMasterSchedule(): void {
    console.log('[CalendarCoordinationService] Loading master schedule');
    
    this.schedulePersistenceService.loadMasterSchedule().subscribe({
      next: (success) => {
        if (success) {
          console.log('[CalendarCoordinationService] Master schedule loaded successfully');
        } else {
          console.log('[CalendarCoordinationService] No existing master schedule, will create on demand');
        }
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Failed to load master schedule:', error);
        // On error, try to generate a new master schedule
        this.generateMasterSchedule();
      }
    });
  }

  // Calculate hidden days from teaching days array
  private calculateHiddenDays(teachingDaysArray: string[]): number[] {
    // Convert day names to numbers (0=Sunday, 1=Monday, etc.)
    const dayNameToNumber: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };

    const teachingDayNumbers = teachingDaysArray
      .map(day => dayNameToNumber[day])
      .filter(num => num !== undefined);

    // Return all days that are NOT teaching days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    return allDays.filter(day => !teachingDayNumbers.includes(day));
  }

  // Generate master schedule using ScheduleGenerationService
  private generateMasterSchedule(): void {
    console.log('[CalendarCoordinationService] generateMasterSchedule');
    
    this.schedulePersistenceService.generateAndSetMasterSchedule().subscribe({
      next: () => {
        console.log('[CalendarCoordinationService] Master schedule generated successfully');
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Error generating master schedule:', error);
      }
    });
  }

  // Refresh calendar events only - handles both populated and empty states
  private refreshCalendarEventsOnly(scheduleEvents: ScheduleEvent[]): void {
    if (!this._callbacks) return;

    if (scheduleEvents.length > 0) {
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents);
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

  // Check if user has configured periods
  hasUserConfiguration(): boolean {
    const userConfig = this.userService.getUserConfiguration();
    return userConfig !== null && 
           userConfig !== undefined && 
           (userConfig.periodAssignments?.length || 0) > 0;
  }

  // Check if master schedule is available
  hasMasterSchedule(): boolean {
    return this.scheduleStateService.hasActiveSchedule();
  }

  // Check if courses are available
  hasCoursesAvailable(): boolean {
    return this.courseManagementService.hasCoursesAvailable();
  }

  // Get active course count
  getActiveCourseCount(): number {
    return this.courseManagementService.getActiveCourseCount();
  }

  // Get master schedule info for display
  getMasterScheduleInfo(): { title: string; eventCount: number; isInMemory: boolean } | null {
    const masterSchedule = this.scheduleStateService.getMasterSchedule();
    if (!masterSchedule) return null;

    return {
      title: masterSchedule.title,
      eventCount: masterSchedule.scheduleEvents?.length || 0,
      isInMemory: this.scheduleStateService.isInMemorySchedule()
    };
  }

  // Refresh master schedule - loads fresh schedule data
  refreshMasterSchedule(): void {
    console.log('[CalendarCoordinationService] refreshMasterSchedule');
    this.loadMasterSchedule();
  }

  // Force regenerate master schedule
  regenerateMasterSchedule(): void {
    console.log('[CalendarCoordinationService] regenerateMasterSchedule');
    this.generateMasterSchedule();
  }

  // Save current master schedule
  saveMasterSchedule(): void {
    console.log('[CalendarCoordinationService] saveMasterSchedule');
    
    this.schedulePersistenceService.saveCurrentMasterSchedule().subscribe({
      next: () => {
        console.log('[CalendarCoordinationService] Master schedule saved successfully');
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Failed to save master schedule:', error);
      }
    });
  }

  // === COURSE QUERIES (for period iteration) ===
  getCurrentCourse(): any | null {
    // This would need to be implemented based on your course selection logic
    // For now, return null as a placeholder
    return null;
  }
  
  // Get course data by ID (used during period iteration)
  getCourseData(courseId: number): any | null {
    return this.courseDataService.getCourseById(courseId);
  }

  // Get all course data for assigned courses
  getAssignedCoursesData(): any[] {
    const userConfig = this.userService.getUserConfiguration();
    if (!userConfig?.periodAssignments) return [];

    const courseIds = new Set<number>();
    userConfig.periodAssignments.forEach(assignment => {
      if (assignment.courseId) {
        courseIds.add(assignment.courseId);
      }
    });

    const courses: any[] = [];
    for (const courseId of courseIds) {
      const course = this.courseDataService.getCourseById(courseId);
      if (course) {
        courses.push(course);
      }
    }

    return courses;
  }

  // === CLEANUP ===

  // Cleanup method for component destruction
  cleanup(): void {
    console.log('[CalendarCoordinationService] cleanup');
    
    this._callbacks = null;
    this._initialized.set(false);
  }

  // Get debug information for troubleshooting
  getDebugInfo() {
    const masterScheduleInfo = this.getMasterScheduleInfo();
    const userConfig = this.userService.getUserConfiguration();
    
    return {
      initialized: this._initialized(),
      hasCallbacks: !!this._callbacks,
      hasUserConfiguration: this.hasUserConfiguration(),
      hasMasterSchedule: this.hasMasterSchedule(),
      masterScheduleInfo: masterScheduleInfo,
      periodsConfigured: userConfig?.periodAssignments?.length || 0,
      periodsPerDay: userConfig?.periodsPerDay || 0,
      availableCoursesCount: this.getActiveCourseCount(),
      hasCoursesData: this.hasCoursesAvailable(),
      assignedCoursesCount: this.getAssignedCoursesData().length
    };
  }
}