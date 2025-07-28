// **COMPLETE FILE** - ScheduleEventCoordinationService - Pure Observable Event Management
// RESPONSIBILITY: Observable event emission and cross-service subscription coordination only
// DOES NOT: Handle UI feedback, business workflow delegation, or facade methods
// CALLED BY: ScheduleWorkflowCoordinationService for event emission

import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import {
  CourseSignalService,
  EntityMoveSignalPayload
} from '../../../lesson-tree/services/course-data/course-signal.service';
import { LessonDetail } from '../../../models/lesson';
import { EntitySignalPayload } from '../../../lesson-tree/services/course-data/course-signal.service';

// ✅ Observable event interfaces for cross-component coordination
export interface ScheduleWorkflowEvent {
  operation: 'generation' | 'save' | 'load' | 'regeneration';
  success: boolean;
  scheduleId?: number;
  configurationId?: number;
  eventCount?: number;
  error?: Error;
  timestamp: Date;
}

export interface ConfigurationWorkflowEvent {
  configurationId: number;
  workflowSteps: ('load' | 'generate' | 'save')[];
  completedSteps: string[];
  success: boolean;
  error?: Error;
  timestamp: Date;
}

export interface ScheduleRegenerationEvent {
  trigger: 'lesson-added' | 'manual' | 'configuration-change';
  courseId?: number;
  lessonId?: number;
  lessonTitle?: string;
  success: boolean;
  eventCount: number;
  error?: Error;
  timestamp: Date;
}

export interface LessonIntegrationEvent {
  lesson: LessonDetail;
  integrationSuccess: boolean;
  scheduleUpdated: boolean;
  reason?: string;
  error?: Error;
  timestamp: Date;
}

