// RESPONSIBILITY: Generates master schedules from user period assignments with period-first architecture.
// DOES NOT: Manage state, save data, handle UI, or show notifications - pure schedule generation logic.
// CALLED BY: Calendar components and SchedulePersistenceService for master schedule creation.
import { Injectable } from '@angular/core';

import { CourseDataService } from '../../../core/services/course-data.service';
import { UserService } from '../../../core/services/user.service';
import { Lesson } from '../../../models/lesson';
import { Course } from '../../../models/course';
import { parseId } from '../../../core/utils/type-conversion.utils';
import { 
  TeachingSchedule,
  PeriodCourseAssignment,
  PeriodAssignment
} from '../../../models/period-assignment';
import { Schedule } from '../../../models/schedule';
import { ScheduleEvent, EventCategories, EventTypes } from '../../../models/schedule-event.model';
import { getUserTeachingSchedule } from '../../../models/user-configuration.model';
import { getPeriodCourseAssignments, getSpecialPeriodAssignments, getUnassignedPeriods } from '../../../models/utils/period-asignment.utils';

// Constants for default schedule configuration
const DEFAULT_TEACHING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SCHOOL_YEAR_START_MONTH = 7; // August (0-indexed)
const SCHOOL_YEAR_START_DAY = 1;
const SCHOOL_YEAR_END_MONTH = 5; // June (0-indexed) 
const SCHOOL_YEAR_END_DAY = 15;

export interface ScheduleGenerationResult {
  success: boolean;
  schedule?: Schedule;
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleGenerationService {

  constructor(
    private courseDataService: CourseDataService,
    private userService: UserService
  ) {
    console.log('[ScheduleGenerationService] Initialized for period-first master schedule generation');
  }

  // Create master schedule for current user with all period assignments
  createMasterSchedule(): ScheduleGenerationResult {
    console.log('[ScheduleGenerationService] createMasterSchedule - period-first generation');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get current user and configuration
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      errors.push('Cannot create schedule: No current user available');
      return { success: false, errors, warnings };
    }

    const userId = parseId(currentUser.id) || 0;
    if (userId === 0) {
      errors.push('Cannot create schedule: Invalid user ID');
      return { success: false, errors, warnings };
    }

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    if (!teachingSchedule.periodAssignments || teachingSchedule.periodAssignments.length === 0) {
      errors.push('Cannot create schedule: No period assignments configured');
      return { success: false, errors, warnings };
    }

    // Generate master schedule
    const { startDate, endDate } = this.getDefaultDateRange();
    const teachingDaysArray = DEFAULT_TEACHING_DAYS;
    const scheduleEvents = this.generateMasterScheduleEvents(
      teachingSchedule,
      startDate,
      endDate,
      teachingDaysArray
    );

    if (scheduleEvents.length === 0) {
      warnings.push('No schedule events generated');
    }

    const masterSchedule: Schedule = {
        id: 0, // In-memory schedule
        title: `Master Schedule - ${startDate.getFullYear()}`,
        userId: userId,
        startDate,
        endDate,
        teachingDays: teachingDaysArray, // FIXED: Use array directly, not joined string
        isLocked: false,
        scheduleEvents
      };

    console.log(`[ScheduleGenerationService] Generated master schedule with ${scheduleEvents.length} events`);
    return {
      success: true,
      schedule: masterSchedule,
      errors,
      warnings
    };
  }

