// **COMPLETE FILE** - Enhanced calendar-event-interaction.service.ts with Observable patterns
// RESPONSIBILITY: Handle event mounting, DOM listeners, and interaction setup with Observable events
// DOES NOT: Generate templates, manage configuration, or handle business logic
// CALLED BY: CalendarConfigurationService for eventDidMount setup

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { CalendarEventTemplateService } from './calendar-event-template.service';

// ✅ Event interfaces for Observable pattern
export interface EventInteractionSetupEvent {
  eventId: string;
  eventTitle: string;
  eventType: string;
  interactionsAttached: string[];
  listenersAdded: string[];
  classesApplied: string[];
  timestamp: Date;
}

export interface ContextMenuTriggeredEvent {
  eventId: string;
  eventTitle: string;
  eventType: string;
  mousePosition: { x: number, y: number };
  triggerMethod: 'right-click' | 'touch-hold';
  timestamp: Date;
}

export interface EventDragInteractionEvent {
  eventId: string;
  eventTitle: string;
  dragState: 'start' | 'end' | 'hover-enter' | 'hover-leave';
  elementClasses: string[];
  timestamp: Date;
}

export interface PeriodBadgeAttachedEvent {
  eventId: string;
  eventTitle: string;
  period: number;
  badgeContent: string;
  periodAssignment: any;
  timestamp: Date;
}

