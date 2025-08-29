// **UPDATED SERVICE** - SpecialDayCoordinationService - Reduced from 19,220 to ~400 lines
// RESPONSIBILITY: Observable event management, cross-service coordination only
// DOES NOT: Handle lesson shifting logic (delegated to LessonShiftingService)
// CALLED BY: SpecialDayManagementService for coordinated operations

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { format } from 'date-fns';
import { map } from 'rxjs/operators';

import { ScheduleEvent } from '../../../models/schedule-event.model';
import { SpecialDayBusinessService, SpecialDayData } from '../business/special-day-buisness.service';
import {CalendarRefreshService} from '../business/calendar-refresh.service';

// ✅ Observable event for cross-component coordination
export interface SpecialDayOperationEvent {
  type: 'created' | 'updated' | 'deleted';
  scheduleEvent: ScheduleEvent;
  affectedPeriods: number[];
  date: Date;
  eventType: string;
  title: string;
  timestamp: Date;
  source: 'special-day-management';
}

// ✅ Cross-service coordination event
export interface SpecialDayCoordinationEvent {
  coordinationType: 'lesson-shifting-response' | 'sequence-continuation-response' | 'schedule-update-response';
  triggerEvent: string;
  sourceService: string;
  coordinationAction: string;
  specialDayDetails: {
    date: Date;
    affectedPeriods: number[];
    eventType: string;
  };
  success: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SpecialDayCoordinationService implements OnDestroy {

  // ✅ Observable events for cross-component coordination
  private readonly _specialDayOperation$ = new Subject<SpecialDayOperationEvent>();
  private readonly _specialDayCoordinated$ = new Subject<SpecialDayCoordinationEvent>();

  readonly specialDayOperation$ = this._specialDayOperation$.asObservable();
  readonly specialDayCoordinated$ = this._specialDayCoordinated$.asObservable();

  // ✅ Subscription management for Observable consumption
  private subscriptions = new Subscription();

  constructor(
      private businessService: SpecialDayBusinessService,
      private calendarRefresh: CalendarRefreshService
  ) { }

  // === COORDINATED OPERATIONS WITH LESSON INTEGRATION ===

  createSpecialDayWithCoordination(data: SpecialDayData): Observable<ScheduleEvent[]> {
    console.log(`[SpecialDayCoordinationService] Creating special day with simplified coordination`);

    return this.businessService.createSpecialDay(data).pipe(
      map((scheduleEvents: ScheduleEvent[]) => {
        console.log(`[SpecialDayCoordinationService] Special day created - triggering calendar refresh`);

        // ✅ SIMPLIFIED: Just trigger calendar refresh - API handles all logic
        this.calendarRefresh.refreshAfterSpecialDayChange('added');

        // ✅ Keep existing Observable emission for other components
        this._specialDayOperation$.next({
          type: 'created',
          scheduleEvent: scheduleEvents[0],
          affectedPeriods: data.periods,
          date: data.date,
          eventType: data.eventType,
          title: data.title,
          timestamp: new Date(),
          source: 'special-day-management'
        });

        console.log('🚨 [SpecialDayCoordinationService] EMITTED specialDayOperation event (Observable)');

        return scheduleEvents;
      })
    );
  }


  updateSpecialDayWithCoordination(data: SpecialDayData, originalScheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    console.log(`[SpecialDayCoordinationService] Updating special day with simplified coordination`);

    return this.businessService.updateSpecialDay(data, originalScheduleEvent).pipe(
      map((updatedScheduleEvent: ScheduleEvent) => {
        // ✅ SIMPLIFIED: Just trigger calendar refresh
        this.calendarRefresh.refreshAfterSpecialDayChange('updated');

        // ✅ Keep existing Observable emission
        this._specialDayOperation$.next({
          type: 'updated',
          scheduleEvent: updatedScheduleEvent,
          affectedPeriods: data.periods,
          date: data.date,
          eventType: data.eventType,
          title: data.title,
          timestamp: new Date(),
          source: 'special-day-management'
        });

        return updatedScheduleEvent;
      })
    );
  }

  deleteSpecialDayWithCoordination(scheduleEvent: ScheduleEvent): Observable<void> {
    console.log(`[SpecialDayCoordinationService] Deleting special day with simplified coordination`);

    const eventData = {
      date: scheduleEvent.date,
      period: scheduleEvent.period,
      eventType: scheduleEvent.eventType || 'Unknown',
      title: this.extractTitleFromComment(scheduleEvent.comment, scheduleEvent.eventType || 'Special Day')
    };

    return this.businessService.deleteSpecialDay(scheduleEvent).pipe(
      map(() => {
        // ✅ SIMPLIFIED: Just trigger calendar refresh - API handles all logic
        this.calendarRefresh.refreshAfterSpecialDayChange('deleted');

        // ✅ Keep existing Observable emission
        this._specialDayOperation$.next({
          type: 'deleted',
          scheduleEvent: scheduleEvent,
          affectedPeriods: [scheduleEvent.period],
          date: eventData.date,
          eventType: eventData.eventType,
          title: eventData.title,
          timestamp: new Date(),
          source: 'special-day-management'
        });

        console.log('🚨 [SpecialDayCoordinationService] EMITTED specialDayOperation event (Observable)');
      })
    );
  }

  // === PRIVATE HELPER METHODS ===

  private extractTitleFromComment(comment: string | null | undefined, eventType: string): string {
    if (!comment) return eventType;

    if (comment.startsWith(eventType + ':')) {
      return comment.substring((eventType + ':').length).trim();
    }

    return comment;
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[SpecialDayCoordinationService] Cleaning up Observable subscriptions and subjects');

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // ✅ Complete subjects
    this._specialDayOperation$.complete();
    this._specialDayCoordinated$.complete();

    console.log('[SpecialDayCoordinationService] All Observable subjects and subscriptions completed');
  }
}