export interface LessonOrderChangeEvent {
  lesson: LessonDetail;
  sourceLocation: string;
  targetLocation: string;
  source: string;
  metadata?: {
    oldSortOrder?: number;
    newSortOrder?: number;
    moveType?: 'drag-drop' | 'api-move' | 'bulk-operation';
    apiResponse?: any;  // ← ADD THIS LINE
  };
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleEventCoordinationService implements OnDestroy {

  private readonly _lessonOrderChanged$ = new Subject<LessonOrderChangeEvent>();
  readonly lessonOrderChanged$ = this._lessonOrderChanged$.asObservable();

  // ✅ Observable events for cross-component coordination
  private readonly _workflowCompleted$ = new Subject<ScheduleWorkflowEvent>();
  private readonly _configurationWorkflowCompleted$ = new Subject<ConfigurationWorkflowEvent>();
  private readonly _regenerationCompleted$ = new Subject<ScheduleRegenerationEvent>();
  private readonly _lessonIntegrationCompleted$ = new Subject<LessonIntegrationEvent>();

  // Public observable streams
  readonly workflowCompleted$ = this._workflowCompleted$.asObservable();
  readonly configurationWorkflowCompleted$ = this._configurationWorkflowCompleted$.asObservable();
  readonly regenerationCompleted$ = this._regenerationCompleted$.asObservable();
  readonly lessonIntegrationCompleted$ = this._lessonIntegrationCompleted$.asObservable();

  // ✅ Subscription management
  private subscriptions: Subscription[] = [];

  constructor(private courseSignalService: CourseSignalService) {
    console.log('[ScheduleEventCoordinationService] Pure Observable event management service initialized');
    this.setupCrossServiceSubscriptions();
  }

  // === CROSS-SERVICE SUBSCRIPTIONS ===

  private setupCrossServiceSubscriptions(): void {
    console.log('[ScheduleEventCoordinationService] Setting up cross-service subscriptions');

    // ✅ Subscribe to lesson added events for integration workflow
    const lessonAddedSub = this.courseSignalService.entityAdded$.subscribe((entityAddedEvent: EntitySignalPayload) => {
      console.log('🔄 [ScheduleEventCoordinationService] === OBSERVABLE EVENT RECEIVED ===', {
        eventType: 'entityAdded',
        entityType: entityAddedEvent.entity.entityType,
        entityId: entityAddedEvent.entity.id,
        nodeTitle: entityAddedEvent.entity.title,
        source: entityAddedEvent.source,
        operationType: entityAddedEvent.operationType,
        timestamp: entityAddedEvent.timestamp.toISOString()
      });

      if (entityAddedEvent.entity.entityType === 'Lesson' && entityAddedEvent.source === 'infopanel') {
        console.log('🎯 [ScheduleEventCoordinationService] PROCESSING lesson event - notifying coordination service');
        // Emit lesson integration event for coordination service to handle
        this._lessonIntegrationCompleted$.next({
          lesson: entityAddedEvent.entity as LessonDetail,
          integrationSuccess: false, // Will be updated by coordination service
          scheduleUpdated: false,
          reason: 'Lesson created - evaluation needed',
          timestamp: new Date()
        });
      } else {
        console.log('🔄 [ScheduleEventCoordinationService] IGNORING event - not lesson from infopanel');
      }
    });

    const lessonMovedSub = this.courseSignalService.entityMoved$.subscribe((entityMovedEvent: EntityMoveSignalPayload) => {
      console.log('🔄 [ScheduleEventCoordinationService] === OBSERVABLE EVENT RECEIVED ===', {
        eventType: 'entityMoved',
        entityType: entityMovedEvent.entity.entityType,
        entityId: entityMovedEvent.entity.id,
        entityTitle: entityMovedEvent.entity.title,
        sourceLocation: entityMovedEvent.sourceLocation,
        targetLocation: entityMovedEvent.targetLocation,
        source: entityMovedEvent.source,
        metadata: entityMovedEvent.metadata,  // ✅ LOG METADATA
        timestamp: entityMovedEvent.timestamp.toISOString()
      });

      if (entityMovedEvent.entity.entityType === 'Lesson') {
        console.log('🎯 [ScheduleEventCoordinationService] PROCESSING lesson move event - emitting order change coordination');

        // ✅ FIXED: Pass metadata through to coordination service
        this._lessonOrderChanged$.next({
          lesson: entityMovedEvent.entity as LessonDetail,
          sourceLocation: entityMovedEvent.sourceLocation,
          targetLocation: entityMovedEvent.targetLocation,
          source: entityMovedEvent.source,
          metadata: entityMovedEvent.metadata,  // ✅ PASS METADATA THROUGH
          timestamp: new Date()
        });
      } else {
        console.log('🔄 [ScheduleEventCoordinationService] IGNORING event - not lesson move');
      }
    });

    this.subscriptions.push(lessonAddedSub, lessonMovedSub);
    console.log('[ScheduleEventCoordinationService] Cross-service subscriptions setup complete');
  }

  // === EVENT EMISSION METHODS ===

  emitWorkflowCompleted(event: ScheduleWorkflowEvent): void {
    console.log('[ScheduleEventCoordinationService] Emitting workflow completed event', {
      operation: event.operation,
      success: event.success,
      scheduleId: event.scheduleId
    });
    this._workflowCompleted$.next(event);
  }

  emitConfigurationWorkflowCompleted(event: ConfigurationWorkflowEvent): void {
    console.log('[ScheduleEventCoordinationService] Emitting configuration workflow completed event', {
      configurationId: event.configurationId,
      success: event.success
    });
    this._configurationWorkflowCompleted$.next(event);
  }

  emitRegenerationCompleted(event: ScheduleRegenerationEvent): void {
    console.log('[ScheduleEventCoordinationService] Emitting regeneration completed event', {
      trigger: event.trigger,
      success: event.success,
      eventCount: event.eventCount
    });
    this._regenerationCompleted$.next(event);
  }

  emitLessonIntegrationCompleted(event: LessonIntegrationEvent): void {
    console.log('[ScheduleEventCoordinationService] Emitting lesson integration completed event', {
      lessonTitle: event.lesson.title,
      integrationSuccess: event.integrationSuccess,
      scheduleUpdated: event.scheduleUpdated
    });
    this._lessonIntegrationCompleted$.next(event);
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[ScheduleEventCoordinationService] Cleaning up Observable subjects and subscriptions');

    // ✅ Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // ✅ Complete Observable subjects
    this._workflowCompleted$.complete();
    this._configurationWorkflowCompleted$.complete();
    this._regenerationCompleted$.complete();
    this._lessonIntegrationCompleted$.complete();
    this._lessonOrderChanged$.complete(); // ✅ ADD THIS

    console.log('[ScheduleEventCoordinationService] All Observable subjects and subscriptions completed');
  }
}
