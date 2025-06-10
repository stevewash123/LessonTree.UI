// RESPONSIBILITY: Core master schedule state management with signals and reactive properties.
// DOES NOT: Generate schedules, save/load data, handle API calls, or manage user state - pure schedule state management.
// CALLED BY: Calendar components, ScheduleGenerationService, SchedulePersistenceService for state coordination.
import { Injectable, signal, computed } from '@angular/core';
import { format } from 'date-fns';
import { Schedule } from '../../../models/schedule';
import { ScheduleEvent } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  // Private state signals
  private readonly _masterSchedule = signal<Schedule | null>(null);
  private readonly _isInMemorySchedule = signal<boolean>(false);
  private readonly _hasUnsavedChanges = signal<boolean>(false);
  private readonly _scheduleVersion = signal<number>(0);

  // Counter for in-memory event IDs
  private _inMemoryEventIdCounter = -1;

  // Public readonly signals
  readonly masterSchedule = this._masterSchedule.asReadonly();
  readonly isInMemorySchedule = this._isInMemorySchedule.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly scheduleVersion = this._scheduleVersion.asReadonly();

  // Computed signals for master schedule
  readonly canSaveSchedule = computed(() => 
    this._isInMemorySchedule() && this._masterSchedule() !== null
  );

  readonly currentScheduleEvents = computed(() => 
    this._masterSchedule()?.scheduleEvents || []
  );

  readonly hasActiveSchedule = computed(() => 
    this._masterSchedule() !== null
  );

  readonly scheduleTitle = computed(() => 
    this._masterSchedule()?.title || 'No Schedule'
  );

  constructor() {
    console.log('[ScheduleStateService] Initialized for master schedule state management');
  }

  // === MASTER SCHEDULE MANAGEMENT ===

  setMasterSchedule(schedule: Schedule | null, isInMemory: boolean = false): void {
    this._masterSchedule.set(schedule);
    this._isInMemorySchedule.set(isInMemory);
    this._hasUnsavedChanges.set(false);
    this.incrementScheduleVersion();
    
    console.log('[ScheduleStateService] Master schedule changed', {
      scheduleId: schedule?.id || null,
      scheduleTitle: schedule?.title || null,
      isInMemory,
      eventCount: schedule?.scheduleEvents?.length || 0
    });
  }

  getMasterSchedule(): Schedule | null {
    return this._masterSchedule();
  }

  clearMasterSchedule(): void {
    this._masterSchedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    console.log('[ScheduleStateService] Master schedule cleared');
  }

  updateMasterSchedule(updatedSchedule: Schedule): void {
    const currentSchedule = this._masterSchedule();
    if (currentSchedule && currentSchedule.id === updatedSchedule.id) {
      this._masterSchedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      console.log(`[ScheduleStateService] Updated master schedule: ${updatedSchedule.title}`);
    } else {
      console.warn('[ScheduleStateService] Cannot update master schedule - ID mismatch or no current schedule');
    }
  }

  // === SCHEDULE EVENT MANAGEMENT ===

  updateScheduleEvent(updatedEvent: ScheduleEvent): void {
    const currentSchedule = this._masterSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.warn('[ScheduleStateService] Cannot update event: No master schedule or events array');
      return;
    }

    // Find and update the event
    const events = currentSchedule.scheduleEvents;
    const eventIndex = events.findIndex(event => event.id === updatedEvent.id);
    
    if (eventIndex !== -1) {
      // Create new events array with updated event
      const newEvents = [...events];
      newEvents[eventIndex] = updatedEvent;
      
      // Update master schedule with new events array
      const updatedSchedule = { 
        ...currentSchedule, 
        scheduleEvents: newEvents 
      };
      
      this._masterSchedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();
      
      console.log('[ScheduleStateService] Updated schedule event', {
        eventId: updatedEvent.id,
        period: updatedEvent.period,
        date: format(new Date(updatedEvent.date), 'yyyy-MM-dd'),
        eventType: updatedEvent.eventType
      });
    } else {
      console.warn(`[ScheduleStateService] Event with ID ${updatedEvent.id} not found for update`);
    }
  }

  addScheduleEvent(newEvent: ScheduleEvent): void {
    const currentSchedule = this._masterSchedule();
    if (!currentSchedule) {
      console.warn('[ScheduleStateService] Cannot add event: No master schedule selected');
      return;
    }

    // Add event to master schedule
    const updatedSchedule = { 
      ...currentSchedule,
      scheduleEvents: [...(currentSchedule.scheduleEvents || []), newEvent]
    };
    
    this._masterSchedule.set(updatedSchedule);
    this.incrementScheduleVersion();
    this.markAsChangedIfInMemory();
    
    console.log('[ScheduleStateService] Added schedule event', {
      eventId: newEvent.id,
      period: newEvent.period,
      date: format(new Date(newEvent.date), 'yyyy-MM-dd'),
      lessonId: newEvent.lessonId,
      eventType: newEvent.eventType
    });
  }

  removeScheduleEvent(eventId: number): void {
    const currentSchedule = this._masterSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.warn('[ScheduleStateService] Cannot remove event: No master schedule or events array');
      return;
    }

    // Filter out the event
    const newEvents = currentSchedule.scheduleEvents.filter(event => event.id !== eventId);
    
    if (newEvents.length < currentSchedule.scheduleEvents.length) {
      const updatedSchedule = { 
        ...currentSchedule, 
        scheduleEvents: newEvents 
      };
      
      this._masterSchedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();
      
      console.log(`[ScheduleStateService] Removed schedule event with ID ${eventId}`);
    } else {
      console.warn(`[ScheduleStateService] Event with ID ${eventId} not found for removal`);
    }
  }

  // === PERIOD-SPECIFIC EVENT MANAGEMENT ===

  getScheduleEventsForDate(date: Date): ScheduleEvent[] {
    const currentSchedule = this._masterSchedule();
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
        eventType: event.eventType
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
      const currentSchedule = this._masterSchedule();
      if (!currentSchedule) {
        console.warn('[ScheduleStateService] Cannot create event: No master schedule available');
        return;
      }

      const newEvent: ScheduleEvent = {
        id: this.generateInMemoryEventId(),
        scheduleId: currentSchedule.id,
        courseId: null,
        date: new Date(date),
        period,
        lessonId: null,
        eventType: 'Error',
        eventCategory: null,
        comment: null,
        ...updates
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

  // === COURSE-SPECIFIC QUERIES (for period iteration) ===

  getScheduleEventsForCourse(courseId: number): ScheduleEvent[] {
    const currentSchedule = this._masterSchedule();
    if (!currentSchedule?.scheduleEvents) return [];

    return currentSchedule.scheduleEvents.filter(event => event.courseId === courseId);
  }

  getScheduleEventsForCourseAndPeriod(courseId: number, period: number): ScheduleEvent[] {
    const courseEvents = this.getScheduleEventsForCourse(courseId);
    return courseEvents.filter(event => event.period === period);
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

  // === SCHEDULE STATISTICS ===

  // Get total number of events in master schedule
  getCurrentScheduleEventCount(): number {
    const events = this.currentScheduleEvents();
    return events.length;
  }

  // Get event count by period for master schedule
  getEventCountByPeriod(): { [period: number]: number } {
    const events = this.currentScheduleEvents();
    const countByPeriod: { [period: number]: number } = {};
    
    events.forEach(event => {
      countByPeriod[event.period] = (countByPeriod[event.period] || 0) + 1;
    });
    
    return countByPeriod;
  }

  // Get event count by course for master schedule
  getEventCountByCourse(): { [courseId: number]: number } {
    const events = this.currentScheduleEvents();
    const countByCourse: { [courseId: number]: number } = {};
    
    events.forEach(event => {
      if (event.courseId) {
        countByCourse[event.courseId] = (countByCourse[event.courseId] || 0) + 1;
      }
    });
    
    return countByCourse;
  }

  // Get event count by event type
  getEventCountByType(): { [eventType: string]: number } {
    const events = this.currentScheduleEvents();
    const countByType: { [eventType: string]: number } = {};
    
    events.forEach(event => {
      const eventType = event.eventType || 'Unknown';
      countByType[eventType] = (countByType[eventType] || 0) + 1;
    });
    
    return countByType;
  }

  get selectedSchedule() {
    return this.masterSchedule; // Alias to the existing masterSchedule signal
  }
  
  // Add this method for value access (used by services)
  selectedScheduleValue(): Schedule | null {
    return this._masterSchedule();
  }

  // === STATE MANAGEMENT ===

  reset(): void {
    this._masterSchedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    this._scheduleVersion.set(0);
    this._inMemoryEventIdCounter = -1;
    console.log('[ScheduleStateService] State reset');
  }

  // === DEBUG METHODS ===

  getDebugInfo() {
    const currentSchedule = this._masterSchedule();
    const events = this.currentScheduleEvents();
    
    return {
      hasMasterSchedule: currentSchedule !== null,
      masterScheduleId: currentSchedule?.id || null,
      masterScheduleTitle: currentSchedule?.title || null,
      isInMemorySchedule: this._isInMemorySchedule(),
      hasUnsavedChanges: this._hasUnsavedChanges(),
      scheduleVersion: this._scheduleVersion(),
      eventCount: events.length,
      eventCountByPeriod: this.getEventCountByPeriod(),
      eventCountByCourse: this.getEventCountByCourse(),
      eventCountByType: this.getEventCountByType(),
      inMemoryEventIdCounter: this._inMemoryEventIdCounter
    };
  }
}