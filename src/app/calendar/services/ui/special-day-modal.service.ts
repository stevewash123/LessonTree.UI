// **ACTIVE FILE** - SpecialDayModalService
// RESPONSIBILITY: Pure modal coordination and UI interactions for special day operations
// DOES NOT: Observable coordination, complex event emission, subscription management
// CALLED BY: ContextMenuHandlerService for special day UI coordination

import { Injectable, inject } from '@angular/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';
import { MatDialog } from '@angular/material/dialog';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { CalendarRefreshService } from '../integration/calendar-refresh.service';
import { SpecialDayModalComponent } from '../../components/special-day-modal.component';
import { SpecialDayModalData, SpecialDayResult, SpecialDayCreateResource } from '../../../models/specialDay.model';
import { ScheduleEvent } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly scheduleApiService = inject(ScheduleApiService);
  private readonly calendarRefreshService = inject(CalendarRefreshService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    console.log('[SpecialDayModalService] Initialized for special day modal coordination');
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
   * Delete special day directly from calendar event
   */
  deleteSpecialDayFromEvent(event: EventClickArg): void {
    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event to delete', 'Error');
      return;
    }

    const currentSchedule = this.scheduleStateService.schedule();
    if (!currentSchedule) {
      this.toastr.error('No active schedule found', 'Error');
      return;
    }

    // TODO: We need to find the special day ID, not the schedule event ID
    // For now, assume the event ID is the special day ID (this may need adjustment)
    const specialDayId = eventId;

    console.log(`[SpecialDayModalService] Deleting special day ${specialDayId} from schedule ${currentSchedule.id}`);

    this.scheduleApiService.deleteSpecialDay(currentSchedule.id, specialDayId).subscribe({
      next: () => {
        this.toastr.success('Special day deleted successfully', 'Success');
        
        console.log('[SpecialDayModalService] Special day deleted successfully:', {
          specialDayId,
          scheduleId: currentSchedule.id
        });

        // Refresh schedule to reflect the deletion
        this.refreshScheduleAfterSpecialDayChange();
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to delete special day:', error);
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
  private openModalWithData(modalData: SpecialDayModalData, originalMode: 'add' | 'edit'): void {
    const dialogRef = this.dialog.open(SpecialDayModalComponent, {
      data: modalData,
      width: '600px',
      maxWidth: '90vw',
      panelClass: 'special-day-modal-container'
    });

    dialogRef.afterClosed().subscribe((result: SpecialDayResult | undefined) => {
      if (result) {
        this.handleModalResult(result, originalMode);
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
    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event', 'Error');
      return null;
    }

    // TODO: Extract special day data from schedule state or API
    console.log('[SpecialDayModalService] Extract special day data - requires API integration');
    this.toastr.info('Special day editing requires API integration', 'Feature Update');
    return null;
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
  private handleModalResult(result: SpecialDayResult, originalMode: 'add' | 'edit'): void {
    if (result.action === 'save' && result.data) {
      this.handleSaveSpecialDay(result.data, originalMode);
    } else if (result.action === 'delete') {
      // TODO: Implement delete from modal - need special day ID
      console.log('[SpecialDayModalService] Delete special day from modal - requires special day ID');
      this.toastr.info('Special day deletion from modal not yet implemented', 'Feature Update');
    }
  }

  /**
   * Handle saving special day via API
   */
  private handleSaveSpecialDay(data: any, mode: 'add' | 'edit'): void {
    const currentSchedule = this.scheduleStateService.schedule();
    if (!currentSchedule) {
      this.toastr.error('No active schedule found', 'Error');
      return;
    }

    // Create the special day request
    const specialDayRequest: SpecialDayCreateResource = {
      date: data.date,
      periods: data.periods,
      eventType: data.specialCode || data.eventType,
      title: data.title,
      description: data.description
    };

    console.log('[SpecialDayModalService] Creating special day:', {
      scheduleId: currentSchedule.id,
      request: specialDayRequest
    });

    // Call API to create special day
    this.scheduleApiService.createSpecialDay(currentSchedule.id, specialDayRequest).subscribe({
      next: (createdSpecialDay) => {
        const periodText = specialDayRequest.periods.length === 1
          ? `Period ${specialDayRequest.periods[0]}`
          : `Periods ${specialDayRequest.periods.join(', ')}`;
        
        this.toastr.success(`Created special day for ${periodText}`, 'Success');
        
        console.log('[SpecialDayModalService] Special day created successfully:', {
          specialDay: createdSpecialDay,
          affectedPeriods: specialDayRequest.periods,
          date: format(specialDayRequest.date, 'yyyy-MM-dd')
        });

        // Refresh schedule to show the new special day
        this.refreshScheduleAfterSpecialDayChange();
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to create special day:', error);
        this.toastr.error('Failed to create special day', 'Error');
      }
    });
  }

  /**
   * Refresh schedule data after special day changes
   */
  private refreshScheduleAfterSpecialDayChange(): void {
    const currentSchedule = this.scheduleStateService.schedule();
    if (currentSchedule?.id) {
      console.log('[SpecialDayModalService] Triggering calendar refresh after special day change');
      
      // Use the CalendarRefreshService to trigger proper calendar UI refresh
      this.calendarRefreshService.refreshAfterSpecialDayChange(currentSchedule.id);
    }
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
   * Cleanup method for manual cleanup if needed
   */
  cleanup(): void {
    this.closeAllModals();
    console.log('[SpecialDayModalService] Manual cleanup completed');
  }
}