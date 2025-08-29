// **COMPLETE FILE** - CalendarManagementService - Enhanced Debug Logging
// RESPONSIBILITY: Calendar state management, reactive effects, and business logic
// SCOPE: Signal management, effects, business logic only (Observable coordination in separate service)
// RATIONALE: Calendar management separated from cross-service event coordination

import {Injectable, effect, signal, computed, untracked, Injector} from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';

import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { CalendarEventService } from '../ui/calendar-event.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { parseTeachingDaysToArray } from '../../../shared/utils/shared.utils';
import {CourseManagementService} from '../../../lesson-tree/services/coordination/course-management.service';

export interface CalendarRefreshCallbacks {
  getCalendarApi: () => any;
  getCalendarOptions: () => CalendarOptions;
  setCalendarOptions: (options: CalendarOptions) => void;
  cls?: any; // ✅ FIX: Add proper cls property (component reference)
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
    private injector: Injector, // ✅ ADD: Injector for effect() context
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private courseManagementService: CourseManagementService
  ) {
    console.log('[CalendarManagementService] Simplified calendar management initialized');
    this.setupScheduleDisplayEffect();
    this.setupScheduleDateEffect();
    this.setupScheduleConfigurationEffect();
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
    const schedule = this.scheduleStateService.schedule(); // ✅ This is correct - schedule is a signal

    // ✅ FIXED: schedule is already the signal value, don't call it again
    const hasConfiguration = !!schedule?.scheduleConfiguration;

    return {
      canTransform: events.length > 0 && hasConfiguration,
      hasEvents: events.length > 0,
      hasConfiguration: hasConfiguration,
      events,
      config: schedule?.scheduleConfiguration || null, // ✅ FIXED: No function call
      eventCount: events.length,
      configTitle: schedule?.scheduleConfiguration?.title || null // ✅ FIXED: No function call
    };
  });
  // === REACTIVE EFFECTS ===

  private setupScheduleDisplayEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) {
        console.log('🔍 [CalendarManagementService] Effect skipped - not initialized or no callbacks');
        return;
      }

      // ✅ CRITICAL: Read ALL signal dependencies first, then use untracked() for ALL side effects
      const scheduleEvents = this.scheduleStateService.currentScheduleEvents();
      const config = this.scheduleConfigurationStateService.activeConfiguration();

      const canTransform = scheduleEvents.length > 0 && !!config?.periodAssignments?.length;
      const hasEvents = scheduleEvents.length > 0;
      const hasConfiguration = !!config?.periodAssignments?.length;

    }, { injector: this.injector });
  }

  private setupScheduleDateEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

      if (activeConfig?.startDate) {
        console.log('🔍 [CalendarManagementService] Updating calendar date:', activeConfig.startDate);
        this.updateCalendarDate(new Date(activeConfig.startDate));
      }
    }, { injector: this.injector }); // ✅ CRITICAL: Provide injector explicitly
  }

  private setupScheduleConfigurationEffect(): void {
    effect(() => {
      if (!this._initialized() || !this._callbacks) return;

      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

      if (activeConfig?.teachingDays) {
        const teachingDaysArray = parseTeachingDaysToArray(activeConfig.teachingDays);
        const hiddenDays = this.calculateHiddenDays(teachingDaysArray);
        console.log('🔍 [CalendarManagementService] Updating hidden days:', { teachingDaysArray, hiddenDays });
        this.updateHiddenDays(hiddenDays);
      }
    }, { injector: this.injector }); // ✅ CRITICAL: Provide injector explicitly
  }

  // === CALENDAR OPERATIONS ===
  refreshCalendarEventsOnly(scheduleEvents: ScheduleEvent[]): void {
    console.log('🔍 [DEBUG] === refreshCalendarEventsOnly DETAILED ===');
    console.log('🔍 [DEBUG] Input:', {
      inputEventCount: scheduleEvents.length,
      currentSignalEventCount: this._calendarEvents().length,
      inputSample: scheduleEvents.slice(0, 2).map(e => ({
        id: e.id,
        date: e.date,
        period: e.period,
        lessonTitle: e.lessonTitle,
        eventType: e.eventType
      }))
    });

    if (scheduleEvents.length > 0) {
      const events = this.calendarEventService.transformEventsForCalendar(scheduleEvents);

      console.log('🔍 [DEBUG] After transformation:', {
        transformedCount: events.length,
        transformedSample: events.slice(0, 2).map(e => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end
        }))
      });

      // ✅ Critical check: Validate transformed events
      const invalidEvents = events.filter(e => !e.id || !e.title || !e.start);
      if (invalidEvents.length > 0) {
        console.error('🔍 [DEBUG] ❌ INVALID TRANSFORMED EVENTS:', invalidEvents);
      }

      const newEventsArray = [...events];

      console.log('🔍 [DEBUG] About to set signal:', {
        newArrayLength: newEventsArray.length,
        isNewReference: newEventsArray !== this._calendarEvents()
      });

      this._calendarEvents.set(newEventsArray);

      console.log('🔍 [DEBUG] Signal set. Current signal state:', {
        signalLength: this._calendarEvents().length,
        signalSample: this._calendarEvents().slice(0, 2).map(e => ({
          id: e.id,
          title: e.title,
          start: e.start
        }))
      });

    } else {
      console.log('🔍 [DEBUG] No events - clearing signal');
      this._calendarEvents.set([]);
    }

    console.log('🔍 [DEBUG] === END refreshCalendarEventsOnly ===');
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
    console.log('[CalendarManagementService] Loading active schedule - enhanced with configuration check');
    const currentEvents = this._calendarEvents();
    if (currentEvents.length > 0) {
      console.log('[CalendarManagementService] ⏭️ SKIPPING load - already have events:', currentEvents.length);
      return;
    }

    this.schedulePersistenceService.loadActiveSchedule().subscribe({
      next: (loaded: boolean) => {
        if (loaded) {
          console.log('[CalendarManagementService] Active schedule loaded successfully');

          // ✅ Verify configuration was also loaded
          const hasConfig = this.scheduleConfigurationStateService.hasActiveConfiguration();
          if (!hasConfig) {
            console.warn('[CalendarManagementService] ⚠️ Schedule loaded but configuration missing - may need manual load');
          }
        } else {
          console.log('[CalendarManagementService] No existing schedule found - user will need to create configuration');
        }
      },
      error: (error: any) => {
        console.error('[CalendarManagementService] Failed to load active schedule:', error);
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

  // === PUBLIC API METHODS ===

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

  //transformScheduleEventsToCalendar(scheduleEvents: any[]): any[] {
  //  console.log('[CalendarManagementService] transformScheduleEventsToCalendar');

    // ✅ Use existing calendarEventService
  //  return this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents);
  //}

  debugSignalState(): any {
    const events = this._calendarEvents();
    const displayState = this.scheduleReadyForDisplay();

    return {
      signalEventCount: events.length,
      signalEventsValid: events.every(e => e.id && e.title && e.start),
      displayState: {
        canTransform: displayState.canTransform,
        hasEvents: displayState.hasEvents,
        hasConfiguration: displayState.hasConfiguration
      },
      sampleEvents: events.slice(0, 3).map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        period: e.extendedProps?.period
      }))
    };
  }

}
