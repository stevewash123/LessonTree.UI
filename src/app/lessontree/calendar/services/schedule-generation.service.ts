// RESPONSIBILITY: Generates in-memory schedules from course data and lesson hierarchies with period assignment matching.
// DOES NOT: Manage state, save data, or handle UI - pure schedule generation logic.
// CALLED BY: SchedulePersistenceService when no saved schedules exist for a course.
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { CourseDataService } from '../../../core/services/course-data.service';
import { ScheduleStateService } from './schedule-state.service';
import { Schedule, ScheduleEvent, PeriodAssignment } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { Course } from '../../../models/course';
import { UserService } from '../../../core/services/user.service';

// Constants for default schedule configuration
const DEFAULT_TEACHING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SCHOOL_YEAR_START_MONTH = 7; // August (0-indexed)
const SCHOOL_YEAR_START_DAY = 1;
const SCHOOL_YEAR_END_MONTH = 5; // June (0-indexed) 
const SCHOOL_YEAR_END_DAY = 15;

@Injectable({
  providedIn: 'root'
})
export class ScheduleGenerationService {

  constructor(
    private courseDataService: CourseDataService,
    private userService: UserService,
    private scheduleStateService: ScheduleStateService,
    private toastr: ToastrService
  ) {}

  // Create an in-memory schedule for a course with period assignment matching
  createInMemorySchedule(courseId: number): void {
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      console.error('[ScheduleGeneration] Course not found:', courseId);
      this.toastr.error('Cannot create schedule: Course not found', 'Error');
      return;
    }

    const teachingConfig = this.userService.getTeachingConfig();
    if (!teachingConfig) {
      console.error('[ScheduleGeneration] No teaching configuration available');
      this.toastr.error('Cannot create schedule: No teaching configuration found', 'Error');
      return;
    }

    // Find periods assigned to this course
    const assignedPeriods = this.getPeriodsAssignedToCourse(courseId, teachingConfig.periodAssignments);
    if (assignedPeriods.length === 0) {
      console.warn('[ScheduleGeneration] No periods assigned to this course', { courseId });
      this.toastr.warning('No periods assigned to this course', 'Warning');
      return;
    }

    const lessons = this.collectLessonsFromCourse(course);
    if (lessons.length === 0) {
      this.toastr.warning('No lessons available for scheduling', 'Warning');
    }

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
      userId: this.scheduleStateService.getCurrentUserId() || 0,
      startDate,
      endDate,
      teachingDays: DEFAULT_TEACHING_DAYS.join(','),
      isLocked: false,
      scheduleEvents
    };

    console.log('[ScheduleGeneration] Created in-memory schedule', {
      courseId,
      courseName: course.title,
      lessonCount: lessons.length,
      assignedPeriods: assignedPeriods.map(p => p.period).join(', '),
      totalEvents: scheduleEvents.length,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    });

    this.scheduleStateService.setSelectedSchedule(inMemorySchedule, true);
  }

  // Get periods assigned to the specified course
  private getPeriodsAssignedToCourse(courseId: number, periodAssignments: PeriodAssignment[]): PeriodAssignment[] {
    const assigned = periodAssignments.filter(assignment => assignment.courseId === courseId);
    
    // Sort by period number for consistent lesson distribution
    assigned.sort((a, b) => a.period - b.period);
    
    console.log('[ScheduleGeneration] Found assigned periods', {
      courseId,
      periods: assigned.map(p => `Period ${p.period} (${p.room || 'no room'})`).join(', ')
    });
    
    return assigned;
  }

  // Collect lessons from course hierarchy in proper order (unchanged)
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
      console.error('[ScheduleGeneration] Invalid date range');
      return scheduleEvents;
    }
    
    console.log('[ScheduleGeneration] Generating events', {
      lessonCount: lessons.length,
      assignedPeriodsCount: assignedPeriods.length,
      periodsDetails: assignedPeriods.map(p => `P${p.period}`).join(', '),
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    });
    
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
    
    console.log('[ScheduleGeneration] Generated schedule events', {
      totalEvents: scheduleEvents.length,
      lessonsUsed: lessonIndex,
      errorDays: scheduleEvents.filter(e => e.specialCode === 'Error Day').length
    });
    
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
      console.log('[ScheduleGeneration] Assigned lesson to period', {
        date: date.toISOString().split('T')[0],
        period,
        lessonIndex,
        lessonId,
        lessonTitle: lessons[lessonIndex].title
      });
    } else {
      specialCode = 'Error Day';
      comment = 'No lesson assigned - schedule needs more content';
      console.log('[ScheduleGeneration] Created error day for period', {
        date: date.toISOString().split('T')[0],
        period,
        lessonIndex,
        totalLessons: lessons.length
      });
    }
    
    return {
      id: eventId,
      scheduleId: 0,
      date: new Date(date), // Ensure clean date object
      period,
      lessonId,
      specialCode,
      comment
    };
  }

  // Get default date range for current school year (unchanged)
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