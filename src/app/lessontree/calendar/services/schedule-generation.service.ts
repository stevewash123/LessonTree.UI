// RESPONSIBILITY: Generates in-memory schedules from course data and lesson hierarchies with period assignment matching.
// DOES NOT: Manage state, save data, handle UI, or show notifications - pure schedule generation logic.
// CALLED BY: SchedulePersistenceService when no saved schedules exist for a course.
import { Injectable } from '@angular/core';

import { CourseDataService } from '../../../core/services/course-data.service';
import { Schedule, ScheduleEvent, PeriodAssignment } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { Course } from '../../../models/course';
import { UserService } from '../../../core/services/user.service';
import { parseId } from '../../../core/utils/type-conversion.utils';

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
    console.log('[ScheduleGenerationService] Initialized for schedule generation');
  }

  // Create an in-memory schedule for a course with period assignment matching
  createInMemorySchedule(courseId: number): ScheduleGenerationResult {
    console.log(`[ScheduleGenerationService] createInMemorySchedule for course ${courseId}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      errors.push('Cannot create schedule: Course not found');
      return { success: false, errors, warnings };
    }

    const teachingConfig = this.userService.getTeachingConfig();
    if (!teachingConfig) {
      errors.push('Cannot create schedule: No teaching configuration found');
      return { success: false, errors, warnings };
    }

    // Find periods assigned to this course
    const assignedPeriods = this.getPeriodsAssignedToCourse(courseId, teachingConfig.periodAssignments);
    if (assignedPeriods.length === 0) {
      warnings.push('No periods assigned to this course');
      return { success: false, errors, warnings };
    }

    const lessons = this.collectLessonsFromCourse(course);
    if (lessons.length === 0) {
      warnings.push('No lessons available for scheduling');
    }

    // Get userId from UserService directly
    const currentUser = this.userService.getCurrentUser();
    const userId = parseId(currentUser?.id || '0') || 0;

    const { startDate, endDate } = this.getDefaultDateRange();
    const scheduleEvents = this.generateScheduleEvents(
      lessons, 
      startDate, 
      endDate, 
      DEFAULT_TEACHING_DAYS,
      assignedPeriods
    );

    const inMemorySchedule: Schedule = {
      id: 0,
      title: `${course.title} - ${startDate.getFullYear()}`,
      courseId: courseId,
      userId: userId,
      startDate,
      endDate,
      teachingDays: DEFAULT_TEACHING_DAYS.join(','),
      isLocked: false,
      scheduleEvents
    };

    return {
      success: true,
      schedule: inMemorySchedule,
      errors,
      warnings
    };
  }

  // Get periods assigned to the specified course
  private getPeriodsAssignedToCourse(courseId: number, periodAssignments: PeriodAssignment[]): PeriodAssignment[] {
    const assigned = periodAssignments.filter(assignment => assignment.courseId === courseId);
    
    // Sort by period number for consistent lesson distribution
    assigned.sort((a, b) => a.period - b.period);
    
    return assigned;
  }

  // Collect lessons from course hierarchy in proper order
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

  // Generate schedule events for assigned periods only
  generateScheduleEvents(
    lessons: Lesson[], 
    startDate: Date, 
    endDate: Date, 
    teachingDays: string[],
    assignedPeriods: PeriodAssignment[]
  ): ScheduleEvent[] {
    const scheduleEvents: ScheduleEvent[] = [];
    let lessonIndex = 0;
    let eventIdCounter = -1; // Negative for in-memory events
    
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    
    if (startDate >= endDate) {
      console.error('[ScheduleGenerationService] Invalid date range');
      return scheduleEvents;
    }
    
    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (teachingDays.includes(dayName)) {
        // Generate events only for periods assigned to this course
        for (const periodAssignment of assignedPeriods) {
          const scheduleEvent = this.createScheduleEvent(
            eventIdCounter--,
            new Date(currentDate),
            periodAssignment.period,
            lessons,
            lessonIndex
          );
          
          scheduleEvents.push(scheduleEvent);
          
          // Only increment lesson index if we assigned a lesson (not error day)
          if (scheduleEvent.lessonId) {
            lessonIndex++;
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return scheduleEvents;
  }

  // Create a single schedule event for a specific period
  private createScheduleEvent(
    eventId: number,
    date: Date,
    period: number,
    lessons: Lesson[],
    lessonIndex: number
  ): ScheduleEvent {
    let lessonId: number | null = null;
    let specialCode: string | null = null;
    let comment: string | null = null;
    
    if (lessonIndex < lessons.length) {
      lessonId = lessons[lessonIndex].id;
    } else {
      specialCode = 'Error Day';
      comment = 'No lesson assigned - schedule needs more content';
    }
    
    return {
      id: eventId,
      scheduleId: 0,
      date: new Date(date),
      period,
      lessonId,
      specialCode,
      comment
    };
  }

  // Get default date range for current school year
  getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const currentYear = new Date().getFullYear();
    return {
      startDate: new Date(currentYear, SCHOOL_YEAR_START_MONTH, SCHOOL_YEAR_START_DAY),
      endDate: new Date(currentYear + 1, SCHOOL_YEAR_END_MONTH, SCHOOL_YEAR_END_DAY)
    };
  }

  // === DEBUG AND UTILITY METHODS ===

  // Get debug information about period assignments for a course
  getDebugInfoForCourse(courseId: number): any {
    const teachingConfig = this.userService.getTeachingConfig();
    if (!teachingConfig) {
      return { error: 'No teaching configuration available' };
    }

    const assignedPeriods = this.getPeriodsAssignedToCourse(courseId, teachingConfig.periodAssignments);
    const course = this.courseDataService.getCourseById(courseId);
    const lessons = course ? this.collectLessonsFromCourse(course) : [];

    return {
      courseId,
      courseName: course?.title || 'Course not found',
      assignedPeriods: assignedPeriods.map(p => ({
        period: p.period,
        room: p.room,
        sectionName: p.sectionName
      })),
      lessonCount: lessons.length,
      periodsPerDay: teachingConfig.periodsPerDay,
      totalPeriodAssignments: teachingConfig.periodAssignments.length
    };
  }

  // Validate that a course can be scheduled
  validateCourseForScheduling(courseId: number): { canSchedule: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      issues.push('Course not found');
    }

    const teachingConfig = this.userService.getTeachingConfig();
    if (!teachingConfig) {
      issues.push('No teaching configuration available');
    } else {
      const assignedPeriods = this.getPeriodsAssignedToCourse(courseId, teachingConfig.periodAssignments);
      if (assignedPeriods.length === 0) {
        issues.push('No periods assigned to this course');
      }
    }

    const lessons = course ? this.collectLessonsFromCourse(course) : [];
    if (lessons.length === 0) {
      issues.push('No lessons available for scheduling');
    }

    return {
      canSchedule: issues.length === 0,
      issues
    };
  }
}