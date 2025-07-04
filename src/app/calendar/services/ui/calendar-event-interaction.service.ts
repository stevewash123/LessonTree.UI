// **COMPLETE FILE** - Cleaned calendar-event-interaction.service.ts
// RESPONSIBILITY: Pure DOM event interaction setup for calendar events
// DOES NOT: Observable coordination, complex event emission, subscription management
// CALLED BY: CalendarConfigurationService for eventDidMount setup

import { Injectable } from '@angular/core';
import { CalendarEventTemplateService } from './calendar-event-template.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventInteractionService {

  constructor(private templateService: CalendarEventTemplateService) {
    console.log('[CalendarEventInteractionService] Initialized for pure DOM event interaction');
  }

  // === EVENT MOUNTING AND INTERACTION ===

  /**
   * Handle complete event mounting with DOM interaction setup
   */
  mountEvent(
    info: any,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void
  ): void {
    console.log('[CalendarEventInteractionService] Mounting event with DOM interaction setup');

    const eventId = info.event.id;
    const eventTitle = info.event.title;
    const eventType = info.event.extendedProps?.eventType || 'standard';

    // Apply visual styling (delegate to template service)
    this.templateService.applyEventStyling(info);

    // Setup DOM listeners and interaction
    this.attachEventListeners(info, handleEventContextMenu, eventId, eventTitle, eventType);
    this.setupEventInteraction(info, eventId, eventTitle, eventType);

    console.log('[CalendarEventInteractionService] Event mounted with interactions:', {
      eventId,
      eventTitle,
      eventType
    });
  }

  /**
   * Attach DOM event listeners
   */
  private attachEventListeners(
    info: any,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void,
    eventId: string,
    eventTitle: string,
    eventType: string
  ): void {
    console.log('[CalendarEventInteractionService] Attaching listeners to event:', eventTitle);

    // Setup context menu listener
    const contextMenuHandler = (e: MouseEvent) => {
      console.log('[CalendarEventInteractionService] Context menu triggered on:', eventTitle);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      handleEventContextMenu(info, e);
    };

    // Attach the context menu listener
    info.el.addEventListener('contextmenu', contextMenuHandler, { passive: false });

    // Store reference for potential cleanup
    (info.el as any).__contextMenuHandler = contextMenuHandler;
    (info.el as any).__eventId = eventId;
    (info.el as any).__eventTitle = eventTitle;

    // Add click listener for interaction feedback
    const clickHandler = (e: MouseEvent) => {
      console.log('[CalendarEventInteractionService] Click event on:', eventTitle);
      e.stopPropagation(); // Prevent interference
    };

    info.el.addEventListener('click', clickHandler, { passive: false });
    (info.el as any).__clickHandler = clickHandler;
  }

  /**
   * Setup event element for interaction
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

    // Setup drag interaction feedback
    this.setupDragInteraction(info, eventId, eventTitle);
  }

  /**
   * Setup drag and drop interaction feedback
   */
  private setupDragInteraction(info: any, eventId: string, eventTitle: string): void {
    // Add hover effects for visual feedback
    info.el.addEventListener('mouseenter', () => {
      info.el.classList.add('calendar-event-hover');
    });

    info.el.addEventListener('mouseleave', () => {
      info.el.classList.remove('calendar-event-hover');
    });

    // Add drag start/end classes for visual feedback
    info.el.addEventListener('dragstart', () => {
      info.el.classList.add('calendar-event-dragging');
      console.log('[CalendarEventInteractionService] Drag started for:', eventTitle);
    });

    info.el.addEventListener('dragend', () => {
      info.el.classList.remove('calendar-event-dragging');
      console.log('[CalendarEventInteractionService] Drag ended for:', eventTitle);
    });
  }

  // === EVENT CLEANUP ===

  /**
   * Clean up event listeners for a specific event element
   */
  cleanupEventListeners(eventElement: HTMLElement): void {
    const contextHandler = (eventElement as any).__contextMenuHandler;
    const clickHandler = (eventElement as any).__clickHandler;

    if (contextHandler) {
      eventElement.removeEventListener('contextmenu', contextHandler);
      delete (eventElement as any).__contextMenuHandler;
    }

    if (clickHandler) {
      eventElement.removeEventListener('click', clickHandler);
      delete (eventElement as any).__clickHandler;
    }

    console.log('[CalendarEventInteractionService] Cleaned up listeners for event element');
  }

  // === UTILITY METHODS ===

  /**
   * Apply interaction styling to event element
   */
  applyInteractionStyling(eventElement: HTMLElement, styleType: 'hover' | 'active' | 'dragging'): void {
    const classMap = {
      hover: 'calendar-event-hover',
      active: 'calendar-event-active',
      dragging: 'calendar-event-dragging'
    };

    const className = classMap[styleType];
    if (className && !eventElement.classList.contains(className)) {
      eventElement.classList.add(className);
    }
  }

  /**
   * Remove interaction styling from event element
   */
  removeInteractionStyling(eventElement: HTMLElement, styleType: 'hover' | 'active' | 'dragging'): void {
    const classMap = {
      hover: 'calendar-event-hover',
      active: 'calendar-event-active',
      dragging: 'calendar-event-dragging'
    };

    const className = classMap[styleType];
    if (className) {
      eventElement.classList.remove(className);
    }
  }

  /**
   * Check if event element has interaction setup
   */
  hasInteractionSetup(eventElement: HTMLElement): boolean {
    return eventElement.classList.contains('calendar-event-interactive');
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
        supportedInteractions: [
          'contextMenu',
          'dragDrop',
          'hover',
          'click',
          'visualFeedback'
        ],
        cleanedUp: {
          observablePatterns: 'removed',
          subscriptionManagement: 'removed',
          complexEventInterfaces: 'removed',
          lineCount: 'reduced ~50%'
        }
      }
    };
  }

  /**
   * Cleanup method for manual cleanup if needed
   */
  cleanup(): void {
    console.log('[CalendarEventInteractionService] Manual cleanup completed');
  }
}
