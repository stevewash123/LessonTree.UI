// **COMPLETE FILE** - CalendarCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management and cross-service coordination for calendar operations
// SCOPE: Observable patterns and cross-service subscriptions only (business logic in separate service)
// RATIONALE: Event coordination separated from calendar management logic for maintainability

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

import { SpecialDayManagementService } from '../business/special-day-management.service';
import {CalendarManagementService} from '../business/calendar-managment.service';
import {LessonSequenceCoordinationService} from "./lesson-sequence-coordination.service";
import {ScheduleEventCoordinationService} from "./schedule-event-coordination.service";
import {ScheduleEventRepositioningService} from "../business/schedule-event-repositioning.service";

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

@Injectable({
  providedIn: 'root'
})
export class CalendarCoordinationService implements OnDestroy {

  // ✅ Observable events for cross-service coordination
  private readonly _calendarRefreshed$ = new Subject<CalendarRefreshEvent>();
  private readonly _initializationCompleted$ = new Subject<CalendarInitializationEvent>();
  private readonly _calendarDateUpdated$ = new Subject<CalendarDateUpdateEvent>();
  private readonly _calendarOptionsUpdated$ = new Subject<CalendarOptionsUpdateEvent>();

  // Public observables for business logic subscriptions
  readonly calendarRefreshed$ = this._calendarRefreshed$.asObservable();
  readonly initializationCompleted$ = this._initializationCompleted$.asObservable();
  readonly calendarDateUpdated$ = this._calendarDateUpdated$.asObservable();
  readonly calendarOptionsUpdated$ = this._calendarOptionsUpdated$.asObservable();

  // ✅ Subscription management for cross-service coordination
  private subscriptions = new Subscription();

  // **PARTIAL UPDATE** - CalendarCoordinationService constructor with enhanced debugging
// Add this enhanced logging to your existing constructor

  constructor(
    private managementService: CalendarManagementService,
    private specialDayManagementService: SpecialDayManagementService,
    private lessonSequenceCoordination: LessonSequenceCoordinationService,
    private scheduleEventCoordination: ScheduleEventCoordinationService,
    private scheduleEventRepositioningService: ScheduleEventRepositioningService
  ) {
    console.log('🚨🚨🚨 [CalendarCoordination] ===== SERVICE CONSTRUCTOR EXECUTING =====');
    console.log('🚨 [CalendarCoordination] Timestamp:', new Date().toISOString());
    console.log('🚨 [CalendarCoordination] Dependencies injected:', {
      managementService: !!managementService,
      scheduleEventCoordination: !!scheduleEventCoordination,
      hasLessonOrderChanged$: !!scheduleEventCoordination?.lessonOrderChanged$
    });

    // Test observable immediately
    console.log('🚨 [CalendarCoordination] Testing scheduleEventCoordination.lessonOrderChanged$ observable...');

    // Set up subscription SYNCHRONOUSLY
    console.log('🚨 [CalendarCoordination] About to call setupCrossServiceSubscriptions()...');
    this.setupCrossServiceSubscriptions();
    console.log('🚨 [CalendarCoordination] setupCrossServiceSubscriptions() completed');

    console.log('🚨🚨🚨 [CalendarCoordination] ===== CONSTRUCTOR COMPLETE =====');
  }

  // **PARTIAL UPDATE** - Replace setupCrossServiceSubscriptions with enhanced debug version

