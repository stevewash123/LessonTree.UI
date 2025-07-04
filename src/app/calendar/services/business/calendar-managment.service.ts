// **COMPLETE FILE** - CalendarManagementService - Signal Management & Effects
// RESPONSIBILITY: Calendar state management, reactive effects, and business logic
// SCOPE: Signal management, effects, business logic only (Observable coordination in separate service)
// RATIONALE: Calendar management separated from cross-service event coordination

import { Injectable, effect, signal, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { CalendarEventService } from '../ui/calendar-event.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { parseTeachingDaysToArray } from '../../../shared/utils/shared.utils';
import {ScheduleCoordinationService} from '../coordination/schedule-coordination.service';
import {CourseManagementService} from '../../../lesson-tree/services/coordination/course-management.service';

export interface CalendarRefreshCallbacks {
  getCalendarApi: () => any;
  getCalendarOptions: () => CalendarOptions;
  setCalendarOptions: (options: CalendarOptions) => void;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarManagementService {

  // ✅ Signal state for reactive UI and computed properties
  private readonly _initialized = signal<boolean>(false);
  private readonly _calendarEvents = signal<any[]>([]);
  private _callbacks: CalendarRefreshCallbacks | null = null;

  // Computed signals for reactive UI
  readonly calendarEvents = computed(() => this._calendarEvents());
  readonly isInitialized = computed(() => this._initialized());

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private courseDataService: CourseDataService,
    private courseManagementService: CourseManagementService,
    private scheduleCoordinationService: ScheduleCoordinationService
  ) {
    console.log('[CalendarManagementService] Signal-based calendar management initialized');
  }

  // Initialize the coordination service with calendar refresh callbacks
  initialize(callbacks: CalendarRefreshCallbacks): void {
    console.log('[CalendarManagementService] initialize');

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

  // === REACTIVE EFFECTS ===

  private setupScheduleDisplayEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const displayState = this.scheduleReadyForDisplay();

      if (displayState.canTransform) {
        console.log('[CalendarManagementService] Transforming events for calendar display');
        this.refreshCalendarEventsOnly(displayState.events);
      } else if (displayState.hasEvents && !displayState.hasConfiguration) {
        this.refreshCalendarEventsOnly([]);
      } else if (!displayState.hasEvents) {
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

  // === CALENDAR OPERATIONS ===

  // Refresh calendar events (signal update only)
  refreshCalendarEventsOnly(scheduleEvents: ScheduleEvent[]): void {
    if (scheduleEvents.length > 0) {
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents);
      console.log(`[CalendarManagementService] Calendar events updated: ${events.length} events`);

      // Update signal state for reactive UI
      this._calendarEvents.set(events);
    } else {
      console.log('[CalendarManagementService] Calendar events cleared');
      this._calendarEvents.set([]);
    }
  }

  // Update calendar date
  updateCalendarDate(date: Date): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, initialDate: date });

    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.gotoDate(date);
    }
  }

  // Update hidden days
  updateHiddenDays(hiddenDays: number[]): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, hiddenDays });

    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.setOption('hiddenDays', hiddenDays);
    }
  }

  // === BUSINESS LOGIC ===

  // Load active schedule for current user
  loadActiveSchedule(): void {
    console.log('[CalendarManagementService] Loading active schedule');

    this.scheduleCoordinationService.loadActiveScheduleWithConfiguration().subscribe({
      next: (success: boolean) => {
        if (success) {
          console.log('[CalendarManagementService] Active schedule loaded successfully');
        } else {
          console.log('[CalendarManagementService] No existing schedule, generating new one');
          this.generateSchedule();
        }
      },
      error: (error: any) => {
        console.error('[CalendarManagementService] Failed to load active schedule:', error);
        this.generateSchedule();
      }
    });
  }

  // Calculate hidden days from teaching days array
  calculateHiddenDays(teachingDaysArray: string[]): number[] {
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
  generateSchedule(): void {
    console.log('[CalendarManagementService] Generating schedule');

    this.scheduleCoordinationService.generateAndSetSchedule().subscribe({
      next: () => {
        console.log('[CalendarManagementService] Schedule generated successfully');
      },
      error: (error: any) => {
        console.error('[CalendarManagementService] Schedule generation failed:', error);
      }
    });
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

  hasCoursesAvailable(): boolean {
    return this.courseManagementService.hasCoursesAvailable();
  }

  getActiveCourseCount(): number {
    return this.courseManagementService.getActiveCourseCount();
  }

  getCurrentCourse(): any | null {
    const validation = this.courseManagementService.validateCourseSelection();

    if (validation.isValid && validation.course) {
      return validation.course;
    }

    return null;
  }

  // === SCHEDULE OPERATIONS ===

  regenerateSchedule(): void {
    console.log('[CalendarManagementService] Regenerating schedule');

    this.scheduleCoordinationService.regenerateSchedule().subscribe({
      next: () => {
        console.log('[CalendarManagementService] Schedule regenerated successfully');
      },
      error: (error: any) => {
        console.error('[CalendarManagementService] Schedule regeneration failed:', error);
      }
    });
  }

  saveSchedule(): void {
    console.log('[CalendarManagementService] Saving schedule');

    this.scheduleCoordinationService.saveCurrentSchedule().subscribe({
      next: () => {
        console.log('[CalendarManagementService] Schedule saved successfully');
      },
      error: (error: any) => {
        console.error('[CalendarManagementService] Schedule save failed:', error);
      }
    });
  }

  // === DEBUG ===

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
      configurationTitle: activeConfig?.title || null,
      calendarEventCount: this._calendarEvents().length
    };
  }

  // === CLEANUP ===

  cleanup(): void {
    console.log('[CalendarManagementService] cleanup');

    this._callbacks = null;
    this._initialized.set(false);
  }
}
