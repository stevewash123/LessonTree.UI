// RESPONSIBILITY: Handles modal coordination and UI interactions for special day operations.
// DOES NOT: Handle business logic, API calls, or data persistence - delegates to SpecialDayManagementService.
// CALLED BY: ScheduleContextService for special day UI coordination.
import { Injectable, inject } from '@angular/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';
import { MatDialog } from '@angular/material/dialog';

import { ScheduleEvent } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { SpecialDayManagementService, SpecialDayData } from './special-day-management.service';
import { SpecialDayModalComponent, SpecialDayModalData, SpecialDayResult } from '../components/special-day-modal.component';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly specialDayManagement = inject(SpecialDayManagementService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    console.log('[SpecialDayModalService] Initialized for multi-period special days');
  }

  // Open special day modal for add or edit operations
  openSpecialDayModal(mode: 'add' | 'edit', date?: Date | null, event?: EventClickArg, periods?: number[]): void {
    console.log(`[SpecialDayModalService] Opening ${mode} modal`);
    
    const modalData = mode === 'add' 
      ? this.createAddModalData(date, periods)
      : this.createEditModalData(event);

    if (modalData) {
      this.openModalWithData(modalData, mode);
    }
  }

  // Edit special day directly from a schedule event
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
        eventType: specialDayData.eventType, // FIXED: was specialCode
        title: specialDayData.title,
        description: specialDayData.description,
        date: specialDayData.date
      }
    };
  
    this.openModalWithData(modalData, 'edit', scheduleEvent);
  }

  // Delete special day directly from a schedule event
  deleteSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Deleting special day event ${scheduleEvent.id}`);
    
    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${scheduleEvent.period}`, 'Success');
      },
      error: () => {
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  // Delete special day from event
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
        this.toastr.success(`Deleted special day from Period ${scheduleEvent.period}`, 'Success');
      },
      error: () => {
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  // Show information about error days
  showErrorDayInfo(period?: number): void {
    const message = period 
      ? `Period ${period} has no lesson assigned because there are more school periods than lessons. Add more lessons to your course or adjust the schedule.`
      : 'This day has no lesson assigned because there are more school days than lessons. Add more lessons to your course or adjust the schedule end date.';
      
    this.toastr.info(message, 'Error Day Information', { timeOut: 8000 });
  }

  // === PRIVATE HELPER METHODS ===

  // SIMPLIFIED: Create modal data for add mode
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

  // SIMPLIFIED: Create modal data for edit mode
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
      }
    });
  }

  private prepareExistingDataFromEvent(event: EventClickArg): { id: number; periods: number[]; eventType: string; title: string; description?: string; date: Date } | null {
    const currentSchedule = this.scheduleStateService.selectedScheduleValue(); // FIXED: signal access
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
      eventType: specialDayData.eventType, // FIXED: was specialCode
      title: specialDayData.title,
      description: specialDayData.description,
      date: specialDayData.date
    };
  }

  private extractEventIdFromCalendarEvent(event: EventClickArg): number | null {
    const eventId = event.event.id;
    
    // Handle period-based event IDs like "123-period-2"
    if (eventId.includes('-period-')) {
      const scheduleDayId = parseInt(eventId.split('-period-')[0], 10);
      return isNaN(scheduleDayId) ? null : scheduleDayId;
    }
    
    // Handle simple numeric IDs
    const numericId = parseInt(eventId, 10);
    return isNaN(numericId) ? null : numericId;
  }

  private handleModalResult(result: SpecialDayResult, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    if (result.action === 'save' && result.data) {
      // Map specialCode to eventType for compatibility
      const mappedData: SpecialDayData = {
        ...result.data,
        eventType: (result.data as any).specialCode || (result.data as any).eventType
      };
      this.handleSaveAction(mappedData, originalMode, originalScheduleEvent); // CHANGED: use mappedData
    } else if (result.action === 'delete' && originalScheduleEvent) {
      this.handleDeleteAction(originalScheduleEvent);
    }
  }

  private handleSaveAction(data: SpecialDayData, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    const validation = this.specialDayManagement.validateSpecialDayData(data);
    if (!validation.isValid) {
      this.toastr.error(`Invalid data: ${validation.errors.join(', ')}`, 'Validation Error');
      return;
    }
  
    // Ensure data has eventType property (the interface should already enforce this)
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
        },
        error: () => {
          this.toastr.error('Failed to create special day', 'Error');
        }
      });
    } else if (originalScheduleEvent) {
      this.specialDayManagement.updateSpecialDay(data, originalScheduleEvent).subscribe({
        next: (updatedEvent) => {
          this.toastr.success(`Updated special day for Period ${updatedEvent.period}`, 'Success');
        },
        error: () => {
          this.toastr.error('Failed to update special day', 'Error');
        }
      });
    }
  }

  private handleDeleteAction(originalScheduleEvent: ScheduleEvent): void {
    this.specialDayManagement.deleteSpecialDay(originalScheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${originalScheduleEvent.period}`, 'Success');
      },
      error: () => {
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }
}