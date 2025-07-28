// **UPDATED SERVICE** - SpecialDayCoordinationService - Reduced from 19,220 to ~400 lines
// RESPONSIBILITY: Observable event management, cross-service coordination only
// DOES NOT: Handle lesson shifting logic (delegated to LessonShiftingService)
// CALLED BY: SpecialDayManagementService for coordinated operations

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { format } from 'date-fns';
import { map } from 'rxjs/operators';

import { LessonShiftingService } from '../business/lesson-shifting.service';
import { LessonSequenceCoordinationService } from './lesson-sequence-coordination.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { SpecialDayBusinessService, SpecialDayData } from '../business/special-day-buisness.service';

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
      private lessonShiftingService: LessonShiftingService,
      private lessonSequenceService: LessonSequenceCoordinationService
  ) {
    console.log('[SpecialDayCoordinationService] Observable coordination patterns for special day operations');
    this.setupObservableConsumption();
  }

  // ✅ Observable consumption setup for cross-service coordination
  private setupObservableConsumption(): void {
    console.log('[SpecialDayCoordinationService] Setting up Observable consumption for cross-service coordination');

    // ✅ Consume LessonSequenceService events
    this.subscriptions.add(
        this.lessonSequenceService.sequenceContinuation$.subscribe((event: any) => {
          console.log('[SpecialDayCoordinationService] RECEIVED lesson sequence continuation event (Observable):', {
            operationType: event.operationType,
            periodsProcessed: event.periodsProcessed,
            eventsCreated: event.eventsCreated,
            success: event.success,
            source: event.source,
            timestamp: event.timestamp.toISOString()
          });

          // ✅ Emit coordination response
          this._specialDayCoordinated$.next({
            coordinationType: 'sequence-continuation-response',
            triggerEvent: 'lesson-sequence-continuation',
            sourceService: 'LessonSequenceCoordinationService',
            coordinationAction: `processed-${event.periodsProcessed}-periods`,
            specialDayDetails: {
              date: new Date(),
              affectedPeriods: [],
              eventType: 'sequence-continuation'
            },
            success: event.success,
            timestamp: new Date()
          });
        })
    );

    console.log('[SpecialDayCoordinationService] Observable consumption setup complete - monitoring cross-service events');
  }

  // === COORDINATED OPERATIONS WITH LESSON INTEGRATION ===

  createSpecialDayWithCoordination(data: SpecialDayData): Observable<ScheduleEvent[]> {
    console.log(`[SpecialDayCoordinationService] Creating special day with lesson coordination`);

    return this.businessService.createSpecialDay(data).pipe(
        map((scheduleEvents: ScheduleEvent[]) => {
          console.log(`[SpecialDayCoordinationService] Starting lesson shifting after special day on ${format(data.date, 'yyyy-MM-dd')}`);

          // ✅ Delegate lesson shifting to dedicated service
          scheduleEvents.forEach(event => {
            const shiftResult = this.lessonShiftingService.shiftLessonsForward(data.date, event.period);

            // ✅ Emit coordination event for lesson shifting
            this._specialDayCoordinated$.next({
              coordinationType: 'lesson-shifting-response',
              triggerEvent: 'special-day-created',
              sourceService: 'LessonShiftingService',
              coordinationAction: `shifted-${shiftResult.shiftedLessons.length}-lessons`,
              specialDayDetails: {
                date: data.date,
                affectedPeriods: [event.period],
                eventType: data.eventType
              },
              success: shiftResult.success,
              timestamp: new Date()
            });
          });

          // Continue lesson sequences after shifting
          this.lessonSequenceService.continueSequencesAfterDate(data.date);

          // ✅ Emit Observable event for cross-component coordination
          this._specialDayOperation$.next({
            type: 'created',
            scheduleEvent: scheduleEvents[0], // Representative event
            affectedPeriods: data.periods,
            date: data.date,
            eventType: data.eventType,
            title: data.title,
            timestamp: new Date(),
            source: 'special-day-management'
          });

          console.log('🚨 [SpecialDayCoordinationService] EMITTED specialDayOperation event (Observable)', {
            type: 'created',
            affectedPeriods: data.periods,
            date: format(data.date, 'yyyy-MM-dd'),
            eventType: data.eventType,
            scheduleEventCount: scheduleEvents.length
          });

          return scheduleEvents;
        })
    );
  }

  updateSpecialDayWithCoordination(data: SpecialDayData, originalScheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    console.log(`[SpecialDayCoordinationService] Updating special day with lesson coordination`);

    return this.businessService.updateSpecialDay(data, originalScheduleEvent).pipe(
        map((updatedScheduleEvent: ScheduleEvent) => {
          // ✅ Emit Observable event for cross-component coordination
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

          console.log('🚨 [SpecialDayCoordinationService] EMITTED specialDayOperation event (Observable)', {
            type: 'updated',
            affectedPeriods: data.periods,
            date: format(data.date, 'yyyy-MM-dd'),
            eventType: data.eventType,
            originalEventId: originalScheduleEvent.id
          });

          return updatedScheduleEvent;
        })
    );
  }

  deleteSpecialDayWithCoordination(scheduleEvent: ScheduleEvent): Observable<void> {
    console.log(`[SpecialDayCoordinationService] Deleting special day with lesson coordination`);

    // Store event data before removal for Observable event
    const eventData = {
      date: scheduleEvent.date,
      period: scheduleEvent.period,
      eventType: scheduleEvent.eventType || 'Unknown',
      title: this.extractTitleFromComment(scheduleEvent.comment, scheduleEvent.eventType || 'Special Day')
    };

    return this.businessService.deleteSpecialDay(scheduleEvent).pipe(
        map(() => {
          // ✅ Delegate lesson shifting to dedicated service
          const shiftResult = this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);

          // ✅ Emit coordination event for lesson shifting
          this._specialDayCoordinated$.next({
            coordinationType: 'lesson-shifting-response',
            triggerEvent: 'special-day-deleted',
            sourceService: 'LessonShiftingService',
            coordinationAction: `shifted-${shiftResult.shiftedLessons.length}-lessons-backward`,
            specialDayDetails: {
              date: eventData.date,
              affectedPeriods: [eventData.period],
              eventType: eventData.eventType
            },
            success: shiftResult.success,
            timestamp: new Date()
          });

          this.lessonSequenceService.continueSequencesAfterDate(scheduleEvent.date);

          // ✅ Emit Observable event for cross-component coordination
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

          console.log('🚨 [SpecialDayCoordinationService] EMITTED specialDayOperation event (Observable)', {
            type: 'deleted',
            affectedPeriods: [scheduleEvent.period],
            date: format(new Date(eventData.date), 'yyyy-MM-dd'),
            eventType: eventData.eventType,
            deletedEventId: scheduleEvent.id
          });
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
