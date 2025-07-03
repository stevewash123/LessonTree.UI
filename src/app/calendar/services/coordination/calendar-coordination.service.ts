// **COMPLETE FILE** - CalendarCoordinationService with Dual Signal/Observable Pattern
// RESPONSIBILITY: Coordinates schedule state reactions and delegates to appropriate services for calendar component.
// DOES NOT: Handle UI interactions, direct API calls, or template logic - pure reactive coordination service.
// CALLED BY: LessonCalendarComponent for managing reactive state coordination.

import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from '../state/schedule-state.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { CourseManagementService } from '../../../lesson-tree/services/course-operations/course-management.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { parseTeachingDaysToArray } from '../../../shared/utils/shared.utils';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { CalendarEventService } from '../ui/calendar-event.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { ScheduleCoordinationService } from './schedule-coordination.service';
import { SpecialDayManagementService } from '../business/special-day-management.service';

// ✅ Observable event interfaces
export interface CalendarRefreshEvent {
  events: any[];
  source: 'schedule-update' | 'configuration-change' | 'manual-refresh';
  eventCount: number;
  timestamp: Date;
}

export interface CalendarInitializationEvent {
  initialized: boolean;
  hasCallbacks: boolean;
  timestamp: Date;
}

export interface CalendarDateUpdateEvent {
  date: Date;
  source: 'configuration' | 'manual';
  timestamp: Date;
}

export interface CalendarOptionsUpdateEvent {
  optionType: 'hiddenDays' | 'initialDate' | 'full';
  optionValue: any;
  timestamp: Date;
}

export interface CalendarRefreshCallbacks {
  getCalendarApi: () => any;
  getCalendarOptions: () => CalendarOptions;
  setCalendarOptions: (options: CalendarOptions) => void;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarCoordinationService {

  // ✅ Observable events for one-time business processing
  private readonly _calendarRefreshed$ = new Subject<CalendarRefreshEvent>();
  private readonly _initializationCompleted$ = new Subject<CalendarInitializationEvent>();
  private readonly _calendarDateUpdated$ = new Subject<CalendarDateUpdateEvent>();
  private readonly _calendarOptionsUpdated$ = new Subject<CalendarOptionsUpdateEvent>();

  // ✅ Signal state for reactive UI and computed properties
  private readonly _initialized = signal<boolean>(false);
  private readonly _calendarEvents = signal<any[]>([]);
  private _callbacks: CalendarRefreshCallbacks | null = null;

  // Computed signals for reactive UI (keep as signals)
  readonly calendarEvents = computed(() => this._calendarEvents());

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private courseDataService: CourseDataService,
    private courseManagementService: CourseManagementService,
    private scheduleCoordinationService: ScheduleCoordinationService,
    private specialDayManagementService: SpecialDayManagementService
  ) {
    console.log('[CalendarCoordinationService] Initialized with dual Signal/Observable pattern');
  }

