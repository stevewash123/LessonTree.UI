// **COMPLETE FILE** - ContextMenuCoordinationService - Observable Events & State Coordination
// RESPONSIBILITY: Observable event management and context state coordination for context menu operations
// SCOPE: Observable patterns and state coordination only (action execution in separate service)
// RATIONALE: Event coordination separated from action execution for maintainability

import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { EventClickArg } from '@fullcalendar/core';

import { ContextMenuBusinessService, ContextMenuAction, ContextMenuResult } from '../business/context-menu-business.service';
import { ContextMenuHandlerService, ActionExecutionResult } from '../ui/context-menu-handler.service';

// ✅ Observable event interfaces for user interaction workflows
export interface ContextMenuInteractionEvent {
  action: 'view-lesson' | 'edit-lesson' | 'reschedule-lesson' | 'add-special-day' | 'edit-special-day' | 'delete-special-day' | 'view-error' | 'add-activity' | 'view-details';
  success: boolean;
  contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only';
  eventId?: number;
  lessonId?: number;
  lessonTitle?: string;
  period?: number;
  date?: Date;
  eventType?: string;
  error?: Error;
  timestamp: Date;
}

export interface ContextMenuGenerationEvent {
  contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only' | 'no-context';
  actionCount: number;
  availableActions: string[];
  hasEventContext: boolean;
  hasDateContext: boolean;
  period?: number;
  eventType?: string;
  timestamp: Date;
}

export interface ContextStateChangeEvent {
  changeType: 'event-context-set' | 'date-context-set' | 'context-cleared';
  previousContext?: 'event' | 'date' | 'none';
  newContext: 'event' | 'date' | 'none';
  eventTitle?: string;
  date?: Date;
  period?: number;
  timestamp: Date;
}

// Legacy interface for backward compatibility
export interface LegacyContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuCoordinationService implements OnDestroy {

  // ✅ Observable events for cross-component coordination
  private readonly _interactionCompleted$ = new Subject<ContextMenuInteractionEvent>();
  private readonly _menuGenerated$ = new Subject<ContextMenuGenerationEvent>();
  private readonly _contextStateChanged$ = new Subject<ContextStateChangeEvent>();

  // Public observables
  readonly interactionCompleted$ = this._interactionCompleted$.asObservable();
  readonly menuGenerated$ = this._menuGenerated$.asObservable();
  readonly contextStateChanged$ = this._contextStateChanged$.asObservable();

  constructor(
    private businessService: ContextMenuBusinessService,
    private handlerService: ContextMenuHandlerService
  ) {
    console.log('[ContextMenuCoordinationService] Observable coordination patterns for context menu state and events');
  }

  // === COORDINATED CONTEXT MANAGEMENT ===

  setEventContextWithCoordination(event: EventClickArg): void {
    console.log('[ContextMenuCoordinationService] Setting event context with coordination');

    const previousContext = this.businessService.getCurrentContextType();
    const contextState = this.businessService.setEventContext(event);

    if (contextState.type === 'event') {
      // ✅ Emit context state change event
      this._contextStateChanged$.next({
        changeType: 'event-context-set',
        previousContext,
        newContext: 'event',
        eventTitle: contextState.metadata.eventTitle,
        date: contextState.event?.event?.start ? new Date(contextState.event.event.start) : undefined,
        period: contextState.metadata.period,
        timestamp: new Date()
      });
    } else {
      // ✅ Emit context state change for invalid event
      this._contextStateChanged$.next({
        changeType: 'context-cleared',
        previousContext,
        newContext: 'none',
        timestamp: new Date()
      });
    }
  }

  setDateContextWithCoordination(date: Date): void {
    console.log('[ContextMenuCoordinationService] Setting date context with coordination');

    const previousContext = this.businessService.getCurrentContextType();
    this.businessService.setDateContext(date);

    // ✅ Emit context state change event
    this._contextStateChanged$.next({
      changeType: 'date-context-set',
      previousContext,
      newContext: 'date',
      date,
      timestamp: new Date()
    });
  }