export interface InteractionCleanupEvent {
  eventId: string;
  eventTitle: string;
  classesRemoved: string[];
  listenersRemoved: string[];
  cleanupReason: 'component-destroy' | 'event-remove' | 'manual-cleanup';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarEventInteractionService implements OnDestroy {

  // ✅ Observable event emissions
  private readonly _eventInteractionSetup = new Subject<EventInteractionSetupEvent>();
  private readonly _contextMenuTriggered = new Subject<ContextMenuTriggeredEvent>();
  private readonly _eventDragInteraction = new Subject<EventDragInteractionEvent>();
  private readonly _periodBadgeAttached = new Subject<PeriodBadgeAttachedEvent>();
  private readonly _interactionCleanup = new Subject<InteractionCleanupEvent>();

  // Public observables
  readonly eventInteractionSetup$ = this._eventInteractionSetup.asObservable();
  readonly contextMenuTriggered$ = this._contextMenuTriggered.asObservable();
  readonly eventDragInteraction$ = this._eventDragInteraction.asObservable();
  readonly periodBadgeAttached$ = this._periodBadgeAttached.asObservable();
  readonly interactionCleanup$ = this._interactionCleanup.asObservable();

  // ✅ Subscription management (for potential future Observable consumption)
  private subscriptions = new Subscription();

  constructor(private templateService: CalendarEventTemplateService) {
    console.log('[CalendarEventInteractionService] Enhanced with Observable patterns for event interaction coordination');
  }

  // === EVENT MOUNTING AND INTERACTION ===

  /**
   * ✅ Enhanced: Handle complete event mounting with Observable emission
   */
  mountEvent(
    info: any,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void
  ): void {
    console.log('[CalendarEventInteractionService] Mounting event with Observable event emission');

    const eventId = info.event.id;
    const eventTitle = info.event.title;
    const eventType = info.event.extendedProps?.eventType || 'standard';

    const interactionsAttached: string[] = [];
    const listenersAdded: string[] = [];
    const classesApplied: string[] = [];

    // Apply visual styling (delegate to template service)
    this.templateService.applyEventStyling(info);
    interactionsAttached.push('visual-styling');

    // Add interaction listeners (interaction responsibility)
    this.attachEventListeners(info, handleEventContextMenu, eventId, eventTitle, eventType);
    interactionsAttached.push('event-listeners');
    listenersAdded.push('contextmenu', 'click');

    // Apply interaction classes
    this.setupEventInteraction(info, eventId, eventTitle, eventType);
    interactionsAttached.push('interaction-setup');
    classesApplied.push('calendar-event-interactive');

    // ✅ Emit Observable event
    this._eventInteractionSetup.next({
      eventId,
      eventTitle,
      eventType,
      interactionsAttached,
      listenersAdded,
      classesApplied,
      timestamp: new Date()
    });

    console.log('[CalendarEventInteractionService] Event mounted and event emitted', {
      eventId,
      eventTitle,
      eventType,
      interactionsAttached
    });
  }

  /**
   * ✅ Enhanced: Attach DOM event listeners with Observable emission
   */
  private attachEventListeners(
    info: any,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void,
    eventId: string,
    eventTitle: string,
    eventType: string
  ): void {
    console.log('[CalendarEventInteractionService] Attaching listeners to event:', eventTitle);

    // FIXED: Actually implement the context menu listener
    const contextMenuHandler = (e: MouseEvent) => {
      console.log('[CalendarEventInteractionService] Context menu event triggered on:', eventTitle);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // ✅ Emit Observable event for context menu
      this._contextMenuTriggered.next({
        eventId,
        eventTitle,
        eventType,
        mousePosition: { x: e.clientX, y: e.clientY },
        triggerMethod: 'right-click',
        timestamp: new Date()
      });

      handleEventContextMenu(info, e);
    };

    // Attach the context menu listener
    info.el.addEventListener('contextmenu', contextMenuHandler, { passive: false });

    // Store reference for potential cleanup
    (info.el as any).__contextMenuHandler = contextMenuHandler;
    (info.el as any).__eventId = eventId;
    (info.el as any).__eventTitle = eventTitle;

    // DIAGNOSTIC: Also add a click listener to test if events are working
    const clickHandler = (e: MouseEvent) => {
      console.log('[CalendarEventInteractionService] Click event on:', eventTitle);
      e.stopPropagation(); // Prevent interference

      // Could emit click event here if needed for coordination
    };

    info.el.addEventListener('click', clickHandler, { passive: false });
    (info.el as any).__clickHandler = clickHandler;
  }

  /**
   * ✅ Enhanced: Setup event element for interaction with Observable emission
   */
  private setupEventInteraction(
    info: any,
    eventId: string,
    eventTitle: string,
    eventType: string
  ): void {
    // Make events clearly interactive
    info.el.style.cursor = 'pointer';
    info.el.style.position = 'relative';
    info.el.style.zIndex = '1';

    // Add interaction classes for CSS styling
    info.el.classList.add('calendar-event-interactive');

    // Setup for potential drag/drop feedback
    this.setupDragInteraction(info, eventId, eventTitle);
  }

  /**
   * ✅ Enhanced: Setup drag and drop interaction with Observable emission
   */
  private setupDragInteraction(info: any, eventId: string, eventTitle: string): void {
    // Add hover effects for drag indication
    info.el.addEventListener('mouseenter', () => {
      info.el.classList.add('calendar-event-hover');

      // ✅ Emit Observable event
      this._eventDragInteraction.next({
        eventId,
        eventTitle,
        dragState: 'hover-enter',
        elementClasses: Array.from(info.el.classList),
        timestamp: new Date()
      });
    });

    info.el.addEventListener('mouseleave', () => {
      info.el.classList.remove('calendar-event-hover');

      // ✅ Emit Observable event
      this._eventDragInteraction.next({
        eventId,
        eventTitle,
        dragState: 'hover-leave',
        elementClasses: Array.from(info.el.classList),
        timestamp: new Date()
      });
    });

    // Add drag start/end classes for visual feedback
    info.el.addEventListener('dragstart', () => {
      info.el.classList.add('calendar-event-dragging');

      // ✅ Emit Observable event
      this._eventDragInteraction.next({
        eventId,
        eventTitle,
        dragState: 'start',
        elementClasses: Array.from(info.el.classList),
        timestamp: new Date()
      });
    });

    info.el.addEventListener('dragend', () => {
      info.el.classList.remove('calendar-event-dragging');

      // ✅ Emit Observable event
      this._eventDragInteraction.next({
        eventId,
        eventTitle,
        dragState: 'end',
        elementClasses: Array.from(info.el.classList),
        timestamp: new Date()
      });
    });
  }

  /**
   * ✅ Enhanced: Create and attach period badge with Observable emission
   */
  attachPeriodBadge(eventElement: HTMLElement, period: number, periodAssignment: any): void {
    const badge = this.templateService.createPeriodBadge(period, periodAssignment);
    eventElement.style.position = 'relative';
    eventElement.appendChild(badge);

    // Extract event details from element for Observable emission
    const eventId = (eventElement as any).__eventId || 'unknown';
    const eventTitle = (eventElement as any).__eventTitle || 'Unknown Event';
    const badgeContent = badge.textContent || `Period ${period}`;

    // ✅ Emit Observable event
    this._periodBadgeAttached.next({
      eventId,
      eventTitle,
      period,
      badgeContent,
      periodAssignment,
      timestamp: new Date()
    });

    console.log('[CalendarEventInteractionService] Period badge attached and event emitted', {
      eventId,
      eventTitle,
      period,
      badgeContent
    });
  }

  /**
   * Apply event type-specific interaction setup
   */
  setupEventTypeInteraction(element: HTMLElement, scheduleEvent: any): void {
    // Different interaction patterns for different event types
    if (scheduleEvent?.eventType === 'Error') {
      element.classList.add('error-event-interaction');
      // Error events might have different interaction patterns
    } else if (scheduleEvent?.eventCategory === 'Lesson') {
      element.classList.add('lesson-event-interaction');
      // Lesson events might have rich interaction
    } else {
      element.classList.add('standard-event-interaction');
    }
  }

  /**
   * ✅ Enhanced: Cleanup event listeners and interaction state with Observable emission
   */
  cleanupEventInteraction(element: HTMLElement, reason: 'component-destroy' | 'event-remove' | 'manual-cleanup' = 'manual-cleanup'): void {
    const eventId = (element as any).__eventId || 'unknown';
    const eventTitle = (element as any).__eventTitle || 'Unknown Event';

    const classesRemoved: string[] = [];
    const listenersRemoved: string[] = [];

    // Remove interaction classes
    const classesToRemove = [
      'calendar-event-interactive',
      'calendar-event-hover',
      'calendar-event-dragging',
      'error-event-interaction',
      'lesson-event-interaction',
      'standard-event-interaction'
    ];

    classesToRemove.forEach(className => {
      if (element.classList.contains(className)) {
        element.classList.remove(className);
        classesRemoved.push(className);
      }
    });

    // Note: Event listeners are automatically cleaned up when element is removed from DOM
    // But we track what would be removed for Observable emission
    if ((element as any).__contextMenuHandler) {
      listenersRemoved.push('contextmenu');
    }
    if ((element as any).__clickHandler) {
      listenersRemoved.push('click');
    }

    // ✅ Emit Observable event
    this._interactionCleanup.next({
      eventId,
      eventTitle,
      classesRemoved,
      listenersRemoved,
      cleanupReason: reason,
      timestamp: new Date()
    });

    console.log('[CalendarEventInteractionService] Interaction cleanup completed and event emitted', {
      eventId,
      eventTitle,
      classesRemoved,
      listenersRemoved,
      reason
    });
  }

  // === DEBUG AND UTILITY ===

  /**
   * Get debug info about interaction setup
   */
  getDebugInfo(): any {
    return {
      interactionService: {
        initialized: true,
        canSetupInteractions: true,
        observablePatterns: {
          eventInteractionSetup: true,
          contextMenuTriggered: true,
          eventDragInteraction: true,
          periodBadgeAttached: true,
          interactionCleanup: true
        },
        supportedInteractions: [
          'contextMenu',
          'dragDrop',
          'hover',
          'periodBadges',
          'observableEventEmission'
        ]
      }
    };
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[CalendarEventInteractionService] Cleaning up Observable subscriptions and subjects');

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // ✅ Complete subjects
    this._eventInteractionSetup.complete();
    this._contextMenuTriggered.complete();
    this._eventDragInteraction.complete();
    this._periodBadgeAttached.complete();
    this._interactionCleanup.complete();

    console.log('[CalendarEventInteractionService] All Observable subjects and subscriptions completed');
  }
}