  private setupCrossServiceSubscriptions(): void {
    console.log('🚨🚨🚨 [CalendarCoordination] ===== SUBSCRIPTION SETUP START =====');
    console.log('🚨 [CalendarCoordination] Timestamp:', new Date().toISOString());

    // Test observable before subscribing
    console.log('🚨 [CalendarCoordination] Testing observable availability:', {
      scheduleEventCoordination: !!this.scheduleEventCoordination,
      lessonOrderChanged$: !!this.scheduleEventCoordination?.lessonOrderChanged$,
      canSubscribe: typeof this.scheduleEventCoordination?.lessonOrderChanged$?.subscribe === 'function'
    });

    console.log('[CalendarCoordinationService] Setting up cross-service subscriptions');

    // ✅ Subscribe to special day operations (keep existing)
    this.subscriptions.add(
      this.specialDayManagementService.specialDayOperation$.subscribe(event => {
        console.log('📅 [CalendarCoordinationService] RECEIVED specialDayOperation event (Observable)', {
          type: event.type,
          affectedPeriods: event.affectedPeriods,
          date: event.date.toISOString().split('T')[0],
          eventType: event.eventType,
          timestamp: event.timestamp.toISOString()
        });

        if (event.type === 'created' || event.type === 'updated' || event.type === 'deleted') {
          console.log('📅 [CalendarCoordinationService] Refreshing calendar due to special day operation');
          this.refreshCalendarWithCoordination('schedule-update');
        }
      })
    );

    // ✅ Enhanced lesson order subscription with immediate test
    console.log('🚨🚨🚨 [CalendarCoordination] ===== SETTING UP lessonOrderChanged$ SUBSCRIPTION =====');

    try {
      const subscription = this.scheduleEventCoordination.lessonOrderChanged$.subscribe({
        next: (event) => {
          console.log('🚨🚨🚨 [CalendarCoordination] *** SUBSCRIPTION FIRED *** - lessonOrderChanged$ event received');
          console.log('📚 [CalendarCoordinationService] RECEIVED lessonOrderChanged event (Observable)', {
            lessonTitle: event.lesson.title,
            lessonId: event.lesson.id,
            sourceLocation: event.sourceLocation,
            targetLocation: event.targetLocation,
            source: event.source,
            metadata: event.metadata,
            timestamp: event.timestamp.toISOString()
          });

          // ✅ Process the event with repositioning
          console.log('📚 [CalendarCoordinationService] Processing lesson order change with schedule repositioning');

          const lessonOrderChange = {
            lessonId: event.lesson.id,
            courseId: event.lesson.courseId || 0,
            oldSortOrder: event.metadata?.oldSortOrder || 0,
            newSortOrder: event.metadata?.newSortOrder || 0,
            moveType: event.sourceLocation === event.targetLocation ? 'reorder' as const : 'reparent' as const,
            metadata: event.metadata  // ✅ FIXED: Pass entire metadata object, not just apiResponse
          };

          console.log('📚 [CalendarCoordinationService] 🎯 LESSON ORDER CHANGE DATA:', {
            lessonOrderChange,
            hasApiResponse: !!lessonOrderChange.metadata?.apiResponse,
            apiResponseEntities: lessonOrderChange.metadata?.apiResponse?.modifiedEntities?.length || 0
          });

          const repositioningResult = this.scheduleEventRepositioningService.repositionScheduleEventsForLessonOrderChange(lessonOrderChange);

          if (repositioningResult.success) {
            console.log('📚 [CalendarCoordinationService] Schedule events repositioned successfully:', {
              eventsUpdated: repositioningResult.eventsUpdated,
              eventsShifted: repositioningResult.eventsShifted,
              periodsAffected: repositioningResult.periodsAffected
            });
          } else {
            console.error('📚 [CalendarCoordinationService] Schedule repositioning failed:', repositioningResult.errors);
          }

          // ✅ NEW: Use proven POC pattern for calendar refresh
          console.log('🎯 [CalendarCoordinationService] Calling PROVEN calendar refresh method');
          this.managementService.refreshCalendarEventsAfterLessonMove({
            lesson: event.lesson,
            lessonId: event.lesson.id,
            metadata: event.metadata,
            moveType: lessonOrderChange.moveType,
            repositioningResult: repositioningResult
          });

          console.log('✅ [CalendarCoordinationService] Lesson move calendar refresh completed using proven POC pattern');
        },
        error: (error) => {
          console.error('🚨 [CalendarCoordination] Subscription ERROR:', error);
        },
        complete: () => {
          console.log('🚨 [CalendarCoordination] Subscription COMPLETED');
        }
      });
      this.subscriptions.add(subscription);
      console.log('🚨 [CalendarCoordination] lessonOrderChanged$ subscription SUCCESSFULLY ADDED');

    } catch (error) {
      console.error('🚨 [CalendarCoordination] FAILED to set up lessonOrderChanged$ subscription:', error);
    }

    console.log('🚨🚨🚨 [CalendarCoordination] ===== SUBSCRIPTION SETUP COMPLETE =====');
    console.log('🚨 [CalendarCoordination] Total subscriptions:', this.subscriptions.closed ? 'CLOSED' : 'ACTIVE');
  }

