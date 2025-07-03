// **COMPLETE FILE** - SchedulePersistenceService with Observable Events
// RESPONSIBILITY: Pure schedule persistence operations with cross-component event coordination
// DOES NOT: Handle orchestration, validation, UI notifications, or state management - delegates appropriately
// CALLED BY: ScheduleCoordinationService for HTTP persistence operations

import { Injectable } from '@angular/core';
import { Observable, Subject, of, map, tap, catchError } from 'rxjs';
import {ScheduleStateService} from '../state/schedule-state.service';
import {ScheduleApiService} from '../api/schedule-api.service';
import {Schedule, ScheduleCreateResource} from '../../../models/schedule';

// ✅ NEW: Observable event interfaces for cross-component coordination
export interface SchedulePersistenceEvent {
  operationType: 'save-completed' | 'load-completed' | 'create-completed' | 'delete-completed' | 'select-completed';
  scheduleId: number;
  scheduleTitle: string;
  success: boolean;
  isInMemory: boolean;
  eventCount: number;
  configurationId: number | null;
  userId: number | null;
  source: 'schedule-persistence';
  timestamp: Date;
}

export interface PersistenceErrorEvent {
  operationType: 'save-failed' | 'load-failed' | 'create-failed' | 'delete-failed' | 'select-failed';
  error: Error;
  scheduleId?: number;
  scheduleTitle?: string;
  source: 'schedule-persistence';
  timestamp: Date;
}

export interface PersistenceStatusEvent {
  statusType: 'schedule-cleared' | 'state-updated' | 'persistence-ready';
  scheduleId: number | null;
  hasSchedule: boolean;
  isInMemory: boolean;
  hasUnsavedChanges: boolean;
  source: 'schedule-persistence';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SchedulePersistenceService {

  // ✅ NEW: Observable events for cross-component coordination
  private readonly _schedulePersistence$ = new Subject<SchedulePersistenceEvent>();
  private readonly _persistenceError$ = new Subject<PersistenceErrorEvent>();
  private readonly _persistenceStatus$ = new Subject<PersistenceStatusEvent>();

  // Public observables for business logic subscriptions
  readonly schedulePersistence$ = this._schedulePersistence$.asObservable();
  readonly persistenceError$ = this._persistenceError$.asObservable();
  readonly persistenceStatus$ = this._persistenceStatus$.asObservable();

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleApiService: ScheduleApiService
  ) {
    console.log('[SchedulePersistenceService] Initialized with Observable events for persistence coordination');
  }

  // === SCHEDULE LOADING ===

