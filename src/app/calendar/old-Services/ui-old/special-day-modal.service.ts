// **COMPLETE FILE** - Cleaned SpecialDayModalService
// RESPONSIBILITY: Pure modal coordination and UI interactions for special day operations
// DOES NOT: Observable coordination, complex event emission, subscription management
// CALLED BY: ContextMenuService for special day UI coordination

import { Injectable, inject } from '@angular/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';
import { MatDialog } from '@angular/material/dialog';
import { ScheduleStateService } from '../state/schedule-state.service';
import { SpecialDayData, SpecialDayManagementService } from '../business/special-day-management.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { SpecialDayModalComponent } from '../../components/special-day-modal.component';
import { SpecialDayModalData, SpecialDayResult } from '../../../models/specialDay.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly specialDayManagement = inject(SpecialDayManagementService);
  private readonly toastr = inject(ToastrService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    console.log('[SpecialDayModalService] Initialized for pure modal coordination');
  }

  // === MODAL OPERATIONS ===

  /**
   * Open special day modal for add or edit operations
   */
  openSpecialDayModal(mode: 'add' | 'edit', date?: Date | null, event?: EventClickArg, periods?: number[]): void {
    console.log(`[SpecialDayModalService] Opening ${mode} modal`);

    const modalData = mode === 'add'
      ? this.createAddModalData(date, periods)
      : this.createEditModalData(event);

    if (modalData) {
      console.log('[SpecialDayModalService] Modal data prepared:', {
        mode,
        date: modalData.date,
        periods: modalData.periods,
        hasExistingData: !!modalData.existingSpecialDay
      });

      this.openModalWithData(modalData, mode);
    }
  }

  /**
   * Edit special day directly from schedule event
   */
  editSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Editing special day event ${scheduleEvent.id}`);

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleEvent);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');
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

    console.log('[SpecialDayModalService] Direct edit modal prepared for event:', {
      eventId: scheduleEvent.id,
      eventType: scheduleEvent.eventType,
      period: scheduleEvent.period
    });

    this.openModalWithData(modalData, 'edit', scheduleEvent);
  }

  /**
   * Delete special day directly from schedule event
   */
  deleteSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Deleting special day event ${scheduleEvent.id}`);

    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Deleted special day from Period ${scheduleEvent.period}`);
        console.log('[SpecialDayModalService] Special day deleted successfully:', {
          eventId: scheduleEvent.id,
          period: scheduleEvent.period,
          date: format(new Date(scheduleEvent.date), 'yyyy-MM-dd')
        });
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to delete special day:', error);
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  /**
   * Delete special day from calendar event (context menu operation)
   */
  deleteSpecialDayFromEvent(event: EventClickArg): void {
    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event to delete', 'Error');
      return;
    }

    const scheduleEvent = this.specialDayManagement.findSpecialDayById(eventId);
    if (!scheduleEvent) {
      this.toastr.error('Selected item is not a special day', 'Error');
      return;
    }

    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Deleted special day from Period ${scheduleEvent.period}`);
        console.log('[SpecialDayModalService] Special day deleted from event:', {
          eventId: scheduleEvent.id,
          period: scheduleEvent.period,
          eventType: scheduleEvent.eventType
        });
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to delete special day from event:', error);
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  /**
   * Show error day information
   */
  showErrorDayInfo(period?: number): void {
    const message = period
      ? `Period ${period} has no lesson assigned because there are more school periods than lessons. Add more lessons to your course or adjust the schedule.`
      : 'This day has no lesson assigned because there are more school days than lessons. Add more lessons to your course or adjust the schedule end date.';

    this.toastr.info(message, 'Error Day Information', { timeOut: 8000 });

    console.log('[SpecialDayModalService] Error day info displayed:', {
      period: period || 'all',
      messageType: 'schedule-gap-explanation'
    });
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Create modal data for add mode
   */
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

  /**
   * Create modal data for edit mode
   */
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

  /**
   * Open modal with prepared data
   */
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
        console.log('[SpecialDayModalService] Modal cancelled by user:', {
          mode: originalMode,
          date: format(modalData.date, 'yyyy-MM-dd')
        });
      }
    });
  }

  /**
   * Prepare existing data from calendar event
   */
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

  /**
   * Extract event ID from calendar event
   */
  private extractEventIdFromCalendarEvent(event: EventClickArg): number | null {
    const eventId = event.event.id;

    if (eventId.includes('-period-')) {
      const scheduleDayId = parseInt(eventId.split('-period-')[0], 10);
      return isNaN(scheduleDayId) ? null : scheduleDayId;
    }

    const numericId = parseInt(eventId, 10);
    return isNaN(numericId) ? null : numericId;
  }

  /**
   * Handle modal result (save or delete)
   */
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

  /**
   * Handle save action from modal
   */
  private handleSaveAction(data: SpecialDayData, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    const validation = this.specialDayManagement.validateSpecialDayData(data);
    if (!validation.isValid) {
      this.toastr.error(`Invalid data: ${validation.errors.join(', ')}`, 'Validation Error');
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
          this.notificationService.showSuccess(`Created special day for ${periodText}`);

          console.log('[SpecialDayModalService] Special day created successfully:', {
            eventType: data.eventType,
            periods: data.periods,
            date: format(data.date, 'yyyy-MM-dd'),
            eventsCreated: createdEvents.length
          });
        },
        error: (error) => {
          console.error('[SpecialDayModalService] Failed to create special day:', error);
          this.toastr.error('Failed to create special day', 'Error');
        }
      });
    } else if (originalScheduleEvent) {
      this.specialDayManagement.updateSpecialDay(data, originalScheduleEvent).subscribe({
        next: (updatedEvent) => {
          this.notificationService.showSuccess(`Updated special day for Period ${updatedEvent.period}`);

          console.log('[SpecialDayModalService] Special day updated successfully:', {
            eventId: updatedEvent.id,
            eventType: data.eventType,
            period: updatedEvent.period,
            date: format(data.date, 'yyyy-MM-dd')
          });
        },
        error: (error) => {
          console.error('[SpecialDayModalService] Failed to update special day:', error);
          this.toastr.error('Failed to update special day', 'Error');
        }
      });
    }
  }

  /**
   * Handle delete action from modal
   */
  private handleDeleteAction(originalScheduleEvent: ScheduleEvent): void {
    this.specialDayManagement.deleteSpecialDay(originalScheduleEvent).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Deleted special day from Period ${originalScheduleEvent.period}`);

        console.log('[SpecialDayModalService] Special day deleted via modal:', {
          eventId: originalScheduleEvent.id,
          period: originalScheduleEvent.period,
          eventType: originalScheduleEvent.eventType,
          date: format(new Date(originalScheduleEvent.date), 'yyyy-MM-dd')
        });
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to delete special day via modal:', error);
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  // === UTILITY METHODS ===

  /**
   * Check if service has any active modals
   */
  hasActiveModal(): boolean {
    return this.dialog.openDialogs.length > 0;
  }

  /**
   * Close all open modals
   */
  closeAllModals(): void {
    this.dialog.closeAll();
    console.log('[SpecialDayModalService] All modals closed');
  }

  /**
   * Get debug info about modal service
   */
  getDebugInfo(): any {
    return {
      modalService: {
        initialized: true,
        canOpenModals: true,
        activeModals: this.dialog.openDialogs.length,
        supportedOperations: [
          'openSpecialDayModal',
          'editSpecialDayOnDate',
          'deleteSpecialDayOnDate',
          'deleteSpecialDayFromEvent',
          'showErrorDayInfo'
        ],
        cleanedUp: {
          observablePatterns: 'removed',
          subscriptionManagement: 'removed',
          complexEventInterfaces: 'removed',
          lineCount: 'reduced ~25%'
        }
      }
    };
  }

  /**
   * Cleanup method for manual cleanup if needed
   */
  cleanup(): void {
    this.closeAllModals();
    console.log('[SpecialDayModalService] Manual cleanup completed');
  }
}
