// calendar-context.service.spec.ts
// Unit tests for CalendarContextService - Calendar Update Optimization
// Tests calendar state management, optimization payload generation, and signal reactivity

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CalendarContextService, CalendarContext, CalendarOptimizationPayload } from './calendar-context.service';
import { CalendarDateService } from '../core/calendar-date.service';

describe('CalendarContextService', () => {
  let service: CalendarContextService;
  let mockCalendarDateService: jasmine.SpyObj<CalendarDateService>;

  // Test data setup
  const testCurrentDate = new Date('2024-03-15T10:00:00.000Z');
  const testWeekRange = {
    start: new Date('2024-03-11T00:00:00.000Z'),
    end: new Date('2024-03-17T23:59:59.999Z')
  };
  const testMonthRange = {
    start: new Date('2024-03-01T00:00:00.000Z'),
    end: new Date('2024-03-31T23:59:59.999Z')
  };

  beforeEach(() => {
    // Create spy object for CalendarDateService
    const spy = jasmine.createSpyObj('CalendarDateService', [
      'getCurrentCalendarDate',
      'getWeekRange',
      'getMonthRange'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CalendarContextService,
        { provide: CalendarDateService, useValue: spy }
      ]
    });

    service = TestBed.inject(CalendarContextService);
    mockCalendarDateService = TestBed.inject(CalendarDateService) as jasmine.SpyObj<CalendarDateService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with calendar inactive', () => {
      expect(service.isCalendarActive()).toBeFalse();
      expect(service.hasDateRange()).toBeFalse();
      expect(service.canOptimize()).toBeFalse();
    });

    it('should initialize with empty calendar context', () => {
      const context = service.calendarContext();
      expect(context.currentDate).toBeNull();
      expect(context.weekRange).toBeNull();
      expect(context.monthRange).toBeNull();
      expect(context.isAvailable).toBeFalse();
    });
  });

  describe('Calendar State Management', () => {
    it('should activate calendar and refresh context', () => {
      // Arrange: Mock successful date service calls
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);

      // Act: Activate calendar
      service.setCalendarActive(true);

      // Assert: Calendar should be active with valid context
      expect(service.isCalendarActive()).toBeTrue();
      expect(service.hasDateRange()).toBeTrue();
      expect(service.canOptimize()).toBeTrue();

      const context = service.calendarContext();
      expect(context.currentDate).toEqual(testCurrentDate);
      expect(context.weekRange).toEqual(testWeekRange);
      expect(context.monthRange).toEqual(testMonthRange);
      expect(context.isAvailable).toBeTrue();
    });

    it('should deactivate calendar and clear context', () => {
      // Arrange: Start with active calendar
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.setCalendarActive(true);

      // Act: Deactivate calendar
      service.setCalendarActive(false);

      // Assert: Calendar should be inactive with empty context
      expect(service.isCalendarActive()).toBeFalse();
      expect(service.hasDateRange()).toBeFalse();
      expect(service.canOptimize()).toBeFalse();

      const context = service.calendarContext();
      expect(context.currentDate).toBeNull();
      expect(context.weekRange).toBeNull();
      expect(context.monthRange).toBeNull();
      expect(context.isAvailable).toBeFalse();
    });

    it('should handle refresh when calendar date service returns null', () => {
      // Arrange: Mock date service returning null
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(null);

      // Act: Activate calendar
      service.setCalendarActive(true);

      // Assert: Should remain inactive due to null current date
      expect(service.isCalendarActive()).toBeTrue(); // Service is marked active
      expect(service.hasDateRange()).toBeFalse(); // But no date range available
      expect(service.canOptimize()).toBeFalse(); // So cannot optimize

      const context = service.calendarContext();
      expect(context.isAvailable).toBeFalse();
    });
  });

  describe('Context Refresh Operations', () => {
    it('should refresh context with updated date ranges', () => {
      // Arrange: Mock updated date values
      const newCurrentDate = new Date('2024-04-20T14:30:00.000Z');
      const newWeekRange = {
        start: new Date('2024-04-15T00:00:00.000Z'),
        end: new Date('2024-04-21T23:59:59.999Z')
      };
      const newMonthRange = {
        start: new Date('2024-04-01T00:00:00.000Z'),
        end: new Date('2024-04-30T23:59:59.999Z')
      };

      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(newCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(newWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(newMonthRange);

      // Act: Refresh context
      service.refreshContext();

      // Assert: Context should be updated with new values
      const context = service.calendarContext();
      expect(context.currentDate).toEqual(newCurrentDate);
      expect(context.weekRange).toEqual(newWeekRange);
      expect(context.monthRange).toEqual(newMonthRange);
      expect(context.isAvailable).toBeTrue();
    });

    it('should clear context when refresh finds no current date', () => {
      // Arrange: Start with valid context, then mock null return
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.refreshContext();

      // Now mock null return
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(null);

      // Act: Refresh context
      service.refreshContext();

      // Assert: Context should be cleared
      const context = service.calendarContext();
      expect(context.currentDate).toBeNull();
      expect(context.weekRange).toBeNull();
      expect(context.monthRange).toBeNull();
      expect(context.isAvailable).toBeFalse();
    });
  });

  describe('Optimization Payload Generation', () => {
    beforeEach(() => {
      // Setup active calendar with valid context for optimization tests
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.setCalendarActive(true);
    });

    it('should generate week optimization payload', () => {
      // Act: Get week optimization payload
      const payload = service.getOptimizationPayload('week');

      // Assert: Should return valid week-based payload
      expect(payload).not.toBeNull();
      expect(payload!.calendarStartDate).toBe(testWeekRange.start.toISOString());
      expect(payload!.calendarEndDate).toBe(testWeekRange.end.toISOString());
      expect(payload!.requestPartialScheduleUpdate).toBeTrue();
    });

    it('should generate month optimization payload', () => {
      // Act: Get month optimization payload
      const payload = service.getOptimizationPayload('month');

      // Assert: Should return valid month-based payload
      expect(payload).not.toBeNull();
      expect(payload!.calendarStartDate).toBe(testMonthRange.start.toISOString());
      expect(payload!.calendarEndDate).toBe(testMonthRange.end.toISOString());
      expect(payload!.requestPartialScheduleUpdate).toBeTrue();
    });

    it('should default to week mode when no view mode specified', () => {
      // Act: Get optimization payload without specifying mode
      const payload = service.getOptimizationPayload();

      // Assert: Should default to week range
      expect(payload).not.toBeNull();
      expect(payload!.calendarStartDate).toBe(testWeekRange.start.toISOString());
      expect(payload!.calendarEndDate).toBe(testWeekRange.end.toISOString());
    });

    it('should return null when calendar is not active', () => {
      // Arrange: Deactivate calendar
      service.setCalendarActive(false);

      // Act: Attempt to get optimization payload
      const payload = service.getOptimizationPayload('week');

      // Assert: Should return null for inactive calendar
      expect(payload).toBeNull();
    });

    it('should return null when context is not available', () => {
      // Arrange: Calendar active but no context available
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(null);
      service.refreshContext();

      // Act: Attempt to get optimization payload
      const payload = service.getOptimizationPayload('week');

      // Assert: Should return null when context unavailable
      expect(payload).toBeNull();
    });

    it('should return null when date range is missing', () => {
      // Arrange: Mock scenario where week range is null
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(null); // Month range missing

      service.refreshContext();

      // Act: Attempt to get month optimization payload
      const payload = service.getOptimizationPayload('month');

      // Assert: Should return null when requested range is missing
      expect(payload).toBeNull();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      // Setup active calendar for convenience method tests
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.setCalendarActive(true);
    });

    it('should return current week range', () => {
      const weekRange = service.getCurrentWeekRange();
      expect(weekRange).toEqual(testWeekRange);
    });

    it('should return current month range', () => {
      const monthRange = service.getCurrentMonthRange();
      expect(monthRange).toEqual(testMonthRange);
    });

    it('should return current date', () => {
      const currentDate = service.getCurrentDate();
      expect(currentDate).toEqual(testCurrentDate);
    });

    it('should return null values when context is unavailable', () => {
      // Arrange: Clear context
      service.setCalendarActive(false);

      // Act & Assert: All convenience methods should return null
      expect(service.getCurrentWeekRange()).toBeNull();
      expect(service.getCurrentMonthRange()).toBeNull();
      expect(service.getCurrentDate()).toBeNull();
    });
  });

  describe('Optimization Capability Check', () => {
    it('should return true when calendar is active and has date range', () => {
      // Arrange: Setup active calendar with valid context
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.setCalendarActive(true);

      // Act & Assert: Should be able to optimize
      expect(service.canOptimize()).toBeTrue();
    });

    it('should return false when calendar is inactive', () => {
      // Arrange: Calendar is inactive
      service.setCalendarActive(false);

      // Act & Assert: Should not be able to optimize
      expect(service.canOptimize()).toBeFalse();
    });

    it('should return false when calendar is active but has no date range', () => {
      // Arrange: Active calendar but no date context
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(null);
      service.setCalendarActive(true);

      // Act & Assert: Should not be able to optimize without date range
      expect(service.canOptimize()).toBeFalse();
    });
  });

  describe('Debug Methods', () => {
    it('should provide comprehensive debug information', () => {
      // Arrange: Setup calendar with valid context
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.setCalendarActive(true);

      // Act: Get debug information
      const debugInfo = service.getDebugInfo();

      // Assert: Should contain all relevant debug data
      expect(debugInfo.isCalendarActive).toBeTrue();
      expect(debugInfo.hasDateRange).toBeTrue();
      expect(debugInfo.canOptimize).toBeTrue();
      expect(debugInfo.currentDate).toBe(testCurrentDate.toDateString());
      expect(debugInfo.weekRange).toEqual({
        start: testWeekRange.start.toDateString(),
        end: testWeekRange.end.toDateString()
      });
      expect(debugInfo.monthRange).toEqual({
        start: testMonthRange.start.toDateString(),
        end: testMonthRange.end.toDateString()
      });
    });

    it('should handle debug info when context is unavailable', () => {
      // Arrange: Inactive calendar
      service.setCalendarActive(false);

      // Act: Get debug information
      const debugInfo = service.getDebugInfo();

      // Assert: Should show unavailable state
      expect(debugInfo.isCalendarActive).toBeFalse();
      expect(debugInfo.hasDateRange).toBeFalse();
      expect(debugInfo.canOptimize).toBeFalse();
      expect(debugInfo.currentDate).toBe('none');
      expect(debugInfo.weekRange).toBeNull();
      expect(debugInfo.monthRange).toBeNull();
    });
  });

  describe('Signal Reactivity', () => {
    it('should update computed signals when context changes', () => {
      // Arrange: Start with inactive calendar
      expect(service.isCalendarActive()).toBeFalse();
      expect(service.hasDateRange()).toBeFalse();

      // Act: Activate calendar with valid context
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);
      service.setCalendarActive(true);

      // Assert: Computed signals should update reactively
      expect(service.isCalendarActive()).toBeTrue();
      expect(service.hasDateRange()).toBeTrue();
      expect(service.canOptimize()).toBeTrue();
    });

    it('should maintain signal consistency during state transitions', () => {
      // Arrange & Act: Multiple state changes
      service.setCalendarActive(true);
      expect(service.isCalendarActive()).toBeTrue();

      service.setCalendarActive(false);
      expect(service.isCalendarActive()).toBeFalse();

      service.setCalendarActive(true);
      expect(service.isCalendarActive()).toBeTrue();

      // Assert: Signals should remain consistent
      expect(service.isCalendarActive()).toBeTrue();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle date service throwing errors gracefully', () => {
      // Arrange: Mock date service to throw error
      mockCalendarDateService.getCurrentCalendarDate.and.throwError('Date service error');

      // Act & Assert: Should not throw error
      expect(() => service.refreshContext()).not.toThrow();
      expect(service.hasDateRange()).toBeFalse();
    });

    it('should handle undefined date ranges gracefully', () => {
      // Arrange: Mock date service returning undefined
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(undefined as any);
      mockCalendarDateService.getMonthRange.and.returnValue(undefined as any);

      // Act: Refresh context
      service.refreshContext();

      // Assert: Should handle undefined gracefully
      expect(service.hasDateRange()).toBeFalse();
      expect(service.getOptimizationPayload('week')).toBeNull();
    });

    it('should handle rapid calendar activation/deactivation', () => {
      // Arrange: Setup valid context
      mockCalendarDateService.getCurrentCalendarDate.and.returnValue(testCurrentDate);
      mockCalendarDateService.getWeekRange.and.returnValue(testWeekRange);
      mockCalendarDateService.getMonthRange.and.returnValue(testMonthRange);

      // Act: Rapid state changes
      service.setCalendarActive(true);
      service.setCalendarActive(false);
      service.setCalendarActive(true);
      service.setCalendarActive(false);

      // Assert: Should end in consistent state
      expect(service.isCalendarActive()).toBeFalse();
      expect(service.hasDateRange()).toBeFalse();
      expect(service.canOptimize()).toBeFalse();
    });
  });
});