// **COMPLETE FILE** - CalendarCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management and cross-service coordination for calendar operations
// SCOPE: Observable patterns and cross-service subscriptions only (business logic in separate service)
// RATIONALE: Event coordination separated from calendar management logic for maintainability

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

import { SpecialDayManagementService } from '../business/special-day-management.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import {CalendarManagementService} from '../business/calendar-managment.service';

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

  constructor(
    private managementService: CalendarManagementService,
    private specialDayManagementService: SpecialDayManagementService
  ) {
    console.log('[CalendarCoordinationService] Observable coordination patterns initialized');
    this.setupCrossServiceSubscriptions();
  }

  // === INITIALIZATION WITH EVENTS ===

  initializeWithCoordination(callbacks: any): void {
    console.log('[CalendarCoordinationService] Initialize with cross-service coordination');

    // Delegate to management service
    this.managementService.initialize(callbacks);

    // ✅ Emit initialization completed event for business logic
    this._initializationCompleted$.next({
      initialized: true,
      hasCallbacks: !!callbacks,
      timestamp: new Date()
    });
  }

  // === CROSS-SERVICE SUBSCRIPTIONS ===

  private setupCrossServiceSubscriptions(): void {
    console.log('[CalendarCoordinationService] Setting up cross-service subscriptions');

    // ✅ Subscribe to special day operations
    this.subscriptions.add(
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

          // Trigger business service refresh and emit coordination event
          this.refreshCalendarWithCoordination('schedule-update');
        }
      })
    );

    console.log('[CalendarCoordinationService] Cross-service subscriptions setup complete');
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
