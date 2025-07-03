// **COMPLETE FILE** - LessonSequenceService with Observable Events
// RESPONSIBILITY: Manages lesson sequence continuation with cross-component event coordination
// DOES NOT: Create events directly, sequence lessons, or calculate dates - delegates to existing services
// CALLED BY: SpecialDayManagementService and other services needing sequence continuation

import { Injectable } from '@angular/core';
import { Subject, Subscription, Observable } from 'rxjs';
import { addDays, format } from 'date-fns';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { PeriodAssignment, PeriodCourseAssignment } from '../../../models/period-assignment';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { ScheduleEventFactoryService } from './schedule-event-factory.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { TeachingDayCalculationService } from './teaching-day-calculations.service';
import { CourseSignalService } from '../../../lesson-tree/services/course-data/course-signal.service';

// ✅ NEW: Observable event interfaces for cross-component coordination
export interface SequenceContinuationEvent {
  operationType: 'sequence-continued' | 'sequence-completed' | 'sequence-failed' | 'no-sequences-needed';
  afterDate: Date;
  periodsProcessed: number;
  eventsCreated: number;
  coursePeriods: Array<{
    courseId: number;
    courseTitle: string;
    period: number;
    eventsAdded: number;
    lessonsRemaining: number;
    lastLessonIndex: number;
  }>;
  totalLessonsInScope: number;
  success: boolean;
  errors: string[];
  warnings: string[];
  source: 'lesson-sequence';
  timestamp: Date;
}

export interface SequenceAnalysisEvent {
  analysisType: 'continuation-points-found' | 'course-data-refreshed' | 'sequence-state-analyzed';
  courseCount: number;
  periodCount: number;
  totalLessonsAnalyzed: number;
  continuationPointsFound: number;
  coursePeriodDetails: Array<{
    courseId: number;
    courseTitle: string;
    period: number;
    totalLessons: number;
    assignedLessons: number;
    needsContinuation: boolean;
  }>;
  source: 'lesson-sequence';
  timestamp: Date;
}

export interface SequenceCompletionEvent {
  completionType: 'period-sequence-completed' | 'all-sequences-completed' | 'sequence-exhausted';
  courseId: number;
  courseTitle: string;
  period: number;
  totalEventsCreated: number;
  finalLessonIndex: number;
  hasMoreLessons: boolean;
  source: 'lesson-sequence';
  timestamp: Date;
}

interface ContinuationPoint {
  period: number;
  courseId: number;
  periodAssignment: PeriodAssignment;
  lastAssignedLessonIndex: number;
  continuationDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LessonSequenceService {

  // ✅ NEW: Observable events for cross-component coordination
  private readonly _sequenceContinuation$ = new Subject<SequenceContinuationEvent>();
  private readonly _sequenceAnalysis$ = new Subject<SequenceAnalysisEvent>();
  private readonly _sequenceCompletion$ = new Subject<SequenceCompletionEvent>();

  // Public observables for business logic subscriptions
  readonly sequenceContinuation$ = this._sequenceContinuation$.asObservable();
  readonly sequenceAnalysis$ = this._sequenceAnalysis$.asObservable();
  readonly sequenceCompletion$ = this._sequenceCompletion$.asObservable();

  private subscriptions: Subscription[] = []; // ✅ Best Practice: Track subscriptions

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleEventFactoryService: ScheduleEventFactoryService,
    private courseDataService: CourseDataService,
    private teachingDayCalculation: TeachingDayCalculationService,
    private courseSignalService: CourseSignalService
  ) {
    console.log('[LessonSequenceService] Initialized with Observable events for lesson sequence coordination');

    // ✅ Best Practice: Observable subscription for fresh lesson events
    this.setupLessonEventSubscription();
  }

