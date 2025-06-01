// RESPONSIBILITY: Generates in-memory schedules from course data and lesson hierarchies.
// DOES NOT: Manage state, save data, or handle UI - pure schedule generation logic.
// CALLED BY: SchedulePersistenceService when no saved schedules exist for a course.
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { CourseDataService } from '../../../core/services/course-data.service';
import { ScheduleStateService } from './schedule-state.service';
import { Schedule, ScheduleDay } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { Course } from '../../../models/course';

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
    private scheduleStateService: ScheduleStateService,
    private toastr: ToastrService
  ) {}

  // Create an in-memory schedule for a course
  createInMemorySchedule(courseId: number): void {
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      console.error('[ScheduleGeneration] Course not found:', courseId);
      this.toastr.error('Cannot create schedule: Course not found', 'Error');
      return;
    }

    const lessons = this.collectLessonsFromCourse(course);
    if (lessons.length === 0) {
      this.toastr.warning('No lessons available for scheduling', 'Warning');
    }

    const { startDate, endDate } = this.getDefaultDateRange();
    const scheduleDays = this.generateScheduleDays(lessons, startDate, endDate, DEFAULT_TEACHING_DAYS);

    const inMemorySchedule: Schedule = {
      id: 0,
      title: `${course.title} - ${startDate.getFullYear()}`,
      courseId: courseId,
      userId: this.scheduleStateService.getCurrentUserId() || 0,
      startDate,
      endDate,
      teachingDays: DEFAULT_TEACHING_DAYS.join(','),
      isLocked: false,
      scheduleDays
    };

    this.scheduleStateService.setSelectedSchedule(inMemorySchedule, true);
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

  // Generate schedule days from lessons and date range
  generateScheduleDays(
    lessons: Lesson[], 
    startDate: Date, 
    endDate: Date, 
    teachingDays: string[]
  ): ScheduleDay[] {
    const scheduleDays: ScheduleDay[] = [];
    let lessonIndex = 0;
    
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    
    if (startDate >= endDate) {
      console.error('[ScheduleGeneration] Invalid date range');
      return scheduleDays;
    }
    
    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (teachingDays.includes(dayName)) {
        const scheduleDay = this.createScheduleDay(
          scheduleDays.length,
          new Date(currentDate),
          lessons,
          lessonIndex
        );
        
        scheduleDays.push(scheduleDay);
        
        if (scheduleDay.lessonId) {
          lessonIndex++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return scheduleDays;
  }

  // Create a single schedule day
  private createScheduleDay(
    index: number,
    date: Date,
    lessons: Lesson[],
    lessonIndex: number
  ): ScheduleDay {
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
      id: -(index + 1), // Negative for in-memory
      scheduleId: 0,
      date,
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

  // REMOVED: Dead code methods
  // - getDefaultTeachingDays() - use constant instead
  // - calculateTeachingDaysCount() - unused
  // - validateGenerationParameters() - overly complex and unused
}