  clearContextWithCoordination(): void {
    console.log('[ContextMenuCoordinationService] Clearing context with coordination');

    const previousContext = this.businessService.getCurrentContextType();
    this.businessService.clearContext();

    // ✅ Emit context state change event
    this._contextStateChanged$.next({
      changeType: 'context-cleared',
      previousContext,
      newContext: 'none',
      timestamp: new Date()
    });
  }

  // === COORDINATED MENU GENERATION ===

  getContextMenuActionsWithCoordination(): LegacyContextMenuAction[] {
    console.log('[ContextMenuCoordinationService] Generating context menu actions with coordination');

    const result = this.businessService.generateContextMenuActions();

    // ✅ Emit menu generation event
    this._menuGenerated$.next({
      contextType: result.contextType,
      actionCount: result.actions.length,
      availableActions: result.actions.map(a => a.id),
      hasEventContext: result.hasEventContext,
      hasDateContext: result.hasDateContext,
      period: result.period,
      eventType: result.eventType,
      timestamp: new Date()
    });

    // Convert to legacy format with handlers
    return result.actions.map(action => ({
      id: action.id,
      label: action.label,
      handler: () => this.executeActionWithCoordination(action)
    }));
  }

  // === ACTION EXECUTION WITH COORDINATION ===

  private executeActionWithCoordination(action: ContextMenuAction): void {
    console.log(`[ContextMenuCoordinationService] Executing action: ${action.actionType} with coordination`);

    try {
      // Execute action through handler service
      const result = this.handlerService.executeAction(action);

      if (result.success) {
        // ✅ Emit successful interaction event
        this._interactionCompleted$.next({
          action: result.actionType as any,
          success: true,
          contextType: result.contextType as any,
          lessonId: result.metadata?.lessonId,
          lessonTitle: result.metadata?.lessonTitle,
          period: result.metadata?.period,
          date: result.metadata?.date,
          eventType: result.metadata?.eventType,
          timestamp: new Date()
        });
      } else {
        // ✅ Emit failed interaction event
        this._interactionCompleted$.next({
          action: result.actionType as any,
          success: false,
          contextType: result.contextType as any,
          error: result.error,
          timestamp: new Date()
        });
      }
    } catch (error: any) {
      console.error(`[ContextMenuCoordinationService] Error executing action ${action.actionType}:`, error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: action.actionType,
        success: false,
        contextType: action.contextType,
        error,
        timestamp: new Date()
      });
    }
  }

  // === DELEGATION METHODS - Direct access to business operations ===

  /**
   * Delegates to business service for operations that don't need coordination events
   */
  getCurrentContextState() {
    return this.businessService.getCurrentContextState();
  }

  getContextDate() {
    return this.businessService.getContextDate();
  }

  validateAction(actionId: string) {
    return this.businessService.validateAction(actionId);
  }

  isLessonEvent(event: EventClickArg) {
    return this.businessService.isLessonEvent(event);
  }

  isSpecialDayEvent(event: EventClickArg) {
    return this.businessService.isSpecialDayEvent(event);
  }

  // === FACADE METHODS - Maintain backward compatibility ===

  /**
   * FACADE: Set event context (maintains original interface)
   */
  setEventContext(event: EventClickArg): void {
    this.setEventContextWithCoordination(event);
  }

  /**
   * FACADE: Set date context (maintains original interface)
   */
  setDateContext(date: Date): void {
    this.setDateContextWithCoordination(date);
  }

  /**
   * FACADE: Clear context (maintains original interface)
   */
  clearContext(): void {
    this.clearContextWithCoordination();
  }

  /**
   * FACADE: Get context menu actions (maintains original interface)
   */
  getContextMenuActions(): LegacyContextMenuAction[] {
    return this.getContextMenuActionsWithCoordination();
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[ContextMenuCoordinationService] Cleaning up Observable subjects');

    // ✅ Complete Observable subjects
    this._interactionCompleted$.complete();
    this._menuGenerated$.complete();
    this._contextStateChanged$.complete();

    console.log('[ContextMenuCoordinationService] All Observable subjects completed');
  }
}
