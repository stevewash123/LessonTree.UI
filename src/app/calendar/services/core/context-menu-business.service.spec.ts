// context-menu-business.service.spec.ts
// Comprehensive unit tests for ContextMenuBusinessService - Business logic and context state management
// Tests all public methods, event type detection, state transitions, and edge cases

import { TestBed } from '@angular/core/testing';
import { EventClickArg } from '@fullcalendar/core';
import { ContextMenuBusinessService, ContextMenuAction, ContextMenuResult, ContextState } from './context-menu-business.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { Schedule } from '../../../models/schedule';

describe('ContextMenuBusinessService', () => {
  let service: ContextMenuBusinessService;
  let scheduleStateServiceSpy: jasmine.SpyObj<ScheduleStateService>;

  // Test data fixtures
  const mockSchedule: Schedule = {
    id: 1,
    title: 'Test Schedule',
    scheduleEvents: [],
    specialDays: [
      {
        id: 1,
        date: new Date('2024-01-15'),
        periods: [1, 2],
        eventType: 'Holiday',
        title: 'Test Holiday',
        backgroundColor: '#ff0000',
        fontColor: '#ffffff'
      }
    ]
  };

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

  beforeEach(() => {
    const scheduleStateSpy = jasmine.createSpyObj('ScheduleStateService', ['getSchedule']);

    TestBed.configureTestingModule({
      providers: [
        ContextMenuBusinessService,
        { provide: ScheduleStateService, useValue: scheduleStateSpy }
      ]
    });

    service = TestBed.inject(ContextMenuBusinessService);
    scheduleStateServiceSpy = TestBed.inject(ScheduleStateService) as jasmine.SpyObj<ScheduleStateService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no context state', () => {
      const contextState = service.getCurrentContextState();
      expect(contextState.type).toBe('none');
      expect(contextState.metadata).toEqual({});
    });
  });

  describe('Context State Management', () => {
    describe('setEventContext()', () => {
      it('should set event context with valid event', () => {
        const mockEvent = createMockEvent({
          period: 1,
          eventType: 'lesson',
          scheduleEvent: { lessonId: 123, lessonTitle: 'Test Lesson' }
        });

        const result = service.setEventContext(mockEvent);

        expect(result.type).toBe('event');
        expect(result.event).toBe(mockEvent);
        expect(result.metadata.eventTitle).toBe('Test Event');
        expect(result.metadata.period).toBe(1);
        expect(result.metadata.eventType).toBe('lesson');
      });

      it('should handle null event', () => {
        const result = service.setEventContext(null as any);

        expect(result.type).toBe('none');
        expect(result.metadata).toEqual({});
      });

      it('should handle event without extendedProps', () => {
        const mockEvent = createMockEvent();

        const result = service.setEventContext(mockEvent);

        expect(result.type).toBe('event');
        expect(result.metadata.eventTitle).toBe('Test Event');
        expect(result.metadata.period).toBeUndefined();
      });

      it('should clear date context when setting event context', () => {
        service.setDateContext(new Date('2024-01-15'));
        const mockEvent = createMockEvent();

        service.setEventContext(mockEvent);

        const contextState = service.getCurrentContextState();
        expect(contextState.type).toBe('event');
        expect(contextState.date).toBeUndefined();
      });
    });

    describe('setDateContext()', () => {
      it('should set date context', () => {
        const testDate = new Date('2024-01-15');

        const result = service.setDateContext(testDate);

        expect(result.type).toBe('date');
        expect(result.date).toBe(testDate);
        expect(result.metadata.date).toBe(testDate);
      });

      it('should clear event context when setting date context', () => {
        const mockEvent = createMockEvent();
        service.setEventContext(mockEvent);

        const testDate = new Date('2024-01-15');
        service.setDateContext(testDate);

        const contextState = service.getCurrentContextState();
        expect(contextState.type).toBe('date');
        expect(contextState.event).toBeUndefined();
      });
    });

    describe('clearContext()', () => {
      it('should clear all context state', () => {
        const mockEvent = createMockEvent();
        service.setEventContext(mockEvent);

        const result = service.clearContext();

        expect(result.type).toBe('none');
        expect(result.metadata).toEqual({});
      });

      it('should clear date context', () => {
        service.setDateContext(new Date('2024-01-15'));

        service.clearContext();

        const contextState = service.getCurrentContextState();
        expect(contextState.type).toBe('none');
        expect(contextState.date).toBeUndefined();
      });
    });

    describe('getCurrentContextState()', () => {
      it('should return event context when set', () => {
        const mockEvent = createMockEvent({ period: 2, eventType: 'lesson' });
        service.setEventContext(mockEvent);

        const contextState = service.getCurrentContextState();

        expect(contextState.type).toBe('event');
        expect(contextState.event).toBe(mockEvent);
        expect(contextState.metadata.period).toBe(2);
      });

      it('should return date context when set', () => {
        const testDate = new Date('2024-01-15');
        service.setDateContext(testDate);

        const contextState = service.getCurrentContextState();

        expect(contextState.type).toBe('date');
        expect(contextState.date).toBe(testDate);
      });

      it('should return none when no context set', () => {
        const contextState = service.getCurrentContextState();

        expect(contextState.type).toBe('none');
        expect(contextState.metadata).toEqual({});
      });
    });
  });

  describe('Context Menu Generation', () => {
    describe('generateContextMenuActions()', () => {
      beforeEach(() => {
        scheduleStateServiceSpy.getSchedule.and.returnValue(mockSchedule);
      });

      it('should generate add special day action for date context', () => {
        service.setDateContext(new Date('2024-02-15')); // Date without special day

        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('date-only');
        expect(result.actions.length).toBe(1);
        expect(result.actions[0].actionType).toBe('add-special-day');
        expect(result.actions[0].label).toContain('Add Special Day');
        expect(result.hasDateContext).toBe(true);
        expect(result.hasEventContext).toBe(false);
      });

      it('should not generate add special day action when special day exists', () => {
        service.setDateContext(new Date('2024-01-15')); // Date with existing special day

        const result = service.generateContextMenuActions();

        expect(result.actions.length).toBe(0);
        expect(result.contextType).toBe('date-only');
      });

      it('should generate lesson event actions', () => {
        const mockEvent = createMockEvent({
          eventType: 'lesson',
          period: 1,
          scheduleEvent: { lessonId: 123, lessonTitle: 'Math Lesson' }
        });
        service.setEventContext(mockEvent);

        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('lesson-event');
        expect(result.actions.length).toBe(3);

        const actionTypes = result.actions.map(a => a.actionType);
        expect(actionTypes).toContain('view-lesson');
        expect(actionTypes).toContain('edit-lesson');
        expect(actionTypes).toContain('reschedule-lesson');

        expect(result.hasEventContext).toBe(true);
        expect(result.period).toBe(1);
      });

      it('should generate special day event actions', () => {
        const mockEvent = createMockEvent({
          eventType: 'special',
          period: 2,
          scheduleEvent: { eventCategory: 'SpecialDay' }
        });
        service.setEventContext(mockEvent);

        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('special-day-event');
        expect(result.actions.length).toBe(2);

        const actionTypes = result.actions.map(a => a.actionType);
        expect(actionTypes).toContain('edit-special-day');
        expect(actionTypes).toContain('delete-special-day');
      });

      it('should generate error event actions', () => {
        const mockEvent = createMockEvent({
          eventType: 'error',
          period: 3,
          scheduleEvent: { eventCategory: 'Error' }
        });
        service.setEventContext(mockEvent);

        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('error-event');
        expect(result.actions.length).toBe(1);
        expect(result.actions[0].actionType).toBe('view-error');
      });

      it('should generate free period actions', () => {
        const mockEvent = createMockEvent({
          eventType: 'free',
          period: 4,
          scheduleEvent: { period: 4, eventCategory: 'Free' }
        });
        service.setEventContext(mockEvent);

        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('free-period');
        expect(result.actions.length).toBe(1);
        expect(result.actions[0].actionType).toBe('add-activity');
      });

      it('should generate fallback actions for unknown event types', () => {
        const mockEvent = createMockEvent({
          eventType: 'unknown',
          period: 1
        });
        service.setEventContext(mockEvent);

        const result = service.generateContextMenuActions();

        expect(result.actions.length).toBe(1);
        expect(result.actions[0].actionType).toBe('view-details');
      });

      it('should handle errors gracefully', () => {
        scheduleStateServiceSpy.getSchedule.and.throwError('Test error');

        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('no-context');
        expect(result.actions.length).toBe(0);
      });

      it('should return no context when no state is set', () => {
        const result = service.generateContextMenuActions();

        expect(result.contextType).toBe('no-context');
        expect(result.actions.length).toBe(0);
        expect(result.hasEventContext).toBe(false);
        expect(result.hasDateContext).toBe(false);
      });
    });
  });

  describe('Event Type Detection', () => {
    describe('isLessonEvent()', () => {
      it('should detect lesson event by eventType', () => {
        const mockEvent = createMockEvent({ eventType: 'lesson' });

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect lesson event by eventCategory', () => {
        const mockEvent = createMockEvent({ eventCategory: 'Lesson' });

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect lesson event by scheduleEvent category', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { eventCategory: 'Lesson' }
        });

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect lesson event by lessonId', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { lessonId: 123 }
        });

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect lesson event by lessonTitle', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { lessonTitle: 'Math Lesson' }
        });

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should return false for non-lesson events', () => {
        const mockEvent = createMockEvent({ eventType: 'special' });

        const result = service.isLessonEvent(mockEvent);

        expect(result).toBe(false);
      });
    });

    describe('isSpecialDayEvent()', () => {
      it('should detect special day event by eventType', () => {
        const mockEvent = createMockEvent({ eventType: 'special' });

        const result = service.isSpecialDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect special day event by eventCategory', () => {
        const mockEvent = createMockEvent({ eventCategory: 'SpecialDay' });

        const result = service.isSpecialDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect special day event by scheduleEvent category', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { eventCategory: 'SpecialDay' }
        });

        const result = service.isSpecialDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect special day event by scheduleEvent type', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { eventType: 'special' }
        });

        const result = service.isSpecialDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should return false for non-special day events', () => {
        const mockEvent = createMockEvent({ eventType: 'lesson' });

        const result = service.isSpecialDayEvent(mockEvent);

        expect(result).toBe(false);
      });
    });

    describe('isErrorDayEvent()', () => {
      it('should detect error event by eventType', () => {
        const mockEvent = createMockEvent({ eventType: 'error' });

        const result = service.isErrorDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect error event by Error eventType', () => {
        const mockEvent = createMockEvent({ eventType: 'Error' });

        const result = service.isErrorDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect error event by scheduleEvent type', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { eventType: 'Error' }
        });

        const result = service.isErrorDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect error event by scheduleEvent category', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { eventCategory: 'Error' }
        });

        const result = service.isErrorDayEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should return false for non-error events', () => {
        const mockEvent = createMockEvent({ eventType: 'lesson' });

        const result = service.isErrorDayEvent(mockEvent);

        expect(result).toBe(false);
      });
    });

    describe('isFreePeriodEvent()', () => {
      it('should detect free period event by eventType', () => {
        const mockEvent = createMockEvent({ eventType: 'free' });

        const result = service.isFreePeriodEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect free period event by eventCategory', () => {
        const mockEvent = createMockEvent({ eventCategory: 'Free' });

        const result = service.isFreePeriodEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect free period event by scheduleEvent category', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { eventCategory: 'Free' }
        });

        const result = service.isFreePeriodEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should detect free period by period without lesson', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { period: 1 }
        });

        const result = service.isFreePeriodEvent(mockEvent);

        expect(result).toBe(true);
      });

      it('should return false for periods with lessons', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { period: 1, lessonId: 123 }
        });

        const result = service.isFreePeriodEvent(mockEvent);

        expect(result).toBe(false);
      });

      it('should return false for periods with special codes', () => {
        const mockEvent = createMockEvent({
          scheduleEvent: { period: 1, specialCode: 'HOLIDAY' }
        });

        const result = service.isFreePeriodEvent(mockEvent);

        expect(result).toBe(false);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getContextDate()', () => {
      it('should return date from event start', () => {
        const eventDate = new Date('2024-01-15');
        const mockEvent = createMockEvent();
        mockEvent.event.start = eventDate;
        service.setEventContext(mockEvent);

        const result = service.getContextDate();

        expect(result).toEqual(eventDate);
      });

      it('should return direct date context', () => {
        const testDate = new Date('2024-01-15');
        service.setDateContext(testDate);

        const result = service.getContextDate();

        expect(result).toBe(testDate);
      });

      it('should return null when no context', () => {
        const result = service.getContextDate();

        expect(result).toBeNull();
      });

      it('should prefer event date over direct date context', () => {
        const eventDate = new Date('2024-01-15');
        const dateContext = new Date('2024-01-16');

        service.setDateContext(dateContext);
        const mockEvent = createMockEvent();
        mockEvent.event.start = eventDate;
        service.setEventContext(mockEvent);

        const result = service.getContextDate();

        expect(result).toEqual(eventDate);
      });
    });

    describe('getCurrentContextType()', () => {
      it('should return event when event context is set', () => {
        const mockEvent = createMockEvent();
        service.setEventContext(mockEvent);

        const result = service.getCurrentContextType();

        expect(result).toBe('event');
      });

      it('should return date when date context is set', () => {
        service.setDateContext(new Date('2024-01-15'));

        const result = service.getCurrentContextType();

        expect(result).toBe('date');
      });

      it('should return none when no context is set', () => {
        const result = service.getCurrentContextType();

        expect(result).toBe('none');
      });

      it('should return event when both contexts are set', () => {
        service.setDateContext(new Date('2024-01-15'));
        const mockEvent = createMockEvent();
        service.setEventContext(mockEvent);

        const result = service.getCurrentContextType();

        expect(result).toBe('event');
      });
    });
  });

  describe('Action Validation', () => {
    describe('validateAction()', () => {
      it('should validate existing action', () => {
        service.setDateContext(new Date('2024-02-15'));

        const result = service.validateAction('addSpecialDay');

        expect(result.isValid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should reject non-existing action', () => {
        service.setDateContext(new Date('2024-01-15'));

        const result = service.validateAction('nonExistentAction');

        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Action not available in current context');
      });

      it('should reject action when no context', () => {
        const result = service.validateAction('addSpecialDay');

        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Action not available in current context');
      });
    });

    describe('getActionMetadata()', () => {
      it('should return metadata for existing action', () => {
        const testDate = new Date('2024-02-15');
        service.setDateContext(testDate);

        const result = service.getActionMetadata('addSpecialDay');

        expect(result).toEqual({ date: testDate });
      });

      it('should return null for non-existing action', () => {
        service.setDateContext(new Date('2024-01-15'));

        const result = service.getActionMetadata('nonExistentAction');

        expect(result).toBeNull();
      });
    });
  });

  describe('Special Day Detection', () => {
    beforeEach(() => {
      scheduleStateServiceSpy.getSchedule.and.returnValue(mockSchedule);
    });

    it('should detect existing special day for date', () => {
      service.setDateContext(new Date('2024-01-15'));

      const result = service.generateContextMenuActions();

      expect(result.actions.length).toBe(0); // No add action when special day exists
    });

    it('should allow special day creation for date without special day', () => {
      service.setDateContext(new Date('2024-02-15'));

      const result = service.generateContextMenuActions();

      expect(result.actions.length).toBe(1);
      expect(result.actions[0].actionType).toBe('add-special-day');
    });

    it('should handle schedule without special days', () => {
      const scheduleWithoutSpecialDays = { ...mockSchedule, specialDays: null };
      scheduleStateServiceSpy.getSchedule.and.returnValue(scheduleWithoutSpecialDays);
      service.setDateContext(new Date('2024-01-15'));

      const result = service.generateContextMenuActions();

      expect(result.actions.length).toBe(1);
      expect(result.actions[0].actionType).toBe('add-special-day');
    });

    it('should handle null schedule', () => {
      scheduleStateServiceSpy.getSchedule.and.returnValue(null);
      service.setDateContext(new Date('2024-01-15'));

      const result = service.generateContextMenuActions();

      expect(result.actions.length).toBe(1);
      expect(result.actions[0].actionType).toBe('add-special-day');
    });
  });

  describe('Edge Cases', () => {
    it('should handle event without extendedProps', () => {
      const mockEvent = createMockEvent();
      delete (mockEvent.event as any).extendedProps;

      const result = service.setEventContext(mockEvent);

      expect(result.type).toBe('event');
      expect(result.metadata.period).toBeUndefined();
    });

    it('should handle event with null extendedProps', () => {
      const mockEvent = createMockEvent();
      (mockEvent.event as any).extendedProps = null;

      const result = service.setEventContext(mockEvent);

      expect(result.type).toBe('event');
      expect(result.metadata).toBeDefined();
    });

    it('should handle event without start date', () => {
      const mockEvent = createMockEvent();
      mockEvent.event.start = null;

      service.setEventContext(mockEvent);
      const result = service.getContextDate();

      expect(result).toBeNull();
    });

    it('should handle multiple context switches', () => {
      const mockEvent = createMockEvent();
      const testDate = new Date('2024-01-15');

      service.setEventContext(mockEvent);
      service.setDateContext(testDate);
      service.clearContext();
      service.setEventContext(mockEvent);

      const contextState = service.getCurrentContextState();
      expect(contextState.type).toBe('event');
    });

    it('should handle lesson event without period', () => {
      const mockEvent = createMockEvent({
        eventType: 'lesson',
        scheduleEvent: { lessonId: 123, lessonTitle: 'Math Lesson' }
      });
      service.setEventContext(mockEvent);

      const result = service.generateContextMenuActions();

      expect(result.contextType).toBe('lesson-event');
      expect(result.actions.length).toBe(2); // No reschedule action without period

      const actionTypes = result.actions.map(a => a.actionType);
      expect(actionTypes).toContain('view-lesson');
      expect(actionTypes).toContain('edit-lesson');
      expect(actionTypes).not.toContain('reschedule-lesson');
    });
  });
});