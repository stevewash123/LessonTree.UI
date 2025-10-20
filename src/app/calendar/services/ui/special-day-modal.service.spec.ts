// special-day-modal.service.spec.ts
// Comprehensive unit tests for SpecialDayModalService - Modal coordination and UI interactions
// Tests modal operations, API integration, delete operations, and error handling

import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { EventClickArg } from '@fullcalendar/core';
import { SpecialDayModalService } from './special-day-modal.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { CalendarRefreshService } from '../integration/calendar-refresh.service';
import { SpecialDayModalComponent } from '../../components/special-day-modal.component';
import { SpecialDayModalData, SpecialDayResult, SpecialDayCreateResource } from '../../../models/specialDay.model';
import { Schedule } from '../../../models/schedule';

describe('SpecialDayModalService', () => {
  let service: SpecialDayModalService;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let scheduleStateServiceSpy: jasmine.SpyObj<ScheduleStateService>;
  let scheduleApiServiceSpy: jasmine.SpyObj<ScheduleApiService>;
  let calendarRefreshServiceSpy: jasmine.SpyObj<CalendarRefreshService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SpecialDayModalComponent>>;

  // Test data fixtures
  const mockSchedule: Schedule = {
    id: 1,
    title: 'Test Schedule',
    scheduleEvents: [],
    specialDays: []
  };

  const mockSpecialDay = {
    id: 1,
    date: new Date('2024-01-15'),
    periods: [1, 2],
    eventType: 'Holiday',
    title: 'Test Holiday',
    description: 'Test Description',
    backgroundColor: '#ff0000',
    fontColor: '#ffffff'
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
    const matDialogSpyObj = jasmine.createSpyObj('MatDialog', ['open', 'closeAll'], {
      openDialogs: []
    });
    const toastrSpyObj = jasmine.createSpyObj('ToastrService', ['error', 'success', 'info']);
    const scheduleStateSpyObj = jasmine.createSpyObj('ScheduleStateService', ['schedule']);
    const scheduleApiSpyObj = jasmine.createSpyObj('ScheduleApiService', [
      'getSpecialDay',
      'createSpecialDay',
      'updateSpecialDay',
      'deleteSpecialDay'
    ]);
    const calendarRefreshSpyObj = jasmine.createSpyObj('CalendarRefreshService', ['refreshCalendar']);
    const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);

    TestBed.configureTestingModule({
      providers: [
        SpecialDayModalService,
        { provide: MatDialog, useValue: matDialogSpyObj },
        { provide: ToastrService, useValue: toastrSpyObj },
        { provide: ScheduleStateService, useValue: scheduleStateSpyObj },
        { provide: ScheduleApiService, useValue: scheduleApiSpyObj },
        { provide: CalendarRefreshService, useValue: calendarRefreshSpyObj }
      ]
    });

    service = TestBed.inject(SpecialDayModalService);
    matDialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    toastrSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    scheduleStateServiceSpy = TestBed.inject(ScheduleStateService) as jasmine.SpyObj<ScheduleStateService>;
    scheduleApiServiceSpy = TestBed.inject(ScheduleApiService) as jasmine.SpyObj<ScheduleApiService>;
    calendarRefreshServiceSpy = TestBed.inject(CalendarRefreshService) as jasmine.SpyObj<CalendarRefreshService>;
    dialogRefSpy = dialogRefSpyObj;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Modal Operations', () => {
    describe('openSpecialDayModal() - Add Mode', () => {
      it('should open modal in add mode with date', () => {
        const testDate = new Date('2024-01-15');
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(null));

        service.openSpecialDayModal('add', testDate);

        expect(matDialogSpy.open).toHaveBeenCalledWith(
          SpecialDayModalComponent,
          jasmine.objectContaining({
            data: jasmine.objectContaining({
              date: testDate,
              periods: [],
              mode: 'add',
              existingSpecialDay: null
            }),
            width: '600px',
            maxWidth: '90vw',
            panelClass: 'special-day-modal-container'
          })
        );
      });

      it('should open modal in add mode with date and periods', () => {
        const testDate = new Date('2024-01-15');
        const periods = [1, 3, 5];
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(null));

        service.openSpecialDayModal('add', testDate, undefined, periods);

        expect(matDialogSpy.open).toHaveBeenCalledWith(
          SpecialDayModalComponent,
          jasmine.objectContaining({
            data: jasmine.objectContaining({
              date: testDate,
              periods: periods,
              mode: 'add'
            })
          })
        );
      });

      it('should show error when no date provided for add mode', () => {
        service.openSpecialDayModal('add', null);

        expect(toastrSpy.error).toHaveBeenCalledWith('No date selected', 'Error');
        expect(matDialogSpy.open).not.toHaveBeenCalled();
      });

      it('should show error when undefined date provided for add mode', () => {
        service.openSpecialDayModal('add', undefined);

        expect(toastrSpy.error).toHaveBeenCalledWith('No date selected', 'Error');
        expect(matDialogSpy.open).not.toHaveBeenCalled();
      });
    });

    describe('openSpecialDayModal() - Edit Mode', () => {
      it('should fetch special day data and open modal in edit mode', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1,
          scheduleEvent: { specialDayId: 1 }
        });

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(null));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(scheduleApiServiceSpy.getSpecialDay).toHaveBeenCalledWith(1, 1);
      });

      it('should handle event without specialDayId', () => {
        const mockEvent = createMockEvent();

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('Special Day ID not found in event', 'Error');
        expect(scheduleApiServiceSpy.getSpecialDay).not.toHaveBeenCalled();
      });

      it('should handle null event in edit mode', () => {
        service.openSpecialDayModal('edit', null, undefined);

        expect(toastrSpy.error).toHaveBeenCalledWith('No special day selected', 'Error');
      });

      it('should handle API error when fetching special day data', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(throwError(() => new Error('API Error')));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('Failed to load Special Day data', 'Error');
      });

      it('should handle no active schedule in edit mode', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        scheduleStateServiceSpy.schedule.and.returnValue(null);

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('No active schedule found', 'Error');
      });
    });

    describe('Modal Result Handling', () => {
      it('should handle modal cancellation', () => {
        const testDate = new Date('2024-01-15');
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(null));

        service.openSpecialDayModal('add', testDate);

        expect(matDialogSpy.open).toHaveBeenCalled();
        // Should not trigger any API calls when cancelled
        expect(scheduleApiServiceSpy.createSpecialDay).not.toHaveBeenCalled();
      });

      it('should handle save result from modal', () => {
        const testDate = new Date('2024-01-15');
        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            date: testDate,
            periods: [1, 2],
            eventType: 'Holiday',
            title: 'Test Holiday',
            backgroundColor: '#ff0000',
            fontColor: '#ffffff'
          }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.createSpecialDay.and.returnValue(of(mockSpecialDay));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('add', testDate);

        expect(scheduleApiServiceSpy.createSpecialDay).toHaveBeenCalled();
      });

      it('should handle delete result from modal', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        const deleteResult: SpecialDayResult = {
          action: 'delete',
          data: { id: 1 }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        scheduleApiServiceSpy.deleteSpecialDay.and.returnValue(of(null));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(deleteResult));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(scheduleApiServiceSpy.deleteSpecialDay).toHaveBeenCalledWith(1, 1);
      });
    });
  });

  describe('Delete Operations', () => {
    describe('deleteSpecialDayFromEvent()', () => {
      it('should delete special day from event successfully', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1,
          scheduleEvent: { specialDayId: 1, eventCategory: 'SpecialDay' }
        });

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.deleteSpecialDay.and.returnValue(of(null));

        service.deleteSpecialDayFromEvent(mockEvent);

        expect(scheduleApiServiceSpy.deleteSpecialDay).toHaveBeenCalledWith(1, 1);
        expect(toastrSpy.success).toHaveBeenCalledWith('Special day deleted successfully', 'Success');
        expect(calendarRefreshServiceSpy.refreshCalendar).toHaveBeenCalled();
      });

      it('should handle event without extractable event ID', () => {
        const mockEvent = createMockEvent();
        mockEvent.event.id = ''; // Invalid ID

        service.deleteSpecialDayFromEvent(mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('Cannot identify event to delete', 'Error');
        expect(scheduleApiServiceSpy.deleteSpecialDay).not.toHaveBeenCalled();
      });

      it('should handle no active schedule', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        scheduleStateServiceSpy.schedule.and.returnValue(null);

        service.deleteSpecialDayFromEvent(mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('No active schedule found', 'Error');
        expect(scheduleApiServiceSpy.deleteSpecialDay).not.toHaveBeenCalled();
      });

      it('should handle event without specialDayId', () => {
        const mockEvent = createMockEvent({
          eventCategory: 'Lesson' // Not a special day
        });

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);

        service.deleteSpecialDayFromEvent(mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('This event is not associated with a special day', 'Error');
        expect(scheduleApiServiceSpy.deleteSpecialDay).not.toHaveBeenCalled();
      });

      it('should handle legacy special day event without specialDayId', () => {
        const mockEvent = createMockEvent({
          eventCategory: 'SpecialDay' // Is special day but no ID
        });

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);

        service.deleteSpecialDayFromEvent(mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Special Day events created before the latest update cannot be deleted via this method. Please recreate the calendar to update Special Day references.',
          'Legacy Special Day'
        );
      });

      it('should handle API error during deletion', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.deleteSpecialDay.and.returnValue(throwError(() => new Error('API Error')));

        service.deleteSpecialDayFromEvent(mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('Failed to delete special day', 'Error');
      });
    });
  });

  describe('API Integration', () => {
    describe('Create Special Day', () => {
      it('should create special day successfully', () => {
        const testDate = new Date('2024-01-15');
        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            date: testDate,
            periods: [1, 2],
            eventType: 'Holiday',
            title: 'Test Holiday',
            backgroundColor: '#ff0000',
            fontColor: '#ffffff'
          }
        };

        const expectedRequest: SpecialDayCreateResource = {
          date: testDate,
          periods: [1, 2],
          eventType: 'Holiday',
          title: 'Test Holiday',
          description: undefined,
          backgroundColor: '#ff0000',
          fontColor: '#ffffff'
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.createSpecialDay.and.returnValue(of(mockSpecialDay));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('add', testDate);

        expect(scheduleApiServiceSpy.createSpecialDay).toHaveBeenCalledWith(1, expectedRequest);
        expect(toastrSpy.success).toHaveBeenCalledWith('Created special day for Periods 1, 2', 'Success');
        expect(calendarRefreshServiceSpy.refreshCalendar).toHaveBeenCalled();
      });

      it('should handle single period in success message', () => {
        const testDate = new Date('2024-01-15');
        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            date: testDate,
            periods: [3],
            eventType: 'Holiday',
            title: 'Test Holiday'
          }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.createSpecialDay.and.returnValue(of(mockSpecialDay));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('add', testDate);

        expect(toastrSpy.success).toHaveBeenCalledWith('Created special day for Period 3', 'Success');
      });

      it('should handle create API error', () => {
        const testDate = new Date('2024-01-15');
        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            date: testDate,
            periods: [1],
            eventType: 'Holiday',
            title: 'Test Holiday'
          }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.createSpecialDay.and.returnValue(throwError(() => new Error('Create failed')));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('add', testDate);

        expect(toastrSpy.error).toHaveBeenCalledWith('Failed to create special day', 'Error');
      });
    });

    describe('Update Special Day', () => {
      it('should update special day successfully', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            id: 1,
            date: new Date('2024-01-15'),
            periods: [2, 3],
            eventType: 'Updated Holiday',
            title: 'Updated Test Holiday'
          }
        };

        const updateResponse = {
          specialDay: mockSpecialDay,
          calendarRefreshNeeded: true,
          refreshReason: 'Period assignments changed'
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        scheduleApiServiceSpy.updateSpecialDay.and.returnValue(of(updateResponse));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(scheduleApiServiceSpy.updateSpecialDay).toHaveBeenCalledWith(
          1,
          1,
          jasmine.objectContaining({
            id: 1,
            date: new Date('2024-01-15'),
            periods: [2, 3],
            eventType: 'Updated Holiday',
            title: 'Updated Test Holiday'
          })
        );
        expect(toastrSpy.success).toHaveBeenCalledWith('Updated special day for Periods 2, 3', 'Success');
        expect(calendarRefreshServiceSpy.refreshCalendar).toHaveBeenCalled();
      });

      it('should handle update without calendar refresh when not needed', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            id: 1,
            date: new Date('2024-01-15'),
            periods: [1],
            eventType: 'Holiday',
            title: 'Test Holiday'
          }
        };

        const updateResponse = {
          specialDay: mockSpecialDay,
          calendarRefreshNeeded: false,
          refreshReason: 'No structural changes'
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        scheduleApiServiceSpy.updateSpecialDay.and.returnValue(of(updateResponse));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(calendarRefreshServiceSpy.refreshCalendar).not.toHaveBeenCalled();
      });

      it('should handle legacy update response format', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            id: 1,
            date: new Date('2024-01-15'),
            periods: [1],
            eventType: 'Holiday',
            title: 'Test Holiday'
          }
        };

        // Legacy response format (direct special day object)
        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        scheduleApiServiceSpy.updateSpecialDay.and.returnValue(of(mockSpecialDay as any));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(toastrSpy.success).toHaveBeenCalledWith('Updated special day for Period 1', 'Success');
      });

      it('should handle missing special day ID for update', () => {
        const testDate = new Date('2024-01-15');
        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            // Missing id
            date: testDate,
            periods: [1],
            eventType: 'Holiday',
            title: 'Test Holiday'
          }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('edit', testDate);

        expect(toastrSpy.error).toHaveBeenCalledWith('Missing special day ID for update', 'Error');
      });

      it('should handle update API error', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        const saveResult: SpecialDayResult = {
          action: 'save',
          data: {
            id: 1,
            date: new Date('2024-01-15'),
            periods: [1],
            eventType: 'Holiday',
            title: 'Test Holiday'
          }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        scheduleApiServiceSpy.updateSpecialDay.and.returnValue(throwError(() => new Error('Update failed')));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(toastrSpy.error).toHaveBeenCalledWith('Failed to update special day', 'Error');
      });
    });

    describe('Delete from Modal', () => {
      it('should delete special day from modal successfully', () => {
        const mockEvent = createMockEvent({
          specialDayId: 1
        });

        const deleteResult: SpecialDayResult = {
          action: 'delete',
          data: { id: 1 }
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
        scheduleApiServiceSpy.deleteSpecialDay.and.returnValue(of(null));
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(deleteResult));

        service.openSpecialDayModal('edit', null, mockEvent);

        expect(scheduleApiServiceSpy.deleteSpecialDay).toHaveBeenCalledWith(1, 1);
        expect(toastrSpy.success).toHaveBeenCalledWith('Special day deleted successfully', 'Success');
        expect(calendarRefreshServiceSpy.refreshCalendar).toHaveBeenCalled();
      });

      it('should handle delete on add mode (no-op)', () => {
        const testDate = new Date('2024-01-15');
        const deleteResult: SpecialDayResult = {
          action: 'delete',
          data: {}
        };

        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(deleteResult));

        service.openSpecialDayModal('add', testDate);

        expect(scheduleApiServiceSpy.deleteSpecialDay).not.toHaveBeenCalled();
      });

      it('should handle delete without special day ID', () => {
        const testDate = new Date('2024-01-15');
        const deleteResult: SpecialDayResult = {
          action: 'delete',
          data: {}
        };

        scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
        matDialogSpy.open.and.returnValue(dialogRefSpy);
        dialogRefSpy.afterClosed.and.returnValue(of(deleteResult));

        service.openSpecialDayModal('edit', testDate);

        expect(toastrSpy.error).toHaveBeenCalledWith('Missing special day ID for deletion', 'Error');
      });
    });
  });

  describe('Error Day Information', () => {
    describe('showErrorDayInfo()', () => {
      it('should show error info for specific period', () => {
        service.showErrorDayInfo(3);

        expect(toastrSpy.info).toHaveBeenCalledWith(
          'Period 3 has no lesson assigned because there are more school periods than lessons. Add more lessons to your course or adjust the schedule.',
          'Error Day Information',
          { timeOut: 8000 }
        );
      });

      it('should show general error info when no period specified', () => {
        service.showErrorDayInfo();

        expect(toastrSpy.info).toHaveBeenCalledWith(
          'This day has no lesson assigned because there are more school days than lessons. Add more lessons to your course or adjust the schedule end date.',
          'Error Day Information',
          { timeOut: 8000 }
        );
      });

      it('should handle zero period', () => {
        service.showErrorDayInfo(0);

        expect(toastrSpy.info).toHaveBeenCalledWith(
          'This day has no lesson assigned because there are more school days than lessons. Add more lessons to your course or adjust the schedule end date.',
          'Error Day Information',
          { timeOut: 8000 }
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('hasActiveModal()', () => {
      it('should return false when no modals are open', () => {
        (matDialogSpy as any).openDialogs = [];

        expect(service.hasActiveModal()).toBe(false);
      });

      it('should return true when modals are open', () => {
        (matDialogSpy as any).openDialogs = [{}];

        expect(service.hasActiveModal()).toBe(true);
      });

      it('should return true when multiple modals are open', () => {
        (matDialogSpy as any).openDialogs = [{}, {}];

        expect(service.hasActiveModal()).toBe(true);
      });
    });

    describe('closeAllModals()', () => {
      it('should close all open modals', () => {
        service.closeAllModals();

        expect(matDialogSpy.closeAll).toHaveBeenCalled();
      });
    });

    describe('cleanup()', () => {
      it('should close all modals during cleanup', () => {
        service.cleanup();

        expect(matDialogSpy.closeAll).toHaveBeenCalled();
      });
    });
  });

  describe('Event ID Extraction', () => {
    it('should extract schedule day ID from period event ID', () => {
      const mockEvent = createMockEvent();
      mockEvent.event.id = '123-period-2';
      scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);

      // This is tested indirectly through deleteSpecialDayFromEvent
      service.deleteSpecialDayFromEvent(mockEvent);

      expect(toastrSpy.error).toHaveBeenCalledWith('Cannot identify event to delete', 'Error');
    });

    it('should extract numeric ID from simple event ID', () => {
      const mockEvent = createMockEvent({ specialDayId: 1 });
      mockEvent.event.id = '456';
      scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
      scheduleApiServiceSpy.deleteSpecialDay.and.returnValue(of(null));

      service.deleteSpecialDayFromEvent(mockEvent);

      expect(scheduleApiServiceSpy.deleteSpecialDay).toHaveBeenCalledWith(1, 1);
    });

    it('should handle invalid numeric ID', () => {
      const mockEvent = createMockEvent();
      mockEvent.event.id = 'invalid-id';
      scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);

      service.deleteSpecialDayFromEvent(mockEvent);

      expect(toastrSpy.error).toHaveBeenCalledWith('Cannot identify event to delete', 'Error');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle modal data creation with null values', () => {
      const testDate = new Date('2024-01-15');
      matDialogSpy.open.and.returnValue(dialogRefSpy);
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openSpecialDayModal('add', testDate, undefined, undefined);

      expect(matDialogSpy.open).toHaveBeenCalledWith(
        SpecialDayModalComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            periods: []
          })
        })
      );
    });

    it('should handle API response without specialDay property', () => {
      const mockEvent = createMockEvent({
        specialDayId: 1
      });

      const saveResult: SpecialDayResult = {
        action: 'save',
        data: {
          id: 1,
          date: new Date('2024-01-15'),
          periods: [1],
          eventType: 'Holiday',
          title: 'Test Holiday'
        }
      };

      // Response without specialDay wrapper
      const directResponse = mockSpecialDay;

      scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
      scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(mockSpecialDay));
      scheduleApiServiceSpy.updateSpecialDay.and.returnValue(of(directResponse as any));
      matDialogSpy.open.and.returnValue(dialogRefSpy);
      dialogRefSpy.afterClosed.and.returnValue(of(saveResult));

      service.openSpecialDayModal('edit', null, mockEvent);

      expect(toastrSpy.success).toHaveBeenCalled();
    });

    it('should handle multiple rapid modal operations', () => {
      const testDate = new Date('2024-01-15');
      matDialogSpy.open.and.returnValue(dialogRefSpy);
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      // Simulate rapid modal opening
      service.openSpecialDayModal('add', testDate);
      service.openSpecialDayModal('add', testDate);
      service.openSpecialDayModal('add', testDate);

      expect(matDialogSpy.open).toHaveBeenCalledTimes(3);
    });

    it('should handle date objects vs Date strings in API responses', () => {
      const mockEvent = createMockEvent({
        specialDayId: 1
      });

      const specialDayWithStringDate = {
        ...mockSpecialDay,
        date: '2024-01-15' // String instead of Date
      };

      scheduleStateServiceSpy.schedule.and.returnValue(mockSchedule);
      scheduleApiServiceSpy.getSpecialDay.and.returnValue(of(specialDayWithStringDate as any));
      matDialogSpy.open.and.returnValue(dialogRefSpy);
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openSpecialDayModal('edit', null, mockEvent);

      expect(matDialogSpy.open).toHaveBeenCalledWith(
        SpecialDayModalComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            date: new Date('2024-01-15')
          })
        })
      );
    });

    it('should handle extremely large period arrays', () => {
      const testDate = new Date('2024-01-15');
      const largePeriodArray = Array.from({ length: 100 }, (_, i) => i + 1);

      matDialogSpy.open.and.returnValue(dialogRefSpy);
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openSpecialDayModal('add', testDate, undefined, largePeriodArray);

      expect(matDialogSpy.open).toHaveBeenCalledWith(
        SpecialDayModalComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            periods: largePeriodArray
          })
        })
      );
    });
  });
});