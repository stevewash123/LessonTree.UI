// **COMPLETE FILE** - SpecialDayCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management, cross-service coordination with lesson shifting and sequencing
// SCOPE: Coordination patterns only (business logic handled by separate service)
// RATIONALE: Complex coordination separated from core business operations for maintainability

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { format } from 'date-fns';

import { LessonShiftingService } from '../business/lesson-shifting.service';
import { LessonSequenceService } from '../business/lesson-sequence.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import {SpecialDayBusinessService, SpecialDayData} from '../business/special-day-buisness.service';
import {map} from 'rxjs/operators';

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
    private scheduleStateService: ScheduleStateService,
    private lessonShiftingService: LessonShiftingService,
    private lessonSequenceService: LessonSequenceService
  ) {
    console.log('[SpecialDayCoordinationService] Observable coordination patterns for special day operations');
    this.setupObservableConsumption();
  }

  // ✅ Observable consumption setup for cross-service coordination
  private setupObservableConsumption(): void {
    console.log('[SpecialDayCoordinationService] Setting up Observable consumption for cross-service coordination');

    // ✅ Consume LessonShiftingService events
    this.subscriptions.add(
      this.lessonShiftingService.lessonShifting$.subscribe((event: any) => {
        console.log('[SpecialDayCoordinationService] Received lessonShifted event', {
          operationType: event.operationType,
          period: event.period,
          affectedLessonsCount: event.affectedLessonsCount,
          success: event.success,
          source: event.source,
          timestamp: event.timestamp.toISOString()
        });

        this.handleLessonShiftingCompleted(event);
      })
    );

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
      })
    );

    // ✅ Consume ScheduleStateService events (if it has Observable emissions)
    if ('scheduleUpdated$' in this.scheduleStateService) {
      this.subscriptions.add(
        (this.scheduleStateService as any).scheduleUpdated$.subscribe((event: any) => {
          console.log('[SpecialDayCoordinationService] Received scheduleUpdated event', {
            updateType: event.updateType,
            scheduleId: event.scheduleId
          });

          this.handleScheduleUpdated(event);
        })
      );
    }

    console.log('[SpecialDayCoordinationService] Observable consumption setup complete - monitoring cross-service events');
  }

  // ✅ Cross-service coordination handlers
  private handleLessonShiftingCompleted(event: any): void {
    try {
      const coordinationActions: string[] = [];

      if (event.shiftType === 'forward' && event.affectedLessons > 0) {
        coordinationActions.push('validate-special-day-placement');
        coordinationActions.push('check-lesson-conflicts');

        // Example: Validate that the special day creation didn't cause issues
        const specialDaysOnDate = this.businessService.getSpecialDaysForDate(new Date(event.date));
        if (specialDaysOnDate.length > 0) {
          coordinationActions.push('confirmed-special-day-active');
        }
      }

      if (event.shiftType === 'backward' && event.affectedLessons > 0) {
        coordinationActions.push('validate-lesson-restoration');
        coordinationActions.push('check-sequence-integrity');
      }

      // ✅ Emit coordination event
      this._specialDayCoordinated$.next({
        coordinationType: 'lesson-shifting-response',
        triggerEvent: 'lesson-shifted',
        sourceService: 'LessonShiftingService',
        coordinationAction: coordinationActions.join(', '),
        specialDayDetails: {
          date: new Date(event.date),
          affectedPeriods: [event.period],
          eventType: 'lesson-shift-coordination'
        },
        success: true,
        timestamp: new Date()
      });

      console.log('[SpecialDayCoordinationService] Lesson shifting coordination completed', {
        shiftType: event.shiftType,
        affectedLessons: event.affectedLessons,
        actions: coordinationActions
      });

    } catch (error) {
      console.error('[SpecialDayCoordinationService] Error handling lesson shifting completed:', error);

      this._specialDayCoordinated$.next({
        coordinationType: 'lesson-shifting-response',
        triggerEvent: 'lesson-shifted',
        sourceService: 'LessonShiftingService',
        coordinationAction: 'error-handling',
        specialDayDetails: {
          date: new Date(event.date),
          affectedPeriods: [event.period],
          eventType: 'error'
        },
        success: false,
        timestamp: new Date()
      });
    }
  }

  private handleScheduleUpdated(event: any): void {
    try {
      const coordinationActions = ['validate-special-day-integrity', 'check-schedule-consistency'];

      // Example: When schedule updates, ensure special days are still valid
      if (event.updateType === 'events-added' || event.updateType === 'events-removed') {
        coordinationActions.push('refresh-special-day-cache');
      }

      // ✅ Emit coordination event
      this._specialDayCoordinated$.next({
        coordinationType: 'schedule-update-response',
        triggerEvent: 'schedule-updated',
        sourceService: 'ScheduleStateService',
        coordinationAction: coordinationActions.join(', '),
        specialDayDetails: {
          date: new Date(),
          affectedPeriods: [],
          eventType: 'schedule-update'
        },
        success: true,
        timestamp: new Date()
      });

      console.log('[SpecialDayCoordinationService] Schedule update coordination completed');

    } catch (error) {
      console.error('[SpecialDayCoordinationService] Error handling schedule updated:', error);
    }
  }

  // === COORDINATED OPERATIONS WITH LESSON INTEGRATION ===

  createSpecialDayWithCoordination(data: SpecialDayData): Observable<ScheduleEvent[]> {
    console.log(`[SpecialDayCoordinationService] Creating special day with lesson coordination`);

    return this.businessService.createSpecialDay(data).pipe(
      map((scheduleEvents: ScheduleEvent[]) => {
        console.log(`[DEBUG] Starting lesson sequence continuation after special day on ${format(data.date, 'yyyy-MM-dd')}`);

        // Trigger lesson shifting and sequence continuation
        scheduleEvents.forEach(event => {
          this.lessonShiftingService.shiftLessonsForward(data.date, event.period);
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
        // Shift lessons backward and continue sequences
        this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);
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

  // === DELEGATION METHODS - Direct access to business operations ===

  /**
   * Delegates to business service for operations that don't need coordination
   */
  extractSpecialDayData(scheduleEvent: ScheduleEvent) {
    return this.businessService.extractSpecialDayData(scheduleEvent);
  }

  findSpecialDayById(scheduleEventId: number) {
    return this.businessService.findSpecialDayById(scheduleEventId);
  }

  getSpecialDaysForDate(date: Date) {
    return this.businessService.getSpecialDaysForDate(date);
  }

  validateSpecialDayData(data: SpecialDayData) {
    return this.businessService.validateSpecialDayData(data);
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
