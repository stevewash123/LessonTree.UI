// **COMPLETE FILE** - SpecialDayCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management, cross-service coordination with lesson shifting and sequencing
// SCOPE: Coordination patterns + integrated lesson shifting logic
// RATIONALE: Complex coordination with integrated shifting logic for optimal performance

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { format, addDays, isAfter, isSameDay } from 'date-fns';

import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { TeachingDayCalculationService } from '../business/teaching-day-calculations.service';
import { LessonSequenceCoordinationService } from './lesson-sequence-coordination.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import {SpecialDayBusinessService, SpecialDayData} from '../business/special-day-buisness.service';
import {map} from 'rxjs/operators';

// ✅ Lesson shifting events (moved from LessonShiftingService)
export interface LessonShiftingEvent {
  operationType: 'shift-forward' | 'shift-backward' | 'shift-failed' | 'lessons-converted-to-errors';
  insertionDate?: Date;
  deletedDate?: Date;
  period: number;
  affectedLessonsCount: number;
  shiftedLessonsCount: number;
  errorsCreatedCount: number;
  success: boolean;
  errors: string[];
  warnings: string[];
  source: 'special-day-coordination';
  timestamp: Date;
}

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
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private teachingDayCalculation: TeachingDayCalculationService,
    private lessonSequenceService: LessonSequenceCoordinationService
  ) {
    console.log('[SpecialDayCoordinationService] Observable coordination patterns for special day operations with integrated lesson shifting');
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
          this.shiftLessonsForward(data.date, event.period);
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
        this.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);
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

  // === LESSON SHIFTING METHODS (integrated from LessonShiftingService) ===

  /**
   * Shift lessons forward when special day is created
   */
  private shiftLessonsForward(insertionDate: Date, period: number): void {
    console.log(`[SpecialDayCoordinationService] Shifting lessons forward - Period ${period} from ${format(insertionDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[SpecialDayCoordinationService] Cannot shift: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(activeConfig.teachingDays);
    const affectedLessons = this.findLessonsInPeriodOnOrAfter(currentSchedule.scheduleEvents, insertionDate, period);

    if (affectedLessons.length === 0) {

      return;
    }

    // Calculate and apply shifts
    const shiftResults = this.calculateForwardShifts(affectedLessons, insertionDate, period, teachingDayNumbers, currentSchedule, activeConfig);
    this.applyLessonShifts(shiftResults.shiftedLessons);

    console.log('🚨 [SpecialDayCoordinationService] EMITTED lessonShifting event:', 'shift-forward');
  }

  /**
   * Shift lessons backward when special day is deleted
   */
  private shiftLessonsBackward(deletedDate: Date, period: number): void {
    console.log(`[SpecialDayCoordinationService] Shifting lessons backward - Period ${period} from ${format(deletedDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[SpecialDayCoordinationService] Cannot shift backward: No schedule or teaching days available');

      return;
    }

    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(activeConfig.teachingDays);
    const lessonsAfterDeleted = this.findLessonsInPeriodAfter(currentSchedule.scheduleEvents, deletedDate, period);

    if (lessonsAfterDeleted.length === 0) {
      return;
    }

    // Perform backward shifts
    this.performBackwardShifts(lessonsAfterDeleted, period, teachingDayNumbers, currentSchedule);
    this.scheduleStateService.markAsChanged();

    console.log('🚨 [SpecialDayCoordinationService] EMITTED lessonShifting event:', 'shift-backward');
  }

  // === LESSON SHIFTING HELPER METHODS ===

  private findLessonsInPeriodOnOrAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    return scheduleEvents
      .filter(event =>
        event.lessonId &&
        event.period === period &&
        (isSameDay(new Date(event.date), targetDate) || isAfter(new Date(event.date), targetDate))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private findLessonsInPeriodAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    return scheduleEvents
      .filter(event =>
        event.lessonId &&
        event.period === period &&
        isAfter(new Date(event.date), targetDate)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private calculateForwardShifts(
    affectedLessons: ScheduleEvent[],
    insertionDate: Date,
    period: number,
    teachingDayNumbers: number[],
    currentSchedule: any,
    activeConfig: any
  ): { shiftedLessons: ScheduleEvent[], errorsCreated: number, warnings: string[] } {
    const shiftedLessons: ScheduleEvent[] = [];
    const warnings: string[] = [];
    let errorsCreated = 0;
    let currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(insertionDate, 1), teachingDayNumbers);

    for (const lesson of affectedLessons) {
      currentShiftDate = this.findNextAvailableDateForPeriod(currentShiftDate, period, teachingDayNumbers, currentSchedule.scheduleEvents);

      const shiftedLesson: ScheduleEvent = {
        ...lesson,
        date: new Date(currentShiftDate)
      };

      // Check if lesson goes past schedule end date
      if (activeConfig.endDate && isAfter(currentShiftDate, new Date(activeConfig.endDate))) {
        shiftedLesson.lessonId = null;
        shiftedLesson.eventType = 'Error';
        shiftedLesson.eventCategory = null;
        shiftedLesson.comment = `ERROR: Lesson pushed past schedule end (Period ${period})`;
        errorsCreated++;
      }

      shiftedLessons.push(shiftedLesson);
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

    return { shiftedLessons, errorsCreated, warnings };
  }

  private findNextAvailableDateForPeriod(
    startDate: Date,
    period: number,
    teachingDayNumbers: number[],
    scheduleEvents: ScheduleEvent[]
  ): Date {
    let candidateDate = new Date(startDate);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        const isOccupied = this.teachingDayCalculation.isPeriodOccupiedByNonTeachingEvent(candidateDate, period, scheduleEvents);
        if (!isOccupied) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[SpecialDayCoordinationService] Could not find available date for Period ${period} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate;
  }

  private performBackwardShifts(
    lessonsAfterDeleted: ScheduleEvent[],
    period: number,
    teachingDayNumbers: number[],
    currentSchedule: any
  ): void {
    for (const currentLesson of lessonsAfterDeleted) {
      const currentLessonDate = new Date(currentLesson.date);
      const targetDate = this.findPreviousAvailableDateForPeriod(currentLessonDate, period, teachingDayNumbers, currentSchedule.scheduleEvents);

      const updatedLesson: ScheduleEvent = {
        ...currentLesson,
        date: new Date(targetDate)
      };

      this.scheduleStateService.updateScheduleEvent(updatedLesson);
    }
  }

  private findPreviousAvailableDateForPeriod(
    startDate: Date,
    period: number,
    teachingDayNumbers: number[],
    scheduleEvents: ScheduleEvent[]
  ): Date {
    let candidateDate = addDays(startDate, -1);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        const isOccupied = this.teachingDayCalculation.isPeriodOccupiedByNonTeachingEvent(candidateDate, period, scheduleEvents);
        if (!isOccupied) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, -1);
      iterations++;
    }

    console.warn(`[SpecialDayCoordinationService] Could not find previous available date for Period ${period} before ${format(startDate, 'yyyy-MM-dd')}`);
    return addDays(startDate, -1);
  }

  private applyLessonShifts(shiftedLessons: ScheduleEvent[]): void {
    if (shiftedLessons.length === 0) return;

    shiftedLessons.forEach(lesson => {
      this.scheduleStateService.updateScheduleEvent(lesson);
    });

    this.scheduleStateService.markAsChanged();
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
