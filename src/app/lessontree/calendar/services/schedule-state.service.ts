// src/app/lessontree/calendar/services/schedule-state.service.ts - COMPLETE FILE
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { set, addDays, format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

import { LessonCalendarService } from './lesson-calendar.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { UserService } from '../../../core/services/user.service';
import { Schedule, ScheduleDay } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { parseId } from '../../../core/utils/type-conversion.utils';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  // Injected services
  private readonly calendarService = inject(LessonCalendarService);
  private readonly courseDataService = inject(CourseDataService);
  private readonly userService = inject(UserService);
  private readonly toastr = inject(ToastrService);

  // State signals
  private readonly _schedules = signal<Schedule[]>([]);
  private readonly _selectedSchedule = signal<Schedule | null>(null);
  private readonly _isInMemorySchedule = signal<boolean>(false);
  private readonly _hasUnsavedChanges = signal<boolean>(false);
  private readonly _currentUserId = signal<number | null>(null);

  // Public read-only signals
  readonly schedules = this._schedules.asReadonly();
  readonly selectedSchedule = this._selectedSchedule.asReadonly();
  readonly isInMemorySchedule = this._isInMemorySchedule.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();

  // Computed signals
  readonly canSaveSchedule = computed(() => 
    this._isInMemorySchedule() && this._selectedSchedule() !== null
  );

  readonly currentScheduleDays = computed(() => 
    this._selectedSchedule()?.scheduleDays || []
  );

  constructor() {
    // Initialize user ID
    this.userService.user$.subscribe(user => {
      this._currentUserId.set(parseId(user?.id || '0') || null);
    });

    console.log('[ScheduleStateService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Load schedules for a course
  loadSchedulesForCourse(courseId: number): Observable<void> {
    console.log(`[ScheduleStateService] Loading schedules for course ID ${courseId}`, { 
      timestamp: new Date().toISOString() 
    });

    return new Observable<void>(observer => {
      this.calendarService.getSchedulesByCourse(courseId).subscribe({
        next: (schedules: Schedule[]) => {
          this._schedules.set(schedules);
          
          if (schedules.length > 0) {
            this.selectSchedule(schedules[0]);
            console.log(`[ScheduleStateService] Loaded ${schedules.length} schedules, selected first`, { 
              timestamp: new Date().toISOString() 
            });
          } else {
            // No schedules available, compute in-memory schedule
            this.createInMemorySchedule(courseId);
          }
          
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error(`[ScheduleStateService] Failed to load schedules: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          
          // Fallback to in-memory schedule
          this.createInMemorySchedule(courseId);
          observer.next();
          observer.complete();
        }
      });
    });
  }

  // Select a specific schedule
  selectScheduleById(scheduleId: number): Observable<void> {
    console.log(`[ScheduleStateService] Selecting schedule ID ${scheduleId}`, { 
      timestamp: new Date().toISOString() 
    });

    return new Observable<void>(observer => {
      this.calendarService.getSchedule(scheduleId).subscribe({
        next: (schedule: Schedule) => {
          this.selectSchedule(schedule);
          console.log(`[ScheduleStateService] Selected schedule ID ${schedule.id}`, { 
            timestamp: new Date().toISOString() 
          });
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error(`[ScheduleStateService] Failed to select schedule: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to load selected schedule', 'Error');
          observer.error(err);
        }
      });
    });
  }

  // Select a schedule (internal method)
  private selectSchedule(schedule: Schedule): void {
    this._selectedSchedule.set(schedule);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
  }

  // Create an in-memory schedule when none exists
  createInMemorySchedule(courseId: number): void {
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      console.error(`[ScheduleStateService] Cannot create in-memory schedule: Course not found`, {
        courseId,
        timestamp: new Date().toISOString()
      });
      this.toastr.error('Cannot create schedule: Course not found', 'Error');
      return;
    }

    // Collect all lessons for the course
    const lessons = this.collectLessonsFromCourse(course);
    
    if (lessons.length === 0) {
      console.warn(`[ScheduleStateService] No lessons found for course ${courseId}`, {
        courseTitle: course.title,
        timestamp: new Date().toISOString()
      });
      this.toastr.warning('No lessons available for scheduling', 'Warning');
    }

    // Generate schedule days
    const scheduleDays = this.generateScheduleDays(lessons);

    // Create the in-memory schedule
    const inMemorySchedule: Schedule = {
      id: 0,
      title: `${course.title} - ${new Date().getFullYear()}`,
      courseId: courseId,
      userId: this._currentUserId() || 0,
      startDate: set(new Date(), { month: 7, date: 1 }), // August 1st
      numSchoolDays: 180,
      teachingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      scheduleDays
    };

    this._selectedSchedule.set(inMemorySchedule);
    this._isInMemorySchedule.set(true);
    this._hasUnsavedChanges.set(false);
    
    console.log(`[ScheduleStateService] Created in-memory schedule`, {
      courseId,
      lessonCount: lessons.length,
      scheduleDaysCount: scheduleDays.length,
      timestamp: new Date().toISOString()
    });
  }

  // Collect lessons from course hierarchy
  private collectLessonsFromCourse(course: any): Lesson[] {
    const lessons: Lesson[] = [];
    
    if (course.topics) {
      for (const topic of course.topics) {
        // Add lessons from topic
        if (topic.lessons) {
          lessons.push(...topic.lessons);
        }
        
        // Add lessons from subtopics
        if (topic.subTopics) {
          for (const subTopic of topic.subTopics) {
            if (subTopic.lessons) {
              lessons.push(...subTopic.lessons);
            }
          }
        }
      }
    }

    // Sort lessons by sortOrder
    return lessons.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Generate schedule days with lesson assignments
  private generateScheduleDays(lessons: Lesson[]): ScheduleDay[] {
    const startDate = set(new Date(), { month: 7, date: 1 }); // August 1st
    const numSchoolDays = 180;
    const teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const scheduleDays: ScheduleDay[] = [];

    // Create schedule days
    let currentDate = new Date(startDate);
    let schoolDaysAdded = 0;
    
    while (schoolDaysAdded < numSchoolDays) {
      const dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'long' });
      if (teachingDays.includes(dayOfWeek)) {
        scheduleDays.push({
          id: -(schoolDaysAdded + 1), // Use negative IDs for in-memory days
          scheduleId: 0,
          date: new Date(currentDate),
          lessonId: null,
          specialCode: null,
          comment: null
        });
        schoolDaysAdded++;
      }
      currentDate = addDays(currentDate, 1);
    }

    // Assign lessons to days
    let lessonIndex = 0;
    const regularSchoolDays = scheduleDays
      .filter(day => !day.specialCode)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (const day of regularSchoolDays) {
      if (lessonIndex < lessons.length) {
        day.lessonId = lessons[lessonIndex].id;
        console.log(`[ScheduleStateService] Assigned lesson to day`, {
          date: format(day.date, 'yyyy-MM-dd'),
          lessonId: day.lessonId,
          lessonTitle: lessons[lessonIndex].title,
          timestamp: new Date().toISOString()
        });
        lessonIndex++;
      }
    }

    return scheduleDays;
  }

  // Save the current in-memory schedule
  saveCurrentSchedule(): Observable<Schedule> {
    const currentSchedule = this._selectedSchedule();
    
    if (!currentSchedule || !this._isInMemorySchedule()) {
      console.error(`[ScheduleStateService] Cannot save: No in-memory schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule to save', 'Error');
      return of(currentSchedule!);
    }

    return new Observable<Schedule>(observer => {
      this.calendarService.createSchedule(currentSchedule).subscribe({
        next: (savedSchedule: Schedule) => {
          // Update state with saved schedule
          this._selectedSchedule.set(savedSchedule);
          this._isInMemorySchedule.set(false);
          this._hasUnsavedChanges.set(false);
          
          // Add to schedules list
          const currentSchedules = this._schedules();
          this._schedules.set([...currentSchedules, savedSchedule]);
          
          console.log(`[ScheduleStateService] Saved schedule ID ${savedSchedule.id}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Schedule saved successfully', 'Success');
          
          observer.next(savedSchedule);
          observer.complete();
        },
        error: (err: any) => {
          console.error(`[ScheduleStateService] Failed to save schedule: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to save schedule', 'Error');
          observer.error(err);
        }
      });
    });
  }

  // Update a schedule day in current schedule
  updateScheduleDay(updatedDay: ScheduleDay): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule || !currentSchedule.scheduleDays) return;

    const updatedSchedule = { ...currentSchedule };
    
    // Ensure scheduleDays array exists
    if (!updatedSchedule.scheduleDays) {
      updatedSchedule.scheduleDays = [];
    }
    
    const dayIndex = updatedSchedule.scheduleDays.findIndex(day => day.id === updatedDay.id);
    
    if (dayIndex !== -1) {
      updatedSchedule.scheduleDays[dayIndex] = updatedDay;
      this._selectedSchedule.set(updatedSchedule);
      
      if (this._isInMemorySchedule()) {
        this._hasUnsavedChanges.set(true);
      }
      
      console.log(`[ScheduleStateService] Updated schedule day ID ${updatedDay.id}`, { 
        timestamp: new Date().toISOString() 
      });
    }
  }

  // Add a schedule day to current schedule
  addScheduleDay(newDay: ScheduleDay): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule) return;

    const updatedSchedule = { ...currentSchedule };
    updatedSchedule.scheduleDays = [...(updatedSchedule.scheduleDays || []), newDay];
    
    this._selectedSchedule.set(updatedSchedule);
    
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
    }
    
    console.log(`[ScheduleStateService] Added schedule day ID ${newDay.id}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  // Remove a schedule day from current schedule
  removeScheduleDay(dayId: number): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule || !currentSchedule.scheduleDays) return;

    const updatedSchedule = { ...currentSchedule };
    
    // Ensure scheduleDays array exists
    if (!updatedSchedule.scheduleDays) {
      updatedSchedule.scheduleDays = [];
      return;
    }
    
    updatedSchedule.scheduleDays = updatedSchedule.scheduleDays.filter(day => day.id !== dayId);
    
    this._selectedSchedule.set(updatedSchedule);
    
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
    }
    
    console.log(`[ScheduleStateService] Removed schedule day ID ${dayId}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  // Mark schedule as having unsaved changes
  markAsChanged(): void {
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
    }
  }

  // Reset state (useful for cleanup)
  reset(): void {
    this._schedules.set([]);
    this._selectedSchedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    
    console.log('[ScheduleStateService] State reset', { timestamp: new Date().toISOString() });
  }
}