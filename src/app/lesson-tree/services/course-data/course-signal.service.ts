// **COMPLETE FILE** - CourseSignalService with proper Observable event pattern
// RESPONSIBILITY: Pure signal emission service with Observable events for cross-component workflows
// DOES NOT: Handle business logic, API operations, or state management - pure event emission
// CALLED BY: CourseDataService and other services for entity lifecycle event emission

import { Injectable, OnDestroy } from '@angular/core';
import { signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import type { OperationType } from './course-data.service';

// ✅ Enhanced event interfaces with better typing
export interface NodeSignalPayload {
  node: any;
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

export interface NodeMoveSignalPayload {
  node: any;
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

// ✅ NEW: Signal coordination event for debugging and monitoring
export interface SignalCoordinationEvent {
  signalType: 'node-added' | 'node-edited' | 'node-deleted' | 'node-moved';
  emissionMethod: 'observable' | 'signal' | 'both';
  entityDetails: {
    entityType: string;
    entityId: number;
    entityTitle: string;
  };
  source: string;
  operationType?: OperationType;
  subscriberCount?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CourseSignalService implements OnDestroy {

  // ✅ PRIMARY: Observable event emissions (preferred pattern)
  private readonly _nodeAdded$ = new Subject<NodeSignalPayload>();
  private readonly _nodeEdited$ = new Subject<NodeSignalPayload>();
  private readonly _nodeDeleted$ = new Subject<NodeSignalPayload>();
  private readonly _nodeMoved$ = new Subject<NodeMoveSignalPayload>();

  // ✅ NEW: Signal coordination tracking
  private readonly _signalCoordinated$ = new Subject<SignalCoordinationEvent>();

  // Public observables for subscription (emit once, consume once)
  readonly nodeAdded$: Observable<NodeSignalPayload> = this._nodeAdded$.asObservable();
  readonly nodeEdited$: Observable<NodeSignalPayload> = this._nodeEdited$.asObservable();
  readonly nodeDeleted$: Observable<NodeSignalPayload> = this._nodeDeleted$.asObservable();
  readonly nodeMoved$: Observable<NodeMoveSignalPayload> = this._nodeMoved$.asObservable();
  readonly signalCoordinated$: Observable<SignalCoordinationEvent> = this._signalCoordinated$.asObservable();

  // ✅ SECONDARY: Signal pattern (for UI reactivity)
  private readonly _nodeAdded = signal<NodeSignalPayload | null>(null);
  private readonly _nodeEdited = signal<NodeSignalPayload | null>(null);
  private readonly _nodeDeleted = signal<NodeSignalPayload | null>(null);
  private readonly _nodeMoved = signal<NodeMoveSignalPayload | null>(null);

  // Signal accessors (readonly for external access)
  readonly nodeAdded = this._nodeAdded.asReadonly();
  readonly nodeEdited = this._nodeEdited.asReadonly();
  readonly nodeDeleted = this._nodeDeleted.asReadonly();
  readonly nodeMoved = this._nodeMoved.asReadonly();

  constructor() {
    console.log('[CourseSignalService] Enhanced with dual Signal/Observable pattern - pure emission service');
  }

  // ✅ PREFERRED: Observable event emission methods (primary API)

  /**
   * ✅ Enhanced: Emit entity added event with dual pattern
   */
  emitEntityAdded(
    entity: any,
    source: string,
    operationType: OperationType = 'USER_ADD',
    metadata?: any
  ): void {
    const payload: NodeSignalPayload = {
      node: entity,
      source,
      operationType,
      metadata,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING entityAdded (Dual Pattern)', {
      entityType: entity.nodeType,
      entityId: entity.id,
      entityTitle: entity.title,
      source,
      operationType,
      timestamp: payload.timestamp.toISOString(),
      pattern: 'Observable + Signal'
    });

    // ✅ Emit Observable event (primary)
    this._nodeAdded$.next(payload);

    // ✅ Update Signal (secondary - for UI reactivity)
    this._nodeAdded.set(payload);

    // ✅ Emit coordination tracking event
    this._signalCoordinated$.next({
      signalType: 'node-added',
      emissionMethod: 'both',
      entityDetails: {
        entityType: entity.nodeType,
        entityId: entity.id,
        entityTitle: entity.title || 'Unknown'
      },
      source,
      operationType,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced: Emit entity edited event with dual pattern
   */
  emitEntityEdited(
    entity: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE',
    metadata?: any
  ): void {
    const payload: NodeSignalPayload = {
      node: entity,
      source,
      operationType,
      metadata,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING entityEdited (Dual Pattern)', {
      entityType: entity.nodeType,
      entityId: entity.id,
      entityTitle: entity.title,
      source,
      operationType
    });

    // ✅ Emit Observable event (primary)
    this._nodeEdited$.next(payload);

    // ✅ Update Signal (secondary)
    this._nodeEdited.set(payload);

    // ✅ Emit coordination tracking event
    this._signalCoordinated$.next({
      signalType: 'node-edited',
      emissionMethod: 'both',
      entityDetails: {
        entityType: entity.nodeType,
        entityId: entity.id,
        entityTitle: entity.title || 'Unknown'
      },
      source,
      operationType,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced: Emit entity deleted event with dual pattern
   */
  emitEntityDeleted(
    entity: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE',
    metadata?: any
  ): void {
    const payload: NodeSignalPayload = {
      node: entity,
      source,
      operationType,
      metadata,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING entityDeleted (Dual Pattern)', {
      entityType: entity.nodeType,
      entityId: entity.id,
      entityTitle: entity.title,
      source,
      operationType
    });

    // ✅ Emit Observable event (primary)
    this._nodeDeleted$.next(payload);

    // ✅ Update Signal (secondary)
    this._nodeDeleted.set(payload);

    // ✅ Emit coordination tracking event
    this._signalCoordinated$.next({
      signalType: 'node-deleted',
      emissionMethod: 'both',
      entityDetails: {
        entityType: entity.nodeType,
        entityId: entity.id,
        entityTitle: entity.title || 'Unknown'
      },
      source,
      operationType,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced: Emit entity moved event with dual pattern
   */
  emitEntityMoved(
    entity: any,
    sourceLocation: string,
    targetLocation: string,
    source: string,
    metadata?: any
  ): void {
    const payload: NodeMoveSignalPayload = {
      node: entity,
      sourceLocation,
      targetLocation,
      source,
      metadata,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING entityMoved (Dual Pattern)', {
      entityType: entity.nodeType,
      entityId: entity.id,
      entityTitle: entity.title,
      sourceLocation,
      targetLocation,
      source
    });

    // ✅ Emit Observable event (primary)
    this._nodeMoved$.next(payload);

    // ✅ Update Signal (secondary)
    this._nodeMoved.set(payload);

    // ✅ Emit coordination tracking event
    this._signalCoordinated$.next({
      signalType: 'node-moved',
      emissionMethod: 'both',
      entityDetails: {
        entityType: entity.nodeType,
        entityId: entity.id,
        entityTitle: entity.title || 'Unknown'
      },
      source,
      timestamp: new Date()
    });
  }

  // ✅ LEGACY SUPPORT: Original method names (delegate to new methods)

  /**
   * @deprecated Use emitEntityAdded() instead for consistent naming
   */
  emitNodeAdded(
    node: any,
    source: string,
    operationType: OperationType = 'USER_ADD'
  ): void {
    console.log('[CourseSignalService] LEGACY emitNodeAdded - delegating to emitEntityAdded');
    this.emitEntityAdded(node, source, operationType);
  }

  /**
   * @deprecated Use emitEntityEdited() instead for consistent naming
   */
  emitNodeEdited(
    node: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    console.log('[CourseSignalService] LEGACY emitNodeEdited - delegating to emitEntityEdited');
    this.emitEntityEdited(node, source, operationType);
  }

  /**
   * @deprecated Use emitEntityDeleted() instead for consistent naming
   */
  emitNodeDeleted(
    node: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    console.log('[CourseSignalService] LEGACY emitNodeDeleted - delegating to emitEntityDeleted');
    this.emitEntityDeleted(node, source, operationType);
  }

  /**
   * @deprecated Use emitEntityMoved() instead for consistent naming
   */
  emitNodeMoved(
    node: any,
    sourceLocation: string,
    targetLocation: string,
    source: string
  ): void {
    console.log('[CourseSignalService] LEGACY emitNodeMoved - delegating to emitEntityMoved');
    this.emitEntityMoved(node, sourceLocation, targetLocation, source);
  }

  // ✅ UTILITY METHODS

  /**
   * ✅ Get emission statistics for debugging
   */
  getEmissionStats(): {
    totalEmissions: number;
    emissionsByType: Record<string, number>;
    lastEmissionTime?: Date;
  } {
    // This could be enhanced with actual tracking if needed
    return {
      totalEmissions: 0,
      emissionsByType: {
        'entity-added': 0,
        'entity-edited': 0,
        'entity-deleted': 0,
        'entity-moved': 0
      },
      lastEmissionTime: undefined
    };
  }

  /**
   * ✅ Reset all signals to null (for testing or cleanup)
   */
  resetAllSignals(): void {
    console.log('[CourseSignalService] Resetting all signals to null');
    this._nodeAdded.set(null);
    this._nodeEdited.set(null);
    this._nodeDeleted.set(null);
    this._nodeMoved.set(null);
  }

  /**
   * ✅ Check if any signals have active values
   */
  hasActiveSignals(): boolean {
    return !!(
      this._nodeAdded() ||
      this._nodeEdited() ||
      this._nodeDeleted() ||
      this._nodeMoved()
    );
  }

  // ✅ CLEANUP

  /**
   * ✅ Complete all Observable subjects
   */
  ngOnDestroy(): void {
    console.log('[CourseSignalService] Cleaning up Observable subjects');

    this._nodeAdded$.complete();
    this._nodeEdited$.complete();
    this._nodeDeleted$.complete();
    this._nodeMoved$.complete();
    this._signalCoordinated$.complete();

    console.log('[CourseSignalService] All Observable subjects completed');
  }
}