  // Generate all schedule events for master schedule - PERIOD-FIRST APPROACH
  private generateMasterScheduleEvents(
    teachingSchedule: TeachingSchedule,
    startDate: Date,
    endDate: Date,
    teachingDays: string[]
  ): ScheduleEvent[] {
    console.log('[ScheduleGenerationService] generateMasterScheduleEvents - period-first generation');
    
    const allScheduleEvents: ScheduleEvent[] = [];
    let eventIdCounter = -1; // Negative for in-memory events

    // Get period assignments by type
    const periodCourseAssignments = getPeriodCourseAssignments(teachingSchedule);
    const specialPeriodAssignments = getSpecialPeriodAssignments(teachingSchedule);
    const unassignedPeriods = getUnassignedPeriods(teachingSchedule);

    console.log(`[ScheduleGenerationService] Found ${periodCourseAssignments.length} period-course assignments, ${specialPeriodAssignments.length} special period assignments, and ${unassignedPeriods.length} unassigned periods`);

    // Generate events for periods with course assignments
    for (const pca of periodCourseAssignments) {
      const courseEvents = this.generateEventsForPeriodCourse(
        pca,
        startDate,
        endDate,
        teachingDays,
        eventIdCounter
      );
      
      allScheduleEvents.push(...courseEvents);
      eventIdCounter -= courseEvents.length; // Maintain unique negative IDs
      
      console.log(`[ScheduleGenerationService] Generated ${courseEvents.length} events for Period ${pca.period} Course ${pca.courseId}`);
    }

    // Generate events for special period assignments (Lunch, HallDuty, etc.)
    for (const specialPeriod of specialPeriodAssignments) {
      const specialEvents = this.generateEventsForSpecialPeriod(
        specialPeriod,
        startDate,
        endDate,
        teachingDays,
        eventIdCounter
      );
      
      allScheduleEvents.push(...specialEvents);
      eventIdCounter -= specialEvents.length; // Maintain unique negative IDs
      
      console.log(`[ScheduleGenerationService] Generated ${specialEvents.length} special period events for Period ${specialPeriod.period} (${specialPeriod.specialPeriodType})`);
    }

    // Generate placeholder events for truly unassigned periods
    for (const unassignedPeriod of unassignedPeriods) {
      const placeholderEvents = this.generateEventsForUnassignedPeriod(
        unassignedPeriod,
        startDate,
        endDate,
        teachingDays,
        eventIdCounter
      );
      
      allScheduleEvents.push(...placeholderEvents);
      eventIdCounter -= placeholderEvents.length; // Maintain unique negative IDs
      
      console.log(`[ScheduleGenerationService] Generated ${placeholderEvents.length} placeholder events for unassigned Period ${unassignedPeriod.period}`);
    }

    return allScheduleEvents;
  }

