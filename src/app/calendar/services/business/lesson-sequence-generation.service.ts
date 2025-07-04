// **COMPLETE FILE** - LessonSequenceGenerationService - Sequence Continuation Logic
// RESPONSIBILITY: Generate and create schedule events for lesson sequence continuation
// DOES NOT: Analyze sequences, coordinate services, or handle UI interactions
// CALLED BY: LessonSequenceCoordinationService for sequence generation

import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { PeriodCourseAssignment } from '../../../models/period-assignment';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { LessonSequenceAnalysisService, ContinuationPoint } from './lesson-sequence-analysis.service';
import { LessonSequenceUtilityService } from './lesson-sequence-utility.service';

export interface SequenceContinuationResult {
  success: boolean;
  periodsProcessed: number;
  eventsCreated: number;
  processedCoursePeriods: Array<{
    courseId: number;
    courseTitle: string;
    period: number;
    eventsAdded: number;
    lessonsRemaining: number;
    lastLessonIndex: number;
  }>;
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LessonSequenceGenerationService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private courseDataService: CourseDataService,
    private analysisService: LessonSequenceAnalysisService,
    private utilityService: LessonSequenceUtilityService
  ) {
    console.log('[LessonSequenceGenerationService] Sequence generation logic initialized');
  }

  // === SEQUENCE CONTINUATION ===

  /**
   * Continue lesson sequences after specified date
   */
  continueSequences(afterDate: Date): SequenceContinuationResult {
    console.log(`[LessonSequenceGenerationService] Continuing lesson sequences after ${format(afterDate, 'yyyy-MM-dd')}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const analysis = this.analysisService.analyzeSequenceState(afterDate);

      if (analysis.continuationPoints.length === 0) {
        console.log('[LessonSequenceGenerationService] No course periods need lesson continuation');
        warnings.push('No course periods require lesson continuation');

        return {
          success: true,
          periodsProcessed: 0,
          eventsCreated: 0,
          processedCoursePeriods: [],
          errors: [],
          warnings
        };
      }

      const activeConfig = this.scheduleConfigurationStateService.activeConfiguration()!;

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

      for (const point of analysis.continuationPoints) {
        // Enhanced course state logging
        const course = this.courseDataService.getCourseById(point.courseId);
        const allLessons = course ? this.courseDataService.collectLessonsFromCourse(course) : [];

        console.log('[LessonSequenceGenerationService] Enhanced course state:', {
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
      }

      this.scheduleStateService.markAsChanged();

      return {
        success: true,
        periodsProcessed: analysis.continuationPoints.length,
        eventsCreated: totalEventsCreated,
        processedCoursePeriods,
        errors,
        warnings
      };

    } catch (error: any) {
      console.error('[LessonSequenceGenerationService] Error in continueSequences:', error);
      errors.push(`Sequence continuation failed: ${error.message}`);

      return {
        success: false,
        periodsProcessed: 0,
        eventsCreated: 0,
        processedCoursePeriods: [],
        errors,
        warnings
      };
    }
  }

  /**
   * Continue sequence for a specific period
   */
  continueSequenceForPeriod(continuationPoint: ContinuationPoint, activeConfig: any): number {
    console.log(`[LessonSequenceGenerationService] Continuing sequence for Period ${continuationPoint.period}, Course ${continuationPoint.courseId} from lesson index ${continuationPoint.lastAssignedLessonIndex + 1}`);

    const course = this.courseDataService.getCourseById(continuationPoint.courseId);
    if (!course) {
      console.warn(`[LessonSequenceGenerationService] Course ${continuationPoint.courseId} not found`);
      return 0;
    }

    // Get lesson sequence using existing CourseDataService logic
    const allLessons = this.courseDataService.collectLessonsFromCourse(course);
    const remainingLessonsCount = allLessons.length - (continuationPoint.lastAssignedLessonIndex + 1);

    if (remainingLessonsCount <= 0) {
      console.log(`[LessonSequenceGenerationService] No remaining lessons for Period ${continuationPoint.period}, Course ${continuationPoint.courseId}`);
      return 0;
    }

    // Create period course assignment for event generation
    const periodCourseAssignment: PeriodCourseAssignment = {
      period: continuationPoint.period,
      courseId: continuationPoint.courseId,
      periodAssignment: continuationPoint.periodAssignment
    };

    // Find next available date for this period
    const startDate = this.utilityService.findNextAvailableDateForPeriod(
      continuationPoint.continuationDate,
      continuationPoint.period,
      activeConfig.teachingDays
    );

    // Generate continuation events
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

    console.log(`[LessonSequenceGenerationService] Added ${newEvents.length} events to state for Period ${continuationPoint.period}`);
    console.log(`[LessonSequenceGenerationService] Course ${course.title} lesson sequence:`,
      allLessons.map((l, i) => `${i}: ${l.title}(ID:${l.id})`));
    console.log(`[LessonSequenceGenerationService] Continuing from lesson index ${continuationPoint.lastAssignedLessonIndex + 1}, ${remainingLessonsCount} lessons remaining`);

    console.log(`[LessonSequenceGenerationService] Added ${newEvents.length} continuation events for Period ${continuationPoint.period}, Course ${continuationPoint.courseId}`);

    return newEvents.length;
  }

  // === EVENT GENERATION ===

  /**
   * Generate schedule events for sequence continuation
   */
  generateContinuationEvents(
    periodCourseAssignment: PeriodCourseAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingLessonIndex: number,
    allLessons: any[]
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = this.utilityService.generateNegativeEventId();
    let lessonIndex = startingLessonIndex;

    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    console.log(`[LessonSequenceGenerationService] Generating events from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}, starting lesson index ${startingLessonIndex}`);

    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (teachingDays.includes(dayName)) {
        // Check if this period is available on this date
        if (this.utilityService.isPeriodAvailableOnDate(currentDate, periodCourseAssignment.period)) {
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

        console.log(`[LessonSequenceGenerationService] ${format(currentDate, 'yyyy-MM-dd')} Period ${periodCourseAssignment.period}: ${lessonIndex < allLessons.length ? `Lesson ${allLessons[lessonIndex].title}(${allLessons[lessonIndex].id})` : 'ERROR - no more lessons'}`);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  /**
   * Create a single continuation event
   */
  createContinuationEvent(
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
   * Generate events for multiple periods simultaneously
   */
  generateContinuationEventsForMultiplePeriods(
    continuationPoints: ContinuationPoint[],
    activeConfig: any
  ): ScheduleEvent[] {
    const allEvents: ScheduleEvent[] = [];

    for (const point of continuationPoints) {
      const course = this.courseDataService.getCourseById(point.courseId);
      if (!course) continue;

      const allLessons = this.courseDataService.collectLessonsFromCourse(course);
      const periodCourseAssignment: PeriodCourseAssignment = {
        period: point.period,
        courseId: point.courseId,
        periodAssignment: point.periodAssignment
      };

      const startDate = this.utilityService.findNextAvailableDateForPeriod(
        point.continuationDate,
        point.period,
        activeConfig.teachingDays
      );

      const events = this.generateContinuationEvents(
        periodCourseAssignment,
        startDate,
        new Date(activeConfig.endDate),
        activeConfig.teachingDays,
        point.lastAssignedLessonIndex + 1,
        allLessons
      );

      allEvents.push(...events);
    }

    return allEvents;
  }

  /**
   * Get debug information about sequence generation
   */
  getDebugInfo(): any {
    return {
      generationService: {
        initialized: true,
        canGenerateSequences: true,
        supportedOperations: [
          'continueSequences',
          'continueSequenceForPeriod',
          'generateContinuationEvents',
          'generateContinuationEventsForMultiplePeriods'
        ]
      }
    };
  }
}
