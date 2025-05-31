// COMPLETE FILE
// RESPONSIBILITY: Handles modal coordination and UI interactions for special day operations.
// DOES NOT: Handle business logic, API calls, or data persistence - delegates to SpecialDayManagementService.
// CALLED BY: ScheduleContextService for special day UI coordination.
import { Injectable, inject } from '@angular/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';
import { MatDialog } from '@angular/material/dialog';

import { ScheduleDay } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { SpecialDayManagementService, SpecialDayData } from './special-day-management.service';
import { SpecialDayModalComponent, SpecialDayModalData, SpecialDayResult } from '../components/special-day-modal.component';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly specialDayManagement = inject(SpecialDayManagementService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    console.log('[SpecialDayModalService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Open special day modal for add or edit operations
  openSpecialDayModal(mode: 'add' | 'edit', date?: Date | null, event?: EventClickArg): void {
    let modalData: SpecialDayModalData;

    if (mode === 'add') {
      if (!date) {
        console.error(`[SpecialDayModalService] Cannot open modal: No date provided for add mode`, { 
          timestamp: new Date().toISOString() 
        });
        this.toastr.error('No date selected', 'Error');
        return;
      }

      modalData = {
        date: new Date(date),
        mode: 'add',
        existingSpecialDay: null
      };
    } else {
      // Edit mode
      if (!event) {
        console.error(`[SpecialDayModalService] Cannot open modal: No event provided for edit mode`, { 
          timestamp: new Date().toISOString() 
        });
        this.toastr.error('No special day selected', 'Error');
        return;
      }

      const existingData = this.prepareExistingDataFromEvent(event);
      if (!existingData) {
        return; // Error already logged in prepareExistingDataFromEvent
      }

      modalData = {
        date: existingData.date,
        mode: 'edit',
        existingSpecialDay: existingData
      };
    }

    this.openModalWithData(modalData, mode);
  }

  // Edit special day directly from a date (used by context service)
  editSpecialDayOnDate(scheduleDay: ScheduleDay): void {
    console.log(`[SpecialDayModalService] Opening edit modal for special day on date`, {
      scheduleDay: scheduleDay.id,
      date: format(new Date(scheduleDay.date), 'yyyy-MM-dd'),
      specialCode: scheduleDay.specialCode,
      timestamp: new Date().toISOString()
    });

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleDay);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');
      return;
    }

    const modalData: SpecialDayModalData = {
      date: specialDayData.date,
      mode: 'edit',
      existingSpecialDay: {
        id: scheduleDay.id,
        specialCode: specialDayData.specialCode,
        title: specialDayData.title,
        description: specialDayData.description,
        date: specialDayData.date
      }
    };

    this.openModalWithData(modalData, 'edit', scheduleDay);
  }

  // Delete special day directly from a date (used by context service)
  deleteSpecialDayOnDate(scheduleDay: ScheduleDay): void {
    console.log(`[SpecialDayModalService] Deleting special day on date`, {
      scheduleDay: scheduleDay.id,
      date: format(new Date(scheduleDay.date), 'yyyy-MM-dd'),
      specialCode: scheduleDay.specialCode,
      timestamp: new Date().toISOString()
    });

    this.specialDayManagement.deleteSpecialDay(scheduleDay);
  }

  // Delete special day from event (used by context service)
  deleteSpecialDayFromEvent(event: EventClickArg): void {
    const eventId = parseInt(event.event.id);
    const scheduleDay = this.specialDayManagement.findSpecialDayById(eventId);
    
    if (!scheduleDay) {
      this.toastr.error('Selected item is not a special day', 'Error');
      return;
    }

    this.specialDayManagement.deleteSpecialDay(scheduleDay);
  }

  // Show information about error days
  showErrorDayInfo(): void {
    this.toastr.info(
      'This day has no lesson assigned because there are more school days than lessons. ' +
      'Add more lessons to your course or adjust the schedule end date.',
      'Error Day Information',
      { timeOut: 8000 }
    );
  }

  // Open modal with prepared data (internal helper)
  private openModalWithData(modalData: SpecialDayModalData, originalMode: 'add' | 'edit', originalScheduleDay?: ScheduleDay): void {
    // Open the modal
    const dialogRef = this.dialog.open(SpecialDayModalComponent, {
      data: modalData,
      width: '500px',
      maxWidth: '90vw',
      panelClass: 'special-day-modal-container'
    });

    // Handle modal result
    dialogRef.afterClosed().subscribe((result: SpecialDayResult | undefined) => {
      if (result) {
        this.handleModalResult(result, originalMode, originalScheduleDay);
      } else {
        console.log('[SpecialDayModalService] Modal cancelled', { 
          mode: originalMode, 
          timestamp: new Date().toISOString() 
        });
      }
    });
  }

  // Prepare existing data from event for edit mode
  private prepareExistingDataFromEvent(event: EventClickArg): { id: number; specialCode: string; title: string; description?: string; date: Date } | null {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays) {
      console.error(`[SpecialDayModalService] Cannot get existing data: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule available', 'Error');
      return null;
    }

    const eventId = parseInt(event.event.id);
    const scheduleDay = this.specialDayManagement.findSpecialDayById(eventId);
    
    if (!scheduleDay) {
      this.toastr.error('Selected item is not a special day', 'Error');
      return null;
    }

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleDay);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');
      return null;
    }

    return {
      id: scheduleDay.id,
      specialCode: specialDayData.specialCode,
      title: specialDayData.title,
      description: specialDayData.description,
      date: specialDayData.date
    };
  }

  // Handle the result from the modal
  private handleModalResult(result: SpecialDayResult, originalMode: 'add' | 'edit', originalScheduleDay?: ScheduleDay): void {
    console.log('[SpecialDayModalService] Processing modal result', { 
      action: result.action, 
      originalMode, 
      timestamp: new Date().toISOString() 
    });

    if (result.action === 'save') {
      // Validate the data first
      const validation = this.specialDayManagement.validateSpecialDayData(result.data!);
      if (!validation.isValid) {
        console.error('[SpecialDayModalService] Invalid special day data:', validation.errors);
        this.toastr.error(`Invalid data: ${validation.errors.join(', ')}`, 'Validation Error');
        return;
      }

      if (originalMode === 'add') {
        this.specialDayManagement.createSpecialDay(result.data!);
      } else if (originalScheduleDay) {
        this.specialDayManagement.updateSpecialDay(result.data!, originalScheduleDay);
      } else {
        // This case shouldn't happen in the refactored version
        console.error('[SpecialDayModalService] Edit mode but no original schedule day provided');
        this.toastr.error('Update operation failed - missing context', 'Error');
      }
    } else if (result.action === 'delete') {
      if (originalScheduleDay) {
        this.specialDayManagement.deleteSpecialDay(originalScheduleDay);
      } else {
        // This case shouldn't happen in the refactored version
        console.error('[SpecialDayModalService] Delete action but no original schedule day provided');
        this.toastr.error('Delete operation failed - missing context', 'Error');
      }
    }
  }
}