  // Generate events for a specific period-course combination
  private generateEventsForPeriodCourse(
    periodCourseAssignment: PeriodCourseAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingEventId: number
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = startingEventId;
    let lessonIndex = 0;

    // Get course and lessons
    const course = this.courseDataService.getCourseById(periodCourseAssignment.courseId);
    if (!course) {
      console.warn(`[ScheduleGenerationService] Course ${periodCourseAssignment.courseId} not found for period ${periodCourseAssignment.period}`);
      return events;
    }

    const lessons = this.collectLessonsFromCourse(course);
    console.log(`[ScheduleGenerationService] Found ${lessons.length} lessons for course ${course.title} in period ${periodCourseAssignment.period}`);

    // Generate events for each teaching day
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (teachingDays.includes(dayName)) {
        const scheduleEvent = this.createPeriodCourseEvent(
          eventId--,
          new Date(currentDate),
          periodCourseAssignment,
          lessons,
          lessonIndex
        );

        events.push(scheduleEvent);

        // Only increment lesson index if we assigned a lesson (not error)
        if (scheduleEvent.lessonId) {
          lessonIndex++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  // Generate events for a special period assignment (Lunch, HallDuty, etc.)
  private generateEventsForSpecialPeriod(
    specialPeriod: PeriodAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingEventId: number
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = startingEventId;

    if (!specialPeriod.specialPeriodType) {
      console.warn(`[ScheduleGenerationService] Special period ${specialPeriod.period} has no specialPeriodType`);
      return events;
    }

    // Generate recurring events for each teaching day
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (teachingDays.includes(dayName)) {
        // TODO: Check for SpecialDayEvent override here
        // For now, generate the recurring event - SpecialDay logic will be added later
        
        const scheduleEvent: ScheduleEvent = {
          id: eventId--,
          scheduleId: 0,
          courseId: null,
          date: new Date(currentDate),
          period: specialPeriod.period,
          lessonId: null,
          eventType: specialPeriod.specialPeriodType,
          eventCategory: EventCategories.SPECIAL_PERIOD,
          comment: specialPeriod.notes || null
        };

        events.push(scheduleEvent);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  // Generate placeholder events for truly unassigned periods
  private generateEventsForUnassignedPeriod(
    unassignedPeriod: PeriodAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingEventId: number
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = startingEventId;

    // Generate error events for unassigned periods
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (teachingDays.includes(dayName)) {
        const scheduleEvent: ScheduleEvent = {
          id: eventId--,
          scheduleId: 0,
          courseId: null,
          date: new Date(currentDate),
          period: unassignedPeriod.period,
          lessonId: null,
          eventType: EventTypes.ERROR,
          eventCategory: null, // Error events have null category
          comment: 'Period not configured - assign a course or special period type'
        };

        events.push(scheduleEvent);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  // Create a schedule event for a specific period-course assignment
  private createPeriodCourseEvent(
    eventId: number,
    date: Date,
    periodCourseAssignment: PeriodCourseAssignment,
    lessons: Lesson[],
    lessonIndex: number
  ): ScheduleEvent {
    let lessonId: number | null = null;
    let eventType: string = EventTypes.ERROR;
    let eventCategory: string | null = null;
    let comment: string | null = null;

    if (lessonIndex < lessons.length) {
      // Assign lesson
      lessonId = lessons[lessonIndex].id;
      eventType = EventTypes.LESSON;
      eventCategory = EventCategories.LESSON;
      comment = null;
    } else {
      // No more lessons available - error day
      lessonId = null;
      eventType = EventTypes.ERROR;
      eventCategory = null; // Error events have null category
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

  // Collect lessons from course hierarchy in proper order (unchanged logic)
  collectLessonsFromCourse(course: Course): Lesson[] {
    const lessons: Lesson[] = [];
    if (!course.topics) return lessons;

    const sortedTopics = [...course.topics].sort((a, b) => a.sortOrder - b.sortOrder);
    
    for (const topic of sortedTopics) {
      const topicLessons: Lesson[] = [];
      
      if (topic.lessons) {
        topicLessons.push(...topic.lessons);
      }
      
      if (topic.subTopics) {
        const sortedSubTopics = [...topic.subTopics].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const subTopic of sortedSubTopics) {
          if (subTopic.lessons) {
            topicLessons.push(...subTopic.lessons);
          }
        }
      }
      
      topicLessons.sort((a, b) => a.sortOrder - b.sortOrder);
      lessons.push(...topicLessons);
    }

    return lessons;
  }

  // Get default date range for current school year (unchanged)
  getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const currentYear = new Date().getFullYear();
    return {
      startDate: new Date(currentYear, SCHOOL_YEAR_START_MONTH, SCHOOL_YEAR_START_DAY),
      endDate: new Date(currentYear + 1, SCHOOL_YEAR_END_MONTH, SCHOOL_YEAR_END_DAY)
    };
  }

  // === VALIDATION AND DEBUG METHODS ===

  // Validate that master schedule can be generated
  validateUserForScheduling(): { canSchedule: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      issues.push('No current user available');
      return { canSchedule: false, issues };
    }

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    if (!teachingSchedule.periodAssignments || teachingSchedule.periodAssignments.length === 0) {
      issues.push('No period assignments configured');
    }

    const periodCourseAssignments = getPeriodCourseAssignments(teachingSchedule);
    if (periodCourseAssignments.length === 0) {
      issues.push('No periods assigned to courses');
    }

    // Validate that assigned courses exist
    for (const pca of periodCourseAssignments) {
      const course = this.courseDataService.getCourseById(pca.courseId);
      if (!course) {
        issues.push(`Course ${pca.courseId} assigned to period ${pca.period} not found`);
      } else {
        const lessons = this.collectLessonsFromCourse(course);
        if (lessons.length === 0) {
          issues.push(`Course ${course.title} (Period ${pca.period}) has no lessons available`);
        }
      }
    }

    return {
      canSchedule: issues.length === 0,
      issues
    };
  }

  // Get debug information about current user's schedule generation capability
  getDebugInfo(): any {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      return { error: 'No current user available' };
    }

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    const periodCourseAssignments = getPeriodCourseAssignments(teachingSchedule);
    const specialPeriodAssignments = getSpecialPeriodAssignments(teachingSchedule);
    const unassignedPeriods = getUnassignedPeriods(teachingSchedule);

    const courseInfo = periodCourseAssignments.map(pca => {
      const course = this.courseDataService.getCourseById(pca.courseId);
      const lessons = course ? this.collectLessonsFromCourse(course) : [];
      
      return {
        period: pca.period,
        courseId: pca.courseId,
        courseName: course?.title || 'Course not found',
        lessonCount: lessons.length,
        room: pca.periodAssignment.room
      };
    });

    return {
      userId: currentUser.id,
      periodsPerDay: teachingSchedule.periodsPerDay,
      totalPeriodAssignments: teachingSchedule.periodAssignments?.length || 0,
      periodCourseAssignments: courseInfo,
      specialPeriodCount: specialPeriodAssignments.length,
      unassignedPeriodCount: unassignedPeriods.length,
      validation: this.validateUserForScheduling()
    };
  }
}