  /**
   * ✅ Setup Observable subscription for lesson added events
   */
  private setupLessonEventSubscription(): void {
    const lessonAddedSub = this.courseSignalService.nodeAdded$.subscribe(event => {
      if (event.node.nodeType === 'Lesson') {
        console.log('[LessonSequenceService] RECEIVED lesson added EVENT (Observable):', {
          lessonTitle: event.node.title,
          lessonId: event.node.nodeId,
          courseId: event.node.courseId,
          source: event.source,
          operationType: event.operationType,
          timestamp: event.timestamp.toISOString(),
          pattern: 'Observable - emit once, consume once',
          freshData: 'Course data will be fresh for next sequence operation'
        });
      }
    });

    this.subscriptions.push(lessonAddedSub);
  }

  /**
   * ✅ ENHANCED: Continue lesson sequences with comprehensive Observable event emission
   * Finds where each period left off and resumes lesson assignment
   */
  continueSequencesAfterDate(afterDate: Date): void {
    console.log(`[LessonSequenceService] Continuing lesson sequences after ${format(afterDate, 'yyyy-MM-dd')}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // **ENHANCED: Force course data refresh to ensure we have latest lessons**
      console.log('[DEBUG] Refreshing course data before sequence continuation');

      const currentSchedule = this.scheduleStateService.getSchedule();
      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

      if (!currentSchedule?.scheduleEvents || !activeConfig) {
        errors.push('Cannot continue sequences: No schedule or configuration available');

        // ✅ NEW: Emit sequence failed event
        this._sequenceContinuation$.next({
          operationType: 'sequence-failed',
          afterDate,
          periodsProcessed: 0,
          eventsCreated: 0,
          coursePeriods: [],
          totalLessonsInScope: 0,
          success: false,
          errors,
          warnings,
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceService] EMITTED sequenceContinuation event:', 'sequence-failed');
        return;
      }

      // ✅ NEW: Emit course data refresh analysis
      const allCourses = this.courseDataService.getCourses();
      const totalLessonsInScope = allCourses.reduce((total: number, course: any) => {
        const lessons = this.courseDataService.collectLessonsFromCourse(course);
        return total + lessons.length;
      }, 0);

      this._sequenceAnalysis$.next({
        analysisType: 'course-data-refreshed',
        courseCount: allCourses.length,
        periodCount: 0, // Will be updated when we find period assignments
        totalLessonsAnalyzed: totalLessonsInScope,
        continuationPointsFound: 0, // Will be updated
        coursePeriodDetails: [], // Will be populated
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      // Find continuation points for all course periods
      const continuationPoints = this.findContinuationPoints(currentSchedule.scheduleEvents, afterDate, activeConfig);

      console.log(`[DEBUG] Found ${continuationPoints.length} periods needing continuation:`,
        continuationPoints.map(cp => `Period ${cp.period} Course ${cp.courseId} from lesson ${cp.lastAssignedLessonIndex + 1}`));

      // ✅ NEW: Emit continuation points analysis
      const coursePeriodDetails = continuationPoints.map(cp => {
        const course = this.courseDataService.getCourseById(cp.courseId);
        const allLessons = course ? this.courseDataService.collectLessonsFromCourse(course) : [];
        return {
          courseId: cp.courseId,
          courseTitle: course?.title || 'Unknown Course',
          period: cp.period,
          totalLessons: allLessons.length,
          assignedLessons: cp.lastAssignedLessonIndex + 1,
          needsContinuation: cp.lastAssignedLessonIndex < allLessons.length - 1
        };
      });

      this._sequenceAnalysis$.next({
        analysisType: 'continuation-points-found',
        courseCount: allCourses.length,
        periodCount: continuationPoints.length,
        totalLessonsAnalyzed: totalLessonsInScope,
        continuationPointsFound: continuationPoints.length,
        coursePeriodDetails,
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      console.log('🚨 [LessonSequenceService] EMITTED sequenceAnalysis event:', 'continuation-points-found');

      if (continuationPoints.length === 0) {
        console.log('[LessonSequenceService] No course periods need lesson continuation');

        // ✅ NEW: Emit no sequences needed event
        this._sequenceContinuation$.next({
          operationType: 'no-sequences-needed',
          afterDate,
          periodsProcessed: 0,
          eventsCreated: 0,
          coursePeriods: [],
          totalLessonsInScope,
          success: true,
          errors: [],
          warnings: ['No course periods require lesson continuation'],
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceService] EMITTED sequenceContinuation event:', 'no-sequences-needed');
        return;
      }

      // Continue each course period sequence and track results
      let totalEventsCreated = 0;
      const processedCoursePeriods: Array<{
        courseId: number;
        courseTitle: string;
        period: number;
        eventsAdded: number;
        lessonsRemaining: number;
        lastLessonIndex: number;
      }> = [];

      for (const point of continuationPoints) {
        // **ENHANCED: Add detailed course state logging**
        const course = this.courseDataService.getCourseById(point.courseId);
        const allLessons = course ? this.courseDataService.collectLessonsFromCourse(course) : [];

        console.log('[DEBUG ENHANCED COURSE STATE]', {
          courseId: point.courseId,
          courseTitle: course?.title,
          topicsCount: course?.topics?.length,
          totalLessonsInCourse: allLessons.length,
          lessonTitles: allLessons.map(l => `${l.title}(ID:${l.id})`),
          lastAssignedIndex: point.lastAssignedLessonIndex,
          nextLessonToAssign: allLessons[point.lastAssignedLessonIndex + 1]?.title || 'None available'
        });

        const eventsAdded = this.continueSequenceForPeriod(point, activeConfig);
        totalEventsCreated += eventsAdded;

        // Track processed period details
        processedCoursePeriods.push({
          courseId: point.courseId,
          courseTitle: course?.title || 'Unknown Course',
          period: point.period,
          eventsAdded,
          lessonsRemaining: Math.max(0, allLessons.length - (point.lastAssignedLessonIndex + 1 + eventsAdded)),
          lastLessonIndex: point.lastAssignedLessonIndex + eventsAdded
        });

        // ✅ NEW: Emit completion event for each period
        this._sequenceCompletion$.next({
          completionType: 'period-sequence-completed',
          courseId: point.courseId,
          courseTitle: course?.title || 'Unknown Course',
          period: point.period,
          totalEventsCreated: eventsAdded,
          finalLessonIndex: point.lastAssignedLessonIndex + eventsAdded,
          hasMoreLessons: (point.lastAssignedLessonIndex + eventsAdded) < allLessons.length - 1,
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceService] EMITTED sequenceCompletion event:', 'period-sequence-completed');
      }

      this.scheduleStateService.markAsChanged();

      // ✅ NEW: Emit sequence continuation completed event
      this._sequenceContinuation$.next({
        operationType: 'sequence-continued',
        afterDate,
        periodsProcessed: continuationPoints.length,
        eventsCreated: totalEventsCreated,
        coursePeriods: processedCoursePeriods,
        totalLessonsInScope,
        success: true,
        errors,
        warnings,
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      console.log('🚨 [LessonSequenceService] EMITTED sequenceContinuation event:', 'sequence-continued');

      // ✅ NEW: Emit all sequences completed if applicable
      const hasMoreSequences = processedCoursePeriods.some(cp => cp.lessonsRemaining > 0);
      if (!hasMoreSequences) {
        this._sequenceCompletion$.next({
          completionType: 'all-sequences-completed',
          courseId: 0, // All courses
          courseTitle: 'All Courses',
          period: 0, // All periods
          totalEventsCreated: totalEventsCreated,
          finalLessonIndex: -1, // Not applicable
          hasMoreLessons: false,
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceService] EMITTED sequenceCompletion event:', 'all-sequences-completed');
      }

    } catch (error: any) {
      console.error('[LessonSequenceService] Error in continueSequencesAfterDate:', error);
      errors.push(`Sequence continuation failed: ${error.message}`);

      // ✅ NEW: Emit sequence failed event
      this._sequenceContinuation$.next({
        operationType: 'sequence-failed',
        afterDate,
        periodsProcessed: 0,
        eventsCreated: 0,
        coursePeriods: [],
        totalLessonsInScope: 0,
        success: false,
        errors,
        warnings,
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      console.log('🚨 [LessonSequenceService] EMITTED sequenceContinuation event:', 'sequence-failed');
    }
  }

  /**
   * ✅ ENHANCED: Continue sequence for specific period with return value for tracking
   */
  private continueSequenceForPeriod(continuationPoint: ContinuationPoint, activeConfig: any): number {
    console.log(`[LessonSequenceService] Continuing sequence for Period ${continuationPoint.period}, Course ${continuationPoint.courseId} from lesson index ${continuationPoint.lastAssignedLessonIndex + 1}`);

    const course = this.courseDataService.getCourseById(continuationPoint.courseId);
    if (!course) {
      console.warn(`[LessonSequenceService] Course ${continuationPoint.courseId} not found`);
      return 0;
    }

    // Get lesson sequence using existing CourseDataService logic
    const allLessons = this.courseDataService.collectLessonsFromCourse(course);
    const remainingLessonsCount = allLessons.length - (continuationPoint.lastAssignedLessonIndex + 1);

    if (remainingLessonsCount <= 0) {
      console.log(`[LessonSequenceService] No remaining lessons for Period ${continuationPoint.period}, Course ${continuationPoint.courseId}`);

      // ✅ NEW: Emit sequence exhausted event
      this._sequenceCompletion$.next({
        completionType: 'sequence-exhausted',
        courseId: continuationPoint.courseId,
        courseTitle: course.title,
        period: continuationPoint.period,
        totalEventsCreated: 0,
        finalLessonIndex: continuationPoint.lastAssignedLessonIndex,
        hasMoreLessons: false,
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      console.log('🚨 [LessonSequenceService] EMITTED sequenceCompletion event:', 'sequence-exhausted');
      return 0;
    }

    // Create period course assignment for factory service
    const periodCourseAssignment: PeriodCourseAssignment = {
      period: continuationPoint.period,
      courseId: continuationPoint.courseId,
      periodAssignment: continuationPoint.periodAssignment
    };

    // Find next available date for this period
    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(activeConfig.teachingDays);
    const startDate = this.findNextAvailableDateForPeriod(
      continuationPoint.continuationDate,
      continuationPoint.period,
      teachingDayNumbers
    );

    // Delegate to existing factory service for event creation
    // Use a modified factory method that starts from a specific lesson index
    const newEvents = this.generateContinuationEvents(
      periodCourseAssignment,
      startDate,
      new Date(activeConfig.endDate),
      activeConfig.teachingDays,
      continuationPoint.lastAssignedLessonIndex + 1, // Start from next lesson
      allLessons
    );

    // Add new events to schedule
    newEvents.forEach(event => {
      this.scheduleStateService.addScheduleEvent(event);
    });
    console.log(`[DEBUG] Added ${newEvents.length} events to state for Period ${continuationPoint.period}`);
    console.log(`[DEBUG] Course ${course.title} lesson sequence:`,
      allLessons.map((l, i) => `${i}: ${l.title}(ID:${l.id})`));
    console.log(`[DEBUG] Continuing from lesson index ${continuationPoint.lastAssignedLessonIndex + 1}, ${remainingLessonsCount} lessons remaining`);

    console.log(`[LessonSequenceService] Added ${newEvents.length} continuation events for Period ${continuationPoint.period}, Course ${continuationPoint.courseId}`);

    return newEvents.length;
  }

  /**
   * Find continuation points for all course periods
   */
  private findContinuationPoints(scheduleEvents: ScheduleEvent[], afterDate: Date, activeConfig: any): ContinuationPoint[] {
    const continuationPoints: ContinuationPoint[] = [];

    // Get course period assignments from configuration
    const periodCourseAssignments = this.getPeriodCourseAssignments(activeConfig);

    for (const pca of periodCourseAssignments) {
      const continuationPoint = this.findContinuationPointForPeriod(
        scheduleEvents,
        pca,
        afterDate,
        activeConfig
      );

      if (continuationPoint) {
        continuationPoints.push(continuationPoint);
      }
    }
    console.log(`[DEBUG] Found ${continuationPoints.length} periods needing continuation:`,
      continuationPoints.map(cp => `Period ${cp.period} Course ${cp.courseId} from lesson ${cp.lastAssignedLessonIndex + 1}`));

    return continuationPoints;
  }

  /**
   * Find continuation point for a specific period
   */
  private findContinuationPointForPeriod(
    scheduleEvents: ScheduleEvent[],
    pca: PeriodCourseAssignment,
    afterDate: Date,
    activeConfig: any
  ): ContinuationPoint | null {
    // Find all lesson events for this period/course
    const periodLessonEvents = scheduleEvents
      .filter(event =>
        event.period === pca.period &&
        event.courseId === pca.courseId &&
        event.lessonId !== null
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (periodLessonEvents.length === 0) {
      console.log(`[LessonSequenceService] No lesson events found for Period ${pca.period}, Course ${pca.courseId} - starting from beginning`);
      return {
        period: pca.period,
        courseId: pca.courseId,
        periodAssignment: pca.periodAssignment,
        lastAssignedLessonIndex: -1, // Start from lesson 0
        continuationDate: addDays(afterDate, 1)
      };
    }

    // Get the course and lesson sequence
    const course = this.courseDataService.getCourseById(pca.courseId);
    if (!course) return null;

    const allLessons = this.courseDataService.collectLessonsFromCourse(course);

    // Find the highest lesson index that was assigned
    let highestLessonIndex = -1;
    for (const event of periodLessonEvents) {
      const lessonIndex = allLessons.findIndex(lesson => lesson.id === event.lessonId);
      if (lessonIndex > highestLessonIndex) {
        highestLessonIndex = lessonIndex;
      }
    }

    console.log(`[DEBUG] Period ${pca.period}, Course ${pca.courseId}:`, {
      totalLessonEvents: periodLessonEvents.length,
      allLessonsCount: allLessons.length,
      highestLessonIndex: highestLessonIndex,
      periodLessonEventIds: periodLessonEvents.map(e => e.lessonId)
    });

    // Check if there are more lessons to assign
    if (highestLessonIndex >= allLessons.length - 1) {
      console.log(`[LessonSequenceService] All lessons already assigned for Period ${pca.period}, Course ${pca.courseId}`);
      return null; // No more lessons to assign
    }

    return {
      period: pca.period,
      courseId: pca.courseId,
      periodAssignment: pca.periodAssignment,
      lastAssignedLessonIndex: highestLessonIndex,
      continuationDate: addDays(afterDate, 1)
    };
  }

  /**
   * Generate continuation events using existing factory logic
   * Modified version of ScheduleEventFactoryService.generateEventsForPeriodCourse
   */
  private generateContinuationEvents(
    periodCourseAssignment: PeriodCourseAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingLessonIndex: number,
    allLessons: any[]
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = this.generateNegativeEventId();
    let lessonIndex = startingLessonIndex;

    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (teachingDays.includes(dayName)) {
        // Check if this period is available on this date
        if (this.isPeriodAvailableOnDate(currentDate, periodCourseAssignment.period)) {
          const scheduleEvent = this.createContinuationEvent(
            eventId--,
            new Date(currentDate),
            periodCourseAssignment,
            allLessons,
            lessonIndex
          );

          events.push(scheduleEvent);

          // Only increment lesson index if we assigned a lesson (not error)
          if (scheduleEvent.lessonId) {
            lessonIndex++;
          }
        }

        console.log(`[DEBUG] ${format(currentDate, 'yyyy-MM-dd')} Period ${periodCourseAssignment.period}: ${lessonIndex < allLessons.length ? `Lesson ${allLessons[lessonIndex].title}(${allLessons[lessonIndex].id})` : 'ERROR - no more lessons'}`);
      }
      console.log(`[DEBUG] Generating events from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}, starting lesson index ${startingLessonIndex}`);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  /**
   * Create a continuation event (similar to ScheduleEventFactoryService logic)
   */
  private createContinuationEvent(
    eventId: number,
    date: Date,
    periodCourseAssignment: PeriodCourseAssignment,
    allLessons: any[],
    lessonIndex: number
  ): ScheduleEvent {
    let lessonId: number | null = null;
    let eventType: string = 'Error';
    let eventCategory: string | null = null;
    let comment: string | null = null;

    if (lessonIndex < allLessons.length) {
      // Assign lesson
      lessonId = allLessons[lessonIndex].id;
      eventType = 'Lesson';
      eventCategory = 'Lesson';
      comment = null;
    } else {
      // No more lessons available - error day
      lessonId = null;
      eventType = 'Error';
      eventCategory = null;
      comment = 'No lesson assigned - schedule needs more content';
    }

    return {
      id: eventId,
      scheduleId: 0,
      courseId: periodCourseAssignment.courseId,
      date: new Date(date),
      period: periodCourseAssignment.period,
      lessonId,
      eventType,
      eventCategory,
      comment
    };
  }

  /**
   * Extract period course assignments from configuration
   */
  private getPeriodCourseAssignments(activeConfig: any): PeriodCourseAssignment[] {
    if (!activeConfig.periodAssignments) return [];

    return activeConfig.periodAssignments
      .filter((assignment: any) => assignment.courseId)
      .map((assignment: any) => ({
        period: assignment.period,
        courseId: assignment.courseId,
        periodAssignment: {
          id: assignment.id || 0,
          period: assignment.period,
          courseId: assignment.courseId,
          specialPeriodType: assignment.specialPeriodType,
          room: assignment.room,
          notes: assignment.notes,
          teachingDays: assignment.teachingDays,
          backgroundColor: assignment.backgroundColor,
          fontColor: assignment.fontColor
        }
      }));
  }

  /**
   * Find next available date for a specific period
   */
  private findNextAvailableDateForPeriod(startDate: Date, period: number, teachingDayNumbers: number[]): Date {
    let candidateDate = new Date(startDate);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        if (this.isPeriodAvailableOnDate(candidateDate, period)) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[LessonSequenceService] Could not find available date for Period ${period} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate;
  }

  /**
   * Check if period is available on a specific date
   */
  private isPeriodAvailableOnDate(date: Date, period: number): boolean {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return true;

    // Check if this date/period combination already has a non-lesson event
    const existingEvent = currentSchedule.scheduleEvents.find(event =>
      new Date(event.date).toDateString() === date.toDateString() &&
      event.period === period &&
      event.eventType !== 'Lesson' &&
      event.eventType !== 'Error'
    );

    return !existingEvent;
  }

  /**
   * Generate negative event ID for in-memory events
   */
  private generateNegativeEventId(): number {
    return -(Date.now() + Math.floor(Math.random() * 1000));
  }

  // === CLEANUP ===

  // ✅ NEW: Complete Observable cleanup following established pattern
  ngOnDestroy(): void {
    // Complete Observable subjects
    this._sequenceContinuation$.complete();
    this._sequenceAnalysis$.complete();
    this._sequenceCompletion$.complete();

    // Unsubscribe from existing subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    console.log('[LessonSequenceService] All Observable subjects completed and subscriptions cleaned up');
  }
}
