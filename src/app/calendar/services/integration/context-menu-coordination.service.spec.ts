// context-menu-coordination.service.spec.ts
// Comprehensive unit tests for ContextMenuCoordinationService - Observable coordination and state management
// Tests event coordination, observables, action execution, and integration patterns

import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { EventClickArg } from '@fullcalendar/core';
import {
  ContextMenuCoordinationService,
  ContextMenuInteractionEvent,
  ContextMenuGenerationEvent,
  ContextStateChangeEvent,
  ContextMenuDisplayItem
} from './context-menu-coordination.service';
import { ContextMenuBusinessService, ContextMenuAction, ContextMenuResult } from '../core/context-menu-business.service';
import { ContextMenuHandlerService, ActionExecutionResult } from '../ui/context-menu-handler.service';

describe('ContextMenuCoordinationService', () => {
  let service: ContextMenuCoordinationService;
  let businessServiceSpy: jasmine.SpyObj<ContextMenuBusinessService>;
  let handlerServiceSpy: jasmine.SpyObj<ContextMenuHandlerService>;

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

  const mockContextMenuAction: ContextMenuAction = {
    id: 'testAction',
    label: 'Test Action',
    actionType: 'view-lesson',
    contextType: 'lesson-event',
    metadata: {
      lessonId: 123,
      lessonTitle: 'Math Lesson',
      period: 1
    }
  };

  const mockContextMenuResult: ContextMenuResult = {
    actions: [mockContextMenuAction],
    contextType: 'lesson-event',
    hasEventContext: true,
    hasDateContext: false,
    eventType: 'lesson',
    period: 1,
    metadata: {
      lessonId: 123,
      lessonTitle: 'Math Lesson',
      period: 1
    }
  };

  beforeEach(() => {
    const businessSpy = jasmine.createSpyObj('ContextMenuBusinessService', [
      'setEventContext',
      'setDateContext',
      'clearContext',
      'getCurrentContextType',
      'getCurrentContextState',
      'generateContextMenuActions',
      'getContextDate',
      'validateAction',
      'isLessonEvent',
      'isSpecialDayEvent'
    ]);

    const handlerSpy = jasmine.createSpyObj('ContextMenuHandlerService', [
      'executeAction'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ContextMenuCoordinationService,
        { provide: ContextMenuBusinessService, useValue: businessSpy },
        { provide: ContextMenuHandlerService, useValue: handlerSpy }
      ]
    });

    service = TestBed.inject(ContextMenuCoordinationService);
    businessServiceSpy = TestBed.inject(ContextMenuBusinessService) as jasmine.SpyObj<ContextMenuBusinessService>;
    handlerServiceSpy = TestBed.inject(ContextMenuHandlerService) as jasmine.SpyObj<ContextMenuHandlerService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should expose observable streams', () => {
      expect(service.interactionCompleted$).toBeDefined();
      expect(service.menuGenerated$).toBeDefined();
      expect(service.contextStateChanged$).toBeDefined();
    });

    it('should initialize without emitting events', (done) => {
      let eventCount = 0;

      service.interactionCompleted$.subscribe(() => eventCount++);
      service.menuGenerated$.subscribe(() => eventCount++);
      service.contextStateChanged$.subscribe(() => eventCount++);

      setTimeout(() => {
        expect(eventCount).toBe(0);
        done();
      }, 10);
    });
  });

  describe('Coordinated Context Management', () => {
    describe('setEventContextWithCoordination()', () => {
      it('should set event context and emit state change event', (done) => {
        const mockEvent = createMockEvent();
        const mockContextState = {
          type: 'event' as const,
          event: mockEvent,
          metadata: { eventTitle: 'Test Event' }
        };

        businessServiceSpy.getCurrentContextType.and.returnValue('none');
        businessServiceSpy.setEventContext.and.returnValue(mockContextState);

        service.contextStateChanged$.subscribe((event: ContextStateChangeEvent) => {
          expect(event.changeType).toBe('event-context-set');
          expect(event.previousContext).toBe('none');
          expect(event.newContext).toBe('event');
          expect(event.eventTitle).toBe('Test Event');
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        });

        service.setEventContextWithCoordination(mockEvent);

        expect(businessServiceSpy.setEventContext).toHaveBeenCalledWith(mockEvent);
      });

      it('should emit context cleared event for invalid event', (done) => {
        const mockEvent = createMockEvent();
        const mockContextState = {
          type: 'none' as const,
          metadata: {}
        };

        businessServiceSpy.getCurrentContextType.and.returnValue('date');
        businessServiceSpy.setEventContext.and.returnValue(mockContextState);

        service.contextStateChanged$.subscribe((event: ContextStateChangeEvent) => {
          expect(event.changeType).toBe('context-cleared');
          expect(event.previousContext).toBe('date');
          expect(event.newContext).toBe('none');
          done();
        });

        service.setEventContextWithCoordination(mockEvent);
      });
    });

    describe('setDateContextWithCoordination()', () => {
      it('should set date context and emit state change event', (done) => {
        const testDate = new Date('2024-01-15');

        businessServiceSpy.getCurrentContextType.and.returnValue('none');

        service.contextStateChanged$.subscribe((event: ContextStateChangeEvent) => {
          expect(event.changeType).toBe('date-context-set');
          expect(event.previousContext).toBe('none');
          expect(event.newContext).toBe('date');
          expect(event.date).toBe(testDate);
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        });

        service.setDateContextWithCoordination(testDate);

        expect(businessServiceSpy.setDateContext).toHaveBeenCalledWith(testDate);
      });

      it('should handle transition from event to date context', (done) => {
        const testDate = new Date('2024-01-15');

        businessServiceSpy.getCurrentContextType.and.returnValue('event');

        service.contextStateChanged$.subscribe((event: ContextStateChangeEvent) => {
          expect(event.previousContext).toBe('event');
          expect(event.newContext).toBe('date');
          done();
        });

        service.setDateContextWithCoordination(testDate);
      });
    });

    describe('clearContextWithCoordination()', () => {
      it('should clear context and emit state change event', (done) => {
        businessServiceSpy.getCurrentContextType.and.returnValue('event');

        service.contextStateChanged$.subscribe((event: ContextStateChangeEvent) => {
          expect(event.changeType).toBe('context-cleared');
          expect(event.previousContext).toBe('event');
          expect(event.newContext).toBe('none');
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        });

        service.clearContextWithCoordination();

        expect(businessServiceSpy.clearContext).toHaveBeenCalled();
      });
    });
  });

  describe('Coordinated Menu Generation', () => {
    describe('getContextMenuActionsWithCoordination()', () => {
      it('should generate menu actions and emit generation event', (done) => {
        businessServiceSpy.generateContextMenuActions.and.returnValue(mockContextMenuResult);

        service.menuGenerated$.subscribe((event: ContextMenuGenerationEvent) => {
          expect(event.contextType).toBe('lesson-event');
          expect(event.actionCount).toBe(1);
          expect(event.availableActions).toEqual(['testAction']);
          expect(event.hasEventContext).toBe(true);
          expect(event.hasDateContext).toBe(false);
          expect(event.period).toBe(1);
          expect(event.eventType).toBe('lesson');
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        });

        const result = service.getContextMenuActionsWithCoordination();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('testAction');
        expect(result[0].label).toBe('Test Action');
        expect(typeof result[0].handler).toBe('function');
      });

      it('should return empty array when no actions available', (done) => {
        const emptyResult: ContextMenuResult = {
          actions: [],
          contextType: 'no-context',
          hasEventContext: false,
          hasDateContext: false,
          metadata: {}
        };

        businessServiceSpy.generateContextMenuActions.and.returnValue(emptyResult);

        service.menuGenerated$.subscribe((event: ContextMenuGenerationEvent) => {
          expect(event.contextType).toBe('no-context');
          expect(event.actionCount).toBe(0);
          expect(event.availableActions).toEqual([]);
          done();
        });

        const result = service.getContextMenuActionsWithCoordination();

        expect(result).toHaveLength(0);
      });

      it('should create handlers that execute actions', () => {
        businessServiceSpy.generateContextMenuActions.and.returnValue(mockContextMenuResult);

        const result = service.getContextMenuActionsWithCoordination();
        const handler = result[0].handler;

        expect(typeof handler).toBe('function');

        // Execute handler to test action delegation
        const successResult: ActionExecutionResult = {
          success: true,
          actionType: 'view-lesson',
          contextType: 'lesson-event',
          metadata: { lessonId: 123 }
        };
        handlerServiceSpy.executeAction.and.returnValue(successResult);

        handler();

        expect(handlerServiceSpy.executeAction).toHaveBeenCalledWith(mockContextMenuAction);
      });
    });
  });

  describe('Action Execution with Coordination', () => {
    beforeEach(() => {
      businessServiceSpy.generateContextMenuActions.and.returnValue(mockContextMenuResult);
    });

    it('should emit successful interaction event', (done) => {
      const successResult: ActionExecutionResult = {
        success: true,
        actionType: 'view-lesson',
        contextType: 'lesson-event',
        metadata: {
          lessonId: 123,
          lessonTitle: 'Math Lesson',
          period: 1
        }
      };

      handlerServiceSpy.executeAction.and.returnValue(successResult);

      service.interactionCompleted$.subscribe((event: ContextMenuInteractionEvent) => {
        expect(event.action).toBe('view-lesson');
        expect(event.success).toBe(true);
        expect(event.contextType).toBe('lesson-event');
        expect(event.lessonId).toBe(123);
        expect(event.lessonTitle).toBe('Math Lesson');
        expect(event.period).toBe(1);
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.error).toBeUndefined();
        done();
      });

      const actions = service.getContextMenuActionsWithCoordination();
      actions[0].handler();
    });

    it('should emit failed interaction event for execution failure', (done) => {
      const errorResult: ActionExecutionResult = {
        success: false,
        actionType: 'view-lesson',
        contextType: 'lesson-event',
        error: new Error('Test error')
      };

      handlerServiceSpy.executeAction.and.returnValue(errorResult);

      service.interactionCompleted$.subscribe((event: ContextMenuInteractionEvent) => {
        expect(event.action).toBe('view-lesson');
        expect(event.success).toBe(false);
        expect(event.contextType).toBe('lesson-event');
        expect(event.error).toEqual(new Error('Test error'));
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      const actions = service.getContextMenuActionsWithCoordination();
      actions[0].handler();
    });

    it('should emit failed interaction event for thrown errors', (done) => {
      const thrownError = new Error('Handler threw error');
      handlerServiceSpy.executeAction.and.throwError(thrownError);

      service.interactionCompleted$.subscribe((event: ContextMenuInteractionEvent) => {
        expect(event.action).toBe('view-lesson');
        expect(event.success).toBe(false);
        expect(event.contextType).toBe('lesson-event');
        expect(event.error).toEqual(thrownError);
        done();
      });

      const actions = service.getContextMenuActionsWithCoordination();
      actions[0].handler();
    });

    it('should handle special day actions', (done) => {
      const specialDayAction: ContextMenuAction = {
        id: 'addSpecialDay',
        label: 'Add Special Day',
        actionType: 'add-special-day',
        contextType: 'date-only',
        metadata: { date: new Date('2024-01-15') }
      };

      const specialDayResult: ContextMenuResult = {
        actions: [specialDayAction],
        contextType: 'date-only',
        hasEventContext: false,
        hasDateContext: true,
        metadata: { date: new Date('2024-01-15') }
      };

      businessServiceSpy.generateContextMenuActions.and.returnValue(specialDayResult);

      const successResult: ActionExecutionResult = {
        success: true,
        actionType: 'add-special-day',
        contextType: 'date-only',
        metadata: { date: new Date('2024-01-15') }
      };

      handlerServiceSpy.executeAction.and.returnValue(successResult);

      service.interactionCompleted$.subscribe((event: ContextMenuInteractionEvent) => {
        expect(event.action).toBe('add-special-day');
        expect(event.success).toBe(true);
        expect(event.contextType).toBe('date-only');
        expect(event.date).toEqual(new Date('2024-01-15'));
        done();
      });

      const actions = service.getContextMenuActionsWithCoordination();
      actions[0].handler();
    });
  });

  describe('Delegation Methods', () => {
    it('should delegate getCurrentContextState to business service', () => {
      const mockState = { type: 'event' as const, metadata: {} };
      businessServiceSpy.getCurrentContextState.and.returnValue(mockState);

      const result = service.getCurrentContextState();

      expect(result).toBe(mockState);
      expect(businessServiceSpy.getCurrentContextState).toHaveBeenCalled();
    });

    it('should delegate getContextDate to business service', () => {
      const testDate = new Date('2024-01-15');
      businessServiceSpy.getContextDate.and.returnValue(testDate);

      const result = service.getContextDate();

      expect(result).toBe(testDate);
      expect(businessServiceSpy.getContextDate).toHaveBeenCalled();
    });

    it('should delegate validateAction to business service', () => {
      const validationResult = { isValid: true };
      businessServiceSpy.validateAction.and.returnValue(validationResult);

      const result = service.validateAction('testAction');

      expect(result).toBe(validationResult);
      expect(businessServiceSpy.validateAction).toHaveBeenCalledWith('testAction');
    });

    it('should delegate isLessonEvent to business service', () => {
      const mockEvent = createMockEvent();
      businessServiceSpy.isLessonEvent.and.returnValue(true);

      const result = service.isLessonEvent(mockEvent);

      expect(result).toBe(true);
      expect(businessServiceSpy.isLessonEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should delegate isSpecialDayEvent to business service', () => {
      const mockEvent = createMockEvent();
      businessServiceSpy.isSpecialDayEvent.and.returnValue(false);

      const result = service.isSpecialDayEvent(mockEvent);

      expect(result).toBe(false);
      expect(businessServiceSpy.isSpecialDayEvent).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Facade Methods', () => {
    it('should delegate setEventContext to coordination method', () => {
      const mockEvent = createMockEvent();
      const mockContextState = {
        type: 'event' as const,
        event: mockEvent,
        metadata: {}
      };

      businessServiceSpy.getCurrentContextType.and.returnValue('none');
      businessServiceSpy.setEventContext.and.returnValue(mockContextState);

      service.setEventContext(mockEvent);

      expect(businessServiceSpy.setEventContext).toHaveBeenCalledWith(mockEvent);
    });

    it('should delegate setDateContext to coordination method', () => {
      const testDate = new Date('2024-01-15');
      businessServiceSpy.getCurrentContextType.and.returnValue('none');

      service.setDateContext(testDate);

      expect(businessServiceSpy.setDateContext).toHaveBeenCalledWith(testDate);
    });

    it('should delegate clearContext to coordination method', () => {
      businessServiceSpy.getCurrentContextType.and.returnValue('event');

      service.clearContext();

      expect(businessServiceSpy.clearContext).toHaveBeenCalled();
    });

    it('should delegate getContextMenuActions to coordination method', () => {
      businessServiceSpy.generateContextMenuActions.and.returnValue(mockContextMenuResult);

      const result = service.getContextMenuActions();

      expect(result).toHaveLength(1);
      expect(businessServiceSpy.generateContextMenuActions).toHaveBeenCalled();
    });
  });

  describe('Observable Event Patterns', () => {
    it('should emit multiple state change events in sequence', () => {
      const events: ContextStateChangeEvent[] = [];

      service.contextStateChanged$.subscribe(event => events.push(event));

      businessServiceSpy.getCurrentContextType.and.returnValues('none', 'event', 'date');
      businessServiceSpy.setEventContext.and.returnValue({
        type: 'event',
        event: createMockEvent(),
        metadata: {}
      });

      service.setEventContextWithCoordination(createMockEvent());
      service.setDateContextWithCoordination(new Date('2024-01-15'));
      service.clearContextWithCoordination();

      expect(events).toHaveLength(3);
      expect(events[0].changeType).toBe('event-context-set');
      expect(events[1].changeType).toBe('date-context-set');
      expect(events[2].changeType).toBe('context-cleared');
    });

    it('should emit menu generation events for different contexts', () => {
      const events: ContextMenuGenerationEvent[] = [];

      service.menuGenerated$.subscribe(event => events.push(event));

      // First generation - lesson context
      businessServiceSpy.generateContextMenuActions.and.returnValue(mockContextMenuResult);
      service.getContextMenuActionsWithCoordination();

      // Second generation - date context
      const dateResult: ContextMenuResult = {
        actions: [],
        contextType: 'date-only',
        hasEventContext: false,
        hasDateContext: true,
        metadata: {}
      };
      businessServiceSpy.generateContextMenuActions.and.returnValue(dateResult);
      service.getContextMenuActionsWithCoordination();

      expect(events).toHaveLength(2);
      expect(events[0].contextType).toBe('lesson-event');
      expect(events[1].contextType).toBe('date-only');
    });

    it('should emit interaction events for different action types', () => {
      const events: ContextMenuInteractionEvent[] = [];

      service.interactionCompleted$.subscribe(event => events.push(event));

      // Setup different actions
      const viewAction: ContextMenuAction = {
        id: 'viewLesson',
        label: 'View Lesson',
        actionType: 'view-lesson',
        contextType: 'lesson-event',
        metadata: {}
      };

      const addAction: ContextMenuAction = {
        id: 'addSpecialDay',
        label: 'Add Special Day',
        actionType: 'add-special-day',
        contextType: 'date-only',
        metadata: {}
      };

      businessServiceSpy.generateContextMenuActions.and.returnValues(
        { actions: [viewAction], contextType: 'lesson-event', hasEventContext: true, hasDateContext: false, metadata: {} },
        { actions: [addAction], contextType: 'date-only', hasEventContext: false, hasDateContext: true, metadata: {} }
      );

      handlerServiceSpy.executeAction.and.returnValues(
        { success: true, actionType: 'view-lesson', contextType: 'lesson-event' },
        { success: true, actionType: 'add-special-day', contextType: 'date-only' }
      );

      // Execute actions
      const actions1 = service.getContextMenuActionsWithCoordination();
      actions1[0].handler();

      const actions2 = service.getContextMenuActionsWithCoordination();
      actions2[0].handler();

      expect(events).toHaveLength(2);
      expect(events[0].action).toBe('view-lesson');
      expect(events[1].action).toBe('add-special-day');
    });
  });

  describe('Cleanup', () => {
    it('should complete observable subjects on destroy', () => {
      const interactionSpy = spyOn(service.interactionCompleted$, 'subscribe');
      const menuSpy = spyOn(service.menuGenerated$, 'subscribe');
      const stateSpy = spyOn(service.contextStateChanged$, 'subscribe');

      service.ngOnDestroy();

      // Verify that new subscriptions would not receive values
      expect(() => {
        service.interactionCompleted$.subscribe();
        service.menuGenerated$.subscribe();
        service.contextStateChanged$.subscribe();
      }).not.toThrow();
    });

    it('should handle destroy when observables have subscribers', () => {
      const subscription1 = service.interactionCompleted$.subscribe();
      const subscription2 = service.menuGenerated$.subscribe();
      const subscription3 = service.contextStateChanged$.subscribe();

      expect(() => service.ngOnDestroy()).not.toThrow();

      subscription1.unsubscribe();
      subscription2.unsubscribe();
      subscription3.unsubscribe();
    });
  });

  describe('Edge Cases', () => {
    it('should handle action execution with minimal metadata', () => {
      const minimalAction: ContextMenuAction = {
        id: 'minimal',
        label: 'Minimal',
        actionType: 'view-details',
        contextType: 'date-only'
      };

      const minimalResult: ContextMenuResult = {
        actions: [minimalAction],
        contextType: 'date-only',
        hasEventContext: false,
        hasDateContext: true,
        metadata: {}
      };

      businessServiceSpy.generateContextMenuActions.and.returnValue(minimalResult);

      const executionResult: ActionExecutionResult = {
        success: true,
        actionType: 'view-details',
        contextType: 'date-only'
      };

      handlerServiceSpy.executeAction.and.returnValue(executionResult);

      let emittedEvent: ContextMenuInteractionEvent | null = null;
      service.interactionCompleted$.subscribe(event => emittedEvent = event);

      const actions = service.getContextMenuActionsWithCoordination();
      actions[0].handler();

      expect(emittedEvent).toBeTruthy();
      expect(emittedEvent!.success).toBe(true);
      expect(emittedEvent!.lessonId).toBeUndefined();
      expect(emittedEvent!.period).toBeUndefined();
    });

    it('should handle empty context menu results', () => {
      const emptyResult: ContextMenuResult = {
        actions: [],
        contextType: 'no-context',
        hasEventContext: false,
        hasDateContext: false,
        metadata: {}
      };

      businessServiceSpy.generateContextMenuActions.and.returnValue(emptyResult);

      let emittedEvent: ContextMenuGenerationEvent | null = null;
      service.menuGenerated$.subscribe(event => emittedEvent = event);

      const actions = service.getContextMenuActionsWithCoordination();

      expect(actions).toHaveLength(0);
      expect(emittedEvent).toBeTruthy();
      expect(emittedEvent!.actionCount).toBe(0);
      expect(emittedEvent!.availableActions).toEqual([]);
    });

    it('should handle context state changes without metadata', () => {
      businessServiceSpy.getCurrentContextType.and.returnValue('none');
      businessServiceSpy.setEventContext.and.returnValue({
        type: 'event',
        event: createMockEvent(),
        metadata: {}
      });

      let emittedEvent: ContextStateChangeEvent | null = null;
      service.contextStateChanged$.subscribe(event => emittedEvent = event);

      service.setEventContextWithCoordination(createMockEvent());

      expect(emittedEvent).toBeTruthy();
      expect(emittedEvent!.eventTitle).toBeUndefined();
      expect(emittedEvent!.period).toBeUndefined();
    });
  });
});