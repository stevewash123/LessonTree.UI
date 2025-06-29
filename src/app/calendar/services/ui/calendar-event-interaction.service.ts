// **COMPLETE FILE** - New calendar-event-interaction.service.ts
// RESPONSIBILITY: Handle event mounting, DOM listeners, and interaction setup
// DOES NOT: Generate templates, manage configuration, or handle business logic
// CALLED BY: CalendarConfigurationService for eventDidMount setup

import { Injectable } from '@angular/core';
import { CalendarEventTemplateService } from './calendar-event-template.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventInteractionService {

  constructor(private templateService: CalendarEventTemplateService) {
    console.log('[CalendarEventInteractionService] Initialized for event interaction handling');
  }

  // === EVENT MOUNTING AND INTERACTION ===

  /**
   * Handle complete event mounting with styling and listeners
   */
  mountEvent(
    info: any,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void
  ): void {
    // Apply visual styling (delegate to template service)
    this.templateService.applyEventStyling(info);
    
    // Add interaction listeners (interaction responsibility)
    this.attachEventListeners(info, handleEventContextMenu);
    
    // Apply interaction classes
    this.setupEventInteraction(info);
  }

  /**
   * Attach DOM event listeners to calendar events
   */
  private attachEventListeners(
    info: any,
    handleEventContextMenu: (eventInfo: any, jsEvent: MouseEvent) => void
  ): void {
    console.log('[CalendarEventInteractionService] Attaching listeners to event:', info.event.title);
    
    // FIXED: Actually implement the context menu listener
    const contextMenuHandler = (e: MouseEvent) => {
      console.log('[CalendarEventInteractionService] Context menu event triggered on:', info.event.title);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleEventContextMenu(info, e);
    };
    
    // Attach the context menu listener
    info.el.addEventListener('contextmenu', contextMenuHandler, { passive: false });
    
    // Store reference for potential cleanup
    (info.el as any).__contextMenuHandler = contextMenuHandler;
    
    // DIAGNOSTIC: Also add a click listener to test if events are working
    const clickHandler = (e: MouseEvent) => {
      console.log('[CalendarEventInteractionService] Click event on:', info.event.title);
      e.stopPropagation(); // Prevent interference
    };
    
    info.el.addEventListener('click', clickHandler, { passive: false });
    (info.el as any).__clickHandler = clickHandler;
  }

  /**
   * Setup event element for interaction
   */
  private setupEventInteraction(info: any): void {
    // Make events clearly interactive
    info.el.style.cursor = 'pointer';
    info.el.style.position = 'relative';
    info.el.style.zIndex = '1';
    
    // Add interaction classes for CSS styling
    info.el.classList.add('calendar-event-interactive');
    
    // Setup for potential drag/drop feedback
    this.setupDragInteraction(info);
  }

  /**
   * Setup drag and drop interaction indicators
   */
  private setupDragInteraction(info: any): void {
    // Add hover effects for drag indication
    info.el.addEventListener('mouseenter', () => {
      info.el.classList.add('calendar-event-hover');
    });
    
    info.el.addEventListener('mouseleave', () => {
      info.el.classList.remove('calendar-event-hover');
    });
    
    // Add drag start/end classes for visual feedback
    info.el.addEventListener('dragstart', () => {
      info.el.classList.add('calendar-event-dragging');
    });
    
    info.el.addEventListener('dragend', () => {
      info.el.classList.remove('calendar-event-dragging');
    });
  }

  /**
   * Create and attach period badge to event
   */
  attachPeriodBadge(eventElement: HTMLElement, period: number, periodAssignment: any): void {
    const badge = this.templateService.createPeriodBadge(period, periodAssignment);
    eventElement.style.position = 'relative';
    eventElement.appendChild(badge);
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
   * Cleanup event listeners and interaction state
   */
  cleanupEventInteraction(element: HTMLElement): void {
    // Remove interaction classes
    element.classList.remove(
      'calendar-event-interactive',
      'calendar-event-hover', 
      'calendar-event-dragging',
      'error-event-interaction',
      'lesson-event-interaction',
      'standard-event-interaction'
    );
    
    // Note: Event listeners are automatically cleaned up when element is removed from DOM
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
          'periodBadges'
        ]
      }
    };
  }
}