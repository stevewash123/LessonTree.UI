// **COMPLETE FILE** - SpecialDayModalService with Observable Events
// RESPONSIBILITY: Handles modal coordination and UI interactions with cross-component event coordination.
// DOES NOT: Handle business logic, API calls, or data persistence - delegates to SpecialDayManagementService.
// CALLED BY: ContextMenuService for special day UI coordination.

import { Injectable, inject } from '@angular/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import {ScheduleStateService} from '../state/schedule-state.service';
import {SpecialDayData, SpecialDayManagementService} from '../business/special-day-management.service';
import {ScheduleEvent} from '../../../models/schedule-event.model';
import {SpecialDayModalComponent} from '../../components/special-day-modal.component';
import {SpecialDayModalData, SpecialDayResult} from '../../../models/specialDay.model';
import {SpecialDayModalOperationEvent, SpecialDayQuickActionEvent} from './special-day-modal-events';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly specialDayManagement = inject(SpecialDayManagementService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  // ✅ NEW: Observable events for cross-component coordination
  private readonly _modalOperation$ = new Subject<SpecialDayModalOperationEvent>();
  private readonly _quickAction$ = new Subject<SpecialDayQuickActionEvent>();

  // Public observables for business logic subscriptions
  readonly modalOperation$ = this._modalOperation$.asObservable();
  readonly quickAction$ = this._quickAction$.asObservable();

  constructor() {
    console.log('[SpecialDayModalService] Initialized with Observable events for modal coordination');
  }

  // ✅ ENHANCED: Open special day modal with Observable event emission
  openSpecialDayModal(mode: 'add' | 'edit', date?: Date | null, event?: EventClickArg, periods?: number[]): void {
    console.log(`[SpecialDayModalService] Opening ${mode} modal`);

    const modalData = mode === 'add'
      ? this.createAddModalData(date, periods)
      : this.createEditModalData(event);

    if (modalData) {
      // ✅ NEW: Emit modal opened event
      this._modalOperation$.next({
        operationType: 'opened',
        mode: mode,
        date: modalData.date,
        periods: modalData.periods || [],
        eventType: modalData.existingSpecialDay?.eventType || null,
        title: modalData.existingSpecialDay?.title || null,
        success: true,
        source: 'modal-operation',
        timestamp: new Date()
      });

      console.log('🚨 [SpecialDayModalService] EMITTED modalOperation event:', 'opened');

      this.openModalWithData(modalData, mode);
    }
  }

  // ✅ ENHANCED: Edit special day with Observable event emission
  editSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Editing special day event ${scheduleEvent.id}`);

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleEvent);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');

      // ✅ NEW: Emit quick action failure event
      this._quickAction$.next({
        actionType: 'direct-edit',
        scheduleEventId: scheduleEvent.id,
        period: scheduleEvent.period,
        date: scheduleEvent.date,
        eventType: scheduleEvent.eventType,
        success: false,
        errorMessage: 'Could not extract special day data',
        source: 'quick-action',
        timestamp: new Date()
      });
      return;
    }

    const modalData: SpecialDayModalData = {
      date: specialDayData.date,
      periods: specialDayData.periods,
      mode: 'edit',
      existingSpecialDay: {
        id: scheduleEvent.id,
        periods: specialDayData.periods,
        eventType: specialDayData.eventType,
        title: specialDayData.title,
        description: specialDayData.description,
        date: specialDayData.date
      }
    };

    // ✅ NEW: Emit quick action success event
    this._quickAction$.next({
      actionType: 'direct-edit',
      scheduleEventId: scheduleEvent.id,
      period: scheduleEvent.period,
      date: scheduleEvent.date,
      eventType: scheduleEvent.eventType,
      success: true,
      errorMessage: null,
      source: 'quick-action',
      timestamp: new Date()
    });

    console.log('🚨 [SpecialDayModalService] EMITTED quickAction event:', 'direct-edit');

    this.openModalWithData(modalData, 'edit', scheduleEvent);
  }

  // ✅ ENHANCED: Delete special day with Observable event emission
  deleteSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Deleting special day event ${scheduleEvent.id}`);

    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${scheduleEvent.period}`, 'Success');

        // ✅ NEW: Emit quick delete success event
        this._quickAction$.next({
          actionType: 'quick-delete',
          scheduleEventId: scheduleEvent.id,
          period: scheduleEvent.period,
          date: scheduleEvent.date,
          eventType: scheduleEvent.eventType,
          success: true,
          errorMessage: null,
          source: 'quick-action',
          timestamp: new Date()
        });

        console.log('🚨 [SpecialDayModalService] EMITTED quickAction event:', 'quick-delete');
      },
      error: () => {
        this.toastr.error('Failed to delete special day', 'Error');

        // ✅ NEW: Emit quick delete failure event
        this._quickAction$.next({
          actionType: 'quick-delete',
          scheduleEventId: scheduleEvent.id,
          period: scheduleEvent.period,
          date: scheduleEvent.date,
          eventType: scheduleEvent.eventType,
          success: false,
          errorMessage: 'Failed to delete special day',
          source: 'quick-action',
          timestamp: new Date()
        });
      }
    });
  }

  // ✅ ENHANCED: Delete special day from event with Observable coordination
  deleteSpecialDayFromEvent(event: EventClickArg): void {
    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event to delete', 'Error');

      // ✅ NEW: Emit failure event
      this._quickAction$.next({
        actionType: 'quick-delete',
        scheduleEventId: null,
        period: null,
        date: null,
        eventType: null,
        success: false,
        errorMessage: 'Cannot identify event to delete',
        source: 'quick-action',
        timestamp: new Date()
      });
      return;
    }

    const scheduleEvent = this.specialDayManagement.findSpecialDayById(eventId);
    if (!scheduleEvent) {
      this.toastr.error('Selected item is not a special day', 'Error');

      // ✅ NEW: Emit failure event
      this._quickAction$.next({
        actionType: 'quick-delete',
        scheduleEventId: eventId,
        period: null,
        date: null,
        eventType: null,
        success: false,
        errorMessage: 'Selected item is not a special day',
        source: 'quick-action',
        timestamp: new Date()
      });
      return;
    }

    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${scheduleEvent.period}`, 'Success');

        // ✅ NEW: Emit success event
        this._quickAction$.next({
          actionType: 'quick-delete',
          scheduleEventId: scheduleEvent.id,
          period: scheduleEvent.period,
          date: scheduleEvent.date,
          eventType: scheduleEvent.eventType,
          success: true,
          errorMessage: null,
          source: 'quick-action',
          timestamp: new Date()
        });

        console.log('🚨 [SpecialDayModalService] EMITTED quickAction event:', 'quick-delete');
      },
      error: () => {
        this.toastr.error('Failed to delete special day', 'Error');

        // ✅ NEW: Emit failure event
        this._quickAction$.next({
          actionType: 'quick-delete',
          scheduleEventId: scheduleEvent.id,
          period: scheduleEvent.period,
          date: scheduleEvent.date,
          eventType: scheduleEvent.eventType,
          success: false,
          errorMessage: 'Failed to delete special day',
          source: 'quick-action',
          timestamp: new Date()
        });
      }
    });
  }

  // ✅ ENHANCED: Show error day info with Observable event emission
  showErrorDayInfo(period?: number): void {
    const message = period
      ? `Period ${period} has no lesson assigned because there are more school periods than lessons. Add more lessons to your course or adjust the schedule.`
      : 'This day has no lesson assigned because there are more school days than lessons. Add more lessons to your course or adjust the schedule end date.';

    this.toastr.info(message, 'Error Day Information', { timeOut: 8000 });

    // ✅ NEW: Emit error info event
    this._quickAction$.next({
      actionType: 'error-info',
      scheduleEventId: null,
      period: period || null,
      date: null,
      eventType: 'Error',
      success: true,
      errorMessage: null,
      source: 'quick-action',
      timestamp: new Date()
    });

    console.log('🚨 [SpecialDayModalService] EMITTED quickAction event:', 'error-info');
  }

  // === PRIVATE HELPER METHODS ===

  private createAddModalData(date?: Date | null, periods?: number[]): SpecialDayModalData | null {
    if (!date) {
      this.toastr.error('No date selected', 'Error');
      return null;
    }

    return {
      date: new Date(date),
      periods: periods || [],
      mode: 'add',
      existingSpecialDay: null
    };
  }

  private createEditModalData(event?: EventClickArg): SpecialDayModalData | null {
    if (!event) {
      this.toastr.error('No special day selected', 'Error');
      return null;
    }

    const existingData = this.prepareExistingDataFromEvent(event);
    if (!existingData) {
      return null;
    }

    return {
      date: existingData.date,
      periods: existingData.periods,
      mode: 'edit',
      existingSpecialDay: existingData
    };
  }

  // ✅ ENHANCED: Modal handling with Observable event emission
  private openModalWithData(modalData: SpecialDayModalData, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    const dialogRef = this.dialog.open(SpecialDayModalComponent, {
      data: modalData,
      width: '600px',
      maxWidth: '90vw',
      panelClass: 'special-day-modal-container'
    });

    dialogRef.afterClosed().subscribe((result: SpecialDayResult | undefined) => {
      if (result) {
        this.handleModalResult(result, originalMode, originalScheduleEvent);
      } else {
        // ✅ NEW: Emit modal cancelled event
        this._modalOperation$.next({
          operationType: 'cancelled',
          mode: originalMode,
          date: modalData.date,
          periods: modalData.periods || [],
          eventType: modalData.existingSpecialDay?.eventType || null,
          title: modalData.existingSpecialDay?.title || null,
          success: true,
          source: 'modal-operation',
          timestamp: new Date()
        });

        console.log('🚨 [SpecialDayModalService] EMITTED modalOperation event:', 'cancelled');
      }

      // ✅ NEW: Always emit modal closed event
      this._modalOperation$.next({
        operationType: 'closed',
        mode: originalMode,
        date: modalData.date,
        periods: modalData.periods || [],
        eventType: modalData.existingSpecialDay?.eventType || null,
        title: modalData.existingSpecialDay?.title || null,
        success: true,
        source: 'modal-operation',
        timestamp: new Date()
      });
    });
  }

  private prepareExistingDataFromEvent(event: EventClickArg): { id: number; periods: number[]; eventType: string; title: string; description?: string; date: Date } | null {
    const currentSchedule = this.scheduleStateService.selectedScheduleValue();
    if (!currentSchedule?.scheduleEvents) {
      this.toastr.error('No schedule available', 'Error');
      return null;
    }

    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event', 'Error');
      return null;
    }

    const scheduleEvent = this.specialDayManagement.findSpecialDayById(eventId);
    if (!scheduleEvent) {
      this.toastr.error('Selected item is not a special day', 'Error');
      return null;
    }

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleEvent);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');
      return null;
    }

    return {
      id: scheduleEvent.id,
      periods: specialDayData.periods,
      eventType: specialDayData.eventType,
      title: specialDayData.title,
      description: specialDayData.description,
      date: specialDayData.date
    };
  }

  private extractEventIdFromCalendarEvent(event: EventClickArg): number | null {
    const eventId = event.event.id;

    if (eventId.includes('-period-')) {
      const scheduleDayId = parseInt(eventId.split('-period-')[0], 10);
      return isNaN(scheduleDayId) ? null : scheduleDayId;
    }

    const numericId = parseInt(eventId, 10);
    return isNaN(numericId) ? null : numericId;
  }

  // ✅ ENHANCED: Modal result handling with Observable events
  private handleModalResult(result: SpecialDayResult, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    if (result.action === 'save' && result.data) {
      const mappedData: SpecialDayData = {
        ...result.data,
        eventType: (result.data as any).specialCode || (result.data as any).eventType
      };

      this.handleSaveAction(mappedData, originalMode, originalScheduleEvent);
    } else if (result.action === 'delete' && originalScheduleEvent) {
      this.handleDeleteAction(originalScheduleEvent);
    }
  }

  private handleSaveAction(data: SpecialDayData, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    const validation = this.specialDayManagement.validateSpecialDayData(data);
    if (!validation.isValid) {
      this.toastr.error(`Invalid data: ${validation.errors.join(', ')}`, 'Validation Error');

      // ✅ NEW: Emit validation failure event
      this._modalOperation$.next({
        operationType: 'saved',
        mode: originalMode,
        date: data.date,
        periods: data.periods,
        eventType: data.eventType,
        title: data.title,
        success: false,
        source: 'modal-operation',
        timestamp: new Date()
      });
      return;
    }

    if (!data.eventType) {
      this.toastr.error('Event type is required', 'Validation Error');
      return;
    }

    if (originalMode === 'add') {
      this.specialDayManagement.createSpecialDay(data).subscribe({
        next: (createdEvents) => {
          const periodText = createdEvents.length === 1
            ? `Period ${createdEvents[0].period}`
            : `Periods ${createdEvents.map(e => e.period).join(', ')}`;
          this.toastr.success(`Created special day for ${periodText}`, 'Success');

          // ✅ NEW: Emit save success event
          this._modalOperation$.next({
            operationType: 'saved',
            mode: originalMode,
            date: data.date,
            periods: data.periods,
            eventType: data.eventType,
            title: data.title,
            success: true,
            source: 'modal-operation',
            timestamp: new Date()
          });

          console.log('🚨 [SpecialDayModalService] EMITTED modalOperation event:', 'saved');
        },
        error: () => {
          this.toastr.error('Failed to create special day', 'Error');

          // ✅ NEW: Emit save failure event
          this._modalOperation$.next({
            operationType: 'saved',
            mode: originalMode,
            date: data.date,
            periods: data.periods,
            eventType: data.eventType,
            title: data.title,
            success: false,
            source: 'modal-operation',
            timestamp: new Date()
          });
        }
      });
    } else if (originalScheduleEvent) {
      this.specialDayManagement.updateSpecialDay(data, originalScheduleEvent).subscribe({
        next: (updatedEvent) => {
          this.toastr.success(`Updated special day for Period ${updatedEvent.period}`, 'Success');

          // ✅ NEW: Emit save success event
          this._modalOperation$.next({
            operationType: 'saved',
            mode: originalMode,
            date: data.date,
            periods: data.periods,
            eventType: data.eventType,
            title: data.title,
            success: true,
            source: 'modal-operation',
            timestamp: new Date()
          });

          console.log('🚨 [SpecialDayModalService] EMITTED modalOperation event:', 'saved');
        },
        error: () => {
          this.toastr.error('Failed to update special day', 'Error');

          // ✅ NEW: Emit save failure event
          this._modalOperation$.next({
            operationType: 'saved',
            mode: originalMode,
            date: data.date,
            periods: data.periods,
            eventType: data.eventType,
            title: data.title,
            success: false,
            source: 'modal-operation',
            timestamp: new Date()
          });
        }
      });
    }
  }

  private handleDeleteAction(originalScheduleEvent: ScheduleEvent): void {
    this.specialDayManagement.deleteSpecialDay(originalScheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${originalScheduleEvent.period}`, 'Success');

        // ✅ NEW: Emit delete success event
        this._modalOperation$.next({
          operationType: 'deleted',
          mode: 'edit',
          date: originalScheduleEvent.date,
          periods: [originalScheduleEvent.period],
          eventType: originalScheduleEvent.eventType,
          title: null,
          success: true,
          source: 'modal-operation',
          timestamp: new Date()
        });

        console.log('🚨 [SpecialDayModalService] EMITTED modalOperation event:', 'deleted');
      },
      error: () => {
        this.toastr.error('Failed to delete special day', 'Error');

        // ✅ NEW: Emit delete failure event
        this._modalOperation$.next({
          operationType: 'deleted',
          mode: 'edit',
          date: originalScheduleEvent.date,
          periods: [originalScheduleEvent.period],
          eventType: originalScheduleEvent.eventType,
          title: null,
          success: false,
          source: 'modal-operation',
          timestamp: new Date()
        });
      }
    });
  }

  // === CLEANUP ===

  // ✅ NEW: Cleanup method with Observable completion
  ngOnDestroy(): void {
    this._modalOperation$.complete();
    this._quickAction$.complete();
    console.log('[SpecialDayModalService] All Observable subjects completed on destroy');
  }
}
