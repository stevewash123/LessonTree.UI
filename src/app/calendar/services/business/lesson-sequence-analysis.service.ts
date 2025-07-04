// **COMPLETE FILE** - LessonSequenceAnalysisService - Sequence Analysis Logic
// RESPONSIBILITY: Analyze current sequence state and identify continuation points
// DOES NOT: Generate events, coordinate services, or handle UI interactions
// CALLED BY: LessonSequenceGenerationService for sequence analysis

import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { PeriodAssignment, PeriodCourseAssignment } from '../../../models/period-assignment';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';

export interface ContinuationPoint {
  period: number;
  courseId: number;
  periodAssignment: PeriodAssignment;
  lastAssignedLessonIndex: number;
  continuationDate: Date;
}

export interface SequenceAnalysisResult {
  allCourses: any[];
  totalLessonsInScope: number;
  continuationPoints: ContinuationPoint[];
  coursePeriodDetails: Array<{
    courseId: number;
    courseTitle: string;
    period: number;
    totalLessons: number;
    assignedLessons: number;
    needsContinuation: boolean;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class LessonSequenceAnalysisService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private courseDataService: CourseDataService
  ) {
    console.log('[LessonSequenceAnalysisService] Sequence analysis logic initialized');
  }

  // === SEQUENCE ANALYSIS ===

  /**
   * Analyze current sequence state and identify what needs continuation
   */
  analyzeSequenceState(afterDate: Date): SequenceAnalysisResult {
    console.log(`[LessonSequenceAnalysisService] Analyzing sequence state after ${format(afterDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig) {
      throw new Error('Cannot analyze sequences: No schedule or configuration available');
    }

    // Force course data refresh to ensure we have latest lessons
    console.log('[LessonSequenceAnalysisService] Refreshing course data before sequence analysis');
    const allCourses = this.courseDataService.getCourses();
    const totalLessonsInScope = allCourses.reduce((total: number, course: any) => {
      const lessons = this.courseDataService.collectLessonsFromCourse(course);
      return total + lessons.length;
    }, 0);

    // Find continuation points for all course periods
    const continuationPoints = this.findContinuationPoints(currentSchedule.scheduleEvents, afterDate, activeConfig);

    console.log(`[LessonSequenceAnalysisService] Found ${continuationPoints.length} periods needing continuation:`,
      continuationPoints.map(cp => `Period ${cp.period} Course ${cp.courseId} from lesson ${cp.lastAssignedLessonIndex + 1}`));

    // Generate course period details
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

    return {
      allCourses,
      totalLessonsInScope,
      continuationPoints,
      coursePeriodDetails
    };
  }

  /**
   * Find all periods that need sequence continuation
   */
  findContinuationPoints(scheduleEvents: ScheduleEvent[], afterDate: Date, activeConfig: any): ContinuationPoint[] {
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

    console.log(`[LessonSequenceAnalysisService] Found ${continuationPoints.length} periods needing continuation:`,
      continuationPoints.map(cp => `Period ${cp.period} Course ${cp.courseId} from lesson ${cp.lastAssignedLessonIndex + 1}`));

    return continuationPoints;
  }

  /**
   * Find continuation point for a specific period
   */
  findContinuationPointForPeriod(
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
      console.log(`[LessonSequenceAnalysisService] No lesson events found for Period ${pca.period}, Course ${pca.courseId} - starting from beginning`);
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

    console.log(`[LessonSequenceAnalysisService] Period ${pca.period}, Course ${pca.courseId}:`, {
      totalLessonEvents: periodLessonEvents.length,
      allLessonsCount: allLessons.length,
      highestLessonIndex: highestLessonIndex,
      periodLessonEventIds: periodLessonEvents.map(e => e.lessonId)
    });

    // Check if there are more lessons to assign
    if (highestLessonIndex >= allLessons.length - 1) {
      console.log(`[LessonSequenceAnalysisService] All lessons already assigned for Period ${pca.period}, Course ${pca.courseId}`);
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
   * Get period course assignments from configuration
   */
  getPeriodCourseAssignments(activeConfig: any): PeriodCourseAssignment[] {
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
   * Get detailed analysis for a specific course period
   */
  analyzeCoursePeriod(courseId: number, period: number): {
    courseTitle: string;
    totalLessons: number;
    assignedEvents: ScheduleEvent[];
    highestLessonIndex: number;
    remainingLessons: number;
    needsContinuation: boolean;
  } | null {
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) return null;

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return null;

    const allLessons = this.courseDataService.collectLessonsFromCourse(course);
    const assignedEvents = currentSchedule.scheduleEvents
      .filter(event =>
        event.period === period &&
        event.courseId === courseId &&
        event.lessonId !== null
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let highestLessonIndex = -1;
    for (const event of assignedEvents) {
      const lessonIndex = allLessons.findIndex(lesson => lesson.id === event.lessonId);
      if (lessonIndex > highestLessonIndex) {
        highestLessonIndex = lessonIndex;
      }
    }

    const remainingLessons = Math.max(0, allLessons.length - (highestLessonIndex + 1));

    return {
      courseTitle: course.title,
      totalLessons: allLessons.length,
      assignedEvents,
      highestLessonIndex,
      remainingLessons,
      needsContinuation: remainingLessons > 0
    };
  }

  /**
   * Get debug information about sequence analysis
   */
  getDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    return {
      analysisService: {
        initialized: true,
        canAnalyzeSequences: true,
        hasSchedule: !!currentSchedule,
        hasConfiguration: !!activeConfig,
        scheduleEventCount: currentSchedule?.scheduleEvents?.length || 0,
        periodAssignments: activeConfig?.periodAssignments?.length || 0
      }
    };
  }
}