  // Initialize the coordination service with calendar refresh callbacks
  initialize(callbacks: CalendarRefreshCallbacks): void {
    console.log('[CalendarCoordinationService] initialize');

    this._callbacks = callbacks;
    this._initialized.set(true);

    // ✅ Emit initialization completed event for business logic
    this._initializationCompleted$.next({
      initialized: true,
      hasCallbacks: !!callbacks,
      timestamp: new Date()
    });

    // Set up reactive effects for schedule
    this.setupScheduleDisplayEffect();
    this.setupScheduleDateEffect();
    this.setupScheduleConfigurationEffect();
    this.setupSpecialDayEventSubscription(); // ✅ NEW: Add special day coordination

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

      if (displayState.canTransform) {
        console.log('[CalendarCoordinationService] Transforming events for calendar display');
        this.refreshCalendarEventsOnly(displayState.events, 'schedule-update');
      } else if (displayState.hasEvents && !displayState.hasConfiguration) {
        this.refreshCalendarEventsOnly([], 'configuration-change');
      } else if (!displayState.hasEvents) {
        this.refreshCalendarEventsOnly([], 'schedule-update');
      }
    });
  }

  // Effect: Update calendar date when configuration changes
  private setupScheduleDateEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

      if (activeConfig?.startDate) {
        this.updateCalendarDate(new Date(activeConfig.startDate), 'configuration');
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

  private setupSpecialDayEventSubscription(): void {
    this.specialDayManagementService.specialDayOperation$.subscribe(event => {
      console.log('📅 [CalendarCoordinationService] RECEIVED specialDayOperation event (Observable)', {
        type: event.type,
        affectedPeriods: event.affectedPeriods,
        date: event.date.toISOString().split('T')[0],
        eventType: event.eventType,
        timestamp: event.timestamp.toISOString()
      });

      // Refresh calendar display when special days are created/updated/deleted
      if (event.type === 'created' || event.type === 'updated' || event.type === 'deleted') {
        console.log('📅 [CalendarCoordinationService] Refreshing calendar due to special day operation');

        // Force refresh of calendar events using existing method
        const displayState = this.scheduleReadyForDisplay();
        if (displayState.canTransform) {
          this.refreshCalendarEventsOnly(displayState.events, 'schedule-update');
        }
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

  // ✅ ENHANCED: Refresh calendar events with Observable event emission
  private refreshCalendarEventsOnly(
    scheduleEvents: ScheduleEvent[],
    source: 'schedule-update' | 'configuration-change' | 'manual-refresh'
  ): void {
    if (scheduleEvents.length > 0) {
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents);
      console.log(`[CalendarCoordinationService] Calendar events updated: ${events.length} events`);

      // ✅ Update signal state for reactive UI
      this._calendarEvents.set(events);

      // ✅ Emit Observable event for business logic processing
      this._calendarRefreshed$.next({
        events,
        source,
        eventCount: events.length,
        timestamp: new Date()
      });
    } else {
      console.log('[CalendarCoordinationService] Calendar events cleared');

      // ✅ Update signal state
      this._calendarEvents.set([]);

      // ✅ Emit Observable event
      this._calendarRefreshed$.next({
        events: [],
        source,
        eventCount: 0,
        timestamp: new Date()
      });
    }
  }

  // ✅ ENHANCED: Update calendar date with Observable event emission
  private updateCalendarDate(date: Date, source: 'configuration' | 'manual'): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, initialDate: date });

    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.gotoDate(date);
    }

    // ✅ Emit Observable event for business logic
    this._calendarDateUpdated$.next({
      date,
      source,
      timestamp: new Date()
    });
  }

  // ✅ ENHANCED: Update hidden days with Observable event emission
  private updateHiddenDays(hiddenDays: number[]): void {
    if (!this._callbacks) return;

    const currentOptions = this._callbacks.getCalendarOptions();
    this._callbacks.setCalendarOptions({ ...currentOptions, hiddenDays });

    const calendarApi = this._callbacks.getCalendarApi();
    if (calendarApi) {
      calendarApi.setOption('hiddenDays', hiddenDays);
    }

    // ✅ Emit Observable event for business logic
    this._calendarOptionsUpdated$.next({
      optionType: 'hiddenDays',
      optionValue: hiddenDays,
      timestamp: new Date()
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
    const validation = this.courseManagementService.validateCourseSelection();

    if (validation.isValid && validation.course) {
      return validation.course;
    }

    return null;
  }

  // === CLEANUP ===

  // ✅ ENHANCED: Cleanup method with Observable completion
  cleanup(): void {
    console.log('[CalendarCoordinationService] cleanup');

    this._callbacks = null;
    this._initialized.set(false);

    // Complete all Observable subjects
    this._calendarRefreshed$.complete();
    this._initializationCompleted$.complete();
    this._calendarDateUpdated$.complete();
    this._calendarOptionsUpdated$.complete();
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
      configurationTitle: activeConfig?.title || null,
      calendarEventCount: this._calendarEvents().length
    };
  }

}
