// **COMPLETE FILE** - SchedulePersistenceService with Observable Events
// RESPONSIBILITY: Pure schedule persistence operations with cross-component event coordination
// DOES NOT: Handle orchestration, validation, UI notifications, or state management - delegates appropriately
// CALLED BY: ScheduleCoordinationService for HTTP persistence operations

import { Injectable } from '@angular/core';
import { Observable, Subject, of, map, tap, catchError } from 'rxjs';
import {ScheduleStateService} from '../state/schedule-state.service';
import {ScheduleApiService} from '../api/schedule-api.service';
import {Schedule, ScheduleCreateResource} from '../../../models/schedule';
import {ScheduleConfigurationStateService} from '../state/schedule-configuration-state.service';

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
    private scheduleApiService: ScheduleApiService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService
  ) {
    console.log('[SchedulePersistenceService] Initialized with Observable events for persistence coordination');
  }

  // === SCHEDULE LOADING ===

  /**
   * ✅ ENHANCED: Load active schedule with Observable event emission
   * Pure HTTP operation with state update and event coordination
   */
  loadActiveSchedule(): Observable<boolean> {
    console.log('[SchedulePersistenceService] 🔍 Starting loadActiveSchedule - detailed debug');

    return this.scheduleApiService.getActiveSchedule().pipe(
      tap(schedule => {
        console.log('[SchedulePersistenceService] 📋 Raw API response:', {
          hasSchedule: !!schedule,
          scheduleId: schedule?.id,
          scheduleTitle: schedule?.title,
          hasEmbeddedConfig: !!(schedule as any)?.scheduleConfiguration,
          embeddedConfigId: (schedule as any)?.scheduleConfiguration?.id,
          embeddedConfigTitle: (schedule as any)?.scheduleConfiguration?.title,
          rawScheduleKeys: schedule ? Object.keys(schedule) : [],
          fullScheduleData: schedule // ⚠️ Remove this after debugging
        });

        if (schedule) {
          // ✅ Set schedule state
          this.scheduleStateService.setSchedule(schedule, false);
          console.log('[SchedulePersistenceService] ✅ Schedule state set');

          // ✅ CRITICAL: Check if configuration is embedded
          const embeddedConfig = (schedule as any).scheduleConfiguration;
          if (embeddedConfig) {
            console.log('[SchedulePersistenceService] ✅ Setting embedded configuration:', {
              configId: embeddedConfig.id,
              configTitle: embeddedConfig.title
            });
            this.scheduleConfigurationStateService.setActiveConfiguration(embeddedConfig);
          } else {
            console.warn('[SchedulePersistenceService] ⚠️ No embedded configuration found in schedule');
            console.log('[SchedulePersistenceService] Available schedule properties:', Object.keys(schedule));
          }

          // ✅ Verify both states are set
          const scheduleSet = this.scheduleStateService.hasActiveSchedule();
          const configSet = this.scheduleConfigurationStateService.hasActiveConfiguration();
          console.log('[SchedulePersistenceService] 🔍 State verification:', {
            scheduleStateSet: scheduleSet,
            configStateSet: configSet,
            bothReady: scheduleSet && configSet
          });

        } else {
          console.log('[SchedulePersistenceService] ❌ No schedule returned from API');
          this.scheduleStateService.clearSchedule();
          this.scheduleConfigurationStateService.setActiveConfiguration(null);
        }
      }),
      map(schedule => {
        // ✅ CRITICAL: Return true only if BOTH schedule and embedded config exist
        const hasSchedule = !!schedule;
        const hasEmbeddedConfig = !!(schedule as any)?.scheduleConfiguration;
        const result = hasSchedule && hasEmbeddedConfig;

        console.log('[SchedulePersistenceService] 🎯 Final load result:', {
          hasSchedule,
          hasEmbeddedConfig,
          returning: result,
          reason: result ? 'Both schedule and config loaded' : 'Missing schedule or embedded config'
        });

        return result;
      }),
      catchError((error: any) => {
        console.error('[SchedulePersistenceService] ❌ Load failed:', error);
        this.scheduleStateService.clearSchedule();
        this.scheduleConfigurationStateService.setActiveConfiguration(null);
        return of(false);
      })
    );
  }


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
        configurationId: currentSchedule.scheduleConfiguration.id || null,
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
          configurationId: savedSchedule.scheduleConfiguration.id || null,
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
        scheduleConfigurationId: schedule.scheduleConfiguration.id,
        scheduleEvents: schedule.scheduleEvents
      };

      return this.scheduleApiService.createSchedule(createResource);
    }
  }

  // === SCHEDULE CREATION ===

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