  // === COORDINATED OPERATIONS ===

  refreshCalendarWithCoordination(source: 'schedule-update' | 'configuration-change' | 'manual-refresh'): void {
    console.log(`[CalendarCoordinationService] Refresh calendar with coordination - source: ${source}`);

    // Get display state from management service
    const displayState = this.managementService.scheduleReadyForDisplay();

    if (displayState.canTransform) {
      // Trigger management service refresh
      this.managementService.refreshCalendarEventsOnly(displayState.events);

      // Transform events for Observable emission
      const events = this.managementService.calendarEvents();

      // ✅ Emit Observable event for cross-service coordination
      this._calendarRefreshed$.next({
        events,
        source,
        eventCount: events.length,
        timestamp: new Date()
      });
    } else {
      // Clear events and emit coordination event
      this.managementService.refreshCalendarEventsOnly([]);

      this._calendarRefreshed$.next({
        events: [],
        source,
        eventCount: 0,
        timestamp: new Date()
      });
    }
  }

  updateCalendarDateWithCoordination(date: Date, source: 'configuration' | 'manual'): void {
    console.log('[CalendarCoordinationService] Update calendar date with coordination');

    // Delegate to management service
    this.managementService.updateCalendarDate(date);

    // ✅ Emit Observable event for business logic
    this._calendarDateUpdated$.next({
      date,
      source,
      timestamp: new Date()
    });
  }

  updateHiddenDaysWithCoordination(hiddenDays: number[]): void {
    console.log('[CalendarCoordinationService] Update hidden days with coordination');

    // Delegate to management service
    this.managementService.updateHiddenDays(hiddenDays);

    // ✅ Emit Observable event for business logic
    this._calendarOptionsUpdated$.next({
      optionType: 'hiddenDays',
      optionValue: hiddenDays,
      timestamp: new Date()
    });
  }

  // === DELEGATION METHODS - Direct access to business operations ===

  /**
   * Delegates to management service for operations that don't need coordination events
   */
  initialize(callbacks: any) {
    return this.managementService.initialize(callbacks);
  }

  get calendarEvents() {
    return this.managementService.calendarEvents;
  }

  get isInitialized() {
    return this.managementService.isInitialized;
  }

  get scheduleReadyForDisplay() {
    return this.managementService.scheduleReadyForDisplay;
  }

  hasScheduleConfiguration() {
    return this.managementService.hasScheduleConfiguration();
  }

  hasActiveSchedule() {
    return this.managementService.hasActiveSchedule();
  }

  getScheduleInfo() {
    return this.managementService.getScheduleInfo();
  }

  hasCoursesAvailable() {
    return this.managementService.hasCoursesAvailable();
  }

  getActiveCourseCount() {
    return this.managementService.getActiveCourseCount();
  }

  getCurrentCourse() {
    return this.managementService.getCurrentCourse();
  }

  regenerateSchedule() {
    return this.managementService.regenerateSchedule();
  }

  saveSchedule() {
    return this.managementService.saveSchedule();
  }

  getDebugInfo() {
    return this.managementService.getDebugInfo();
  }

  refreshSchedule(): void {
    console.log('[CalendarCoordinationService] refreshSchedule with coordination');

    // Delegate to management service
    this.managementService.loadActiveSchedule();

    // ✅ Emit manual refresh event
    this._calendarRefreshed$.next({
      events: this.managementService.calendarEvents(),
      source: 'manual-refresh',
      eventCount: this.managementService.calendarEvents().length,
      timestamp: new Date()
    });
  }

  // === CLEANUP ===

  cleanup(): void {
    console.log('[CalendarCoordinationService] cleanup with Observable completion');

    // Delegate to management service
    this.managementService.cleanup();

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // Complete all Observable subjects
    this._calendarRefreshed$.complete();
    this._initializationCompleted$.complete();
    this._calendarDateUpdated$.complete();
    this._calendarOptionsUpdated$.complete();
  }

  ngOnDestroy(): void {
    this.cleanup();
    console.log('[CalendarCoordinationService] All subjects completed on destroy');
  }
}
