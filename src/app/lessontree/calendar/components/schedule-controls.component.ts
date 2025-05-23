// src/app/lessontree/calendar/components/schedule-controls.component.ts - COMPLETE FILE
import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { ScheduleStateService } from '../services/schedule-state.service';
import { Schedule } from '../../../models/schedule';

@Component({
  selector: 'app-schedule-controls',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './schedule-controls.component.html',
  styleUrls: ['./schedule-controls.component.css']
})
export class ScheduleControlsComponent {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);

  // Input to control visibility
  @Input() visible: boolean = true;

  // Output events for parent component
  @Output() createScheduleClicked = new EventEmitter<void>();
  @Output() scheduleSelected = new EventEmitter<number>();
  @Output() saveScheduleClicked = new EventEmitter<void>();

  // Expose signals for template
  readonly schedules = this.scheduleStateService.schedules;
  readonly selectedSchedule = this.scheduleStateService.selectedSchedule;
  readonly isInMemorySchedule = this.scheduleStateService.isInMemorySchedule;
  readonly hasUnsavedChanges = this.scheduleStateService.hasUnsavedChanges;
  readonly canSaveSchedule = this.scheduleStateService.canSaveSchedule;

  constructor() {
    console.log('[ScheduleControlsComponent] Initialized', { timestamp: new Date().toISOString() });
  }

  // Handle schedule selection
  onScheduleChange(scheduleId: number): void {
    console.log(`[ScheduleControlsComponent] Schedule selection changed: ${scheduleId}`, { 
      timestamp: new Date().toISOString() 
    });
    this.scheduleSelected.emit(scheduleId);
  }

  // Handle create new schedule button
  onCreateSchedule(): void {
    console.log('[ScheduleControlsComponent] Create schedule clicked', { 
      timestamp: new Date().toISOString() 
    });
    this.createScheduleClicked.emit();
  }

  // Handle save schedule button
  onSaveSchedule(): void {
    console.log('[ScheduleControlsComponent] Save schedule clicked', { 
      timestamp: new Date().toISOString() 
    });
    this.saveScheduleClicked.emit();
  }

  // Get button text based on available schedules
  getCreateButtonText(): string {
    return this.schedules().length > 0 ? 'New Schedule' : 'Create Schedule';
  }
}