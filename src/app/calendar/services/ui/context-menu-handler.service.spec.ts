// context-menu-handler.service.spec.ts
// Comprehensive unit tests for ContextMenuHandlerService - Action execution and modal coordination
// Tests action handling, modal service integration, validation methods, and error scenarios

import { TestBed } from '@angular/core/testing';
import { EventClickArg } from '@fullcalendar/core';
import { ContextMenuHandlerService, ActionExecutionResult } from './context-menu-handler.service';
import { ContextMenuBusinessService, ContextMenuAction, ContextState } from '../core/context-menu-business.service';
import { SpecialDayModalService } from './special-day-modal.service';

describe('ContextMenuHandlerService', () => {
  let service: ContextMenuHandlerService;
  let businessServiceSpy: jasmine.SpyObj<ContextMenuBusinessService>;
  let specialDayModalServiceSpy: jasmine.SpyObj<SpecialDayModalService>;

  // Test data fixtures
  const createMockEvent = (extendedProps: any = {}): EventClickArg => ({
    event: {
      id: '1',
      title: 'Test Event',
      start: new Date('2024-01-15'),
      end: new Date('2024-01-15'),
      extendedProps,
      getStart: () => new Date('2024-01-15'),
      getEnd: () => new Date('2024-01-15'),
      toJSON: () => ({}),
      remove: () => {},
      setProp: () => {},
      setExtendedProp: () => {},
      setStart: () => {},
      setEnd: () => {},
      setDates: () => {},
      setAllDay: () => {},
      moveStart: () => {},
      moveEnd: () => {},
      moveDates: () => {},
      formatRange: () => '',
      mutate: () => {},
      url: '',
      display: 'auto',
      source: null,
      allDay: false,
      classNames: [],
      backgroundColor: '',
      borderColor: '',
      textColor: '',
      constraint: null,
      overlap: true,
      editable: true,
      startEditable: true,
      durationEditable: true,
      resourceEditable: true,
      rendering: 'auto'
    },
    el: document.createElement('div'),
    jsEvent: new MouseEvent('click'),
    view: {} as any
  });

  const mockLessonAction: ContextMenuAction = {
    id: 'viewLesson',
    label: 'View Lesson',
    actionType: 'view-lesson',
    contextType: 'lesson-event',
    metadata: {
      lessonId: 123,
      lessonTitle: 'Math Lesson',
      period: 1,
      date: new Date('2024-01-15'),
      scheduleEvent: { lessonId: 123, lessonTitle: 'Math Lesson' }
    }
  };

  const mockSpecialDayAction: ContextMenuAction = {
    id: 'addSpecialDay',
    label: 'Add Special Day',
    actionType: 'add-special-day',
    contextType: 'date-only',
    metadata: {
      date: new Date('2024-01-15')
    }
  };

  beforeEach(() => {
    const businessSpy = jasmine.createSpyObj('ContextMenuBusinessService', [
      'getCurrentContextState'
    ]);

    const modalSpy = jasmine.createSpyObj('SpecialDayModalService', [
      'openSpecialDayModal',
      'deleteSpecialDayFromEvent'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ContextMenuHandlerService,
        { provide: ContextMenuBusinessService, useValue: businessSpy },
        { provide: SpecialDayModalService, useValue: modalSpy }
      ]
    });

    service = TestBed.inject(ContextMenuHandlerService);
    businessServiceSpy = TestBed.inject(ContextMenuBusinessService) as jasmine.SpyObj<ContextMenuBusinessService>;
    specialDayModalServiceSpy = TestBed.inject(SpecialDayModalService) as jasmine.SpyObj<SpecialDayModalService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Action Execution Management', () => {
    describe('executeAction()', () => {
      it('should execute view-lesson action successfully', () => {
        const result = service.executeAction(mockLessonAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('view-lesson');
        expect(result.contextType).toBe('lesson-event');
        expect(result.metadata?.lessonId).toBe(123);
        expect(result.metadata?.lessonTitle).toBe('Math Lesson');
      });

      it('should execute edit-lesson action successfully', () => {
        const editAction: ContextMenuAction = {
          ...mockLessonAction,
          actionType: 'edit-lesson'
        };

        const result = service.executeAction(editAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('edit-lesson');
        expect(result.contextType).toBe('lesson-event');
      });

      it('should execute reschedule-lesson action successfully', () => {
        const rescheduleAction: ContextMenuAction = {
          ...mockLessonAction,
          actionType: 'reschedule-lesson'
        };

        const result = service.executeAction(rescheduleAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('reschedule-lesson');
        expect(result.contextType).toBe('lesson-event');
      });

      it('should handle unknown action type', () => {
        const unknownAction: ContextMenuAction = {
          id: 'unknown',
          label: 'Unknown',
          actionType: 'unknown-action' as any,
          contextType: 'lesson-event'
        };

        const result = service.executeAction(unknownAction);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('Unknown action type');
      });

      it('should handle action execution exceptions', () => {
        const actionThatThrows: ContextMenuAction = {
          ...mockLessonAction,
          metadata: undefined // This might cause issues in handler
        };

        const result = service.executeAction(actionThatThrows);

        expect(result.success).toBe(true); // View lesson should handle undefined metadata gracefully
        expect(result.metadata?.lessonId).toBeUndefined();
      });
    });
  });

  describe('Lesson Action Handlers', () => {
    describe('handleViewLesson()', () => {
      it('should handle view lesson action with full metadata', () => {
        const result = service.executeAction(mockLessonAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('view-lesson');
        expect(result.contextType).toBe('lesson-event');
        expect(result.metadata).toEqual({
          lessonId: 123,
          lessonTitle: 'Math Lesson',
          period: 1,
          date: new Date('2024-01-15')
        });
      });

      it('should handle view lesson action with minimal metadata', () => {
        const minimalAction: ContextMenuAction = {
          ...mockLessonAction,
          metadata: {}
        };

        const result = service.executeAction(minimalAction);

        expect(result.success).toBe(true);
        expect(result.metadata?.lessonId).toBeUndefined();
        expect(result.metadata?.lessonTitle).toBeUndefined();
      });
    });

    describe('handleEditLesson()', () => {
      it('should handle edit lesson action', () => {
        const editAction: ContextMenuAction = {
          ...mockLessonAction,
          actionType: 'edit-lesson'
        };

        const result = service.executeAction(editAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('edit-lesson');
        expect(result.contextType).toBe('lesson-event');
        expect(result.metadata?.lessonId).toBe(123);
      });

      it('should handle edit lesson with missing metadata', () => {
        const editAction: ContextMenuAction = {
          id: 'editLesson',
          label: 'Edit Lesson',
          actionType: 'edit-lesson',
          contextType: 'lesson-event'
        };

        const result = service.executeAction(editAction);

        expect(result.success).toBe(true);
        expect(result.metadata?.lessonId).toBeUndefined();
      });
    });

    describe('handleRescheduleLesson()', () => {
      it('should handle reschedule lesson action', () => {
        const rescheduleAction: ContextMenuAction = {
          ...mockLessonAction,
          actionType: 'reschedule-lesson'
        };

        const result = service.executeAction(rescheduleAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('reschedule-lesson');
        expect(result.contextType).toBe('lesson-event');
        expect(result.metadata?.period).toBe(1);
      });
    });
  });

  describe('Special Day Action Handlers', () => {
    describe('handleAddSpecialDay()', () => {
      it('should handle add special day action successfully', () => {
        const result = service.executeAction(mockSpecialDayAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('add-special-day');
        expect(result.contextType).toBe('date-only');
        expect(result.metadata?.date).toEqual(new Date('2024-01-15'));
        expect(specialDayModalServiceSpy.openSpecialDayModal).toHaveBeenCalledWith(
          'add',
          new Date('2024-01-15'),
          undefined
        );
      });

      it('should handle add special day action without date', () => {
        const actionWithoutDate: ContextMenuAction = {
          ...mockSpecialDayAction,
          metadata: {}
        };

        const result = service.executeAction(actionWithoutDate);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No date context available');
      });

      it('should handle add special day with null date', () => {
        const actionWithNullDate: ContextMenuAction = {
          ...mockSpecialDayAction,
          metadata: { date: null as any }
        };

        const result = service.executeAction(actionWithNullDate);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No date context available');
      });
    });

    describe('handleEditSpecialDay()', () => {
      it('should handle edit special day action successfully', () => {
        const editAction: ContextMenuAction = {
          id: 'editSpecialDay',
          label: 'Edit Special Day',
          actionType: 'edit-special-day',
          contextType: 'special-day-event',
          metadata: {
            period: 1,
            date: new Date('2024-01-15'),
            eventType: 'Holiday'
          }
        };

        const mockEvent = createMockEvent();
        const mockContextState: ContextState = {
          type: 'event',
          event: mockEvent,
          metadata: {}
        };

        businessServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

        const result = service.executeAction(editAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('edit-special-day');
        expect(result.contextType).toBe('special-day-event');
        expect(specialDayModalServiceSpy.openSpecialDayModal).toHaveBeenCalledWith(
          'edit',
          null,
          mockEvent
        );
      });

      it('should handle edit special day without event context', () => {
        const editAction: ContextMenuAction = {
          id: 'editSpecialDay',
          label: 'Edit Special Day',
          actionType: 'edit-special-day',
          contextType: 'special-day-event'
        };

        const mockContextState: ContextState = {
          type: 'date',
          metadata: {}
        };

        businessServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

        const result = service.executeAction(editAction);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No event context available');
      });
    });

    describe('handleDeleteSpecialDay()', () => {
      it('should handle delete special day action successfully', () => {
        const deleteAction: ContextMenuAction = {
          id: 'deleteSpecialDay',
          label: 'Delete Special Day',
          actionType: 'delete-special-day',
          contextType: 'special-day-event',
          metadata: {
            period: 1,
            eventType: 'Holiday'
          }
        };

        const mockEvent = createMockEvent();
        const mockContextState: ContextState = {
          type: 'event',
          event: mockEvent,
          metadata: {}
        };

        businessServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

        const result = service.executeAction(deleteAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('delete-special-day');
        expect(result.contextType).toBe('special-day-event');
        expect(specialDayModalServiceSpy.deleteSpecialDayFromEvent).toHaveBeenCalledWith(mockEvent);
      });

      it('should handle delete special day without event context', () => {
        const deleteAction: ContextMenuAction = {
          id: 'deleteSpecialDay',
          label: 'Delete Special Day',
          actionType: 'delete-special-day',
          contextType: 'special-day-event'
        };

        const mockContextState: ContextState = {
          type: 'none',
          metadata: {}
        };

        businessServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

        const result = service.executeAction(deleteAction);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No event context available');
      });
    });
  });

  describe('Other Action Handlers', () => {
    describe('handleViewError()', () => {
      it('should handle view error action', () => {
        const errorAction: ContextMenuAction = {
          id: 'viewError',
          label: 'View Error',
          actionType: 'view-error',
          contextType: 'error-event',
          metadata: {
            period: 2,
            eventType: 'Error',
            scheduleEvent: { error: 'No lesson assigned' }
          }
        };

        const result = service.executeAction(errorAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('view-error');
        expect(result.contextType).toBe('error-event');
        expect(result.metadata?.period).toBe(2);
        expect(result.metadata?.eventType).toBe('Error');
      });
    });

    describe('handleAddActivity()', () => {
      it('should handle add activity action', () => {
        const activityAction: ContextMenuAction = {
          id: 'addActivity',
          label: 'Add Activity',
          actionType: 'add-activity',
          contextType: 'free-period',
          metadata: {
            period: 3,
            date: new Date('2024-01-15')
          }
        };

        const result = service.executeAction(activityAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('add-activity');
        expect(result.contextType).toBe('free-period');
        expect(result.metadata?.period).toBe(3);
      });
    });

    describe('handleViewDetails()', () => {
      it('should handle view details action', () => {
        const detailsAction: ContextMenuAction = {
          id: 'viewDetails',
          label: 'View Details',
          actionType: 'view-details',
          contextType: 'date-only',
          metadata: {
            date: new Date('2024-01-15'),
            scheduleEvent: { info: 'Additional details' }
          }
        };

        const mockContextState: ContextState = {
          type: 'date',
          metadata: { info: 'Context metadata' }
        };

        businessServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

        const result = service.executeAction(detailsAction);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe('view-details');
        expect(result.contextType).toBe('date-only');
        expect(result.metadata?.date).toEqual(new Date('2024-01-15'));
      });
    });
  });

  describe('Validation Helpers', () => {
    describe('validateActionExecution()', () => {
      it('should validate executable action', () => {
        businessServiceSpy.getCurrentContextState.and.returnValue({
          type: 'event',
          metadata: {}
        });

        // Mock the business service validation
        const mockBusinessService = businessServiceSpy as any;
        mockBusinessService.validateAction = jasmine.createSpy('validateAction').and.returnValue({
          isValid: true
        });

        const result = service.validateActionExecution('validAction');

        expect(result.canExecute).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should reject invalid action', () => {
        const mockBusinessService = businessServiceSpy as any;
        mockBusinessService.validateAction = jasmine.createSpy('validateAction').and.returnValue({
          isValid: false,
          reason: 'Action not available'
        });

        const result = service.validateActionExecution('invalidAction');

        expect(result.canExecute).toBe(false);
        expect(result.reason).toBe('Action not available');
      });
    });

    describe('isModalOperation()', () => {
      it('should identify modal operations', () => {
        expect(service.isModalOperation('add-special-day')).toBe(true);
        expect(service.isModalOperation('edit-special-day')).toBe(true);
        expect(service.isModalOperation('delete-special-day')).toBe(true);
      });

      it('should identify non-modal operations', () => {
        expect(service.isModalOperation('view-lesson')).toBe(false);
        expect(service.isModalOperation('edit-lesson')).toBe(false);
        expect(service.isModalOperation('view-error')).toBe(false);
      });
    });

    describe('requiresEventContext()', () => {
      it('should identify actions requiring event context', () => {
        expect(service.requiresEventContext('edit-special-day')).toBe(true);
        expect(service.requiresEventContext('delete-special-day')).toBe(true);
        expect(service.requiresEventContext('edit-lesson')).toBe(true);
        expect(service.requiresEventContext('view-lesson')).toBe(true);
        expect(service.requiresEventContext('reschedule-lesson')).toBe(true);
      });

      it('should identify actions not requiring event context', () => {
        expect(service.requiresEventContext('add-special-day')).toBe(false);
        expect(service.requiresEventContext('add-activity')).toBe(false);
        expect(service.requiresEventContext('view-details')).toBe(false);
      });
    });

    describe('requiresDateContext()', () => {
      it('should identify actions requiring date context', () => {
        expect(service.requiresDateContext('add-special-day')).toBe(true);
      });

      it('should identify actions not requiring date context', () => {
        expect(service.requiresDateContext('edit-special-day')).toBe(false);
        expect(service.requiresDateContext('view-lesson')).toBe(false);
        expect(service.requiresDateContext('view-error')).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in lesson action handlers', () => {
      // Simulate error by having metadata access throw
      const problematicAction: ContextMenuAction = {
        id: 'viewLesson',
        label: 'View Lesson',
        actionType: 'view-lesson',
        contextType: 'lesson-event'
        // Missing metadata to test error handling
      };

      const result = service.executeAction(problematicAction);

      expect(result.success).toBe(true); // Should handle gracefully
      expect(result.metadata?.lessonId).toBeUndefined();
    });

    it('should handle errors in special day modal service calls', () => {
      specialDayModalServiceSpy.openSpecialDayModal.and.throwError('Modal service error');

      expect(() => {
        service.executeAction(mockSpecialDayAction);
      }).toThrowError('Modal service error');
    });

    it('should handle errors in business service calls', () => {
      const editAction: ContextMenuAction = {
        id: 'editSpecialDay',
        label: 'Edit Special Day',
        actionType: 'edit-special-day',
        contextType: 'special-day-event'
      };

      businessServiceSpy.getCurrentContextState.and.throwError('Business service error');

      const result = service.executeAction(editAction);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Business service error');
    });

    it('should provide detailed error information', () => {
      const unknownAction: ContextMenuAction = {
        id: 'unknown',
        label: 'Unknown',
        actionType: 'unknown-action' as any,
        contextType: 'lesson-event'
      };

      const result = service.executeAction(unknownAction);

      expect(result.success).toBe(false);
      expect(result.actionType).toBe('unknown-action');
      expect(result.contextType).toBe('lesson-event');
      expect(result.error).toBeDefined();
    });
  });

  describe('Action Result Metadata', () => {
    it('should include complete metadata in lesson actions', () => {
      const fullLessonAction: ContextMenuAction = {
        ...mockLessonAction,
        metadata: {
          lessonId: 456,
          lessonTitle: 'Science Lesson',
          period: 3,
          date: new Date('2024-01-20'),
          eventType: 'lesson',
          scheduleEvent: { courseId: 2 }
        }
      };

      const result = service.executeAction(fullLessonAction);

      expect(result.metadata).toEqual({
        lessonId: 456,
        lessonTitle: 'Science Lesson',
        period: 3,
        date: new Date('2024-01-20')
      });
    });

    it('should include minimal metadata when properties are missing', () => {
      const minimalAction: ContextMenuAction = {
        id: 'minimal',
        label: 'Minimal',
        actionType: 'view-lesson',
        contextType: 'lesson-event',
        metadata: { lessonId: 123 } // Only lessonId provided
      };

      const result = service.executeAction(minimalAction);

      expect(result.metadata?.lessonId).toBe(123);
      expect(result.metadata?.lessonTitle).toBeUndefined();
      expect(result.metadata?.period).toBeUndefined();
    });

    it('should preserve special day metadata', () => {
      const specialDayAction: ContextMenuAction = {
        id: 'addSpecialDay',
        label: 'Add Holiday',
        actionType: 'add-special-day',
        contextType: 'date-only',
        metadata: {
          date: new Date('2024-12-25'),
          eventType: 'Holiday'
        }
      };

      const result = service.executeAction(specialDayAction);

      expect(result.metadata?.date).toEqual(new Date('2024-12-25'));
      expect(result.metadata?.eventType).toBeUndefined(); // Not included in add-special-day result
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete lesson workflow', () => {
      // Test view -> edit -> reschedule sequence
      const actions = [
        { ...mockLessonAction, actionType: 'view-lesson' as const },
        { ...mockLessonAction, actionType: 'edit-lesson' as const },
        { ...mockLessonAction, actionType: 'reschedule-lesson' as const }
      ];

      const results = actions.map(action => service.executeAction(action));

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.actionType).toBe(actions[index].actionType);
        expect(result.contextType).toBe('lesson-event');
      });
    });

    it('should handle complete special day workflow', () => {
      const mockEvent = createMockEvent();
      const mockContextState: ContextState = {
        type: 'event',
        event: mockEvent,
        metadata: {}
      };

      businessServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

      // Test add -> edit -> delete sequence
      const addResult = service.executeAction(mockSpecialDayAction);
      expect(addResult.success).toBe(true);

      const editAction: ContextMenuAction = {
        ...mockSpecialDayAction,
        actionType: 'edit-special-day',
        contextType: 'special-day-event'
      };
      const editResult = service.executeAction(editAction);
      expect(editResult.success).toBe(true);

      const deleteAction: ContextMenuAction = {
        ...mockSpecialDayAction,
        actionType: 'delete-special-day',
        contextType: 'special-day-event'
      };
      const deleteResult = service.executeAction(deleteAction);
      expect(deleteResult.success).toBe(true);

      expect(specialDayModalServiceSpy.openSpecialDayModal).toHaveBeenCalledTimes(2);
      expect(specialDayModalServiceSpy.deleteSpecialDayFromEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed action types in sequence', () => {
      const mockEvent = createMockEvent();
      businessServiceSpy.getCurrentContextState.and.returnValue({
        type: 'event',
        event: mockEvent,
        metadata: {}
      });

      const mixedActions: ContextMenuAction[] = [
        mockLessonAction,
        mockSpecialDayAction,
        {
          id: 'viewError',
          label: 'View Error',
          actionType: 'view-error',
          contextType: 'error-event',
          metadata: { period: 1 }
        },
        {
          id: 'addActivity',
          label: 'Add Activity',
          actionType: 'add-activity',
          contextType: 'free-period',
          metadata: { period: 2 }
        }
      ];

      const results = mixedActions.map(action => service.executeAction(action));

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle action with circular metadata references', () => {
      const circularMetadata: any = { period: 1 };
      circularMetadata.self = circularMetadata;

      const actionWithCircularRef: ContextMenuAction = {
        ...mockLessonAction,
        metadata: circularMetadata
      };

      const result = service.executeAction(actionWithCircularRef);

      expect(result.success).toBe(true);
      expect(result.metadata?.period).toBe(1);
    });

    it('should handle very large metadata objects', () => {
      const largeMetadata = {
        lessonId: 123,
        lessonTitle: 'A'.repeat(10000), // Very long title
        period: 1,
        scheduleEvent: {
          details: 'B'.repeat(10000) // Very long details
        }
      };

      const actionWithLargeMetadata: ContextMenuAction = {
        ...mockLessonAction,
        metadata: largeMetadata
      };

      const result = service.executeAction(actionWithLargeMetadata);

      expect(result.success).toBe(true);
      expect(result.metadata?.lessonId).toBe(123);
    });

    it('should handle concurrent action execution simulation', () => {
      const actions = Array(100).fill(null).map((_, index) => ({
        ...mockLessonAction,
        id: `action${index}`,
        metadata: { ...mockLessonAction.metadata, lessonId: index }
      }));

      const results = actions.map(action => service.executeAction(action));

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.metadata?.lessonId).toBe(index);
      });
    });
  });
});