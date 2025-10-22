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
import { NotificationService } from '../../../shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly scheduleApiService = inject(ScheduleApiService);
  private readonly calendarRefreshService = inject(CalendarRefreshService);
  private readonly toastr = inject(ToastrService);
  private readonly notificationService = inject(NotificationService);
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

    // Extract specialDayId from the calendar event's schedule event data
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    // ✅ ENHANCED: Try multiple paths to find specialDayId
    const specialDayId = extendedProps['specialDayId'] || scheduleEvent?.specialDayId;
    const eventCategory = extendedProps['eventCategory'] || scheduleEvent?.eventCategory;

    console.log('[SpecialDayModalService] Debug Special Day ID extraction for delete:', {
      extendedPropsSpecialDayId: extendedProps['specialDayId'],
      scheduleEventSpecialDayId: scheduleEvent?.specialDayId,
      finalSpecialDayId: specialDayId,
      eventCategory: eventCategory,
      isSpecialDayByCategory: eventCategory === 'SpecialDay'
    });

    if (!specialDayId) {
      // ✅ FALLBACK: If no specialDayId but this is a SpecialDay event, show helpful error
      if (eventCategory === 'SpecialDay') {
        this.toastr.error('Special Day events created before the latest update cannot be deleted via this method. Please recreate the calendar to update Special Day references.', 'Legacy Special Day');
        console.log('[SpecialDayModalService] Legacy Special Day event detected for delete (no specialDayId but eventCategory=SpecialDay)');
      } else {
        this.toastr.error('This event is not associated with a special day', 'Error');
        console.log('[SpecialDayModalService] No specialDayId found in event:', { eventId, extendedProps, scheduleEvent });
      }
      return;
    }

    console.log(`[SpecialDayModalService] Deleting special day ${specialDayId} from schedule ${currentSchedule.id}`);

    this.scheduleApiService.deleteSpecialDay(currentSchedule.id, specialDayId).subscribe({
      next: () => {
        this.notificationService.showSuccess('Special day deleted successfully');
        
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

    // Extract SpecialDayId from event to make API call
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];
    const specialDayId = extendedProps['specialDayId'] || scheduleEvent?.specialDayId;

    if (!specialDayId) {
      this.toastr.error('Special Day ID not found in event', 'Error');
      console.log('[SpecialDayModalService] No specialDayId found for edit:', { extendedProps, scheduleEvent });
      return null;
    }

    // ✅ NEW APPROACH: Use API call to fetch full Special Day data
    this.fetchSpecialDayDataAndOpenModal(specialDayId, event);
    return null; // Return null to prevent immediate modal opening
  }

  /**
   * Fetch full Special Day data from API and open modal
   */
  private fetchSpecialDayDataAndOpenModal(specialDayId: number, event: EventClickArg): void {
    const currentSchedule = this.scheduleStateService.schedule();
    if (!currentSchedule) {
      this.toastr.error('No active schedule found', 'Error');
      return;
    }

    console.log(`[SpecialDayModalService] Fetching complete Special Day data for ID: ${specialDayId}`);

    this.scheduleApiService.getSpecialDay(currentSchedule.id, specialDayId).subscribe({
      next: (specialDay) => {
        console.log('[SpecialDayModalService] Fetched Special Day data:', specialDay);

        // Create modal data with complete API response
        const modalData: SpecialDayModalData = {
          date: new Date(specialDay.date),
          periods: specialDay.periods || [], // Full periods array from API
          mode: 'edit',
          existingSpecialDay: {
            id: specialDay.id,
            periods: specialDay.periods || [],
            eventType: specialDay.eventType,
            title: specialDay.title,
            description: specialDay.description || undefined,
            date: new Date(specialDay.date),
            backgroundColor: specialDay.backgroundColor,
            fontColor: specialDay.fontColor
          }
        };

        console.log('[SpecialDayModalService] Created modal data from API:', modalData);

        // Open modal with complete data
        this.openModalWithData(modalData, 'edit');
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to fetch Special Day data:', error);
        this.toastr.error('Failed to load Special Day data', 'Error');
      }
    });
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
      this.handleDeleteSpecialDay(result.data, originalMode);
    }
  }

  /**
   * Handle saving special day via API (create or update based on mode)
   */
  private handleSaveSpecialDay(data: any, mode: 'add' | 'edit'): void {
    const currentSchedule = this.scheduleStateService.schedule();
    if (!currentSchedule) {
      this.toastr.error('No active schedule found', 'Error');
      return;
    }

    if (mode === 'add') {
      this.createSpecialDay(currentSchedule.id, data);
    } else {
      this.updateSpecialDay(currentSchedule.id, data);
    }
  }

  /**
   * Create new special day
   */
  private createSpecialDay(scheduleId: number, data: any): void {
    const specialDayRequest: SpecialDayCreateResource = {
      date: data.date,
      periods: data.periods,
      eventType: data.specialCode || data.eventType,
      title: data.title,
      description: data.description,
      backgroundColor: data.backgroundColor,
      fontColor: data.fontColor
    };

    console.log('[SpecialDayModalService] Creating special day:', {
      scheduleId: scheduleId,
      request: specialDayRequest
    });

    this.scheduleApiService.createSpecialDay(scheduleId, specialDayRequest).subscribe({
      next: (createdSpecialDay) => {
        const periodText = specialDayRequest.periods.length === 1
          ? `Period ${specialDayRequest.periods[0]}`
          : `Periods ${specialDayRequest.periods.join(', ')}`;
        
        this.notificationService.showSuccess(`Created special day for ${periodText}`);
        
        console.log('[SpecialDayModalService] Special day created successfully:', {
          specialDay: createdSpecialDay,
          affectedPeriods: specialDayRequest.periods,
          date: format(specialDayRequest.date, 'yyyy-MM-dd')
        });

        this.refreshScheduleAfterSpecialDayChange();
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to create special day:', error);
        this.toastr.error('Failed to create special day', 'Error');
      }
    });
  }

  /**
   * Update existing special day
   */
  private updateSpecialDay(scheduleId: number, data: any): void {
    if (!data.id) {
      this.toastr.error('Missing special day ID for update', 'Error');
      return;
    }

    const specialDayUpdateRequest = {
      id: data.id,
      date: data.date, // ✅ FIX: Include date in update request
      periods: data.periods,
      eventType: data.specialCode || data.eventType,
      title: data.title,
      description: data.description,
      backgroundColor: data.backgroundColor,
      fontColor: data.fontColor
    };

    console.log('[SpecialDayModalService] Updating special day:', {
      scheduleId: scheduleId,
      specialDayId: data.id,
      request: specialDayUpdateRequest
    });

    this.scheduleApiService.updateSpecialDay(scheduleId, data.id, specialDayUpdateRequest).subscribe({
      next: (updateResponse) => {
        const specialDay = updateResponse.specialDay || updateResponse; // Handle both new and legacy response formats
        const periodText = specialDayUpdateRequest.periods.length === 1
          ? `Period ${specialDayUpdateRequest.periods[0]}`
          : `Periods ${specialDayUpdateRequest.periods.join(', ')}`;

        this.notificationService.showSuccess(`Updated special day for ${periodText}`);

        console.log('[SpecialDayModalService] Special day updated successfully:', {
          specialDay: specialDay,
          affectedPeriods: specialDayUpdateRequest.periods,
          originalId: data.id,
          calendarRefreshNeeded: updateResponse.calendarRefreshNeeded,
          refreshReason: updateResponse.refreshReason
        });

        // Conditionally refresh based on API response
        if (updateResponse.calendarRefreshNeeded) {
          console.log('[SpecialDayModalService] API indicates calendar refresh needed:', updateResponse.refreshReason);
          this.refreshScheduleAfterSpecialDayChange();
        } else {
          console.log('[SpecialDayModalService] API indicates no calendar refresh needed:', updateResponse.refreshReason);
        }
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to update special day:', error);
        this.toastr.error('Failed to update special day', 'Error');
      }
    });
  }

  /**
   * Handle deleting special day from modal
   */
  private handleDeleteSpecialDay(data: any, mode: 'add' | 'edit'): void {
    if (mode === 'add') {
      // No deletion needed for add mode
      console.log('[SpecialDayModalService] Delete requested on add mode - nothing to delete');
      return;
    }

    if (!data?.id) {
      this.toastr.error('Missing special day ID for deletion', 'Error');
      return;
    }

    const currentSchedule = this.scheduleStateService.schedule();
    if (!currentSchedule) {
      this.toastr.error('No active schedule found', 'Error');
      return;
    }

    console.log(`[SpecialDayModalService] Deleting special day ${data.id} from modal`);

    this.scheduleApiService.deleteSpecialDay(currentSchedule.id, data.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Special day deleted successfully');
        
        console.log('[SpecialDayModalService] Special day deleted from modal:', {
          specialDayId: data.id,
          scheduleId: currentSchedule.id
        });

        this.refreshScheduleAfterSpecialDayChange();
      },
      error: (error) => {
        console.error('[SpecialDayModalService] Failed to delete special day from modal:', error);
        this.toastr.error('Failed to delete special day', 'Error');
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
      this.calendarRefreshService.refreshCalendar();
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