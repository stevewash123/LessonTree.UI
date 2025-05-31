// RESPONSIBILITY: Manages schedule state, in-memory schedule generation, and schedule day operations.
// DOES NOT: Handle UI interactions or direct API calls - pure state management with API coordination.
// CALLED BY: LessonCalendarComponent, ScheduleControlsComponent, and ScheduleDayService for schedule operations.
import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { set, addDays, format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

import { LessonCalendarService } from './lesson-calendar.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { UserService } from '../../../core/services/user.service';
import { Schedule, ScheduleConfigUpdateResource, ScheduleDay } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { parseId } from '../../../core/utils/type-conversion.utils';
import { Course } from '../../../models/course';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  // Private state signals
  private readonly _schedules = signal<Schedule[]>([]);
  private readonly _selectedSchedule = signal<Schedule | null>(null);
  private readonly _isInMemorySchedule = signal<boolean>(false);
  private readonly _hasUnsavedChanges = signal<boolean>(false);
  private readonly _currentUserId = signal<number | null>(null);
  
  // NEW: Signal to trigger calendar refresh when schedule days change
  private readonly _scheduleVersion = signal<number>(0);

  // Public readonly signals
  readonly schedules = this._schedules.asReadonly();
  readonly selectedSchedule = this._selectedSchedule.asReadonly();
  readonly isInMemorySchedule = this._isInMemorySchedule.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  
  // NEW: Expose schedule version for calendar coordination
  readonly scheduleVersion = this._scheduleVersion.asReadonly();

  // Computed signals
  readonly canSaveSchedule = computed(() => 
    this._isInMemorySchedule() && this._selectedSchedule() !== null
  );

  readonly currentScheduleDays = computed(() => 
    this._selectedSchedule()?.scheduleDays || []
  );

  constructor(
    private calendarService: LessonCalendarService,
    private courseDataService: CourseDataService,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    console.log('[ScheduleStateService] Initialized with constructor injection', { 
      timestamp: new Date().toISOString() 
    });

    // Initialize user ID
    this.userService.user$.subscribe(user => {
      this._currentUserId.set(parseId(user?.id || '0') || null);
    });
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
    this.incrementScheduleVersion(); // Trigger calendar refresh
  }

  // Create an in-memory schedule when none exists
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

    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 7, 1); // August 1st current year 
    const endDate = new Date(currentYear + 1, 5, 15); // June 15th NEXT year
    const teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    

    // Generate schedule days
    const scheduleDays = this.generateScheduleDaysFromDateRange(lessons, startDate, endDate, teachingDays);

    const inMemorySchedule: Schedule = {
        id: 0,
        title: `${course.title} - ${new Date().getFullYear()}`,
        courseId: courseId,
        userId: this._currentUserId() || 0,
        startDate,
        endDate,  // ← Changed from numSchoolDays
        teachingDays: teachingDays.join(','),  // ← New
        isLocked: false,
        scheduleDays
    };

    this._selectedSchedule.set(inMemorySchedule);
    this._isInMemorySchedule.set(true);
    this._hasUnsavedChanges.set(false);
    this.incrementScheduleVersion(); // Trigger calendar refresh
    
    console.log(`[ScheduleStateService] Created in-memory schedule`, {
      courseId,
      lessonCount: lessons.length,
      scheduleDaysCount: scheduleDays.length,
      timestamp: new Date().toISOString()
    });
  }

  // Collect lessons from course hierarchy
  private collectLessonsFromCourse(course: Course): Lesson[] {
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

  private generateScheduleDaysFromDateRange(
    lessons: Lesson[], 
    startDate: Date, 
    endDate: Date, 
    teachingDays: string[]
  ): ScheduleDay[] {
    const scheduleDays: ScheduleDay[] = [];
    let lessonIndex = 0;
    
    // Create new date objects to avoid mutation
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    
    console.log(`[ScheduleStateService] DEBUG: generateScheduleDaysFromDateRange called with:`, {
      startDateParam: startDate.toISOString(),
      endDateParam: endDate.toISOString(),
      startDateFormatted: format(startDate, 'yyyy-MM-dd'),
      endDateFormatted: format(endDate, 'yyyy-MM-dd'),
      currentDateCopy: currentDate.toISOString(),
      finalDateCopy: finalDate.toISOString(),
      lessonCount: lessons.length,
      teachingDays,
      dateRangeValid: startDate < endDate ? 'VALID' : 'INVALID',
      timestamp: new Date().toISOString()
    });
    
    if (startDate >= endDate) {
      console.error(`[ScheduleStateService] ERROR: Invalid date range - start date is not before end date`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timestamp: new Date().toISOString()
      });
      return scheduleDays;
    }
    
    while (currentDate <= finalDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (teachingDays.includes(dayName)) {
        let lessonId: number | null = null;
        let specialCode: string | null = null;
        let comment: string | null = null;
        
        if (lessonIndex < lessons.length) {
          // Assign lesson to this day
          lessonId = lessons[lessonIndex].id;
          lessonIndex++;
        } else {
          // No more lessons available - create Error Day for UI display
          specialCode = 'Error Day';
          comment = 'No lesson assigned - schedule needs more content';
        }
        
        scheduleDays.push({
          id: -(scheduleDays.length + 1), // Negative for in-memory
          scheduleId: 0,
          date: new Date(currentDate), // Create new date object
          lessonId,
          specialCode,
          comment
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`[ScheduleStateService] Generated ${scheduleDays.length} schedule days`, {
      lessonDays: scheduleDays.filter(d => d.lessonId).length,
      errorDays: scheduleDays.filter(d => d.specialCode === 'Error Day').length,
      timestamp: new Date().toISOString()
    });
    
    return scheduleDays;
  }

  private parseTeachingDays(teachingDaysStr: string): string[] {
    if (!teachingDaysStr) return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return teachingDaysStr.split(',').map(day => day.trim());
  }
  
  // NEW: Toggle schedule lock using config endpoint
  toggleScheduleLock(): Observable<Schedule | null> {
    const currentSchedule = this._selectedSchedule();
    
    if (!currentSchedule || this._isInMemorySchedule()) {
      console.warn('[ScheduleStateService] Cannot toggle lock - no saved schedule selected');
      this.toastr.warning('Can only lock saved schedules', 'Warning');
      return of(null);
    }
  
    const configUpdate: ScheduleConfigUpdateResource = {
      id: currentSchedule.id,
      title: currentSchedule.title,
      startDate: currentSchedule.startDate,
      endDate: currentSchedule.endDate,
      teachingDays: currentSchedule.teachingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday',
      isLocked: !currentSchedule.isLocked
    };
  
    return this.calendarService.updateScheduleConfig(configUpdate).pipe(
      tap((savedSchedule: Schedule) => {
        this._selectedSchedule.set(savedSchedule);
        
        const currentSchedules = this._schedules();
        const updatedSchedules = currentSchedules.map(s => 
          s.id === savedSchedule.id ? savedSchedule : s
        );
        this._schedules.set(updatedSchedules);
        
        const lockStatus = savedSchedule.isLocked ? 'locked' : 'unlocked';
        this.toastr.success(`Schedule ${lockStatus} successfully`, 'Success');
      })
    );
  }
  
  // UPDATE: Save schedule using the days endpoint
  saveCurrentSchedule(): Observable<Schedule> {
    const currentSchedule = this._selectedSchedule();
    
    if (!currentSchedule || !this._isInMemorySchedule()) {
      console.error(`[ScheduleStateService] Cannot save: No in-memory schedule available`);
      this.toastr.error('No schedule to save', 'Error');
      return of(currentSchedule!);
    }
  
    return new Observable<Schedule>(observer => {
      // First create the schedule (without days)
      this.calendarService.createSchedule(currentSchedule).subscribe({
        next: (savedSchedule: Schedule) => {
          // Then save the schedule days
          if (currentSchedule.scheduleDays && currentSchedule.scheduleDays.length > 0) {
            this.calendarService.updateScheduleDays(savedSchedule.id, currentSchedule.scheduleDays).subscribe({
              next: (completeSchedule: Schedule) => {
                this._selectedSchedule.set(completeSchedule);
                this._isInMemorySchedule.set(false);
                this._hasUnsavedChanges.set(false);
                
                const currentSchedules = this._schedules();
                this._schedules.set([...currentSchedules, completeSchedule]);
                
                this.toastr.success('Schedule saved successfully', 'Success');
                observer.next(completeSchedule);
                observer.complete();
              },
              error: (err: any) => {
                console.error(`[ScheduleStateService] Failed to save schedule days: ${err.message}`);
                this.toastr.error('Failed to save schedule days', 'Error');
                observer.error(err);
              }
            });
          } else {
            // No schedule days to save
            this._selectedSchedule.set(savedSchedule);
            this._isInMemorySchedule.set(false);
            this._hasUnsavedChanges.set(false);
            
            observer.next(savedSchedule);
            observer.complete();
          }
        },
        error: (err: any) => {
          console.error(`[ScheduleStateService] Failed to create schedule: ${err.message}`);
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
      this.incrementScheduleVersion(); // Trigger calendar refresh
      
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
    this.incrementScheduleVersion(); // Trigger calendar refresh
    
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
    this.incrementScheduleVersion(); // Trigger calendar refresh
    
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
      this.incrementScheduleVersion(); // Trigger calendar refresh
    }
  }

  private incrementScheduleVersion(): void {
    const currentVersion = this._scheduleVersion();
    this._scheduleVersion.set(currentVersion + 1);
    console.log(`[ScheduleStateService] Schedule version incremented to ${currentVersion + 1}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  // Reset state (useful for cleanup)
  reset(): void {
    this._schedules.set([]);
    this._selectedSchedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    this._scheduleVersion.set(0);
    
    console.log('[ScheduleStateService] State reset', { timestamp: new Date().toISOString() });
  }
}