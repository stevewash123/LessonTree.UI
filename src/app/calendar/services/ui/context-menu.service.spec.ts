// context-menu.service.spec.ts
// Comprehensive unit tests for ContextMenuService - Facade pattern delegation
// Tests facade methods, observable delegation, and backward compatibility

import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { EventClickArg } from '@fullcalendar/core';
import { ContextMenuService, ContextMenuDisplayItem } from './context-menu.service';
import {
  ContextMenuCoordinationService,
  ContextMenuInteractionEvent,
  ContextMenuGenerationEvent,
  ContextStateChangeEvent
} from '../integration/context-menu-coordination.service';
import { ContextState } from '../core/context-menu-business.service';

describe('ContextMenuService', () => {
  let service: ContextMenuService;
  let coordinationServiceSpy: jasmine.SpyObj<ContextMenuCoordinationService>;

  // Test subjects for observables
  let interactionSubject: Subject<ContextMenuInteractionEvent>;
  let menuGenerationSubject: Subject<ContextMenuGenerationEvent>;
  let contextStateSubject: Subject<ContextStateChangeEvent>;

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

  const mockDisplayItems: ContextMenuDisplayItem[] = [
    {
      id: 'viewLesson',
      label: 'View Lesson',
      handler: jasmine.createSpy('handler1')
    },
    {
      id: 'editLesson',
      label: 'Edit Lesson',
      handler: jasmine.createSpy('handler2')
    }
  ];

  const mockContextState: ContextState = {
    type: 'event',
    event: createMockEvent(),
    metadata: {
      eventTitle: 'Test Event',
      period: 1
    }
  };

  beforeEach(() => {
    // Create test subjects
    interactionSubject = new Subject<ContextMenuInteractionEvent>();
    menuGenerationSubject = new Subject<ContextMenuGenerationEvent>();
    contextStateSubject = new Subject<ContextStateChangeEvent>();

    const coordinationSpy = jasmine.createSpyObj('ContextMenuCoordinationService', [
      'setEventContext',
      'setDateContext',
      'clearContext',
      'getContextMenuActions',
      'getCurrentContextState',
      'getContextDate',
      'validateAction',
      'isLessonEvent',
      'isSpecialDayEvent'
    ], {
      // Observable properties
      interactionCompleted$: interactionSubject.asObservable(),
      menuGenerated$: menuGenerationSubject.asObservable(),
      contextStateChanged$: contextStateSubject.asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        ContextMenuService,
        { provide: ContextMenuCoordinationService, useValue: coordinationSpy }
      ]
    });

    service = TestBed.inject(ContextMenuService);
    coordinationServiceSpy = TestBed.inject(ContextMenuCoordinationService) as jasmine.SpyObj<ContextMenuCoordinationService>;
  });

  afterEach(() => {
    interactionSubject.complete();
    menuGenerationSubject.complete();
    contextStateSubject.complete();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should expose coordination service observables', () => {
      expect(service.interactionCompleted$).toBeDefined();
      expect(service.menuGenerated$).toBeDefined();
      expect(service.contextStateChanged$).toBeDefined();
    });

    it('should connect observables to coordination service', (done) => {
      const mockInteractionEvent: ContextMenuInteractionEvent = {
        action: 'view-lesson',
        success: true,
        contextType: 'lesson-event',
        timestamp: new Date()
      };

      service.interactionCompleted$.subscribe(event => {
        expect(event).toBe(mockInteractionEvent);
        done();
      });

      interactionSubject.next(mockInteractionEvent);
    });
  });

  describe('Facade Methods - Context Management', () => {
    describe('setEventContext()', () => {
      it('should delegate to coordination service', () => {
        const mockEvent = createMockEvent();

        service.setEventContext(mockEvent);

        expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledWith(mockEvent);
      });

      it('should handle multiple event context calls', () => {
        const event1 = createMockEvent({ period: 1 });
        const event2 = createMockEvent({ period: 2 });

        service.setEventContext(event1);
        service.setEventContext(event2);

        expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledTimes(2);
        expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledWith(event1);
        expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledWith(event2);
      });
    });

    describe('setDateContext()', () => {
      it('should delegate to coordination service', () => {
        const testDate = new Date('2024-01-15');

        service.setDateContext(testDate);

        expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledWith(testDate);
      });

      it('should handle different date values', () => {
        const date1 = new Date('2024-01-15');
        const date2 = new Date('2024-02-15');

        service.setDateContext(date1);
        service.setDateContext(date2);

        expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledTimes(2);
        expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledWith(date1);
        expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledWith(date2);
      });
    });

    describe('clearContext()', () => {
      it('should delegate to coordination service', () => {
        service.clearContext();

        expect(coordinationServiceSpy.clearContext).toHaveBeenCalled();
      });

      it('should handle multiple clear context calls', () => {
        service.clearContext();
        service.clearContext();

        expect(coordinationServiceSpy.clearContext).toHaveBeenCalledTimes(2);
      });
    });

    describe('getContextMenuActions()', () => {
      it('should delegate to coordination service and return display items', () => {
        coordinationServiceSpy.getContextMenuActions.and.returnValue(mockDisplayItems);

        const result = service.getContextMenuActions();

        expect(coordinationServiceSpy.getContextMenuActions).toHaveBeenCalled();
        expect(result).toBe(mockDisplayItems);
      });

      it('should handle empty context menu actions', () => {
        coordinationServiceSpy.getContextMenuActions.and.returnValue([]);

        const result = service.getContextMenuActions();

        expect(result).toEqual([]);
      });

      it('should preserve action handlers', () => {
        coordinationServiceSpy.getContextMenuActions.and.returnValue(mockDisplayItems);

        const result = service.getContextMenuActions();

        expect(result[0].handler).toBe(mockDisplayItems[0].handler);
        expect(result[1].handler).toBe(mockDisplayItems[1].handler);
      });
    });
  });

  describe('Facade Delegation Methods', () => {
    describe('getCurrentContextState()', () => {
      it('should delegate to coordination service', () => {
        coordinationServiceSpy.getCurrentContextState.and.returnValue(mockContextState);

        const result = service.getCurrentContextState();

        expect(coordinationServiceSpy.getCurrentContextState).toHaveBeenCalled();
        expect(result).toBe(mockContextState);
      });

      it('should handle different context states', () => {
        const eventState: ContextState = { type: 'event', metadata: {} };
        const dateState: ContextState = { type: 'date', metadata: {} };
        const noneState: ContextState = { type: 'none', metadata: {} };

        coordinationServiceSpy.getCurrentContextState.and.returnValues(eventState, dateState, noneState);

        expect(service.getCurrentContextState()).toBe(eventState);
        expect(service.getCurrentContextState()).toBe(dateState);
        expect(service.getCurrentContextState()).toBe(noneState);
      });
    });

    describe('getContextDate()', () => {
      it('should delegate to coordination service', () => {
        const testDate = new Date('2024-01-15');
        coordinationServiceSpy.getContextDate.and.returnValue(testDate);

        const result = service.getContextDate();

        expect(coordinationServiceSpy.getContextDate).toHaveBeenCalled();
        expect(result).toBe(testDate);
      });

      it('should handle null context date', () => {
        coordinationServiceSpy.getContextDate.and.returnValue(null);

        const result = service.getContextDate();

        expect(result).toBeNull();
      });
    });

    describe('validateAction()', () => {
      it('should delegate to coordination service', () => {
        const validationResult = { isValid: true };
        coordinationServiceSpy.validateAction.and.returnValue(validationResult);

        const result = service.validateAction('testAction');

        expect(coordinationServiceSpy.validateAction).toHaveBeenCalledWith('testAction');
        expect(result).toBe(validationResult);
      });

      it('should handle invalid actions', () => {
        const invalidResult = { isValid: false, reason: 'Not available' };
        coordinationServiceSpy.validateAction.and.returnValue(invalidResult);

        const result = service.validateAction('invalidAction');

        expect(result).toBe(invalidResult);
      });
    });

    describe('isLessonEvent()', () => {
      it('should delegate to coordination service', () => {
        const mockEvent = createMockEvent();
        coordinationServiceSpy.isLessonEvent.and.returnValue(true);

        const result = service.isLessonEvent(mockEvent);

        expect(coordinationServiceSpy.isLessonEvent).toHaveBeenCalledWith(mockEvent);
        expect(result).toBe(true);
      });

      it('should handle non-lesson events', () => {
        const mockEvent = createMockEvent();
        coordinationServiceSpy.isLessonEvent.and.returnValue(false);

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(false);
      });
    });

    describe('isSpecialDayEvent()', () => {
      it('should delegate to coordination service', () => {
        const mockEvent = createMockEvent();
        coordinationServiceSpy.isSpecialDayEvent.and.returnValue(true);

        const result = service.isSpecialDayEvent(mockEvent);

        expect(coordinationServiceSpy.isSpecialDayEvent).toHaveBeenCalledWith(mockEvent);
        expect(result).toBe(true);
      });

      it('should handle non-special-day events', () => {
        const mockEvent = createMockEvent();
        coordinationServiceSpy.isSpecialDayEvent.and.returnValue(false);

        const result = service.isSpecialDayEvent(mockEvent);

        expect(result).toBe(false);
      });
    });
  });

  describe('Observable Event Handling', () => {
    describe('interactionCompleted$', () => {
      it('should emit interaction events from coordination service', (done) => {
        const mockEvent: ContextMenuInteractionEvent = {
          action: 'view-lesson',
          success: true,
          contextType: 'lesson-event',
          lessonId: 123,
          timestamp: new Date()
        };

        service.interactionCompleted$.subscribe(event => {
          expect(event).toBe(mockEvent);
          done();
        });

        interactionSubject.next(mockEvent);
      });

      it('should handle multiple interaction events', () => {
        const events: ContextMenuInteractionEvent[] = [];

        service.interactionCompleted$.subscribe(event => events.push(event));

        const event1: ContextMenuInteractionEvent = {
          action: 'view-lesson',
          success: true,
          contextType: 'lesson-event',
          timestamp: new Date()
        };

        const event2: ContextMenuInteractionEvent = {
          action: 'add-special-day',
          success: false,
          contextType: 'date-only',
          error: new Error('Test error'),
          timestamp: new Date()
        };

        interactionSubject.next(event1);
        interactionSubject.next(event2);

        expect(events).toHaveLength(2);
        expect(events[0]).toBe(event1);
        expect(events[1]).toBe(event2);
      });
    });

    describe('menuGenerated$', () => {
      it('should emit menu generation events from coordination service', (done) => {
        const mockEvent: ContextMenuGenerationEvent = {
          contextType: 'lesson-event',
          actionCount: 3,
          availableActions: ['view', 'edit', 'delete'],
          hasEventContext: true,
          hasDateContext: false,
          timestamp: new Date()
        };

        service.menuGenerated$.subscribe(event => {
          expect(event).toBe(mockEvent);
          done();
        });

        menuGenerationSubject.next(mockEvent);
      });

      it('should handle empty menu generation events', (done) => {
        const emptyEvent: ContextMenuGenerationEvent = {
          contextType: 'no-context',
          actionCount: 0,
          availableActions: [],
          hasEventContext: false,
          hasDateContext: false,
          timestamp: new Date()
        };

        service.menuGenerated$.subscribe(event => {
          expect(event.actionCount).toBe(0);
          expect(event.availableActions).toEqual([]);
          done();
        });

        menuGenerationSubject.next(emptyEvent);
      });
    });

    describe('contextStateChanged$', () => {
      it('should emit context state change events from coordination service', (done) => {
        const mockEvent: ContextStateChangeEvent = {
          changeType: 'event-context-set',
          previousContext: 'none',
          newContext: 'event',
          eventTitle: 'Test Event',
          timestamp: new Date()
        };

        service.contextStateChanged$.subscribe(event => {
          expect(event).toBe(mockEvent);
          done();
        });

        contextStateSubject.next(mockEvent);
      });

      it('should handle different state change types', () => {
        const events: ContextStateChangeEvent[] = [];

        service.contextStateChanged$.subscribe(event => events.push(event));

        const eventSet: ContextStateChangeEvent = {
          changeType: 'event-context-set',
          previousContext: 'none',
          newContext: 'event',
          timestamp: new Date()
        };

        const dateSet: ContextStateChangeEvent = {
          changeType: 'date-context-set',
          previousContext: 'event',
          newContext: 'date',
          timestamp: new Date()
        };

        const cleared: ContextStateChangeEvent = {
          changeType: 'context-cleared',
          previousContext: 'date',
          newContext: 'none',
          timestamp: new Date()
        };

        contextStateSubject.next(eventSet);
        contextStateSubject.next(dateSet);
        contextStateSubject.next(cleared);

        expect(events).toHaveLength(3);
        expect(events[0].changeType).toBe('event-context-set');
        expect(events[1].changeType).toBe('date-context-set');
        expect(events[2].changeType).toBe('context-cleared');
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain original API interface', () => {
      // Verify that all expected methods exist
      expect(typeof service.setEventContext).toBe('function');
      expect(typeof service.setDateContext).toBe('function');
      expect(typeof service.clearContext).toBe('function');
      expect(typeof service.getContextMenuActions).toBe('function');
      expect(typeof service.getCurrentContextState).toBe('function');
      expect(typeof service.getContextDate).toBe('function');
      expect(typeof service.validateAction).toBe('function');
      expect(typeof service.isLessonEvent).toBe('function');
      expect(typeof service.isSpecialDayEvent).toBe('function');
    });

    it('should maintain expected return types', () => {
      // Setup coordination service mocks
      coordinationServiceSpy.getContextMenuActions.and.returnValue(mockDisplayItems);
      coordinationServiceSpy.getCurrentContextState.and.returnValue(mockContextState);
      coordinationServiceSpy.getContextDate.and.returnValue(new Date());
      coordinationServiceSpy.validateAction.and.returnValue({ isValid: true });
      coordinationServiceSpy.isLessonEvent.and.returnValue(true);
      coordinationServiceSpy.isSpecialDayEvent.and.returnValue(false);

      const mockEvent = createMockEvent();

      // Test return types
      expect(Array.isArray(service.getContextMenuActions())).toBe(true);
      expect(typeof service.getCurrentContextState()).toBe('object');
      expect(service.getContextDate() instanceof Date).toBe(true);
      expect(typeof service.validateAction('test')).toBe('object');
      expect(typeof service.isLessonEvent(mockEvent)).toBe('boolean');
      expect(typeof service.isSpecialDayEvent(mockEvent)).toBe('boolean');
    });

    it('should handle legacy component usage patterns', () => {
      const mockEvent = createMockEvent();
      const testDate = new Date('2024-01-15');

      coordinationServiceSpy.getContextMenuActions.and.returnValue(mockDisplayItems);

      // Simulate legacy component workflow
      service.setEventContext(mockEvent);
      const actions = service.getContextMenuActions();
      service.clearContext();
      service.setDateContext(testDate);

      expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledWith(mockEvent);
      expect(coordinationServiceSpy.getContextMenuActions).toHaveBeenCalled();
      expect(coordinationServiceSpy.clearContext).toHaveBeenCalled();
      expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledWith(testDate);
      expect(actions).toBe(mockDisplayItems);
    });
  });

  describe('Cleanup and Lifecycle', () => {
    describe('ngOnDestroy()', () => {
      it('should handle destroy without errors', () => {
        expect(() => service.ngOnDestroy()).not.toThrow();
      });

      it('should rely on coordination service for actual cleanup', () => {
        // Since facade delegates cleanup to coordination service,
        // we just verify it doesn't throw
        service.ngOnDestroy();

        // Coordination service should handle its own cleanup
        expect(service).toBeTruthy();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle coordination service errors gracefully', () => {
      coordinationServiceSpy.setEventContext.and.throwError('Coordination error');

      expect(() => {
        service.setEventContext(createMockEvent());
      }).toThrowError('Coordination error');
    });

    it('should handle null/undefined parameters', () => {
      // These should be passed through to coordination service
      service.setEventContext(null as any);
      service.setDateContext(null as any);
      service.validateAction(null as any);
      service.isLessonEvent(null as any);
      service.isSpecialDayEvent(null as any);

      expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledWith(null);
      expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledWith(null);
      expect(coordinationServiceSpy.validateAction).toHaveBeenCalledWith(null);
      expect(coordinationServiceSpy.isLessonEvent).toHaveBeenCalledWith(null);
      expect(coordinationServiceSpy.isSpecialDayEvent).toHaveBeenCalledWith(null);
    });

    it('should handle observable errors from coordination service', (done) => {
      let errorCaught = false;

      service.interactionCompleted$.subscribe({
        next: () => {},
        error: (error) => {
          errorCaught = true;
          expect(error.message).toBe('Test observable error');
          done();
        }
      });

      interactionSubject.error(new Error('Test observable error'));
      expect(errorCaught).toBe(true);
    });

    it('should handle rapid method calls', () => {
      const mockEvent = createMockEvent();
      const testDate = new Date();

      // Simulate rapid UI interactions
      for (let i = 0; i < 100; i++) {
        service.setEventContext(mockEvent);
        service.setDateContext(testDate);
        service.clearContext();
      }

      expect(coordinationServiceSpy.setEventContext).toHaveBeenCalledTimes(100);
      expect(coordinationServiceSpy.setDateContext).toHaveBeenCalledTimes(100);
      expect(coordinationServiceSpy.clearContext).toHaveBeenCalledTimes(100);
    });

    it('should handle large numbers of context menu actions', () => {
      const largeActionList: ContextMenuDisplayItem[] = Array(1000).fill(null).map((_, index) => ({
        id: `action${index}`,
        label: `Action ${index}`,
        handler: jasmine.createSpy(`handler${index}`)
      }));

      coordinationServiceSpy.getContextMenuActions.and.returnValue(largeActionList);

      const result = service.getContextMenuActions();

      expect(result).toHaveLength(1000);
      expect(result[0].id).toBe('action0');
      expect(result[999].id).toBe('action999');
    });
  });

  describe('Observable Stream Completeness', () => {
    it('should complete observables when coordination service completes them', (done) => {
      let completedCount = 0;
      const expectedCompletions = 3;

      service.interactionCompleted$.subscribe({
        complete: () => {
          completedCount++;
          if (completedCount === expectedCompletions) done();
        }
      });

      service.menuGenerated$.subscribe({
        complete: () => {
          completedCount++;
          if (completedCount === expectedCompletions) done();
        }
      });

      service.contextStateChanged$.subscribe({
        complete: () => {
          completedCount++;
          if (completedCount === expectedCompletions) done();
        }
      });

      // Complete all subjects
      interactionSubject.complete();
      menuGenerationSubject.complete();
      contextStateSubject.complete();
    });
  });
});