// **PARTIAL FILE** - Update CourseSignalService to use proper Observable event pattern

import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import type { OperationType } from './course-data.service';


// Export types for other services
export interface NodeSignalPayload {
  node: any;
  source: string;
  operationType: string;
  timestamp: Date;
}

export interface NodeMoveSignalPayload {
  node: any;
  oldParent: any;
  newParent: any;
  source: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CourseSignalService {

  constructor() {
    console.log('[CourseSignalService] Enhanced with Observable event pattern for proper event handling');
  }

  private readonly _nodeAdded$ = new Subject<NodeSignalPayload>();
  private readonly _nodeEdited$ = new Subject<NodeSignalPayload>();
  private readonly _nodeDeleted$ = new Subject<NodeSignalPayload>();
  private readonly _nodeMoved$ = new Subject<NodeMoveSignalPayload>();

  // Public observables for subscription (emit once, consume once)
  readonly nodeAdded$: Observable<NodeSignalPayload> = this._nodeAdded$.asObservable();
  readonly nodeEdited$: Observable<NodeSignalPayload> = this._nodeEdited$.asObservable();
  readonly nodeDeleted$: Observable<NodeSignalPayload> = this._nodeDeleted$.asObservable();
  readonly nodeMoved$: Observable<NodeMoveSignalPayload> = this._nodeMoved$.asObservable();


  // ===== OBSERVABLE EVENT EMISSION METHODS =====

  /**
   * Emit node added event (Observable pattern - emit once, consume once)
   */
  emitNodeAddedEvent(
    node: any,
    source: string,
    operationType: OperationType = 'USER_ADD'
  ): void {
    const payload: NodeSignalPayload = {
      node,
      source,
      operationType,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING nodeAdded EVENT (Observable)', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      nodeTitle: node.title,
      source,
      operationType,
      timestamp: payload.timestamp.toISOString(),
      pattern: 'Observable - emit once, consume once'
    });

    this._nodeAdded$.next(payload);
  }

  /**
   * Emit node edited event
   */
  emitNodeEditedEvent(
    node: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    const payload: NodeSignalPayload = {
      node,
      source,
      operationType,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING nodeEdited EVENT (Observable)', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      nodeTitle: node.title,
      source,
      operationType
    });

    this._nodeEdited$.next(payload);
  }

  /**
   * Emit node deleted event
   */
  emitNodeDeletedEvent(
    node: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    const payload: NodeSignalPayload = {
      node,
      source,
      operationType,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING nodeDeleted EVENT (Observable)', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      nodeTitle: node.title,
      source,
      operationType
    });

    this._nodeDeleted$.next(payload);
  }

  /**
   * Emit node moved event
   */
  emitNodeMovedEvent(
    node: any,
    oldParent: any,
    newParent: any,
    source: string
  ): void {
    const payload: NodeMoveSignalPayload = {
      node,
      oldParent,
      newParent,
      source,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING nodeMoved EVENT (Observable)', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      nodeTitle: node.title,
      source
    });

    this._nodeMoved$.next(payload);
  }


  // ===== LEGACY: SIGNAL PATTERN (Keep for backward compatibility during migration) =====
  private readonly _nodeAdded = signal<NodeSignalPayload | null>(null);
  private readonly _nodeEdited = signal<NodeSignalPayload | null>(null);
  private readonly _nodeDeleted = signal<NodeSignalPayload | null>(null);
  private readonly _nodeMoved = signal<NodeMoveSignalPayload | null>(null);

  // Legacy signal accessors (keep existing API during migration)
  readonly nodeAdded = this._nodeAdded.asReadonly();
  readonly nodeEdited = this._nodeEdited.asReadonly();
  readonly nodeDeleted = this._nodeDeleted.asReadonly();
  readonly nodeMoved = this._nodeMoved.asReadonly();

  /**
   * LEGACY: Emit node added signal (will be deprecated)
   * @deprecated Use emitNodeAddedEvent() instead for proper event handling
   */
  emitNodeAdded(
    node: any,
    source: string,
    operationType: OperationType = 'USER_ADD'
  ): void {
    const payload: NodeSignalPayload = {
      node,
      source,
      operationType,
      timestamp: new Date()
    };

    console.log('🚨 [CourseSignalService] EMITTING nodeAdded signal (LEGACY)', {
      nodeType: node.nodeType,
      nodeId: node.nodeId,
      nodeTitle: node.title,
      source,
      operationType,
      deprecationWarning: 'Use emitNodeAddedEvent() for proper event handling'
    });

    this._nodeAdded.set(payload);
  }

  /**
   * LEGACY: Emit node edited signal (will be deprecated)
   * @deprecated Use emitNodeEditedEvent() instead
   */
  emitNodeEdited(
    node: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    const payload: NodeSignalPayload = {
      node,
      source,
      operationType,
      timestamp: new Date()
    };

    this._nodeEdited.set(payload);
  }

  /**
   * LEGACY: Emit node deleted signal (will be deprecated)
   * @deprecated Use emitNodeDeletedEvent() instead
   */
  emitNodeDeleted(
    node: any,
    source: string,
    operationType: OperationType = 'API_RESPONSE'
  ): void {
    const payload: NodeSignalPayload = {
      node,
      source,
      operationType,
      timestamp: new Date()
    };

    this._nodeDeleted.set(payload);
  }

  /**
   * LEGACY: Emit node moved signal (will be deprecated)
   * @deprecated Use emitNodeMovedEvent() instead
   */
  emitNodeMoved(
    node: any,
    sourceLocation: string,
    targetLocation: string,
    source: string
  ): void {
    const payload: NodeMoveSignalPayload = {
      node,
      oldParent: sourceLocation,
      newParent: targetLocation,
      source,
      timestamp: new Date()
    };

    this._nodeMoved.set(payload);
  }
}
