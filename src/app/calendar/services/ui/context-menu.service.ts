// **FACADE FILE** - ContextMenuService - Temporary Facade for Easy Cleanup
// RESPONSIBILITY: Facade pattern - delegates to coordination service
// SCOPE: Temporary compatibility layer (REMOVE after dependent services updated)
// RATIONALE: Maintains existing API while allowing gradual migration to new services

import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { EventClickArg } from '@fullcalendar/core';
import {
  ContextMenuCoordinationService,
  ContextMenuGenerationEvent,
  ContextMenuInteractionEvent, ContextStateChangeEvent
} from '../coordination/context-menu-coordination.service';


export interface ContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService implements OnDestroy {

  // === FACADE PROPERTIES - Delegate to coordination service ===
  readonly interactionCompleted$: Observable<ContextMenuInteractionEvent>;
  readonly menuGenerated$: Observable<ContextMenuGenerationEvent>;
  readonly contextStateChanged$: Observable<ContextStateChangeEvent>;

  constructor(private coordinationService: ContextMenuCoordinationService) {
    console.log('[ContextMenuService] FACADE initialized - delegates to coordination service');

    // Expose coordination service observables
    this.interactionCompleted$ = this.coordinationService.interactionCompleted$;
    this.menuGenerated$ = this.coordinationService.menuGenerated$;
    this.contextStateChanged$ = this.coordinationService.contextStateChanged$;
  }

  // === FACADE METHODS - Delegate all operations to coordination service ===

  /**
   * FACADE: Set event context
   */
  setEventContext(event: EventClickArg): void {
    console.log('[ContextMenuService] FACADE: Delegating setEventContext to coordination service');
    return this.coordinationService.setEventContext(event);
  }

  /**
   * FACADE: Set date context
   */
  setDateContext(date: Date): void {
    console.log('[ContextMenuService] FACADE: Delegating setDateContext to coordination service');
    return this.coordinationService.setDateContext(date);
  }

  /**
   * FACADE: Clear context
   */
  clearContext(): void {
    console.log('[ContextMenuService] FACADE: Delegating clearContext to coordination service');
    return this.coordinationService.clearContext();
  }

  /**
   * FACADE: Get context menu actions
   */
  getContextMenuActions(): ContextMenuAction[] {
    console.log('[ContextMenuService] FACADE: Delegating getContextMenuActions to coordination service');
    return this.coordinationService.getContextMenuActions();
  }

  // === FACADE DELEGATION METHODS ===

  /**
   * FACADE: Get current context state
   */
  getCurrentContextState() {
    return this.coordinationService.getCurrentContextState();
  }

  /**
   * FACADE: Get context date
   */
  getContextDate() {
    return this.coordinationService.getContextDate();
  }

  /**
   * FACADE: Validate action
   */
  validateAction(actionId: string) {
    return this.coordinationService.validateAction(actionId);
  }

  /**
   * FACADE: Check if lesson event
   */
  isLessonEvent(event: EventClickArg) {
    return this.coordinationService.isLessonEvent(event);
  }

  /**
   * FACADE: Check if special day event
   */
  isSpecialDayEvent(event: EventClickArg) {
    return this.coordinationService.isSpecialDayEvent(event);
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[ContextMenuService] FACADE cleanup - coordination service handles actual cleanup');
    // Coordination service handles its own cleanup
  }
}