  /**
   * ✅ ENHANCED: Load active schedule with Observable event emission
   * Pure HTTP operation with state update and event coordination
   */
  loadActiveSchedule(): Observable<boolean> {
    console.log('[SchedulePersistenceService] Loading active schedule for current user');

    return this.scheduleApiService.getActiveSchedule().pipe(
      tap(schedule => {
        if (schedule) {
          console.log(`[SchedulePersistenceService] Loaded active schedule: ${schedule.title}`);
          this.scheduleStateService.setSchedule(schedule, false);

          // ✅ NEW: Emit load completed event
          this._schedulePersistence$.next({
            operationType: 'load-completed',
            scheduleId: schedule.id,
            scheduleTitle: schedule.title,
            success: true,
            isInMemory: false,
            eventCount: schedule.scheduleEvents?.length || 0,
            configurationId: schedule.scheduleConfigurationId || null,
            userId: schedule.userId || null,
            source: 'schedule-persistence',
            timestamp: new Date()
          });

          console.log('🚨 [SchedulePersistenceService] EMITTED schedulePersistence event:', 'load-completed');

          // ✅ NEW: Emit status update event
          this._persistenceStatus$.next({
            statusType: 'state-updated',
            scheduleId: schedule.id,
            hasSchedule: true,
            isInMemory: false,
            hasUnsavedChanges: false,
            source: 'schedule-persistence',
            timestamp: new Date()
          });

        } else {
          console.log('[SchedulePersistenceService] No existing active schedule found');

          // ✅ NEW: Emit no schedule found event
          this._schedulePersistence$.next({
            operationType: 'load-completed',
            scheduleId: 0,
            scheduleTitle: 'No Schedule',
            success: true,
            isInMemory: false,
            eventCount: 0,
            configurationId: null,
            userId: null,
            source: 'schedule-persistence',
            timestamp: new Date()
          });

          // ✅ NEW: Emit status update event
          this._persistenceStatus$.next({
            statusType: 'state-updated',
            scheduleId: null,
            hasSchedule: false,
            isInMemory: false,
            hasUnsavedChanges: false,
            source: 'schedule-persistence',
            timestamp: new Date()
          });
        }
      }),
      map(schedule => schedule !== null),
      catchError((error: any) => {
        console.warn('[SchedulePersistenceService] Failed to load active schedule:', error.message);

        // ✅ NEW: Emit load failed event
        this._persistenceError$.next({
          operationType: 'load-failed',
          error,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED persistenceError event:', 'load-failed');

        return of(false);
      })
    );
  }

  // === SCHEDULE SAVING ===

  /**
   * ✅ ENHANCED: Save current schedule with Observable event emission
   * Pure HTTP operation with state update and event coordination
   */
  saveCurrentSchedule(): Observable<void> {
    console.log('[SchedulePersistenceService] Saving current schedule');

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      const error = new Error('No schedule available to save');

      // ✅ NEW: Emit save failed event
      this._persistenceError$.next({
        operationType: 'save-failed',
        error,
        source: 'schedule-persistence',
        timestamp: new Date()
      });

      throw error;
    }

    if (!this.scheduleStateService.isInMemorySchedule()) {
      console.log('[SchedulePersistenceService] Schedule already saved');

      // ✅ NEW: Emit save completed event (already saved)
      this._schedulePersistence$.next({
        operationType: 'save-completed',
        scheduleId: currentSchedule.id,
        scheduleTitle: currentSchedule.title,
        success: true,
        isInMemory: false,
        eventCount: currentSchedule.scheduleEvents?.length || 0,
        configurationId: currentSchedule.scheduleConfigurationId || null,
        userId: currentSchedule.userId || null,
        source: 'schedule-persistence',
        timestamp: new Date()
      });

      return of(void 0);
    }

    return this.saveSchedule(currentSchedule).pipe(
      tap(savedSchedule => {
        this.scheduleStateService.setSchedule(savedSchedule, false);
        this.scheduleStateService.markAsSaved();
        console.log(`[SchedulePersistenceService] Saved schedule: ${savedSchedule.title}`);

        // ✅ NEW: Emit save completed event
        this._schedulePersistence$.next({
          operationType: 'save-completed',
          scheduleId: savedSchedule.id,
          scheduleTitle: savedSchedule.title,
          success: true,
          isInMemory: false,
          eventCount: savedSchedule.scheduleEvents?.length || 0,
          configurationId: savedSchedule.scheduleConfigurationId || null,
          userId: savedSchedule.userId || null,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED schedulePersistence event:', 'save-completed');

        // ✅ NEW: Emit status update event
        this._persistenceStatus$.next({
          statusType: 'state-updated',
          scheduleId: savedSchedule.id,
          hasSchedule: true,
          isInMemory: false,
          hasUnsavedChanges: false,
          source: 'schedule-persistence',
          timestamp: new Date()
        });
      }),
      map(() => void 0),
      catchError((error: any) => {
        console.error('[SchedulePersistenceService] Failed to save schedule:', error.message);

        // ✅ NEW: Emit save failed event
        this._persistenceError$.next({
          operationType: 'save-failed',
          error,
          scheduleId: currentSchedule.id,
          scheduleTitle: currentSchedule.title,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED persistenceError event:', 'save-failed');

        throw error;
      })
    );
  }

  /**
   * Save schedule to API - handles create vs update
   * Pure HTTP operation
   */
  private saveSchedule(schedule: Schedule): Observable<Schedule> {
    if (schedule.id && schedule.id > 0) {
      // Update existing schedule events
      return this.scheduleApiService.updateScheduleEvents(schedule.id, schedule.scheduleEvents || []);
    } else {
      // Create new schedule with events in single API call
      const createResource: ScheduleCreateResource = {
        title: schedule.title,
        scheduleConfigurationId: schedule.scheduleConfigurationId,
        scheduleEvents: schedule.scheduleEvents
      };

      return this.scheduleApiService.createSchedule(createResource);
    }
  }

  // === SCHEDULE CREATION ===

  /**
   * ✅ ENHANCED: Create new schedule with Observable event emission
   * Pure HTTP operation with state update and event coordination
   */
  createNewSchedule(createResource: ScheduleCreateResource): Observable<Schedule> {
    console.log('[SchedulePersistenceService] Creating new schedule');

    return this.scheduleApiService.createSchedule(createResource).pipe(
      tap(newSchedule => {
        this.scheduleStateService.setSchedule(newSchedule, false);
        console.log(`[SchedulePersistenceService] Created new schedule: ${newSchedule.title}`);

        // ✅ NEW: Emit create completed event
        this._schedulePersistence$.next({
          operationType: 'create-completed',
          scheduleId: newSchedule.id,
          scheduleTitle: newSchedule.title,
          success: true,
          isInMemory: false,
          eventCount: newSchedule.scheduleEvents?.length || 0,
          configurationId: newSchedule.scheduleConfigurationId || null,
          userId: newSchedule.userId || null,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED schedulePersistence event:', 'create-completed');

        // ✅ NEW: Emit status update event
        this._persistenceStatus$.next({
          statusType: 'state-updated',
          scheduleId: newSchedule.id,
          hasSchedule: true,
          isInMemory: false,
          hasUnsavedChanges: false,
          source: 'schedule-persistence',
          timestamp: new Date()
        });
      }),
      catchError((error: any) => {
        console.error('[SchedulePersistenceService] Failed to create schedule:', error.message);

        // ✅ NEW: Emit create failed event
        this._persistenceError$.next({
          operationType: 'create-failed',
          error,
          scheduleTitle: createResource.title,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED persistenceError event:', 'create-failed');

        throw error;
      })
    );
  }

  // === SCHEDULE SELECTION ===

  /**
   * ✅ ENHANCED: Select schedule by ID with Observable event emission
   * Pure HTTP operation with state update and event coordination
   */
  selectScheduleById(scheduleId: number): Observable<Schedule> {
    console.log(`[SchedulePersistenceService] Selecting schedule ID ${scheduleId}`);

    return this.scheduleApiService.getSchedule(scheduleId).pipe(
      tap(schedule => {
        this.scheduleStateService.setSchedule(schedule, false);
        console.log(`[SchedulePersistenceService] Selected schedule: ${schedule.title}`);

        // ✅ NEW: Emit select completed event
        this._schedulePersistence$.next({
          operationType: 'select-completed',
          scheduleId: schedule.id,
          scheduleTitle: schedule.title,
          success: true,
          isInMemory: false,
          eventCount: schedule.scheduleEvents?.length || 0,
          configurationId: schedule.scheduleConfigurationId || null,
          userId: schedule.userId || null,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED schedulePersistence event:', 'select-completed');

        // ✅ NEW: Emit status update event
        this._persistenceStatus$.next({
          statusType: 'state-updated',
          scheduleId: schedule.id,
          hasSchedule: true,
          isInMemory: false,
          hasUnsavedChanges: false,
          source: 'schedule-persistence',
          timestamp: new Date()
        });
      }),
      catchError((error: any) => {
        console.error(`[SchedulePersistenceService] Failed to select schedule ID ${scheduleId}: ${error.message}`);

        // ✅ NEW: Emit select failed event
        this._persistenceError$.next({
          operationType: 'select-failed',
          error,
          scheduleId,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED persistenceError event:', 'select-failed');

        throw error;
      })
    );
  }

  // === SCHEDULE DELETION ===

  /**
   * ✅ ENHANCED: Delete schedule with Observable event emission
   * Pure HTTP operation with state update and event coordination
   */
  deleteSchedule(scheduleId: number): Observable<void> {
    console.log(`[SchedulePersistenceService] Deleting schedule ID ${scheduleId}`);

    // Get current schedule info before deletion for event emission
    const currentSchedule = this.scheduleStateService.getSchedule();
    const scheduleTitle = currentSchedule?.title || `Schedule ${scheduleId}`;

    return this.scheduleApiService.deleteSchedule(scheduleId).pipe(
      tap(() => {
        this.scheduleStateService.clearSchedule();
        console.log(`[SchedulePersistenceService] Deleted schedule ID ${scheduleId}`);

        // ✅ NEW: Emit delete completed event
        this._schedulePersistence$.next({
          operationType: 'delete-completed',
          scheduleId,
          scheduleTitle,
          success: true,
          isInMemory: false,
          eventCount: 0,
          configurationId: null,
          userId: null,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED schedulePersistence event:', 'delete-completed');

        // ✅ NEW: Emit status update event
        this._persistenceStatus$.next({
          statusType: 'schedule-cleared',
          scheduleId: null,
          hasSchedule: false,
          isInMemory: false,
          hasUnsavedChanges: false,
          source: 'schedule-persistence',
          timestamp: new Date()
        });
      }),
      catchError((error: any) => {
        console.error(`[SchedulePersistenceService] Failed to delete schedule ID ${scheduleId}: ${error.message}`);

        // ✅ NEW: Emit delete failed event
        this._persistenceError$.next({
          operationType: 'delete-failed',
          error,
          scheduleId,
          scheduleTitle,
          source: 'schedule-persistence',
          timestamp: new Date()
        });

        console.log('🚨 [SchedulePersistenceService] EMITTED persistenceError event:', 'delete-failed');

        throw error;
      })
    );
  }

  // === UTILITY METHODS ===

  /**
   * ✅ ENHANCED: Clear schedule state with Observable event emission
   */
  clearSchedule(): void {
    console.log('[SchedulePersistenceService] Clearing schedule');

    const currentSchedule = this.scheduleStateService.getSchedule();
    this.scheduleStateService.clearSchedule();

    // ✅ NEW: Emit status update event
    this._persistenceStatus$.next({
      statusType: 'schedule-cleared',
      scheduleId: null,
      hasSchedule: false,
      isInMemory: false,
      hasUnsavedChanges: false,
      source: 'schedule-persistence',
      timestamp: new Date()
    });

    console.log('🚨 [SchedulePersistenceService] EMITTED persistenceStatus event:', 'schedule-cleared');
  }

  /**
   * Get current schedule from state (convenience method)
   */
  getCurrentSchedule(): Schedule | null {
    return this.scheduleStateService.getSchedule();
  }

  /**
   * Check if current schedule is in memory
   */
  isCurrentScheduleInMemory(): boolean {
    return this.scheduleStateService.isInMemorySchedule();
  }

  /**
   * Check if current schedule has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.scheduleStateService.hasUnsavedChanges();
  }

  // === DEBUG INFO ===

  getDebugInfo(): any {
    return {
      currentSchedule: {
        hasSchedule: !!this.getCurrentSchedule(),
        scheduleId: this.getCurrentSchedule()?.id || null,
        isInMemory: this.isCurrentScheduleInMemory(),
        hasUnsavedChanges: this.hasUnsavedChanges()
      },
      persistenceService: {
        initialized: true,
        dependencies: ['ScheduleStateService', 'ScheduleApiService'],
        responsibilities: ['HTTP operations', 'State updates', 'Observable events'],
        observableEvents: ['schedulePersistence$', 'persistenceError$', 'persistenceStatus$'],
        doesNot: ['Orchestration', 'Validation', 'UI notifications']
      }
    };
  }

  // === CLEANUP ===

  // ✅ NEW: Cleanup method with Observable completion
  ngOnDestroy(): void {
    this._schedulePersistence$.complete();
    this._persistenceError$.complete();
    this._persistenceStatus$.complete();
    console.log('[SchedulePersistenceService] All Observable subjects completed on destroy');
  }
}
