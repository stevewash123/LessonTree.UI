// RESPONSIBILITY: Core schedule state management with signals and reactive properties.
// DOES NOT: Generate schedules, save/load data, or handle API calls - pure state management.
// CALLED BY: Calendar components, ScheduleGenerationService, SchedulePersistenceService for state coordination.
import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Schedule, ScheduleDay } from '../../../models/schedule';
import { UserService } from '../../../core/services/user.service';
import { parseId } from '../../../core/utils/type-conversion.utils';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  // Private state signals
  private readonly _schedules = signal<Schedule[]>([]);
  private readonly _selectedSchedule = signal<Schedule | null>(null);
  private readonly _isInMemorySchedule = signal<boolean>(false);
  private readonly _hasUnsavedChanges = signal<boolean>(false);
  private readonly _scheduleVersion = signal<number>(0);

  private readonly _currentUserId = signal<number | null>(null);

  // Public readonly signals
  readonly schedules = this._schedules.asReadonly();
  readonly selectedSchedule = this._selectedSchedule.asReadonly();
  readonly isInMemorySchedule = this._isInMemorySchedule.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly scheduleVersion = this._scheduleVersion.asReadonly();

  // Computed signals
  readonly canSaveSchedule = computed(() => 
    this._isInMemorySchedule() && this._selectedSchedule() !== null
  );

  readonly currentScheduleDays = computed(() => 
    this._selectedSchedule()?.scheduleDays || []
  );

  constructor(private userService: UserService) {
    // Initialize user ID from user service
    this.userService.user$.subscribe(user => {
      this._currentUserId.set(parseId(user?.id || '0') || null);
    });
  }

  // === SCHEDULE MANAGEMENT ===

  setSchedules(schedules: Schedule[]): void {
    this._schedules.set(schedules);
  }

  setSelectedSchedule(schedule: Schedule | null, isInMemory: boolean = false): void {
    this._selectedSchedule.set(schedule);
    this._isInMemorySchedule.set(isInMemory);
    this._hasUnsavedChanges.set(false);
    this.incrementScheduleVersion();
  }

  addSchedule(schedule: Schedule): void {
    const currentSchedules = this._schedules();
    this._schedules.set([...currentSchedules, schedule]);
  }

  updateScheduleInCollection(updatedSchedule: Schedule): void {
    const currentSchedules = this._schedules();
    const updatedSchedules = currentSchedules.map(s => 
      s.id === updatedSchedule.id ? updatedSchedule : s
    );
    this._schedules.set(updatedSchedules);
    
    // Update selected schedule if it matches
    const selectedSchedule = this._selectedSchedule();
    if (selectedSchedule && selectedSchedule.id === updatedSchedule.id) {
      this._selectedSchedule.set(updatedSchedule);
    }
  }

  // === SCHEDULE DAY MANAGEMENT ===

  updateScheduleDay(updatedDay: ScheduleDay): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule?.scheduleDays) return;

    const updatedSchedule = { ...currentSchedule };
    // Ensure scheduleDays exists
    if (!updatedSchedule.scheduleDays) return;
    
    const dayIndex = updatedSchedule.scheduleDays.findIndex(day => day.id === updatedDay.id);
    
    if (dayIndex !== -1) {
      updatedSchedule.scheduleDays[dayIndex] = updatedDay;
      this._selectedSchedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();
    }
  }

  addScheduleDay(newDay: ScheduleDay): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule) return;

    const updatedSchedule = { ...currentSchedule };
    updatedSchedule.scheduleDays = [...(updatedSchedule.scheduleDays || []), newDay];
    
    this._selectedSchedule.set(updatedSchedule);
    this.incrementScheduleVersion();
    this.markAsChangedIfInMemory();
  }

  removeScheduleDay(dayId: number): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule?.scheduleDays) return;

    const updatedSchedule = { ...currentSchedule };
    // Ensure scheduleDays exists
    if (!updatedSchedule.scheduleDays) return;
    
    updatedSchedule.scheduleDays = updatedSchedule.scheduleDays.filter(day => day.id !== dayId);
    
    this._selectedSchedule.set(updatedSchedule);
    this.incrementScheduleVersion();
    this.markAsChangedIfInMemory();
  }

  // === CHANGE TRACKING ===

  // Mark schedule as having unsaved changes (used by other services)
  markAsChanged(): void {
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
      this.incrementScheduleVersion();
    }
  }

  markAsSaved(): void {
    this._hasUnsavedChanges.set(false);
    this._isInMemorySchedule.set(false);
  }

  incrementScheduleVersion(): void {
    const currentVersion = this._scheduleVersion();
    this._scheduleVersion.set(currentVersion + 1);
  }

  private markAsChangedIfInMemory(): void {
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
    }
  }

  // === GETTERS ===

  getCurrentUserId(): number | null {
    return this._currentUserId();
  }

  getScheduleById(scheduleId: number): Schedule | null {
    return this._schedules().find(s => s.id === scheduleId) || null;
  }

  // === STATE MANAGEMENT ===

  reset(): void {
    this._schedules.set([]);
    this._selectedSchedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    this._scheduleVersion.set(0);
  }

  // RESTORED: Public methods used by other services
  saveCurrentSchedule(): Observable<Schedule> {
    // This should delegate to SchedulePersistenceService, but kept here for backward compatibility
    // TODO: Update callers to use SchedulePersistenceService directly
    const currentSchedule = this._selectedSchedule();
    if (currentSchedule) {
      return of(currentSchedule);
    }
    return of({} as Schedule);
  }

  selectScheduleById(scheduleId: number): Observable<void> {
    // This should delegate to SchedulePersistenceService, but kept here for backward compatibility  
    // TODO: Update callers to use SchedulePersistenceService directly
    const schedule = this.getScheduleById(scheduleId);
    if (schedule) {
      this.setSelectedSchedule(schedule, false);
    }
    return of(void 0);
  }

  // REMOVED: Dead code methods
  // - getStateSnapshot() - debugging method not used in production
}