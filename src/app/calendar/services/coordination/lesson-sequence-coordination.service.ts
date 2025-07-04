// **COMPLETE FILE** - LessonSequenceCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management and cross-service coordination for lesson sequencing
// SCOPE: Observable patterns and event emission only (business logic in separate service)
// RATIONALE: Event coordination separated from sequence business logic for maintainability

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { format } from 'date-fns';

import { LessonSequenceBusinessService } from '../business/lesson-sequence-business.service';
import { CourseSignalService } from '../../../lesson-tree/services/course-data/course-signal.service';
import { EntitySignalPayload } from '../../../lesson-tree/services/course-data/course-signal.service';

// ✅ Observable event interfaces for cross-component coordination
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

@Injectable({
  providedIn: 'root'
})
export class LessonSequenceCoordinationService implements OnDestroy {

  // ✅ Observable events for cross-component coordination
  private readonly _sequenceContinuation$ = new Subject<SequenceContinuationEvent>();
  private readonly _sequenceAnalysis$ = new Subject<SequenceAnalysisEvent>();
  private readonly _sequenceCompletion$ = new Subject<SequenceCompletionEvent>();

  // Public observables for business logic subscriptions
  readonly sequenceContinuation$ = this._sequenceContinuation$.asObservable();
  readonly sequenceAnalysis$ = this._sequenceAnalysis$.asObservable();
  readonly sequenceCompletion$ = this._sequenceCompletion$.asObservable();

  // ✅ Subscription management for cross-service coordination
  private subscriptions: Subscription[] = [];

  constructor(
    private businessService: LessonSequenceBusinessService,
    private courseSignalService: CourseSignalService
  ) {
    console.log('[LessonSequenceCoordinationService] Observable coordination patterns for lesson sequencing');
    this.setupCrossServiceSubscriptions();
  }

  // === CROSS-SERVICE SUBSCRIPTIONS ===

  private setupCrossServiceSubscriptions(): void {
    console.log('[LessonSequenceCoordinationService] Setting up cross-service subscriptions');

    // ✅ Subscribe to lesson added events for fresh data coordination
    const lessonAddedSub = this.courseSignalService.entityAdded$.subscribe((event: EntitySignalPayload) => {
      if (event.entity.nodeType === 'Lesson') {
        console.log('[LessonSequenceCoordinationService] RECEIVED lesson added EVENT (Observable):', {
          lessonTitle: event.entity.title,
          lessonId: event.entity.nodeId,
          courseId: event.entity.courseId,
          source: event.source,
          operationType: event.operationType,
          timestamp: event.timestamp.toISOString(),
          pattern: 'Observable - emit once, consume once',
          freshData: 'Course data will be fresh for next sequence operation'
        });
      }
    });

    this.subscriptions.push(lessonAddedSub);
    console.log('[LessonSequenceCoordinationService] Cross-service subscriptions setup complete');
  }

  // === COORDINATED OPERATIONS ===

