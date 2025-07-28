// **NEW SERVICE** - ScheduleEventRepositioningService - Temporal Schedule Event Updates
// RESPONSIBILITY: Update schedule events when lesson order changes affect temporal positioning across entire schedule
// SCOPE: Schedule-wide event repositioning, not limited to calendar viewport
// DOES NOT: Handle course structure ordering, tree UI operations, or Observable coordination
// CALLED BY: CalendarCoordinationService when lesson order changes detected

import { Injectable } from '@angular/core';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { Schedule } from '../../../models/schedule';
import {EntityPositionResult, EntityStateInfo} from '../../../models/positioning-result.model';

export interface LessonOrderChange {
  lessonId: number;
  courseId: number;
  oldSortOrder: number;
  newSortOrder: number;
  moveType: 'reorder' | 'reparent';
  metadata?: {
    oldSortOrder?: number;
    newSortOrder?: number;
    moveType?: 'drag-drop' | 'api-move' | 'bulk-operation';
    apiResponse?: EntityPositionResult;
  };
}

export interface ScheduleRepositioningResult {
  success: boolean;
  eventsUpdated: number;
  eventsShifted: number;
  dateRangeAffected: {
    startDate: Date;
    endDate: Date;
  };
  periodsAffected: number[];
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleEventRepositioningService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private courseDataService: CourseDataService
  ) {
    console.log('[ScheduleEventRepositioningService] Initialized for temporal schedule event repositioning');
  }

  /**
   * Update schedule events when lesson order changes affect temporal positioning
   */
  repositionScheduleEventsForLessonOrderChange(orderChange: LessonOrderChange): ScheduleRepositioningResult {
    console.log('[ScheduleEventRepositioningService] 🔄 SCHEDULE REPOSITIONING START:', {
      lessonId: orderChange.lessonId,
      courseId: orderChange.courseId,
      oldSortOrder: orderChange.oldSortOrder,
      newSortOrder: orderChange.newSortOrder,
      moveType: orderChange.moveType,
      hasMetadata: !!orderChange.metadata,
      hasApiResponse: !!orderChange.metadata?.apiResponse,
      timestamp: new Date().toISOString()
    });

    // ✅ FIXED: Access API response through metadata
    const apiResponse = orderChange.metadata?.apiResponse;
    if (!apiResponse?.modifiedEntities) {
      console.error('[ScheduleEventRepositioningService] ❌ No API response data available in metadata');
      return this.createErrorResult('No API response data available for repositioning');
    }

    // ✅ Extract lesson order from API response with explicit types
    const lessonsFromApi = apiResponse.modifiedEntities
      .filter((entity: EntityStateInfo) => entity.type === 'Lesson')
      .sort((a: EntityStateInfo, b: EntityStateInfo) => a.sortOrder - b.sortOrder);

    console.log('[ScheduleEventRepositioningService] 📚 LESSON ORDER FROM API RESPONSE:', {
      courseId: orderChange.courseId,
      totalLessons: lessonsFromApi.length,
      lessonOrder: lessonsFromApi.map((lesson: EntityStateInfo, index: number) => ({
        position: index + 1,
        lessonId: lesson.id,
        title: lesson.title,
        sortOrder: lesson.sortOrder,
        isMovedEntity: lesson.isMovedEntity
      })),
      movedLesson: lessonsFromApi.find((l: EntityStateInfo) => l.isMovedEntity),
      source: 'API EntityPositionResult from signal metadata - authoritative post-move state'
    });

    // ✅ Validate we have the moved lesson
    const movedLesson = lessonsFromApi.find((l: EntityStateInfo) => l.id === orderChange.lessonId);
    if (!movedLesson) {
      console.error('[ScheduleEventRepositioningService] ❌ Moved lesson not found in API response');
      return this.createErrorResult(`Moved lesson ${orderChange.lessonId} not found in API response`);
    }

    console.log('[ScheduleEventRepositioningService] ✅ CORRECT LESSON SEQUENCE FROM API:', {
      expectedSequence: lessonsFromApi.map((l: EntityStateInfo) => `${l.title}(${l.sortOrder})`).join(' → '),
      movedLessonPosition: lessonsFromApi.findIndex((l: EntityStateInfo) => l.id === orderChange.lessonId) + 1,
      totalInSequence: lessonsFromApi.length,
      source: 'Fresh from API via signal metadata - not stale CourseData'
    });

    // ✅ Continue with repositioning using the API lesson order
    return this.performRepositioning(orderChange, lessonsFromApi);
  }

  private createNewLessonOrderFromMetadata(orderChange: LessonOrderChange, apiLessons: EntityStateInfo[]): EntityStateInfo[] {
    console.log('[ScheduleEventRepositioningService] ✅ USING API LESSON ORDER (not metadata reconstruction):', {
      lessonId: orderChange.lessonId,
      source: 'API EntityPositionResult modifiedEntities',
      totalLessons: apiLessons.length
    });

    // ✅ The API already gave us the correct order - use it directly
    console.log('[ScheduleEventRepositioningService] ✅ API LESSON ORDER IS AUTHORITATIVE:', {
      correctSequence: apiLessons.map((lesson, index) => ({
        position: index + 1,
        lessonId: lesson.id,
        title: lesson.title,
        sortOrder: lesson.sortOrder
      })),
      movedLessonPosition: apiLessons.findIndex(l => l.id === orderChange.lessonId) + 1,
      note: 'This is the correct order for schedule repositioning'
    });

    return apiLessons;
  }

  // Add missing performRepositioning method stub that calls existing methods
  private performRepositioning(orderChange: LessonOrderChange, lessonsInOrder: EntityStateInfo[]): ScheduleRepositioningResult {
    const currentSchedule = this.scheduleStateService.getSchedule();
    const configuration = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule || !configuration) {
      return {
        success: false,
        eventsUpdated: 0,
        eventsShifted: 0,
        dateRangeAffected: { startDate: new Date(), endDate: new Date() },
        periodsAffected: [],
        errors: ['No active schedule or configuration found'],
        warnings: []
      };
    }

    // Get periods assigned to this course
    const periodsForCourse = this.getPeriodsAssignedToCourse(configuration, orderChange.courseId);

    console.log('[ScheduleEventRepositioningService] Processing periods for course:', {
      courseId: orderChange.courseId,
      periodsAffected: periodsForCourse
    });

    // ✅ FIXED: Use API lessons directly, no need for createNewLessonOrderFromMetadata
    console.log('[ScheduleEventRepositioningService] Lessons in API order:', {
      courseId: orderChange.courseId,
      totalLessons: lessonsInOrder.length,
      lessonOrder: lessonsInOrder.map((l: EntityStateInfo) => ({
        id: l.id,
        title: l.title,
        sortOrder: l.sortOrder
      })),
      basedOn: 'API EntityPositionResult - authoritative'
    });

    let totalEventsUpdated = 0;
    let totalEventsShifted = 0;
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Process each period assigned to this course
    for (const period of periodsForCourse) {
      console.log(`[ScheduleEventRepositioningService] Processing period ${period} for course ${orderChange.courseId}`);

      const periodResult = this.repositionEventsForCoursePeriod(
        currentSchedule,
        configuration,
        orderChange.courseId,
        period,
        lessonsInOrder
      );

      totalEventsUpdated += periodResult.eventsUpdated;
      totalEventsShifted += periodResult.eventsShifted;
      allErrors.push(...periodResult.errors);
      allWarnings.push(...periodResult.warnings);
    }

    // Update the schedule state with modified events
    this.scheduleStateService.setSchedule(currentSchedule);

    return {
      success: allErrors.length === 0,
      eventsUpdated: totalEventsUpdated,
      eventsShifted: totalEventsShifted,
      dateRangeAffected: {
        startDate: new Date(), // Could be calculated from affected events
        endDate: new Date()
      },
      periodsAffected: periodsForCourse,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Reposition events for a specific course-period combination
   */
  /**
   * Reposition events for a specific course-period combination
   */
  private repositionEventsForCoursePeriod(
    schedule: Schedule,
    configuration: any,
    courseId: number,
    period: number,
    lessonsFromApi: EntityStateInfo[]
  ): ScheduleRepositioningResult {
    console.log(`[ScheduleEventRepositioningService] 🔧 FIXING: Repositioning events for course ${courseId}, period ${period}`);

    // Get all lesson events for this course-period combination
    const lessonEvents = schedule.scheduleEvents.filter((event: ScheduleEvent) =>
      event.eventCategory === 'Lesson' &&
      event.period === period &&
      event.courseId === courseId
    );

    console.log(`[ScheduleEventRepositioningService] Found ${lessonEvents.length} lesson events for course ${courseId}, period ${period}`);

    if (lessonEvents.length === 0) {
      return this.createEmptyResult(period, `No lesson events found for course ${courseId}, period ${period}`);
    }

    // Sort events by date to understand current temporal sequence
    lessonEvents.sort((a: ScheduleEvent, b: ScheduleEvent) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    console.log(`[ScheduleEventRepositioningService] 🔍 EVENTS BEFORE REPOSITIONING:`, {
      courseId,
      period,
      eventCount: lessonEvents.length,
      currentOrder: lessonEvents.map((e, index) => ({
        temporalPosition: index + 1,
        date: e.date,
        currentLessonId: e.lessonId,
        currentLessonTitle: e.lessonTitle,
        currentLessonSort: e.lessonSort
      }))
    });

    console.log(`[ScheduleEventRepositioningService] 🎯 API LESSONS TO PROCESS:`, {
      courseId,
      lessonCount: lessonsFromApi.length,
      apiLessons: lessonsFromApi.map((lesson: EntityStateInfo) => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        newSortOrder: lesson.sortOrder
      }))
    });

    let eventsUpdated = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`[ScheduleEventRepositioningService] 🔄 Processing ${lessonsFromApi.length} API lesson updates`);

    // ✅ STEP 1: Update lessonSort values based on API response
    for (const apiLesson of lessonsFromApi) {
      console.log(`[ScheduleEventRepositioningService] 🔍 Looking for events with lessonId ${apiLesson.id}:`, {
        lessonTitle: apiLesson.title,
        newSortOrder: apiLesson.sortOrder
      });

      // Find all events for this specific lesson
      const eventsForThisLesson = lessonEvents.filter(event =>
        event.lessonId === apiLesson.id
      );

      console.log(`[ScheduleEventRepositioningService] 📚 Found ${eventsForThisLesson.length} events for lessonId ${apiLesson.id}:`, {
        events: eventsForThisLesson.map(e => ({
          date: e.date,
          currentLessonSort: e.lessonSort,
          willUpdateTo: apiLesson.sortOrder
        }))
      });

      // Update all events for this lesson
      eventsForThisLesson.forEach(event => {
        if (event.lessonSort !== apiLesson.sortOrder) {
          console.log(`[ScheduleEventRepositioningService] 🔄 UPDATING LESSON SORT:`, {
            date: event.date,
            lessonId: event.lessonId,
            lessonTitle: event.lessonTitle,
            before: { lessonSort: event.lessonSort },
            after: { lessonSort: apiLesson.sortOrder }
          });

          // 🔧 UPDATE: Change the sort order
          event.lessonSort = apiLesson.sortOrder;
          eventsUpdated++;
        } else {
          console.log(`[ScheduleEventRepositioningService] ✅ Event already has correct sort order:`, {
            date: event.date,
            lessonId: event.lessonId,
            lessonSort: event.lessonSort
          });
        }
      });

      if (eventsForThisLesson.length === 0) {
        warnings.push(`No schedule events found for lessonId ${apiLesson.id}`);
        console.warn(`[ScheduleEventRepositioningService] ⚠️ No events found for lessonId ${apiLesson.id}`);
      }
    }

    // ✅ STEP 2: Create lesson-to-event mapping for reordering
    const lessonToEventMap = new Map<number, ScheduleEvent>();
    lessonEvents.forEach(event => {
      if (event.lessonId) {
        lessonToEventMap.set(event.lessonId, event);
      }
    });

    console.log(`[ScheduleEventRepositioningService] 📋 LESSON TO EVENT MAPPING:`, {
      totalLessons: lessonToEventMap.size,
      mapping: Array.from(lessonToEventMap.entries()).map(([lessonId, event]) => ({
        lessonId,
        lessonTitle: event.lessonTitle,
        lessonSort: event.lessonSort || 0,
        currentDate: event.date
      }))
    });

    // ✅ STEP 3: Sort lessons by their lessonSort to get correct order
    const sortedLessons = Array.from(lessonToEventMap.values())
      .sort((a, b) => (a.lessonSort || 0) - (b.lessonSort || 0));

    console.log(`[ScheduleEventRepositioningService] 🎯 LESSONS IN CORRECT SORT ORDER:`, {
      sortedSequence: sortedLessons.map((event, index) => ({
        newPosition: index + 1,
        lessonId: event.lessonId,
        lessonTitle: event.lessonTitle,
        lessonSort: event.lessonSort || 0
      }))
    });

    // ✅ STEP 4: Reassign lessons to temporal positions based on sort order
    let actualRepositions = 0;
    for (let i = 0; i < Math.min(lessonEvents.length, sortedLessons.length); i++) {
      const temporalEvent = lessonEvents[i];  // Event at temporal position i
      const correctLesson = sortedLessons[i]; // Lesson that should be at position i

      if (temporalEvent.lessonId !== correctLesson.lessonId) {
        console.log(`[ScheduleEventRepositioningService] 🔄 REPOSITIONING EVENT:`, {
          temporalPosition: i + 1,
          date: temporalEvent.date,
          before: {
            lessonId: temporalEvent.lessonId,
            lessonTitle: temporalEvent.lessonTitle,
            lessonSort: temporalEvent.lessonSort
          },
          after: {
            lessonId: correctLesson.lessonId,
            lessonTitle: correctLesson.lessonTitle,
            lessonSort: correctLesson.lessonSort
          }
        });

        // 🔧 ACTUAL REPOSITIONING: Replace the lesson data in this temporal slot
        temporalEvent.lessonId = correctLesson.lessonId;
        temporalEvent.lessonTitle = correctLesson.lessonTitle;
        temporalEvent.lessonSort = correctLesson.lessonSort;
        temporalEvent.lessonObjective = correctLesson.lessonObjective;
        temporalEvent.lessonMethods = correctLesson.lessonMethods;

        actualRepositions++;
      } else {
        console.log(`[ScheduleEventRepositioningService] ✅ Temporal position ${i + 1} already has correct lesson:`, {
          date: temporalEvent.date,
          lessonId: temporalEvent.lessonId,
          lessonTitle: temporalEvent.lessonTitle
        });
      }
    }

    console.log(`[ScheduleEventRepositioningService] 🔍 EVENTS AFTER REPOSITIONING:`, {
      courseId,
      period,
      eventsUpdated,
      actualRepositions,
      finalOrder: lessonEvents.map((e, index) => ({
        temporalPosition: index + 1,
        date: e.date,
        finalLessonId: e.lessonId,
        finalLessonTitle: e.lessonTitle,
        finalLessonSort: e.lessonSort
      }))
    });

    return {
      success: errors.length === 0,
      eventsUpdated: actualRepositions,
      eventsShifted: actualRepositions,
      dateRangeAffected: {
        startDate: lessonEvents[0] ? new Date(lessonEvents[0].date) : new Date(),
        endDate: lessonEvents[lessonEvents.length - 1] ? new Date(lessonEvents[lessonEvents.length - 1].date) : new Date()
      },
      periodsAffected: [period],
      errors,
      warnings
    };
  }

  // Helper method for empty results
  private createEmptyResult(period: number, warningMessage: string): ScheduleRepositioningResult {
    return {
      success: true,
      eventsUpdated: 0,
      eventsShifted: 0,
      dateRangeAffected: { startDate: new Date(), endDate: new Date() },
      periodsAffected: [period],
      errors: [],
      warnings: [warningMessage]
    };
  }

  // === HELPER METHODS ===
  private createErrorResult(message: string): ScheduleRepositioningResult {
    return {
      success: false,
      eventsUpdated: 0,
      eventsShifted: 0,
      dateRangeAffected: { startDate: new Date(), endDate: new Date() },
      periodsAffected: [],
      errors: [message],
      warnings: []
    };
  }
  private logScheduleEventOrderValidation(courseId: number, lessonOrder: any[]): void {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.log('[ScheduleEventRepositioningService] ℹ️ No schedule events to validate');
      return;
    }

    // Get events for this course
    const courseEvents = currentSchedule.scheduleEvents.filter(e =>
      e.lessonId && lessonOrder.some(l => l.id === e.lessonId)
    );

    // Group by period and validate order
    const eventsByPeriod = this.groupEventsByPeriod(courseEvents);

    Object.entries(eventsByPeriod).forEach(([period, events]) => {
      const sortedEvents = (events as any[]).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const eventLessonIds = sortedEvents.map(e => e.lessonId);
      const expectedOrder = lessonOrder
        .filter(l => eventLessonIds.includes(l.id))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(l => l.id);

      const orderMatches = this.arraysEqual(eventLessonIds, expectedOrder);

      if (orderMatches) {
        console.log(`[ScheduleEventRepositioningService] ✅ Period ${period} order correct:`, {
          eventOrder: eventLessonIds,
          eventsCount: sortedEvents.length
        });
      } else {
        console.error(`[ScheduleEventRepositioningService] 🚨 Period ${period} order mismatch:`, {
          actualEventOrder: eventLessonIds,
          expectedLessonOrder: expectedOrder,
          orderCorrect: false
        });
      }
    });
  }

  private groupEventsByPeriod(events: any[]): { [period: number]: any[] } {
    return events.reduce((groups, event) => {
      const period = event.period || 1;
      if (!groups[period]) groups[period] = [];
      groups[period].push(event);
      return groups;
    }, {});
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
  private getPeriodsAssignedToCourse(configuration: any, courseId: number): number[] {
    // Extract periods assigned to this course from configuration
    const periods: number[] = [];

    if (configuration.periodAssignments) {
      for (const assignment of configuration.periodAssignments) {
        if (assignment.courseId === courseId) {
          periods.push(assignment.period);
        }
      }
    }

    return periods;
  }

  private isEventForCourse(event: ScheduleEvent, courseId: number): boolean {
    // Check if event belongs to the specified course
    return event.courseId === courseId;
  }

  private getLessonIdFromEvent(event: ScheduleEvent): number {
    // Extract lesson ID from event
    return event.lessonId || 0;
  }

  private getLessonTitleFromEvent(event: ScheduleEvent): string {
    // Extract lesson title from event
    return event.lessonTitle || 'Unknown Lesson';
  }

  private updateEventWithNewLesson(event: ScheduleEvent, newLesson: any): void {
    // Update event to reference the new lesson
    event.lessonId = newLesson.id;
    event.lessonTitle = newLesson.title;
    event.lessonSort = newLesson.sortOrder;

    const eventDate = new Date(event.date);
    console.log(`[ScheduleEventRepositioningService] Event updated: ${event.lessonTitle} on ${eventDate.toDateString()}`);
  }

  // === DEBUG UTILITIES ===

  /**
   * Get debug information about schedule event repositioning
   */
  getDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.schedule();
    const configuration = this.scheduleConfigurationStateService.activeConfiguration();

    return {
      repositioningService: {
        initialized: true,
        hasSchedule: !!currentSchedule,
        hasConfiguration: !!configuration,
        totalEvents: currentSchedule?.scheduleEvents.length || 0,
        lessonEvents: currentSchedule?.scheduleEvents.filter((e: ScheduleEvent) => e.eventCategory === 'Lesson').length || 0,
        responsibilities: [
          'Update schedule events when lesson order changes',
          'Temporal positioning across entire schedule',
          'Schedule-wide event repositioning beyond calendar viewport'
        ],
        doesNot: [
          'Handle course structure ordering',
          'Manage tree UI operations',
          'Observable coordination',
          'Calendar viewport management'
        ]
      }
    };
  }
}
