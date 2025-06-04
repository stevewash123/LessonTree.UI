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
  ) {
    console.log('[SchedulePersistenceService] Initialized for ScheduleEvent persistence');
  }

  // Load schedules for a course
  loadSchedulesForCourse(courseId: number): Observable<void> {
    return new Observable<void>(observer => {
      this.calendarService.getSchedulesByCourse(courseId).subscribe({
        next: (schedules: Schedule[]) => {
          this.scheduleStateService.setSchedules(schedules);
          
          if (schedules.length > 0) {
            this.scheduleStateService.setSelectedSchedule(schedules[0], false);
            console.log(`[SchedulePersistenceService] Loaded ${schedules.length} schedules for course ${courseId}`);
          } else {
            console.log(`[SchedulePersistenceService] No schedules found for course ${courseId}, creating in-memory schedule`);
            this.scheduleGenerationService.createInMemorySchedule(courseId);
          }
          
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error('[SchedulePersistenceService] Failed to load schedules:', err.message);
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
          console.log(`[SchedulePersistenceService] Selected schedule ${scheduleId}: ${schedule.title}`);
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          console.error('[SchedulePersistenceService] Failed to select schedule:', err.message);
          this.toastr.error('Failed to load selected schedule', 'Error');
          observer.error(err);
        }
      });
    });
  }

  // Save current in-memory schedule - UPDATED for ScheduleEvent
  saveCurrentSchedule(): Observable<Schedule> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule || !this.scheduleStateService.isInMemorySchedule()) {
      console.error('[SchedulePersistenceService] Cannot save: No in-memory schedule available');
      this.toastr.error('No schedule to save', 'Error');
      return of(currentSchedule!);
    }

    console.log('[SchedulePersistenceService] Saving in-memory schedule', {
      scheduleTitle: currentSchedule.title,
      eventCount: currentSchedule.scheduleEvents?.length || 0
    });

    return this.calendarService.createSchedule(currentSchedule).pipe(
      tap((savedSchedule: Schedule) => {
        // Save schedule events separately if they exist
        if (currentSchedule.scheduleEvents?.length) {
          console.log(`[SchedulePersistenceService] Saving ${currentSchedule.scheduleEvents.length} schedule events`);
          return this.calendarService.updateScheduleEvents(savedSchedule.id, currentSchedule.scheduleEvents);
        }
        return of(savedSchedule);
      }),
      tap((completeSchedule: Schedule) => {
        this.updateStateAfterSave(completeSchedule);
        this.toastr.success('Schedule saved successfully', 'Success');
        console.log(`[SchedulePersistenceService] Schedule saved successfully: ${completeSchedule.title}`);
      }),
      catchError((err: any) => {
        console.error('[SchedulePersistenceService] Failed to save schedule:', err.message);
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

    const newLockState = !currentSchedule.isLocked;
    console.log(`[SchedulePersistenceService] Toggling schedule lock to: ${newLockState}`);

    const configUpdate: ScheduleConfigUpdateResource = {
      id: currentSchedule.id,
      title: currentSchedule.title,
      startDate: currentSchedule.startDate,
      endDate: currentSchedule.endDate,
      teachingDays: currentSchedule.teachingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday',
      isLocked: newLockState
    };
  
    return this.calendarService.updateScheduleConfig(configUpdate).pipe(
      tap((savedSchedule: Schedule) => {
        this.scheduleStateService.setSelectedSchedule(savedSchedule, false);
        this.scheduleStateService.updateScheduleInCollection(savedSchedule);
        
        const lockStatus = savedSchedule.isLocked ? 'locked' : 'unlocked';
        this.toastr.success(`Schedule ${lockStatus} successfully`, 'Success');
        console.log(`[SchedulePersistenceService] Schedule ${lockStatus}: ${savedSchedule.title}`);
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
      console.error('[SchedulePersistenceService] Schedule not found or not selected');
      this.toastr.error('Schedule not found', 'Error');
      return of(currentSchedule!);
    }

    console.log('[SchedulePersistenceService] Updating schedule configuration', {
      scheduleId,
      configChanges: Object.keys(config)
    });

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
        console.log(`[SchedulePersistenceService] Schedule configuration updated: ${updatedSchedule.title}`);
      })
    );
  }

  // NEW: Save individual schedule event
  saveScheduleEvent(scheduleEvent: any): Observable<any> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule) {
      console.error('[SchedulePersistenceService] Cannot save event: No schedule selected');
      this.toastr.error('No schedule selected', 'Error');
      return of(null);
    }

    if (this.scheduleStateService.isInMemorySchedule()) {
      // For in-memory schedules, just update state
      this.scheduleStateService.updateScheduleEvent(scheduleEvent);
      this.scheduleStateService.markAsChanged();
      console.log('[SchedulePersistenceService] Updated schedule event in memory');
      return of(scheduleEvent);
    } else {
      // For saved schedules, update via API
      return this.calendarService.updateScheduleEvent(scheduleEvent).pipe(
        tap((savedEvent) => {
          this.scheduleStateService.updateScheduleEvent(savedEvent);
          console.log(`[SchedulePersistenceService] Saved schedule event: Period ${savedEvent.period}`);
        }),
        catchError((err: any) => {
          console.error('[SchedulePersistenceService] Failed to save schedule event:', err.message);
          this.toastr.error('Failed to save event', 'Error');
          throw err;
        })
      );
    }
  }

  // NEW: Delete individual schedule event
  deleteScheduleEvent(eventId: number): Observable<void> {
    if (this.scheduleStateService.isInMemorySchedule()) {
      // For in-memory schedules, just update state
      this.scheduleStateService.removeScheduleEvent(eventId);
      this.scheduleStateService.markAsChanged();
      console.log('[SchedulePersistenceService] Removed schedule event from memory');
      return of(void 0);
    } else {
      // For saved schedules, delete via API
      return this.calendarService.deleteScheduleEvent(eventId).pipe(
        tap(() => {
          this.scheduleStateService.removeScheduleEvent(eventId);
          console.log(`[SchedulePersistenceService] Deleted schedule event: ${eventId}`);
        }),
        catchError((err: any) => {
          console.error('[SchedulePersistenceService] Failed to delete schedule event:', err.message);
          this.toastr.error('Failed to delete event', 'Error');
          throw err;
        })
      );
    }
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

  // NEW: Get persistence statistics for debugging
  getDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    const status = this.getPersistenceStatus();
    
    return {
      ...status,
      selectedScheduleId: currentSchedule?.id || null,
      selectedScheduleTitle: currentSchedule?.title || null,
      eventCount: currentSchedule?.scheduleEvents?.length || 0,
      isInMemorySchedule: this.scheduleStateService.isInMemorySchedule(),
      scheduleVersion: this.scheduleStateService.scheduleVersion()
    };
  }
}