  continueSequencesAfterDateWithCoordination(afterDate: Date): void {
    console.log(`[LessonSequenceCoordinationService] Continuing lesson sequences with coordination after ${format(afterDate, 'yyyy-MM-dd')}`);

    try {
      // Analyze sequence state and emit analysis events
      const analysis = this.businessService.analyzeSequenceState(afterDate);

      // ✅ Emit course data refresh analysis
      this._sequenceAnalysis$.next({
        analysisType: 'course-data-refreshed',
        courseCount: analysis.allCourses.length,
        periodCount: 0, // Will be updated when we find period assignments
        totalLessonsAnalyzed: analysis.totalLessonsInScope,
        continuationPointsFound: 0, // Will be updated
        coursePeriodDetails: [], // Will be populated
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      // ✅ Emit continuation points analysis
      this._sequenceAnalysis$.next({
        analysisType: 'continuation-points-found',
        courseCount: analysis.allCourses.length,
        periodCount: analysis.continuationPoints.length,
        totalLessonsAnalyzed: analysis.totalLessonsInScope,
        continuationPointsFound: analysis.continuationPoints.length,
        coursePeriodDetails: analysis.coursePeriodDetails,
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceAnalysis event:', 'continuation-points-found');

      if (analysis.continuationPoints.length === 0) {
        console.log('[LessonSequenceCoordinationService] No course periods need lesson continuation');

        // ✅ Emit no sequences needed event
        this._sequenceContinuation$.next({
          operationType: 'no-sequences-needed',
          afterDate,
          periodsProcessed: 0,
          eventsCreated: 0,
          coursePeriods: [],
          totalLessonsInScope: analysis.totalLessonsInScope,
          success: true,
          errors: [],
          warnings: ['No course periods require lesson continuation'],
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceContinuation event:', 'no-sequences-needed');
        return;
      }

      // Execute sequence continuation
      const result = this.businessService.continueSequences(afterDate);

      if (result.success) {
        // Emit completion events for each processed period
        for (const cp of result.processedCoursePeriods) {
          this._sequenceCompletion$.next({
            completionType: cp.lessonsRemaining === 0 ? 'sequence-exhausted' : 'period-sequence-completed',
            courseId: cp.courseId,
            courseTitle: cp.courseTitle,
            period: cp.period,
            totalEventsCreated: cp.eventsAdded,
            finalLessonIndex: cp.lastLessonIndex,
            hasMoreLessons: cp.lessonsRemaining > 0,
            source: 'lesson-sequence',
            timestamp: new Date()
          });

          console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceCompletion event:',
            cp.lessonsRemaining === 0 ? 'sequence-exhausted' : 'period-sequence-completed');
        }

        // ✅ Emit sequence continuation completed event
        this._sequenceContinuation$.next({
          operationType: 'sequence-continued',
          afterDate,
          periodsProcessed: result.periodsProcessed,
          eventsCreated: result.eventsCreated,
          coursePeriods: result.processedCoursePeriods,
          totalLessonsInScope: analysis.totalLessonsInScope,
          success: true,
          errors: result.errors,
          warnings: result.warnings,
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceContinuation event:', 'sequence-continued');

        // ✅ Emit all sequences completed if applicable
        const hasMoreSequences = result.processedCoursePeriods.some(cp => cp.lessonsRemaining > 0);
        if (!hasMoreSequences) {
          this._sequenceCompletion$.next({
            completionType: 'all-sequences-completed',
            courseId: 0, // All courses
            courseTitle: 'All Courses',
            period: 0, // All periods
            totalEventsCreated: result.eventsCreated,
            finalLessonIndex: -1, // Not applicable
            hasMoreLessons: false,
            source: 'lesson-sequence',
            timestamp: new Date()
          });

          console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceCompletion event:', 'all-sequences-completed');
        }

      } else {
        // ✅ Emit sequence failed event
        this._sequenceContinuation$.next({
          operationType: 'sequence-failed',
          afterDate,
          periodsProcessed: 0,
          eventsCreated: 0,
          coursePeriods: [],
          totalLessonsInScope: analysis.totalLessonsInScope,
          success: false,
          errors: result.errors,
          warnings: result.warnings,
          source: 'lesson-sequence',
          timestamp: new Date()
        });

        console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceContinuation event:', 'sequence-failed');
      }

    } catch (error: any) {
      console.error('[LessonSequenceCoordinationService] Error in continueSequencesAfterDateWithCoordination:', error);

      // ✅ Emit sequence failed event
      this._sequenceContinuation$.next({
        operationType: 'sequence-failed',
        afterDate,
        periodsProcessed: 0,
        eventsCreated: 0,
        coursePeriods: [],
        totalLessonsInScope: 0,
        success: false,
        errors: [`Sequence continuation failed: ${error.message}`],
        warnings: [],
        source: 'lesson-sequence',
        timestamp: new Date()
      });

      console.log('🚨 [LessonSequenceCoordinationService] EMITTED sequenceContinuation event:', 'sequence-failed');
    }
  }

  // === DELEGATION METHODS - Direct access to business operations ===

  /**
   * Delegates to business service for operations that don't need coordination events
   */
  continueSequencesAfterDate(afterDate: Date): void {
    return this.continueSequencesAfterDateWithCoordination(afterDate);
  }

  analyzeSequenceState(afterDate: Date) {
    return this.businessService.analyzeSequenceState(afterDate);
  }

  continueSequences(afterDate: Date) {
    return this.businessService.continueSequences(afterDate);
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[LessonSequenceCoordinationService] Cleaning up Observable subjects and subscriptions');

    // ✅ Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // ✅ Complete Observable subjects
    this._sequenceContinuation$.complete();
    this._sequenceAnalysis$.complete();
    this._sequenceCompletion$.complete();

    console.log('[LessonSequenceCoordinationService] All Observable subjects completed and subscriptions cleaned up');
  }
}
