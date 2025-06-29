// RESPONSIBILITY: Creates schedule events for different period assignment types
// DOES NOT: Transform events, manage state, or handle course data directly
// CALLED BY: ScheduleGenerationService for event creation during schedule generation

import { Injectable } from '@angular/core';
import { Lesson } from '../../../models/lesson';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { PeriodCourseAssignment, PeriodAssignment } from '../../../models/period-assignment';
import { ScheduleEvent, EventCategories, EventTypes } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleEventFactoryService {

  constructor(private courseDataService: CourseDataService) {
    console.log('[ScheduleEventFactoryService] Initialized for schedule event creation');
  }

  // Generate events for a specific period-course combination
  generateEventsForPeriodCourse(
    periodCourseAssignment: PeriodCourseAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingEventId: number
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = startingEventId;
    let lessonIndex = 0;

    // Get course and lessons using CourseDataService
    const course = this.courseDataService.getCourseById(periodCourseAssignment.courseId);
    if (!course) {
      console.warn(`[ScheduleEventFactoryService] Course ${periodCourseAssignment.courseId} not found for period ${periodCourseAssignment.period}`);
      return events;
    }

    // Use CourseDataService method for lesson collection
    const lessons = this.courseDataService.collectLessonsFromCourse(course);
    console.log(`[ScheduleEventFactoryService] Found ${lessons.length} lessons for course ${course.title} in period ${periodCourseAssignment.period}`);

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
  generateEventsForSpecialPeriod(
    specialPeriod: PeriodAssignment,
    startDate: Date,
    endDate: Date,
    teachingDays: string[],
    startingEventId: number
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    let eventId = startingEventId;

    if (!specialPeriod.specialPeriodType) {
      console.warn(`[ScheduleEventFactoryService] Special period ${specialPeriod.period} has no specialPeriodType`);
      return events;
    }

    // Generate recurring events for each teaching day
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
  generateEventsForUnassignedPeriod(
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
}
