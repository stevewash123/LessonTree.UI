// **COMPLETE FILE** - Cleaned calendar-coordination.service.ts
// RESPONSIBILITY: Coordinates schedule state reactions and delegates to appropriate services for calendar component.
// DOES NOT: Handle UI interactions, direct API calls, or template logic - pure reactive coordination service.
// CALLED BY: LessonCalendarComponent for managing reactive state coordination.
import { Injectable, effect, signal, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from './schedule-state.service';
import { ScheduleConfigurationStateService } from './schedule-configuration-state.service';
import { SchedulePersistenceService } from './schedule-persistence.service';
import { CalendarEventService } from './calendar-event.service';
import { CourseDataService } from '../../../core/services/course-data.service';

import { parseTeachingDaysToArray } from '../../../models/utils/shared.utils';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { CourseManagementService } from '../../../core/services/course-management.service';
import { ScheduleCoordinationService } from './schedule-coordination.service';

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

  private readonly _calendarEvents = signal<any[]>([]);
  readonly calendarEvents = computed(() => this._calendarEvents());

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private courseDataService: CourseDataService,
    private courseManagementService: CourseManagementService,
    private scheduleCoordinationService: ScheduleCoordinationService
  ) {
    console.log('[CalendarCoordinationService] Initialized for schedule coordination');
  }

  // Initialize the coordination service with calendar refresh callbacks
  initialize(callbacks: CalendarRefreshCallbacks): void {
    console.log('[CalendarCoordinationService] initialize');
    
    this._callbacks = callbacks;
    this._initialized.set(true);
  
    // Set up reactive effects for schedule
    this.setupScheduleDisplayEffect();
    this.setupScheduleDateEffect();     
    this.setupScheduleConfigurationEffect();
  
    // Load active schedule on initialization
    this.loadActiveSchedule();
  }

  /**
   * Combined signal that coordinates schedule events and configuration readiness
   * Prevents transformation attempts before both are loaded
   */
  readonly scheduleReadyForDisplay = computed(() => {
    const events = this.scheduleStateService.currentScheduleEvents();
    const config = this.scheduleConfigurationStateService.activeConfiguration();
    
    return {
      canTransform: events.length > 0 && !!config?.periodAssignments?.length,
      hasEvents: events.length > 0,
      hasConfiguration: !!config?.periodAssignments?.length,
      events,
      config,
      eventCount: events.length,
      configTitle: config?.title || null
    };
  });

  private setupScheduleDisplayEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;
  
      const displayState = this.scheduleReadyForDisplay();
      
      // **CLEANED: Removed "Schedule display state changed" - too frequent**
  
      if (displayState.canTransform) {
        console.log('[CalendarCoordinationService] Transforming events for calendar display');
        this.refreshCalendarEventsOnly(displayState.events);
      } else if (displayState.hasEvents && !displayState.hasConfiguration) {
        // **CLEANED: Removed "Schedule loaded but waiting for configuration" - expected state**
        this.refreshCalendarEventsOnly([]); // Show empty calendar while waiting
      } else if (!displayState.hasEvents) {
        // **CLEANED: Removed "No schedule events available" - expected state**
        this.refreshCalendarEventsOnly([]);
      }
    });
  }
  
  // Effect: Update calendar date when configuration changes
  private setupScheduleDateEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
      
      if (activeConfig?.startDate) {
        this.updateCalendarDate(new Date(activeConfig.startDate));
      }
    });
  }

  // Effect: Update calendar configuration when active configuration changes
  private setupScheduleConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
      
      if (activeConfig?.teachingDays) {
        const teachingDaysArray = parseTeachingDaysToArray(activeConfig.teachingDays);
        const hiddenDays = this.calculateHiddenDays(teachingDaysArray);
        this.updateHiddenDays(hiddenDays);
      }
    });
  }

  // === PRIVATE HELPER METHODS ===

  // Load active schedule for current user
  private loadActiveSchedule(): void {
    console.log('[CalendarCoordinationService] Loading active schedule');
    
    this.scheduleCoordinationService.loadActiveScheduleWithConfiguration().subscribe({
      next: (success: boolean) => {
        if (success) {
          console.log('[CalendarCoordinationService] Active schedule loaded successfully');
        } else {
          console.log('[CalendarCoordinationService] No existing schedule, generating new one');
          this.generateSchedule();
        }
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Failed to load active schedule:', error);
        this.generateSchedule();
      }
    });
  }

  // Calculate hidden days from teaching days array
  private calculateHiddenDays(teachingDaysArray: string[]): number[] {
    const dayNameToNumber: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    const teachingDayNumbers = teachingDaysArray
      .map(day => dayNameToNumber[day])
      .filter(num => num !== undefined);

    // Return all days that are NOT teaching days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    return allDays.filter(day => !teachingDayNumbers.includes(day));
  }

  // Generate schedule using ScheduleGenerationService
  private generateSchedule(): void {
    console.log('[CalendarCoordinationService] Generating schedule');
    
    this.scheduleCoordinationService.generateAndSetSchedule().subscribe({
      next: () => {
        console.log('[CalendarCoordinationService] Schedule generated successfully');
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Schedule generation failed:', error);
      }
    });
  }

  // Refresh calendar events only - handles both populated and empty states
  private refreshCalendarEventsOnly(scheduleEvents: ScheduleEvent[]): void {
    if (scheduleEvents.length > 0) {
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents);
      console.log(`[CalendarCoordinationService] Calendar events updated: ${events.length} events`);
      this._calendarEvents.set(events);
    } else {
      console.log('[CalendarCoordinationService] Calendar events cleared');
      this._calendarEvents.set([]);
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
  hasScheduleConfiguration(): boolean {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    return activeConfig !== null && 
           activeConfig !== undefined && 
           (activeConfig.periodAssignments?.length || 0) > 0;
  }

  // Check if schedule is available
  hasActiveSchedule(): boolean {
    return this.scheduleStateService.hasActiveSchedule();
  }

  // Get schedule info for display
  getScheduleInfo(): { title: string; eventCount: number; isInMemory: boolean } | null {
    const schedule = this.scheduleStateService.getSchedule();
    if (!schedule) return null;

    return {
      title: schedule.title,
      eventCount: schedule.scheduleEvents?.length || 0,
      isInMemory: this.scheduleStateService.isInMemorySchedule()
    };
  }

  // Refresh schedule - loads fresh schedule data
  refreshSchedule(): void {
    console.log('[CalendarCoordinationService] refreshSchedule');
    this.loadActiveSchedule();
  }

  // Force regenerate schedule
  regenerateSchedule(): void {
    console.log('[CalendarCoordinationService] Regenerating schedule');
    
    this.scheduleCoordinationService.regenerateSchedule().subscribe({
      next: () => {
        console.log('[CalendarCoordinationService] Schedule regenerated successfully');
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Schedule regeneration failed:', error);
      }
    });
  }

  // Save current schedule
  saveSchedule(): void {
    console.log('[CalendarCoordinationService] Saving schedule');
    
    this.scheduleCoordinationService.saveCurrentSchedule().subscribe({
      next: () => {
        console.log('[CalendarCoordinationService] Schedule saved successfully');
      },
      error: (error: any) => {
        console.error('[CalendarCoordinationService] Schedule save failed:', error);
      }
    });
  }

  hasCoursesAvailable(): boolean {
    return this.courseManagementService.hasCoursesAvailable();
  }
  
  /**
   * Get active course count
   */
  getActiveCourseCount(): number {
    return this.courseManagementService.getActiveCourseCount();
  }
  
  /**
   * Get current course data
   */
  getCurrentCourse(): any | null {
    // **FIXED: Use CourseManagementService validation which checks selection**
    const validation = this.courseManagementService.validateCourseSelection();
    
    if (validation.isValid && validation.course) {
      return validation.course;
    }
    
    return null;
  }

  // === CLEANUP ===

  // Cleanup method for component destruction
  cleanup(): void {
    console.log('[CalendarCoordinationService] cleanup');
    
    this._callbacks = null;
    this._initialized.set(false);
  }

  // Essential debug information only
  getDebugInfo() {
    const scheduleInfo = this.getScheduleInfo();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    
    return {
      initialized: this._initialized(),
      hasScheduleConfiguration: this.hasScheduleConfiguration(),
      hasActiveSchedule: this.hasActiveSchedule(),
      scheduleEventCount: scheduleInfo?.eventCount || 0,
      periodsConfigured: activeConfig?.periodAssignments?.length || 0,
      availableCoursesCount: this.courseManagementService.getActiveCourseCount(),
      configurationTitle: activeConfig?.title || null
    };
  }

}