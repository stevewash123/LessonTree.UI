// schedule-state.service.spec.ts
// Comprehensive unit tests for ScheduleStateService - Pure schedule state management
// Tests signal-based state, schedule CRUD operations, change tracking, and reactive properties

import { TestBed } from '@angular/core/testing';
import { ScheduleStateService } from './schedule-state.service';
import { Schedule } from '../../../models/schedule';
import { ScheduleEvent } from '../../../models/schedule-event.model';

describe('ScheduleStateService', () => {
  let service: ScheduleStateService;

  // Test data fixtures
  const mockScheduleEvents: ScheduleEvent[] = [
    {
      id: 1,
      date: new Date('2024-01-15'),
      period: 1,
      lessonId: 123,
      lessonTitle: 'Math Lesson 1',
      lessonSort: 1,
      courseId: 1,
      eventCategory: 'Lesson',
      backgroundColor: '#4CAF50',
      fontColor: '#FFFFFF'
    },
    {
      id: 2,
      date: new Date('2024-01-15'),
      period: 2,
      lessonId: 124,
      lessonTitle: 'Science Lesson 1',
      lessonSort: 1,
      courseId: 2,
      eventCategory: 'Lesson',
      backgroundColor: '#2196F3',
      fontColor: '#FFFFFF'
    },
    {
      id: 3,
      date: new Date('2024-01-16'),
      period: 1,
      specialDayId: 1,
      eventCategory: 'SpecialDay',
      backgroundColor: '#FF9800',
      fontColor: '#000000'
    }
  ];

  const mockSchedule: Schedule = {
    id: 1,
    title: 'Test Schedule',
    scheduleEvents: [...mockScheduleEvents],
    specialDays: []
  };

  const mockSchedule2: Schedule = {
    id: 2,
    title: 'Test Schedule 2',
    scheduleEvents: [],
    specialDays: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScheduleStateService]
    });

    service = TestBed.inject(ScheduleStateService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null schedule', () => {
      expect(service.schedule()).toBeNull();
    });

    it('should initialize with default state values', () => {
      expect(service.isInMemorySchedule()).toBe(false);
      expect(service.hasUnsavedChanges()).toBe(false);
      expect(service.scheduleVersion()).toBe(0);
    });

    it('should initialize computed signals correctly', () => {
      expect(service.canSaveSchedule()).toBe(false);
      expect(service.currentScheduleEvents()).toEqual([]);
      expect(service.hasActiveSchedule()).toBe(false);
      expect(service.scheduleTitle()).toBe('No Schedule');
    });
  });

  describe('Schedule Management', () => {
    describe('setSchedule()', () => {
      it('should set schedule with default parameters', () => {
        service.setSchedule(mockSchedule);

        expect(service.schedule()).toBe(mockSchedule);
        expect(service.isInMemorySchedule()).toBe(false);
        expect(service.hasUnsavedChanges()).toBe(false);
        expect(service.scheduleVersion()).toBe(1);
      });

      it('should set schedule as in-memory', () => {
        service.setSchedule(mockSchedule, true);

        expect(service.schedule()).toBe(mockSchedule);
        expect(service.isInMemorySchedule()).toBe(true);
        expect(service.hasUnsavedChanges()).toBe(false);
        expect(service.canSaveSchedule()).toBe(true);
      });

      it('should update computed signals when setting schedule', () => {
        service.setSchedule(mockSchedule);

        expect(service.hasActiveSchedule()).toBe(true);
        expect(service.scheduleTitle()).toBe('Test Schedule');
        expect(service.currentScheduleEvents()).toBe(mockScheduleEvents);
      });

      it('should increment version when setting schedule', () => {
        const initialVersion = service.scheduleVersion();

        service.setSchedule(mockSchedule);

        expect(service.scheduleVersion()).toBe(initialVersion + 1);
      });

      it('should handle null schedule', () => {
        service.setSchedule(mockSchedule);
        service.setSchedule(null);

        expect(service.schedule()).toBeNull();
        expect(service.hasActiveSchedule()).toBe(false);
        expect(service.scheduleTitle()).toBe('No Schedule');
        expect(service.currentScheduleEvents()).toEqual([]);
      });

      it('should log lesson events when setting schedule', () => {
        const consoleSpy = spyOn(console, 'log');

        service.setSchedule(mockSchedule);

        expect(consoleSpy).toHaveBeenCalledWith(
          jasmine.stringContaining('LESSON EVENTS IN SCHEDULE STATE'),
          jasmine.objectContaining({
            totalLessonEvents: 2,
            lessonEventDetails: jasmine.any(Array)
          })
        );
      });

      it('should handle schedule without events', () => {
        const scheduleWithoutEvents = { ...mockSchedule, scheduleEvents: undefined as any };

        service.setSchedule(scheduleWithoutEvents);

        expect(service.currentScheduleEvents()).toEqual([]);
      });
    });

    describe('getSchedule()', () => {
      it('should return null when no schedule is set', () => {
        expect(service.getSchedule()).toBeNull();
      });

      it('should return current schedule when set', () => {
        service.setSchedule(mockSchedule);

        expect(service.getSchedule()).toBe(mockSchedule);
      });

      it('should return updated schedule after changes', () => {
        service.setSchedule(mockSchedule);
        service.setSchedule(mockSchedule2);

        expect(service.getSchedule()).toBe(mockSchedule2);
      });
    });

    describe('clearSchedule()', () => {
      it('should clear all schedule state', () => {
        service.setSchedule(mockSchedule, true);

        service.clearSchedule();

        expect(service.schedule()).toBeNull();
        expect(service.isInMemorySchedule()).toBe(false);
        expect(service.hasUnsavedChanges()).toBe(false);
      });

      it('should update computed signals after clearing', () => {
        service.setSchedule(mockSchedule);

        service.clearSchedule();

        expect(service.hasActiveSchedule()).toBe(false);
        expect(service.scheduleTitle()).toBe('No Schedule');
        expect(service.canSaveSchedule()).toBe(false);
      });
    });
  });

  describe('Schedule Event CRUD Operations', () => {
    const newScheduleEvent: ScheduleEvent = {
      id: 4,
      date: new Date('2024-01-17'),
      period: 3,
      lessonId: 125,
      lessonTitle: 'History Lesson 1',
      lessonSort: 1,
      courseId: 3,
      eventCategory: 'Lesson',
      backgroundColor: '#9C27B0',
      fontColor: '#FFFFFF'
    };

    beforeEach(() => {
      service.setSchedule(mockSchedule, true);
    });

    describe('addScheduleEvent()', () => {
      it('should add new schedule event', () => {
        const initialCount = service.getEventCount();

        service.addScheduleEvent(newScheduleEvent);

        expect(service.getEventCount()).toBe(initialCount + 1);
        expect(service.currentScheduleEvents()).toContain(newScheduleEvent);
      });

      it('should increment version when adding event', () => {
        const initialVersion = service.scheduleVersion();

        service.addScheduleEvent(newScheduleEvent);

        expect(service.scheduleVersion()).toBe(initialVersion + 1);
      });

      it('should mark as changed if in-memory schedule', () => {
        service.addScheduleEvent(newScheduleEvent);

        expect(service.hasUnsavedChanges()).toBe(true);
      });

      it('should not mark as changed if not in-memory schedule', () => {
        service.setSchedule(mockSchedule, false);

        service.addScheduleEvent(newScheduleEvent);

        expect(service.hasUnsavedChanges()).toBe(false);
      });

      it('should handle adding event when no schedule selected', () => {
        service.clearSchedule();

        service.addScheduleEvent(newScheduleEvent);

        expect(service.schedule()).toBeNull();
        expect(service.getEventCount()).toBe(0);
      });

      it('should handle adding to schedule without existing events', () => {
        const emptySchedule = { ...mockSchedule, scheduleEvents: [] };
        service.setSchedule(emptySchedule, true);

        service.addScheduleEvent(newScheduleEvent);

        expect(service.getEventCount()).toBe(1);
        expect(service.currentScheduleEvents()).toEqual([newScheduleEvent]);
      });
    });

    describe('updateScheduleEvent()', () => {
      it('should update existing schedule event', () => {
        const updatedEvent = { ...mockScheduleEvents[0], lessonTitle: 'Updated Math Lesson' };

        service.updateScheduleEvent(updatedEvent);

        const events = service.currentScheduleEvents();
        const foundEvent = events.find(e => e.id === updatedEvent.id);
        expect(foundEvent?.lessonTitle).toBe('Updated Math Lesson');
      });

      it('should increment version when updating event', () => {
        const initialVersion = service.scheduleVersion();
        const updatedEvent = { ...mockScheduleEvents[0], lessonTitle: 'Updated' };

        service.updateScheduleEvent(updatedEvent);

        expect(service.scheduleVersion()).toBe(initialVersion + 1);
      });

      it('should mark as changed if in-memory schedule', () => {
        const updatedEvent = { ...mockScheduleEvents[0], lessonTitle: 'Updated' };

        service.updateScheduleEvent(updatedEvent);

        expect(service.hasUnsavedChanges()).toBe(true);
      });

      it('should handle updating non-existing event', () => {
        const nonExistingEvent = { ...newScheduleEvent, id: 999 };
        const initialCount = service.getEventCount();

        service.updateScheduleEvent(nonExistingEvent);

        expect(service.getEventCount()).toBe(initialCount);
      });

      it('should handle updating when no schedule or events', () => {
        service.clearSchedule();

        service.updateScheduleEvent(newScheduleEvent);

        expect(service.schedule()).toBeNull();
      });

      it('should handle updating event with different properties', () => {
        const updatedEvent = {
          ...mockScheduleEvents[0],
          period: 5,
          backgroundColor: '#FF0000'
        };

        service.updateScheduleEvent(updatedEvent);

        const events = service.currentScheduleEvents();
        const foundEvent = events.find(e => e.id === updatedEvent.id);
        expect(foundEvent?.period).toBe(5);
        expect(foundEvent?.backgroundColor).toBe('#FF0000');
      });
    });

    describe('removeScheduleEvent()', () => {
      it('should remove existing schedule event', () => {
        const eventToRemove = mockScheduleEvents[0];
        const initialCount = service.getEventCount();

        service.removeScheduleEvent(eventToRemove.id);

        expect(service.getEventCount()).toBe(initialCount - 1);
        expect(service.currentScheduleEvents()).not.toContain(eventToRemove);
      });

      it('should increment version when removing event', () => {
        const initialVersion = service.scheduleVersion();

        service.removeScheduleEvent(mockScheduleEvents[0].id);

        expect(service.scheduleVersion()).toBe(initialVersion + 1);
      });

      it('should mark as changed if in-memory schedule', () => {
        service.removeScheduleEvent(mockScheduleEvents[0].id);

        expect(service.hasUnsavedChanges()).toBe(true);
      });

      it('should handle removing non-existing event', () => {
        const initialCount = service.getEventCount();

        service.removeScheduleEvent(999);

        expect(service.getEventCount()).toBe(initialCount);
      });

      it('should handle removing when no schedule or events', () => {
        service.clearSchedule();

        service.removeScheduleEvent(1);

        expect(service.schedule()).toBeNull();
      });

      it('should remove only the specified event', () => {
        const eventToRemove = mockScheduleEvents[0];
        const eventToKeep = mockScheduleEvents[1];

        service.removeScheduleEvent(eventToRemove.id);

        const events = service.currentScheduleEvents();
        expect(events).not.toContain(eventToRemove);
        expect(events).toContain(eventToKeep);
      });
    });

    describe('getScheduleEvents() and getEventCount()', () => {
      it('should return current schedule events', () => {
        expect(service.getScheduleEvents()).toBe(mockScheduleEvents);
      });

      it('should return event count', () => {
        expect(service.getEventCount()).toBe(mockScheduleEvents.length);
      });

      it('should return empty array when no schedule', () => {
        service.clearSchedule();

        expect(service.getScheduleEvents()).toEqual([]);
        expect(service.getEventCount()).toBe(0);
      });
    });
  });

  describe('Change Tracking', () => {
    beforeEach(() => {
      service.setSchedule(mockSchedule, true);
    });

    describe('markAsChanged()', () => {
      it('should mark as changed if in-memory schedule', () => {
        service.markAsChanged();

        expect(service.hasUnsavedChanges()).toBe(true);
      });

      it('should increment version when marking as changed', () => {
        const initialVersion = service.scheduleVersion();

        service.markAsChanged();

        expect(service.scheduleVersion()).toBe(initialVersion + 1);
      });

      it('should not mark as changed if not in-memory schedule', () => {
        service.setSchedule(mockSchedule, false);

        service.markAsChanged();

        expect(service.hasUnsavedChanges()).toBe(false);
      });
    });

    describe('markAsSaved()', () => {
      it('should clear unsaved changes flag', () => {
        service.markAsChanged();
        expect(service.hasUnsavedChanges()).toBe(true);

        service.markAsSaved();

        expect(service.hasUnsavedChanges()).toBe(false);
      });

      it('should set in-memory flag to false', () => {
        expect(service.isInMemorySchedule()).toBe(true);

        service.markAsSaved();

        expect(service.isInMemorySchedule()).toBe(false);
      });

      it('should update canSaveSchedule computed signal', () => {
        expect(service.canSaveSchedule()).toBe(true);

        service.markAsSaved();

        expect(service.canSaveSchedule()).toBe(false);
      });
    });
  });

  describe('Computed Signals', () => {
    describe('canSaveSchedule', () => {
      it('should return false when no schedule', () => {
        expect(service.canSaveSchedule()).toBe(false);
      });

      it('should return true when in-memory schedule exists', () => {
        service.setSchedule(mockSchedule, true);

        expect(service.canSaveSchedule()).toBe(true);
      });

      it('should return false when schedule is not in-memory', () => {
        service.setSchedule(mockSchedule, false);

        expect(service.canSaveSchedule()).toBe(false);
      });

      it('should update when state changes', () => {
        service.setSchedule(mockSchedule, true);
        expect(service.canSaveSchedule()).toBe(true);

        service.markAsSaved();
        expect(service.canSaveSchedule()).toBe(false);
      });
    });

    describe('currentScheduleEvents', () => {
      it('should return empty array when no schedule', () => {
        expect(service.currentScheduleEvents()).toEqual([]);
      });

      it('should return schedule events when schedule exists', () => {
        service.setSchedule(mockSchedule);

        expect(service.currentScheduleEvents()).toBe(mockScheduleEvents);
      });

      it('should update when events are modified', () => {
        service.setSchedule(mockSchedule, true);

        service.removeScheduleEvent(mockScheduleEvents[0].id);

        const events = service.currentScheduleEvents();
        expect(events).toHaveLength(mockScheduleEvents.length - 1);
      });
    });

    describe('hasActiveSchedule', () => {
      it('should return false when no schedule', () => {
        expect(service.hasActiveSchedule()).toBe(false);
      });

      it('should return true when schedule exists', () => {
        service.setSchedule(mockSchedule);

        expect(service.hasActiveSchedule()).toBe(true);
      });

      it('should update when schedule changes', () => {
        service.setSchedule(mockSchedule);
        expect(service.hasActiveSchedule()).toBe(true);

        service.clearSchedule();
        expect(service.hasActiveSchedule()).toBe(false);
      });
    });

    describe('scheduleTitle', () => {
      it('should return default title when no schedule', () => {
        expect(service.scheduleTitle()).toBe('No Schedule');
      });

      it('should return schedule title when schedule exists', () => {
        service.setSchedule(mockSchedule);

        expect(service.scheduleTitle()).toBe('Test Schedule');
      });

      it('should update when schedule changes', () => {
        service.setSchedule(mockSchedule);
        expect(service.scheduleTitle()).toBe('Test Schedule');

        service.setSchedule(mockSchedule2);
        expect(service.scheduleTitle()).toBe('Test Schedule 2');
      });
    });
  });

  describe('Legacy Compatibility', () => {
    describe('selectedSchedule', () => {
      it('should return readonly signal', () => {
        expect(service.selectedSchedule).toBe(service.schedule);
      });
    });

    describe('selectedScheduleValue()', () => {
      it('should return current schedule value', () => {
        expect(service.selectedScheduleValue()).toBeNull();

        service.setSchedule(mockSchedule);

        expect(service.selectedScheduleValue()).toBe(mockSchedule);
      });
    });
  });

  describe('State Reset', () => {
    describe('reset()', () => {
      it('should reset all state to initial values', () => {
        service.setSchedule(mockSchedule, true);
        service.markAsChanged();

        service.reset();

        expect(service.schedule()).toBeNull();
        expect(service.isInMemorySchedule()).toBe(false);
        expect(service.hasUnsavedChanges()).toBe(false);
        expect(service.scheduleVersion()).toBe(0);
      });

      it('should reset computed signals', () => {
        service.setSchedule(mockSchedule, true);

        service.reset();

        expect(service.canSaveSchedule()).toBe(false);
        expect(service.currentScheduleEvents()).toEqual([]);
        expect(service.hasActiveSchedule()).toBe(false);
        expect(service.scheduleTitle()).toBe('No Schedule');
      });

      it('should handle multiple resets', () => {
        service.setSchedule(mockSchedule);
        service.reset();
        service.reset();

        expect(service.schedule()).toBeNull();
      });
    });
  });

  describe('Debug Information', () => {
    describe('getDebugInfo()', () => {
      it('should return debug info for empty state', () => {
        const debugInfo = service.getDebugInfo();

        expect(debugInfo).toEqual({
          hasSchedule: false,
          scheduleId: null,
          scheduleTitle: null,
          isInMemorySchedule: false,
          hasUnsavedChanges: false,
          scheduleVersion: 0,
          eventCount: 0
        });
      });

      it('should return debug info for active schedule', () => {
        service.setSchedule(mockSchedule, true);
        service.markAsChanged();

        const debugInfo = service.getDebugInfo();

        expect(debugInfo).toEqual({
          hasSchedule: true,
          scheduleId: 1,
          scheduleTitle: 'Test Schedule',
          isInMemorySchedule: true,
          hasUnsavedChanges: true,
          scheduleVersion: 2, // Incremented by setSchedule and markAsChanged
          eventCount: 3
        });
      });

      it('should update debug info when state changes', () => {
        service.setSchedule(mockSchedule);
        let debugInfo = service.getDebugInfo();
        expect(debugInfo.hasSchedule).toBe(true);

        service.clearSchedule();
        debugInfo = service.getDebugInfo();
        expect(debugInfo.hasSchedule).toBe(false);
      });
    });
  });

  describe('Signal Reactivity and Performance', () => {
    it('should trigger signal updates when schedule changes', () => {
      let titleUpdateCount = 0;
      let eventUpdateCount = 0;

      // Create effects to track signal updates
      const titleEffect = () => {
        service.scheduleTitle();
        titleUpdateCount++;
      };

      const eventEffect = () => {
        service.currentScheduleEvents();
        eventUpdateCount++;
      };

      // Initial calls
      titleEffect();
      eventEffect();

      // Change schedule
      service.setSchedule(mockSchedule);

      // Effects should be called again
      titleEffect();
      eventEffect();

      expect(titleUpdateCount).toBe(2);
      expect(eventUpdateCount).toBe(2);
    });

    it('should maintain signal consistency across multiple operations', () => {
      service.setSchedule(mockSchedule, true);

      const initialEventCount = service.getEventCount();
      const initialVersion = service.scheduleVersion();

      // Perform multiple operations
      service.addScheduleEvent(newScheduleEvent);
      service.removeScheduleEvent(mockScheduleEvents[0].id);

      expect(service.getEventCount()).toBe(initialEventCount); // Added 1, removed 1
      expect(service.scheduleVersion()).toBe(initialVersion + 2); // Two operations
      expect(service.hasUnsavedChanges()).toBe(true);
    });

    it('should handle rapid state changes efficiently', () => {
      for (let i = 0; i < 100; i++) {
        service.setSchedule(mockSchedule, true);
        service.markAsChanged();
        service.markAsSaved();
        service.clearSchedule();
      }

      expect(service.schedule()).toBeNull();
      expect(service.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle schedule with null or undefined events array', () => {
      const scheduleWithNullEvents = {
        ...mockSchedule,
        scheduleEvents: null as any
      };

      service.setSchedule(scheduleWithNullEvents);

      expect(service.currentScheduleEvents()).toEqual([]);
      expect(service.getEventCount()).toBe(0);
    });

    it('should handle schedule event operations with undefined properties', () => {
      const partialEvent = {
        id: 99,
        date: new Date('2024-01-20')
      } as any;

      service.setSchedule(mockSchedule, true);
      service.addScheduleEvent(partialEvent);

      expect(service.currentScheduleEvents()).toContain(partialEvent);
    });

    it('should handle version overflow gracefully', () => {
      // Simulate many operations to test version counter
      service.setSchedule(mockSchedule, true);

      for (let i = 0; i < 1000; i++) {
        service.markAsChanged();
      }

      expect(service.scheduleVersion()).toBe(1001); // Initial + 1000 changes
    });

    it('should handle concurrent-like operations', () => {
      service.setSchedule(mockSchedule, true);

      // Simulate rapid operations that might occur in UI interactions
      service.addScheduleEvent(newScheduleEvent);
      service.updateScheduleEvent({ ...newScheduleEvent, lessonTitle: 'Updated' });
      service.removeScheduleEvent(newScheduleEvent.id);

      // Should maintain consistent state
      expect(service.getEventCount()).toBe(mockScheduleEvents.length);
      expect(service.hasUnsavedChanges()).toBe(true);
    });

    it('should handle large numbers of events efficiently', () => {
      const largeEventArray: ScheduleEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        largeEventArray.push({
          id: i + 100,
          date: new Date('2024-01-15'),
          period: (i % 6) + 1,
          lessonId: i + 200,
          lessonTitle: `Lesson ${i}`,
          lessonSort: i,
          courseId: (i % 5) + 1,
          eventCategory: 'Lesson',
          backgroundColor: '#4CAF50',
          fontColor: '#FFFFFF'
        });
      }

      const largeSchedule = {
        ...mockSchedule,
        scheduleEvents: largeEventArray
      };

      service.setSchedule(largeSchedule, true);

      expect(service.getEventCount()).toBe(1000);
      expect(service.currentScheduleEvents()).toHaveLength(1000);
    });
  });
});