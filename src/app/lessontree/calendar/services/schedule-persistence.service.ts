// RESPONSIBILITY: Handles schedule persistence operations, loading, saving, and API coordination.
// DOES NOT: Generate schedules, manage state directly, or handle UI - pure persistence layer.
// CALLED BY: Calendar components and controls for schedule CRUD operations.
import { Injectable } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { LessonCalendarService } from './lesson-calendar.service';
import { ScheduleStateService } from './schedule-state.service';
import { ScheduleGenerationService } from './schedule-generation.service';
import { Schedule, ScheduleConfigUpdateResource } from '../../../models/schedule';

@Injectable({
  providedIn: 'root'
})
export class SchedulePersistenceService {

  constructor(
    private calendarService: LessonCalendarService,
    private scheduleStateService: ScheduleStateService,
    private scheduleGenerationService: ScheduleGenerationService,
    private toastr: ToastrService
  ) {}

  // Load schedules for a course
  loadSchedulesForCourse(courseId: number): Observable<void> {
    return new Observable<void>(observer => {
      this.calendarService.getSchedulesByCourse(courseId).subscribe({
        next: (schedules: Schedule[]) => {
          this.scheduleStateService.setSchedules(schedules);
          
          if (schedules.length > 0) {
            this.scheduleStateService.setSelectedSchedule(schedules[0], false);
          } else {
            this.scheduleGenerationService.createInMemorySchedule(courseId);
          }
          
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error('[SchedulePersistence] Failed to load schedules:', err.message);
          this.scheduleGenerationService.createInMemorySchedule(courseId);
          observer.next();
          observer.complete();
        }
      });
    });
  }

  // Select a specific schedule by ID
  selectScheduleById(scheduleId: number): Observable<void> {
    return new Observable<void>(observer => {
      this.calendarService.getSchedule(scheduleId).subscribe({
        next: (schedule: Schedule) => {
          this.scheduleStateService.setSelectedSchedule(schedule, false);
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error('[SchedulePersistence] Failed to select schedule:', err.message);
          this.toastr.error('Failed to load selected schedule', 'Error');
          observer.error(err);
        }
      });
    });
  }

  // Save current in-memory schedule
  saveCurrentSchedule(): Observable<Schedule> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule || !this.scheduleStateService.isInMemorySchedule()) {
      console.error('[SchedulePersistence] Cannot save: No in-memory schedule available');
      this.toastr.error('No schedule to save', 'Error');
      return of(currentSchedule!);
    }

    return this.calendarService.createSchedule(currentSchedule).pipe(
      tap((savedSchedule: Schedule) => {
        if (currentSchedule.scheduleDays?.length) {
          // Save schedule days separately
          return this.calendarService.updateScheduleDays(savedSchedule.id, currentSchedule.scheduleDays);
        }
        return of(savedSchedule);
      }),
      tap((completeSchedule: Schedule) => {
        this.updateStateAfterSave(completeSchedule);
        this.toastr.success('Schedule saved successfully', 'Success');
      }),
      catchError((err: any) => {
        console.error('[SchedulePersistence] Failed to save schedule:', err.message);
        this.toastr.error('Failed to save schedule', 'Error');
        throw err;
      })
    );
  }

  // Toggle schedule lock/unlock
  toggleScheduleLock(): Observable<Schedule | null> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule || this.scheduleStateService.isInMemorySchedule()) {
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
        this.scheduleStateService.setSelectedSchedule(savedSchedule, false);
        this.scheduleStateService.updateScheduleInCollection(savedSchedule);
        
        const lockStatus = savedSchedule.isLocked ? 'locked' : 'unlocked';
        this.toastr.success(`Schedule ${lockStatus} successfully`, 'Success');
      })
    );
  }

  // Update schedule configuration (title, dates, teaching days)
  updateScheduleConfig(
    scheduleId: number,
    config: Partial<ScheduleConfigUpdateResource>
  ): Observable<Schedule> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule || currentSchedule.id !== scheduleId) {
      console.error('[SchedulePersistence] Schedule not found or not selected');
      this.toastr.error('Schedule not found', 'Error');
      return of(currentSchedule!);
    }

    const fullConfig: ScheduleConfigUpdateResource = {
      id: scheduleId,
      title: config.title || currentSchedule.title,
      startDate: config.startDate || currentSchedule.startDate,
      endDate: config.endDate || currentSchedule.endDate,
      teachingDays: config.teachingDays || currentSchedule.teachingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday',
      isLocked: !!(config.isLocked ?? currentSchedule.isLocked)
    };

    return this.calendarService.updateScheduleConfig(fullConfig).pipe(
      tap((updatedSchedule: Schedule) => {
        this.scheduleStateService.setSelectedSchedule(updatedSchedule, false);
        this.scheduleStateService.updateScheduleInCollection(updatedSchedule);
        this.toastr.success('Schedule updated successfully', 'Success');
      })
    );
  }

  // Helper method to update state after successful save
  private updateStateAfterSave(savedSchedule: Schedule): void {
    this.scheduleStateService.setSelectedSchedule(savedSchedule, false);
    this.scheduleStateService.markAsSaved();
    this.scheduleStateService.addSchedule(savedSchedule);
  }

  // Get persistence status for current schedule
  getPersistenceStatus(): {
    canSave: boolean;
    canLock: boolean;
    isLocked: boolean;
    hasUnsavedChanges: boolean;
  } {
    const selectedSchedule = this.scheduleStateService.selectedSchedule();
    const isInMemory = this.scheduleStateService.isInMemorySchedule();
    const hasUnsavedChanges = this.scheduleStateService.hasUnsavedChanges();

    return {
      canSave: isInMemory && selectedSchedule !== null,
      canLock: !isInMemory && selectedSchedule !== null,
      isLocked: selectedSchedule?.isLocked || false,
      hasUnsavedChanges
    };
  }
}