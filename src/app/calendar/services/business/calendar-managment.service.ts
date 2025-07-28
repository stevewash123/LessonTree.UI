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
import {ScheduleWorkflowBusinessService} from './schedule-workflow-business.service';
import {ScheduleWorkflowCoordinationService} from '../coordination/schedule-workflow-coordination.service';

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
    private injector: Injector, // ✅ ADD: Injector for effect() context
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private courseDataService: CourseDataService,
    private courseManagementService: CourseManagementService,
    private scheduleWorkflowBusinessService: ScheduleWorkflowBusinessService,
    private scheduleCoordinationService: ScheduleWorkflowCoordinationService
  ) {
    console.log('[CalendarManagementService] Signal-based calendar management initialized');

    // ✅ MOVE: Setup effects in constructor where injection context is available
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
      if (!this._initialized() || !this._callbacks) {
        console.log('🔍 [CalendarManagementService] Effect skipped - not initialized or no callbacks');
        return;
      }

      const displayState = this.scheduleReadyForDisplay();

      // ✅ Use untracked() to prevent circular signal dependencies
      untracked(() => {
        if (displayState.canTransform) {
          console.log('[CalendarManagementService] Transforming events for calendar display');
          this.refreshCalendarEventsOnly(displayState.events);
        } else if (displayState.hasEvents && !displayState.hasConfiguration) {
          console.log('🔍 [CalendarManagementService] Has events but no configuration - clearing calendar');
          this.refreshCalendarEventsOnly([]);
        } else if (!displayState.hasEvents) {
          console.log('🔍 [CalendarManagementService] No events - clearing calendar');
          this.refreshCalendarEventsOnly([]);
        }
      });
    }, { injector: this.injector }); // ✅ CRITICAL: Provide injector explicitly
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
    console.log('🔍 [CalendarManagementService] refreshCalendarEventsOnly called:', {
      inputEventCount: scheduleEvents.length,
      currentSignalEventCount: this._calendarEvents().length
    });

    if (scheduleEvents.length > 0) {
      // ✅ SIMPLIFIED: Just transform and update the signal - let Angular handle the rest
      const events = this.calendarEventService.mapScheduleEventsToCalendarEvents(scheduleEvents);

      console.log('🔄 [CalendarManagementService] Creating new events array for Angular change detection:', {
        inputScheduleEvents: scheduleEvents.length,
        outputCalendarEvents: events.length,
        firstTwoEvents: events.slice(0, 2).map(e => ({
          id: e.id,
          title: e.title,
          start: e.start,
          lessonId: e.extendedProps?.lessonId
        }))
      });

      // ✅ CRITICAL: Create completely new array reference
      const newEventsArray = [...events];

      // ✅ Update signal - this should trigger Angular change detection with deepChangeDetection="true"
      this._calendarEvents.set(newEventsArray);

      // ✅ Enhanced debug logging to verify signal content
      const lessonEventsInOrder = newEventsArray.filter(e => {
        const hasEventCategory = e.extendedProps?.eventCategory === 'Lesson';
        const hasLessonId = e.extendedProps?.lessonId && typeof e.extendedProps.lessonId === 'number';
        const isLessonByTitle = e.title && e.title.includes('Lesson');
        return hasEventCategory || hasLessonId || isLessonByTitle;
      }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      console.log('🎯 [CalendarManagementService] FINAL LESSON ORDER IN SIGNAL:', {
        totalLessonEvents: lessonEventsInOrder.length,
        chronologicalSequence: lessonEventsInOrder.map((e, index) => ({
          position: index + 1,
          date: e.start,
          title: e.title,
          lessonId: e.extendedProps?.lessonId,
          lessonSort: e.extendedProps?.lessonSort
        })),
        signalArrayReference: newEventsArray.length,
        isNewReference: this._calendarEvents() === newEventsArray
      });

      // ✅ NO MORE FULLCALENDAR API CALLS - Let Angular handle it!
      console.log('🎯 [CalendarManagementService] Signal updated - Angular should handle FullCalendar refresh automatically');

    } else {
      console.log('[CalendarManagementService] Calendar events cleared');
      this._calendarEvents.set([]);
    }
  }

  refreshCalendarEventsAfterLessonMove(lessonMoveData: any): void {
    console.log('🎯 [CalendarManagementService] Lesson moved - refreshing calendar using PROVEN POC PATTERN:', {
      lessonId: lessonMoveData.lessonId,
      lessonTitle: lessonMoveData.lesson?.title,
      oldSort: lessonMoveData.metadata?.oldSortOrder,
      newSort: lessonMoveData.metadata?.newSortOrder,
      moveType: lessonMoveData.moveType
    });

    // ✅ USE PROVEN POC PATTERN: Get current schedule events and refresh
    // This is exactly the same pattern that works in your testBasicUpdate()
    const displayState = this.scheduleReadyForDisplay();

    if (displayState.canTransform && displayState.events.length > 0) {
      console.log('🔄 [CalendarManagementService] Using proven POC pattern - refreshing with current schedule events');

      // ✅ Use your proven refreshCalendarEventsOnly method
      // This creates new array reference that triggers FullCalendar change detection
      this.refreshCalendarEventsOnly(displayState.events);

      console.log('✅ [CalendarManagementService] Calendar refreshed after lesson move using proven pattern');
    } else {
      console.log('📊 [CalendarManagementService] No events to refresh after lesson move');
      this.refreshCalendarEventsOnly([]);
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

  // ADD THIS METHOD to your CalendarManagementService class

// Method to update mock data (simulates service data changes)
  updateMockEvent(eventId: string, updates: Partial<any>): void {
    console.log('🎭 [CalendarManagementService] Updating mock event:', { eventId, updates });

    const currentMockEvents = this._mockCalendarEvents();

    // Find and update the target event
    const updatedMockEvents = currentMockEvents.map(event => {
      if (event.id === eventId) {
        const updatedEvent = {
          ...event,
          ...updates,
          extendedProps: {
            ...event.extendedProps,
            ...updates['extendedProps'],
            modifiedAt: new Date().toISOString()
          }
        };
        console.log('🎭 Event updated:', { original: event.title, updated: updatedEvent.title });
        return updatedEvent;
      }
      return event;
    });

    // Check if update occurred
    const wasUpdated = updatedMockEvents.some(e =>
      e.extendedProps?.modifiedAt && !currentMockEvents.find(orig => orig.id === e.id)?.extendedProps?.modifiedAt
    );

    if (wasUpdated) {
      // ✅ Update the mock signal with new data
      this._mockCalendarEvents.set([...updatedMockEvents]);
      console.log('✅ [CalendarManagementService] Mock data signal updated');
    } else {
      console.log(`❌ [CalendarManagementService] Event "${eventId}" not found in mock data`);
    }
  }

  private readonly _mockCalendarEvents = signal<any[]>([
    {
      id: 'mock-lesson-1',
      title: '📚 Math Lesson 1',
      start: '2025-08-05T10:00:00',
      end: '2025-08-05T11:00:00',
      backgroundColor: '#e74c3c',
      borderColor: '#c0392b',
      extendedProps: {
        eventCategory: 'Lesson',
        lessonId: 101,
        courseId: 'math-101',
        period: 1,
        lessonSort: 1
      }
    },
    {
      id: 'mock-lesson-2',
      title: '📚 Math Lesson 2',
      start: '2025-08-06T10:00:00',
      end: '2025-08-06T11:00:00',
      backgroundColor: '#e74c3c',
      borderColor: '#c0392b',
      extendedProps: {
        eventCategory: 'Lesson',
        lessonId: 102,
        courseId: 'math-101',
        period: 1,
        lessonSort: 2
      }
    },
    {
      id: 'mock-lesson-3',
      title: '🔬 Science Lab',
      start: '2025-08-07T14:00:00',
      end: '2025-08-07T15:00:00',
      backgroundColor: '#27ae60',
      borderColor: '#229954',
      extendedProps: {
        eventCategory: 'Lesson',
        lessonId: 201,
        courseId: 'science-101',
        period: 2,
        lessonSort: 1
      }
    }
  ]);

// Computed signal for mock data (same signature as calendarEvents)
  readonly mockCalendarEvents = computed(() => this._mockCalendarEvents());

// Method to switch to mock data
  useMockData(): void {
    console.log('🎭 [CalendarManagementService] Switching to mock data');

    const mockData = this._mockCalendarEvents();
    console.log('🎭 Mock data:', {
      count: mockData.length,
      events: mockData.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        extendedProps: e.extendedProps
      }))
    });

    // Use same method as real service data
    this._calendarEvents.set([...mockData]);
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
