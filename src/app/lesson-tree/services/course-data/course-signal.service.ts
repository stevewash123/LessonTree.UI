// **COMPLETE FILE** - CourseSignalService with proper Subject-based hybrid architecture
// RESPONSIBILITY: Hybrid signal emission service supporting both Observable events and Signal state
// DOES NOT: Handle business logic, API operations, or state management - pure event emission
// CALLED BY: CourseDataService and other services for entity lifecycle event emission

import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { OperationType } from './course-data.service';
import { Entity, EntityType } from '../../../models/entity';

// Enhanced event interfaces for signal payloads
export interface EntitySignalPayload {
  entity: Entity;
  source: string;
  operationType: OperationType;
  metadata?: {
    parentId?: number;
    parentType?: string;
    sortOrder?: number;
    userAction?: string;
  };
  timestamp: Date;
}

export interface EntityMoveSignalPayload {
  entity: Entity;
  sourceLocation: string;
  targetLocation: string;
  source: string;
  metadata?: {
    oldSortOrder?: number;
    newSortOrder?: number;
    moveType?: 'drag-drop' | 'api-move' | 'bulk-operation';
  };
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CourseSignalService {

  // === SUBJECT-BASED HYBRID ARCHITECTURE ===
  // Supports both Observable events (for coordination) and Signal state (for reactive UI)

  private readonly _nodeAddedSubject = new Subject<EntitySignalPayload>();
  private readonly _nodeEditedSubject = new Subject<EntitySignalPayload>();
  private readonly _nodeDeletedSubject = new Subject<EntitySignalPayload>();
  private readonly _nodeMovedSubject = new Subject<EntityMoveSignalPayload>();

  // === OBSERVABLE INTERFACE (for event-driven coordination) ===
  readonly entityAdded$ = this._nodeAddedSubject.asObservable();
  readonly entityEdited$ = this._nodeEditedSubject.asObservable();
  readonly entityDeleted$ = this._nodeDeletedSubject.asObservable();
  readonly entityMoved$ = this._nodeMovedSubject.asObservable();

  // === SIGNAL INTERFACE (for reactive state monitoring) ===
  // Convert Subject events to Signal state for UI reactivity
  private readonly _nodeAddedSignal = signal<EntitySignalPayload | null>(null);
  private readonly _nodeEditedSignal = signal<EntitySignalPayload | null>(null);
  private readonly _nodeDeletedSignal = signal<EntitySignalPayload | null>(null);
  private readonly _nodeMovedSignal = signal<EntityMoveSignalPayload | null>(null);

  readonly entityAdded = this._nodeAddedSignal.asReadonly();
  readonly entityEdited = this._nodeEditedSignal.asReadonly();
  readonly entityDeleted = this._nodeDeletedSignal.asReadonly();
  readonly entityMoved = this._nodeMovedSignal.asReadonly();

  constructor() {
    console.log('[CourseSignalService] Service initialized with hybrid Subject-Signal architecture');

    // Bridge Observable events to Signal state for reactive UI
    this._nodeAddedSubject.subscribe(payload => this._nodeAddedSignal.set(payload));
    this._nodeEditedSubject.subscribe(payload => this._nodeEditedSignal.set(payload));
    this._nodeDeletedSubject.subscribe(payload => this._nodeDeletedSignal.set(payload));
    this._nodeMovedSubject.subscribe(payload => this._nodeMovedSignal.set(payload));
  }

  // === SIGNAL EMISSION METHODS ===

  /**
   * Emit entity added event (hybrid: Observable + Signal)
   */
  emitEntityAdded(
    entity: Entity,  // ✅ FIXED: Entity object, not EntityType string
    source: string,
    operationType: OperationType = 'USER_ADD',
    metadata?: any
  ): void {
    const payload: EntitySignalPayload = {
      entity: entity,
      source,
      operationType,
      metadata,
      timestamp: new Date()
    };

    console.log('📡 [CourseSignalService] Entity added emitted (hybrid)', {
      entityType: entity.entityType,  // ✅ FIXED: Access from Entity object
      entityId: entity.id,            // ✅ FIXED: Access from Entity object
      entityTitle: entity.title,      // ✅ FIXED: Access from Entity object
      source,
      operationType,
      timestamp: payload.timestamp.toISOString(),
      patterns: ['Observable stream', 'Signal state']
    });

    // Emit to both Observable stream and Signal state
    this._nodeAddedSubject.next(payload);
  }

  /**
   * Emit entity edited event (hybrid: Observable + Signal)
   */
  emitEntityEdited(
    entity: Entity,  // ✅ FIXED: Entity object parameter
    source: string,
    operationType: OperationType = 'API_RESPONSE',
    metadata?: any
  ): void {
    const payload: EntitySignalPayload = {
      entity: entity,
      source,
      operationType,
      metadata,
      timestamp: new Date()
    };

    console.log('📡 [CourseSignalService] Entity edited emitted (hybrid)', {
      entityType: entity.entityType,   // ✅ FIXED: Access from Entity object
      entityId: entity.id,             // ✅ FIXED: Access from Entity object
      entityTitle: entity.title,       // ✅ FIXED: Access from Entity object
      source,
      operationType
    });

    this._nodeEditedSubject.next(payload);
  }

  /**
   * Emit entity deleted event (hybrid: Observable + Signal)
   */
  emitEntityDeleted(
    entity: Entity,  // ✅ FIXED: Entity object, not EntityType string
    source: string,
    operationType: OperationType = 'API_RESPONSE',
    metadata?: any
  ): void {
    const payload: EntitySignalPayload = {
      entity: entity,
      source,
      operationType,
      metadata,
      timestamp: new Date()
    };

    console.log('📡 [CourseSignalService] Entity deleted emitted (hybrid)', {
      entityType: entity.entityType,   // ✅ FIXED: Access from Entity object
      entityId: entity.id,             // ✅ FIXED: Access from Entity object
      entityTitle: entity.title,       // ✅ FIXED: Access from Entity object
      source,
      operationType
    });

    this._nodeDeletedSubject.next(payload);
  }

  /**
   * Emit entity moved event (hybrid: Observable + Signal)
   */
  emitEntityMoved(
    entity: Entity,  // ✅ FIXED: Entity object parameter
    sourceLocation: string,
    targetLocation: string,
    source: string,
    metadata?: any
  ): void {
    const payload: EntityMoveSignalPayload = {
      entity: entity,
      sourceLocation,
      targetLocation,
      source,
      metadata,
      timestamp: new Date()
    };

    console.log('📡 [CourseSignalService] Entity moved emitted (hybrid)', {
      entityType: entity.entityType,   // ✅ FIXED: Access from Entity object
      entityId: entity.id,             // ✅ FIXED: Access from Entity object
      entityTitle: entity.title,       // ✅ FIXED: Access from Entity object
      sourceLocation,
      targetLocation,
      source
    });

    this._nodeMovedSubject.next(payload);
  }

  // === LEGACY SUPPORT ===

  /**
   * @deprecated Use emitEntityAdded() instead for consistent naming
   */
  emitNodeAdded(
    node: Entity,  // ✅ FIXED: Entity object parameter
    source: string,
    operationType: OperationType = 'USER_ADD'
  ): void {
    console.log('[CourseSignalService] Legacy emitNodeAdded - delegating to emitEntityAdded');
    this.emitEntityAdded(node, source, operationType);
  }

  /**
   * @deprecated Use emitEntityEdited() instead for consistent naming
   */
  emitNodeEdited(
    node: Entity,  // ✅ FIXED: Entity object parameter
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    console.log('[CourseSignalService] Legacy emitNodeEdited - delegating to emitEntityEdited');
    this.emitEntityEdited(node, source, operationType);
  }

  /**
   * @deprecated Use emitEntityDeleted() instead for consistent naming
   */
  emitNodeDeleted(
    node: Entity,  // ✅ FIXED: Entity object parameter
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    console.log('[CourseSignalService] Legacy emitNodeDeleted - delegating to emitEntityDeleted');
    this.emitEntityDeleted(node, source, operationType);
  }

  /**
   * @deprecated Use emitEntityMoved() instead for consistent naming
   */
  emitNodeMoved(
    node: Entity,  // ✅ FIXED: Entity object parameter
    sourceLocation: string,
    targetLocation: string,
    source: string
  ): void {
    console.log('[CourseSignalService] Legacy emitNodeMoved - delegating to emitEntityMoved');
    this.emitEntityMoved(node, sourceLocation, targetLocation, source);
  }

  // === UTILITY METHODS ===

  /**
   * Reset all signals to null (for testing or cleanup)
   */
  resetAllSignals(): void {
    console.log('[CourseSignalService] Resetting all signals to null');
    this._nodeAddedSignal.set(null);
    this._nodeEditedSignal.set(null);
    this._nodeDeletedSignal.set(null);
    this._nodeMovedSignal.set(null);
  }

  /**
   * Check if any signals have active values
   */
  hasActiveSignals(): boolean {
    return !!(
      this._nodeAddedSignal() ||
      this._nodeEditedSignal() ||
      this._nodeDeletedSignal() ||
      this._nodeMovedSignal()
    );
  }

  /**
   * Get debug information about signal state
   */
  getDebugInfo(): any {
    return {
      signalService: {
        initialized: true,
        hasActiveSignals: this.hasActiveSignals(),
        signalTypes: ['entityAdded', 'nodeEdited', 'nodeDeleted', 'nodeMoved'],
        architecture: 'Subject-Signal Hybrid'
      },
      currentSignalValues: {
        nodeAdded: !!this._nodeAddedSignal(),
        nodeEdited: !!this._nodeEditedSignal(),
        nodeDeleted: !!this._nodeDeletedSignal(),
        nodeMoved: !!this._nodeMovedSignal()
      },
      serviceArchitecture: {
        pattern: 'Hybrid Subject-Signal Architecture',
        observableStreams: ['nodeAdded$', 'nodeEdited$', 'nodeDeleted$', 'nodeMoved$'],
        signalState: ['entityAdded', 'nodeEdited', 'nodeDeleted', 'nodeMoved'],
        dependencies: ['rxjs/Subject'],
        consumers: ['TreeEffectsService', 'ScheduleCoordinationService', 'TreeWrapper', 'Calendar components'],
        hasObservableEvents: true,
        hasSignalState: true
      }
    };
  }

  /**
   * Complete all Subjects on service destruction (for proper cleanup)
   */
  ngOnDestroy(): void {
    console.log('[CourseSignalService] Completing all Subject streams');
    this._nodeAddedSubject.complete();
    this._nodeEditedSubject.complete();
    this._nodeDeletedSubject.complete();
    this._nodeMovedSubject.complete();
  }
}
