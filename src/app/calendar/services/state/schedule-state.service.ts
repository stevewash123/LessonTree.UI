// **COMPLETE FILE** - ScheduleStateService Final SRP Split
// RESPONSIBILITY: Pure schedule state management with signals and reactive properties only
// DOES NOT: Handle date/period queries, course filtering, or complex business logic - PURE STATE ONLY
// CALLED BY: Calendar components, ScheduleGenerationService, SchedulePersistenceService for state coordination

import { Injectable, signal, computed } from '@angular/core';
import { Schedule } from '../../../models/schedule';
import { ScheduleEvent } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  // Private state signals
  private readonly _schedule = signal<Schedule | null>(null);
  private readonly _isInMemorySchedule = signal<boolean>(false);
  private readonly _hasUnsavedChanges = signal<boolean>(false);
  private readonly _scheduleVersion = signal<number>(0);

  // Counter for in-memory event IDs
  private _inMemoryEventIdCounter = -1;

  // Public readonly signals
  readonly schedule = this._schedule.asReadonly();
  readonly isInMemorySchedule = this._isInMemorySchedule.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly scheduleVersion = this._scheduleVersion.asReadonly();

  // Computed signals
  readonly canSaveSchedule = computed(() =>
    this._isInMemorySchedule() && this._schedule() !== null
  );

  readonly currentScheduleEvents = computed(() =>
    this._schedule()?.scheduleEvents || []
  );

  readonly hasActiveSchedule = computed(() =>
    this._schedule() !== null
  );

  readonly scheduleTitle = computed(() =>
    this._schedule()?.title || 'No Schedule'
  );

  constructor() {
    console.log('[ScheduleStateService] Initialized for schedule state management');
  }

  // === SCHEDULE MANAGEMENT ===

  setSchedule(schedule: Schedule | null, isInMemory: boolean = false): void {
    console.log('[ScheduleStateService] 📊 SETTING SCHEDULE:', {
      scheduleId: schedule?.id,
      title: schedule?.title,
      eventCount: schedule?.scheduleEvents?.length || 0
    });

    const lessonEvents = (schedule?.scheduleEvents || []).filter(e => e.eventCategory === 'Lesson');
    console.log('[ScheduleStateService] 📚 LESSON EVENTS IN SCHEDULE STATE:', {
      totalLessonEvents: lessonEvents.length,
      lessonEventDetails: lessonEvents.map(e => ({
        scheduleEventId: e.id,
        date: e.date,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle,
        lessonSort: e.lessonSort,
        courseId: e.courseId
      }))
    });
    this._schedule.set(schedule);
    this._isInMemorySchedule.set(isInMemory);
    this._hasUnsavedChanges.set(false);
    this.incrementScheduleVersion();

    console.log('[ScheduleStateService] Schedule changed:', {
      scheduleId: schedule?.id || null,
      eventCount: schedule?.scheduleEvents?.length || 0
    });
  }

  getSchedule(): Schedule | null {
    return this._schedule();
  }

  clearSchedule(): void {
    this._schedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    console.log('[ScheduleStateService] Schedule cleared');
  }


  // === SCHEDULE EVENT CRUD ===

  addScheduleEvent(newEvent: ScheduleEvent): void {
    const currentSchedule = this._schedule();
    if (!currentSchedule) {
      console.warn('[ScheduleStateService] Cannot add event: No schedule selected');
      return;
    }

    const updatedSchedule = {
      ...currentSchedule,
      scheduleEvents: [...(currentSchedule.scheduleEvents || []), newEvent]
    };

    this._schedule.set(updatedSchedule);
    this.incrementScheduleVersion();
    this.markAsChangedIfInMemory();

    console.log('[ScheduleStateService] Added schedule event:', newEvent.id);
  }

  updateScheduleEvent(updatedEvent: ScheduleEvent): void {
    const currentSchedule = this._schedule();
    if (!currentSchedule?.scheduleEvents) {
      console.warn('[ScheduleStateService] Cannot update event: No schedule or events array');
      return;
    }

    const events = currentSchedule.scheduleEvents;
    const eventIndex = events.findIndex(event => event.id === updatedEvent.id);

    if (eventIndex !== -1) {
      const newEvents = [...events];
      newEvents[eventIndex] = updatedEvent;

      const updatedSchedule = {
        ...currentSchedule,
        scheduleEvents: newEvents
      };

      this._schedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();

      console.log('[ScheduleStateService] Updated schedule event:', updatedEvent.id);
    } else {
      console.warn('[ScheduleStateService] Event not found for update:', updatedEvent.id);
    }
  }

  removeScheduleEvent(eventId: number): void {
    const currentSchedule = this._schedule();
    if (!currentSchedule?.scheduleEvents) {
      console.warn('[ScheduleStateService] Cannot remove event: No schedule or events array');
      return;
    }

    const newEvents = currentSchedule.scheduleEvents.filter(event => event.id !== eventId);

    if (newEvents.length < currentSchedule.scheduleEvents.length) {
      const updatedSchedule = {
        ...currentSchedule,
        scheduleEvents: newEvents
      };

      this._schedule.set(updatedSchedule);
      this.incrementScheduleVersion();
      this.markAsChangedIfInMemory();

      console.log('[ScheduleStateService] Removed schedule event:', eventId);
    } else {
      console.warn('[ScheduleStateService] Event not found for removal:', eventId);
    }
  }

  // === BASIC EVENT ACCESS ===

  getScheduleEvents(): ScheduleEvent[] {
    return this.currentScheduleEvents();
  }

  getEventCount(): number {
    return this.currentScheduleEvents().length;
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


  // === LEGACY COMPATIBILITY ===

  get selectedSchedule() {
    return this.schedule;
  }

  selectedScheduleValue(): Schedule | null {
    return this._schedule();
  }

  // === STATE RESET ===

  reset(): void {
    this._schedule.set(null);
    this._isInMemorySchedule.set(false);
    this._hasUnsavedChanges.set(false);
    this._scheduleVersion.set(0);
    this._inMemoryEventIdCounter = -1;
    console.log('[ScheduleStateService] State reset');
  }

  // === ESSENTIAL DEBUG INFO ===

  getDebugInfo() {
    const currentSchedule = this._schedule();

    return {
      hasSchedule: currentSchedule !== null,
      scheduleId: currentSchedule?.id || null,
      scheduleTitle: currentSchedule?.title || null,
      isInMemorySchedule: this._isInMemorySchedule(),
      hasUnsavedChanges: this._hasUnsavedChanges(),
      scheduleVersion: this._scheduleVersion(),
      eventCount: this.getEventCount()
    };
  }

  // === PRIVATE HELPERS ===

  private incrementScheduleVersion(): void {
    const currentVersion = this._scheduleVersion();
    this._scheduleVersion.set(currentVersion + 1);
  }

  private markAsChangedIfInMemory(): void {
    if (this._isInMemorySchedule()) {
      this._hasUnsavedChanges.set(true);
    }
  }


}
