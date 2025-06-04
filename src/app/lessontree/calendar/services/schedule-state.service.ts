// RESPONSIBILITY: Core schedule state management with signals and reactive properties.
// DOES NOT: Generate schedules, save/load data, or handle API calls - pure state management.
// CALLED BY: Calendar components, ScheduleGenerationService, SchedulePersistenceService for state coordination.
import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { format } from 'date-fns';
import { Schedule, ScheduleEvent } from '../../../models/schedule';
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

  // Counter for in-memory event IDs
  private _inMemoryEventIdCounter = -1;

  // Public readonly signals
  readonly schedules = this._schedules.asReadonly();
  readonly selectedSchedule = this._selectedSchedule.asReadonly();
  readonly isInMemorySchedule = this._isInMemorySchedule.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly scheduleVersion = this._scheduleVersion.asReadonly();

  // Computed signals - UPDATED for ScheduleEvent
  readonly canSaveSchedule = computed(() => 
    this._isInMemorySchedule() && this._selectedSchedule() !== null
  );

  readonly currentScheduleEvents = computed(() => 
    this._selectedSchedule()?.scheduleEvents || []
  );

  constructor(private userService: UserService) {
    console.log('[ScheduleStateService] Initialized for ScheduleEvent period-based management');
    
    // Initialize user ID from user service
    this.userService.user$.subscribe(user => {
      this._currentUserId.set(parseId(user?.id || '0') || null);
    });
  }

  // === SCHEDULE MANAGEMENT ===

  setSchedules(schedules: Schedule[]): void {
    this._schedules.set(schedules);
    console.log(`[ScheduleStateService] Set ${schedules.length} schedules`);
  }

  setSelectedSchedule(schedule: Schedule | null, isInMemory: boolean = false): void {
    this._selectedSchedule.set(schedule);
    this._isInMemorySchedule.set(isInMemory);
    this._hasUnsavedChanges.set(false);
    this.incrementScheduleVersion();
    
    console.log('[ScheduleStateService] Selected schedule changed', {
      scheduleId: schedule?.id || null,
      scheduleTitle: schedule?.title || null,
      isInMemory,
      eventCount: schedule?.scheduleEvents?.length || 0
    });
  }

  addSchedule(schedule: Schedule): void {
    const currentSchedules = this._schedules();
    this._schedules.set([...currentSchedules, schedule]);
    console.log(`[ScheduleStateService] Added schedule: ${schedule.title}`);
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
    
    console.log(`[ScheduleStateService] Updated schedule in collection: ${updatedSchedule.title}`);
  }

  // === SCHEDULE EVENT MANAGEMENT ===

  updateScheduleEvent(updatedEvent: ScheduleEvent): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.warn('[ScheduleStateService] Cannot update event: No schedule or events array');
      return;
    }

    const updatedSchedule = { ...currentSchedule };
    if (!updatedSchedule.scheduleEvents) return;
    
    const eventIndex = updatedSchedule.scheduleEvents.findIndex(event => event.id === updatedEvent.id);
    
    if (eventIndex !== -1) {
      updatedSchedule.scheduleEvents[eventIndex] = updatedEvent;
      this._selectedSchedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();
      
      console.log('[ScheduleStateService] Updated schedule event', {
        eventId: updatedEvent.id,
        period: updatedEvent.period,
        date: format(new Date(updatedEvent.date), 'yyyy-MM-dd')
      });
    } else {
      console.warn(`[ScheduleStateService] Event with ID ${updatedEvent.id} not found for update`);
    }
  }

  addScheduleEvent(newEvent: ScheduleEvent): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule) {
      console.warn('[ScheduleStateService] Cannot add event: No schedule selected');
      return;
    }

    const updatedSchedule = { ...currentSchedule };
    updatedSchedule.scheduleEvents = [...(updatedSchedule.scheduleEvents || []), newEvent];
    
    this._selectedSchedule.set(updatedSchedule);
    this.incrementScheduleVersion();
    this.markAsChangedIfInMemory();
    
    console.log('[ScheduleStateService] Added schedule event', {
      eventId: newEvent.id,
      period: newEvent.period,
      date: format(new Date(newEvent.date), 'yyyy-MM-dd'),
      lessonId: newEvent.lessonId,
      specialCode: newEvent.specialCode
    });
  }

  removeScheduleEvent(eventId: number): void {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.warn('[ScheduleStateService] Cannot remove event: No schedule or events array');
      return;
    }

    const updatedSchedule = { ...currentSchedule };
    if (!updatedSchedule.scheduleEvents) return;
    
    const originalLength = updatedSchedule.scheduleEvents.length;
    updatedSchedule.scheduleEvents = updatedSchedule.scheduleEvents.filter(event => event.id !== eventId);
    
    if (updatedSchedule.scheduleEvents.length < originalLength) {
      this._selectedSchedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();
      
      console.log(`[ScheduleStateService] Removed schedule event with ID ${eventId}`);
    } else {
      console.warn(`[ScheduleStateService] Event with ID ${eventId} not found for removal`);
    }
  }

  // === PERIOD-SPECIFIC EVENT MANAGEMENT ===

  getScheduleEventsForDate(date: Date): ScheduleEvent[] {
    const currentSchedule = this._selectedSchedule();
    if (!currentSchedule?.scheduleEvents) return [];

    const targetDateStr = format(date, 'yyyy-MM-dd');
    const eventsForDate = currentSchedule.scheduleEvents.filter(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === targetDateStr;
    });
    
    console.log(`[ScheduleStateService] Found ${eventsForDate.length} events for date ${targetDateStr}`);
    return eventsForDate;
  }

  getScheduleEventForPeriod(date: Date, period: number): ScheduleEvent | null {
    const eventsForDate = this.getScheduleEventsForDate(date);
    const event = eventsForDate.find(event => event.period === period) || null;
    
    if (event) {
      console.log(`[ScheduleStateService] Found event for ${format(date, 'yyyy-MM-dd')} Period ${period}:`, {
        eventId: event.id,
        lessonId: event.lessonId,
        specialCode: event.specialCode
      });
    }
    
    return event;
  }

  updateScheduleEventForPeriod(date: Date, period: number, updates: Partial<ScheduleEvent>): void {
    const existingEvent = this.getScheduleEventForPeriod(date, period);
    
    if (existingEvent) {
      // Update existing event
      const updatedEvent = { ...existingEvent, ...updates };
      this.updateScheduleEvent(updatedEvent);
    } else {
      // Create new event for this period
      const currentSchedule = this._selectedSchedule();
      if (!currentSchedule) {
        console.warn('[ScheduleStateService] Cannot create event: No schedule selected');
        return;
      }

      const newEvent: ScheduleEvent = {
        id: this.generateInMemoryEventId(),
        scheduleId: currentSchedule.id,
        date: new Date(date), // Ensure clean date object
        period,
        lessonId: null,
        specialCode: null,
        comment: null,
        ...updates // Apply provided updates
      };
      
      this.addScheduleEvent(newEvent);
    }
  }

  // Generate negative IDs for in-memory events
  private generateInMemoryEventId(): number {
    return this._inMemoryEventIdCounter--;
  }

  // Check if event exists for specific date and period
  hasScheduleEventForPeriod(date: Date, period: number): boolean {
    return this.getScheduleEventForPeriod(date, period) !== null;
  }

  // Get all periods that have events for a specific date
  getPeriodsWithEventsForDate(date: Date): number[] {
    const eventsForDate = this.getScheduleEventsForDate(date);
    const periods = eventsForDate.map(event => event.period).sort((a, b) => a - b);
    
    console.log(`[ScheduleStateService] Periods with events for ${format(date, 'yyyy-MM-dd')}: ${periods.join(', ')}`);
    return periods;
  }

  // === CHANGE TRACKING ===

  markAsChanged(): void {
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
      this.incrementScheduleVersion();
      console.log('[ScheduleStateService] Marked as changed');
    }
  }

  markAsSaved(): void {
    this._hasUnsavedChanges.set(false);
    this._isInMemorySchedule.set(false);
    console.log('[ScheduleStateService] Marked as saved');
  }

  incrementScheduleVersion(): void {
    const currentVersion = this._scheduleVersion();
    const newVersion = currentVersion + 1;
    this._scheduleVersion.set(newVersion);
    console.log(`[ScheduleStateService] Schedule version incremented to ${newVersion}`);
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

  // Get total number of events in current schedule
  getCurrentScheduleEventCount(): number {
    const events = this.currentScheduleEvents();
    return events.length;
  }

  // Get event count by period for current schedule
  getEventCountByPeriod(): { [period: number]: number } {
    const events = this.currentScheduleEvents();
    const countByPeriod: { [period: number]: number } = {};
    
    events.forEach(event => {
      countByPeriod[event.period] = (countByPeriod[event.period] || 0) + 1;
    });
    
    return countByPeriod;
  }

  // === STATE MANAGEMENT ===

  reset(): void {
    this._schedules.set([]);
    this._selectedSchedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    this._scheduleVersion.set(0);
    this._inMemoryEventIdCounter = -1;
    console.log('[ScheduleStateService] State reset');
  }

  // === BACKWARD COMPATIBILITY METHODS ===

  saveCurrentSchedule(): Observable<Schedule> {
    // This should delegate to SchedulePersistenceService, but kept here for backward compatibility
    // TODO: Update callers to use SchedulePersistenceService directly
    const currentSchedule = this._selectedSchedule();
    if (currentSchedule) {
      console.log('[ScheduleStateService] saveCurrentSchedule called (deprecated - use SchedulePersistenceService)');
      return of(currentSchedule);
    }
    return of({} as Schedule);
  }

  selectScheduleById(scheduleId: number): Observable<void> {
    // This should delegate to SchedulePersistenceService, but kept here for backward compatibility  
    // TODO: Update callers to use SchedulePersistenceService directly
    const schedule = this.getScheduleById(scheduleId);
    if (schedule) {
      console.log(`[ScheduleStateService] selectScheduleById called (deprecated - use SchedulePersistenceService): ${scheduleId}`);
      this.setSelectedSchedule(schedule, false);
    }
    return of(void 0);
  }

  // === DEBUG METHODS ===

  getDebugInfo() {
    const currentSchedule = this._selectedSchedule();
    const events = this.currentScheduleEvents();
    
    return {
      scheduleCount: this._schedules().length,
      selectedScheduleId: currentSchedule?.id || null,
      selectedScheduleTitle: currentSchedule?.title || null,
      isInMemorySchedule: this._isInMemorySchedule(),
      hasUnsavedChanges: this._hasUnsavedChanges(),
      scheduleVersion: this._scheduleVersion(),
      eventCount: events.length,
      eventCountByPeriod: this.getEventCountByPeriod(),
      currentUserId: this._currentUserId(),
      inMemoryEventIdCounter: this._inMemoryEventIdCounter
    };
  }
}