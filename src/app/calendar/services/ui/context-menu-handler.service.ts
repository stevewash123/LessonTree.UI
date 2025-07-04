// **COMPLETE FILE** - ContextMenuHandlerService - User Action Execution & Modal Coordination
// RESPONSIBILITY: User action execution, modal service coordination, and interaction workflows
// SCOPE: Action handlers and modal coordination only (Observable events in separate service)
// RATIONALE: User interaction execution separated from event emission patterns

import { Injectable } from '@angular/core';
import { EventClickArg } from '@fullcalendar/core';

import { ContextMenuBusinessService, ContextMenuAction } from '../business/context-menu-business.service';
import { SpecialDayModalService } from './special-day-modal.service';

export interface ActionExecutionResult {
  success: boolean;
  actionType: string;
  contextType: string;
  metadata?: {
    lessonId?: number;
    lessonTitle?: string;
    period?: number;
    date?: Date;
    eventType?: string;
    scheduleEvent?: any;
  };
  error?: Error;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuHandlerService {

  constructor(
    private businessService: ContextMenuBusinessService,
    private specialDayModalService: SpecialDayModalService
  ) {
    console.log('[ContextMenuHandlerService] User action execution and modal coordination initialized');
  }

  // === ACTION EXECUTION MANAGEMENT ===

  executeAction(action: ContextMenuAction): ActionExecutionResult {
    console.log(`[ContextMenuHandlerService] Executing action: ${action.actionType}`);

    try {
      switch (action.actionType) {
        case 'view-lesson':
          return this.handleViewLesson(action);
        case 'edit-lesson':
          return this.handleEditLesson(action);
        case 'reschedule-lesson':
          return this.handleRescheduleLesson(action);
        case 'add-special-day':
          return this.handleAddSpecialDay(action);
        case 'edit-special-day':
          return this.handleEditSpecialDay(action);
        case 'delete-special-day':
          return this.handleDeleteSpecialDay(action);
        case 'view-error':
          return this.handleViewError(action);
        case 'add-activity':
          return this.handleAddActivity(action);
        case 'view-details':
          return this.handleViewDetails(action);
        default:
          throw new Error(`Unknown action type: ${action.actionType}`);
      }
    } catch (error: any) {
      console.error(`[ContextMenuHandlerService] Error executing action ${action.actionType}:`, error);

      return {
        success: false,
        actionType: action.actionType,
        contextType: action.contextType,
        error
      };
    }
  }

  // === LESSON ACTION HANDLERS ===

  private handleViewLesson(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling view lesson');

    console.log('Lesson details:', action.metadata?.scheduleEvent);

    return {
      success: true,
      actionType: 'view-lesson',
      contextType: 'lesson-event',
      metadata: {
        lessonId: action.metadata?.lessonId,
        lessonTitle: action.metadata?.lessonTitle,
        period: action.metadata?.period,
        date: action.metadata?.date
      }
    };
  }

  private handleEditLesson(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling edit lesson');

    console.log('Edit lesson:', action.metadata?.scheduleEvent);

    return {
      success: true,
      actionType: 'edit-lesson',
      contextType: 'lesson-event',
      metadata: {
        lessonId: action.metadata?.lessonId,
        lessonTitle: action.metadata?.lessonTitle,
        period: action.metadata?.period,
        date: action.metadata?.date
      }
    };
  }

  private handleRescheduleLesson(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling reschedule lesson');

    console.log('Reschedule lesson:', action.metadata?.scheduleEvent);

    return {
      success: true,
      actionType: 'reschedule-lesson',
      contextType: 'lesson-event',
      metadata: {
        lessonId: action.metadata?.lessonId,
        lessonTitle: action.metadata?.lessonTitle,
        period: action.metadata?.period,
        date: action.metadata?.date
      }
    };
  }

  // === SPECIAL DAY ACTION HANDLERS ===

  private handleAddSpecialDay(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling add special day');

    const contextDate = action.metadata?.date;
    console.log('Add special day requested for date:', contextDate);

    if (contextDate) {
      // Open special day modal in 'add' mode with the selected date
      this.specialDayModalService.openSpecialDayModal('add', contextDate, undefined);

      return {
        success: true,
        actionType: 'add-special-day',
        contextType: 'date-only',
        metadata: {
          date: contextDate
        }
      };
    } else {
      throw new Error('No date context available for special day creation');
    }
  }

  private handleEditSpecialDay(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling edit special day');

    const contextState = this.businessService.getCurrentContextState();
    if (contextState.type === 'event' && contextState.event) {
      this.specialDayModalService.openSpecialDayModal('edit', null, contextState.event);

      return {
        success: true,
        actionType: 'edit-special-day',
        contextType: 'special-day-event',
        metadata: {
          period: action.metadata?.period,
          date: action.metadata?.date,
          eventType: action.metadata?.eventType,
          scheduleEvent: action.metadata?.scheduleEvent
        }
      };
    } else {
      throw new Error('No event context available for special day editing');
    }
  }

  private handleDeleteSpecialDay(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling delete special day');

    const contextState = this.businessService.getCurrentContextState();
    if (contextState.type === 'event' && contextState.event) {
      this.specialDayModalService.deleteSpecialDayFromEvent(contextState.event);

      return {
        success: true,
        actionType: 'delete-special-day',
        contextType: 'special-day-event',
        metadata: {
          period: action.metadata?.period,
          date: action.metadata?.date,
          eventType: action.metadata?.eventType,
          scheduleEvent: action.metadata?.scheduleEvent
        }
      };
    } else {
      throw new Error('No event context available for special day deletion');
    }
  }

  // === OTHER ACTION HANDLERS ===

  private handleViewError(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling view error');

    console.log('Error details:', action.metadata?.scheduleEvent);

    return {
      success: true,
      actionType: 'view-error',
      contextType: 'error-event',
      metadata: {
        period: action.metadata?.period,
        date: action.metadata?.date,
        eventType: action.metadata?.eventType,
        scheduleEvent: action.metadata?.scheduleEvent
      }
    };
  }

  private handleAddActivity(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling add activity');

    console.log('Add activity to period:', action.metadata?.period);

    return {
      success: true,
      actionType: 'add-activity',
      contextType: 'free-period',
      metadata: {
        period: action.metadata?.period,
        date: action.metadata?.date
      }
    };
  }

  private handleViewDetails(action: ContextMenuAction): ActionExecutionResult {
    console.log('[ContextMenuHandlerService] Handling view details');

    const contextState = this.businessService.getCurrentContextState();
    console.log('Event details:', contextState.metadata);

    return {
      success: true,
      actionType: 'view-details',
      contextType: 'date-only',
      metadata: {
        date: action.metadata?.date,
        scheduleEvent: action.metadata?.scheduleEvent
      }
    };
  }

  // === VALIDATION HELPERS ===

  validateActionExecution(actionId: string): { canExecute: boolean; reason?: string } {
    const validation = this.businessService.validateAction(actionId);

    if (!validation.isValid) {
      return { canExecute: false, reason: validation.reason };
    }

    // Additional execution-specific validation could go here
    return { canExecute: true };
  }

  // === MODAL COORDINATION HELPERS ===

  isModalOperation(actionType: string): boolean {
    return ['add-special-day', 'edit-special-day', 'delete-special-day'].includes(actionType);
  }

  requiresEventContext(actionType: string): boolean {
    return ['edit-special-day', 'delete-special-day', 'edit-lesson', 'view-lesson', 'reschedule-lesson'].includes(actionType);
  }

  requiresDateContext(actionType: string): boolean {
    return ['add-special-day'].includes(actionType);
  }
}
