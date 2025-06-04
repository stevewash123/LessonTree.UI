// RESPONSIBILITY: Provides UI for configuring schedule settings (title, dates, teaching days, lock status).
// DOES NOT: Handle schedule day generation or full schedule management.
// CALLED BY: LessonCalendarComponent when user needs to configure schedule settings.
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { set } from 'date-fns';
import { LessonCalendarService } from '../services/lesson-calendar.service';
import { Schedule } from '../../../models/schedule';
import { ToastrService } from 'ngx-toastr';

export interface CalendarConfigModalData {
  courseId: number;
  userId: number;
  courseTitle: string;
  existingSchedule?: Schedule | null; // For populating form with current schedule data
}

@Component({
  selector: 'app-calendar-config-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSlideToggleModule
  ],
  templateUrl: './calendar-config-modal.component.html',
  styleUrl: './calendar-config-modal.component.css'
})
export class CalendarConfigModalComponent implements OnInit {
  configForm: FormGroup;
  weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  get noTeachingDaySelected(): boolean {
    return !this.weekdays.some(day => this.configForm.get(day)?.value);
  }

  get hasExistingSchedule(): boolean {
    return !!this.data.existingSchedule;
  }

  constructor(
    private dialogRef: MatDialogRef<CalendarConfigModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CalendarConfigModalData,
    private calendarService: LessonCalendarService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    // Initialize form with default values
    const currentYear = new Date().getFullYear();
    const defaultStartDate = new Date(currentYear, 7, 1); // August 1st current year (month is 0-indexed)
    const defaultEndDate = new Date(currentYear + 1, 5, 15); // June 15th NEXT year

    const formConfig: any = {
      title: [
        `${data.courseTitle || 'New Course'} - ${new Date().getFullYear()}`, 
        [Validators.required, Validators.maxLength(200)]
      ],
      startDate: [defaultStartDate, Validators.required],
      endDate: [defaultEndDate, Validators.required],
      isLocked: [false]
    };
    
    // Add weekday checkboxes with defaults (MTWThF)
    this.weekdays.forEach(day => {
      formConfig[day] = [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day)];
    });
    
    this.configForm = this.fb.group(formConfig);
    
    // Add custom validator for date range
    this.configForm.addValidators(this.dateRangeValidator.bind(this));
    
    // If we have an existing schedule, populate the form
    if (data.existingSchedule) {
      this.populateFormFromSchedule(data.existingSchedule);
    }
  }

  ngOnInit(): void {
    console.log(`[CalendarConfigModal] Component initialized`, {
      courseId: this.data.courseId,
      userId: this.data.userId,
      courseTitle: this.data.courseTitle,
      hasExistingSchedule: !!this.data.existingSchedule,
      timestamp: new Date().toISOString()
    });
  }

  private populateFormFromSchedule(schedule: Schedule): void {
    this.configForm.patchValue({
      title: schedule.title,
      startDate: new Date(schedule.startDate),
      endDate: new Date(schedule.endDate),
      isLocked: schedule.isLocked || false
    });
    
    // Reset all days to false first
    this.weekdays.forEach(day => {
      this.configForm.get(day)?.setValue(false);
    });
    
    // Parse and set teaching days from CSV
    const teachingDays = this.parseTeachingDays(schedule.teachingDays);
    teachingDays.forEach(day => {
      if (this.weekdays.includes(day)) {
        this.configForm.get(day)?.setValue(true);
      }
    });

    console.log(`[CalendarConfigModal] Form populated from existing schedule`, {
      scheduleId: schedule.id,
      title: schedule.title,
      teachingDays: teachingDays,
      isLocked: schedule.isLocked,
      timestamp: new Date().toISOString()
    });
  }

  private parseTeachingDays(teachingDaysStr?: string): string[] {
    if (!teachingDaysStr) return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return teachingDaysStr.split(',').map(day => day.trim());
  }

  private getSelectedTeachingDays(): string[] {
    return this.weekdays.filter(day => this.configForm.get(day)?.value);
  }

  private dateRangeValidator(control: AbstractControl): { [key: string]: any } | null {
    const formGroup = control as FormGroup;
    const startDate = formGroup.get('startDate')?.value;
    const endDate = formGroup.get('endDate')?.value;
    
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return { dateRange: true };
    }
    return null;
  }

  save(): void {
    if (this.configForm.valid && !this.noTeachingDaySelected) {
      const formValue = this.configForm.value;
      const teachingDays = this.getSelectedTeachingDays();
      
      this.saveScheduleConfiguration(formValue, teachingDays);
    } else {
      this.handleValidationErrors();
    }
  }

  private saveScheduleConfiguration(formValue: any, teachingDays: string[]): void {
    const schedule: Schedule = {
      id: this.data.existingSchedule?.id || 0, // 0 for new, existing ID for updates
      title: formValue.title,
      courseId: this.data.courseId,
      userId: this.data.userId,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      teachingDays: teachingDays.join(','),
      isLocked: formValue.isLocked || false,
      scheduleEvents: this.data.existingSchedule?.scheduleEvents || []
    };
    
    console.log(`[CalendarConfigModal] Saving schedule configuration`, {
      scheduleId: schedule.id,
      title: schedule.title,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      teachingDays: schedule.teachingDays,
      isUpdate: !!this.data.existingSchedule,
      eventCount: schedule.scheduleEvents?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // API will determine if this is create or update based on schedule.id
    this.calendarService.createSchedule(schedule).subscribe({
      next: (savedSchedule: Schedule) => {
        const actionType = this.data.existingSchedule ? 'updated' : 'created';
        console.log(`[CalendarConfigModal] Schedule ${actionType} successfully`, {
          scheduleId: savedSchedule.id,
          eventCount: savedSchedule.scheduleEvents?.length || 0,
          timestamp: new Date().toISOString()
        });
        
        this.toastr.success(`Schedule ${actionType} successfully`, 'Success');
        this.dialogRef.close(savedSchedule);
      },
      error: (err: any) => {
        const actionType = this.data.existingSchedule ? 'update' : 'create';
        console.error(`[CalendarConfigModal] Failed to ${actionType} schedule: ${err.message}`, {
          timestamp: new Date().toISOString()
        });
        
        this.toastr.error(`Failed to ${actionType} schedule`, 'Error');
      }
    });
  }

  private handleValidationErrors(): void {
    console.log(`[CalendarConfigModal] Form validation failed`, {
      valid: this.configForm.valid,
      noTeachingDaySelected: this.noTeachingDaySelected,
      errors: this.configForm.errors,
      timestamp: new Date().toISOString()
    });
    
    if (this.noTeachingDaySelected) {
      this.toastr.error('Please select at least one teaching day', 'Validation Error');
    }
    
    if (this.configForm.hasError('dateRange')) {
      this.toastr.error('End date must be after start date', 'Validation Error');
    }
    
    // Mark all fields as touched to show validation errors
    this.configForm.markAllAsTouched();
  }

  cancel(): void {
    console.log(`[CalendarConfigModal] Modal cancelled`, { 
      timestamp: new Date().toISOString() 
    });
    this.dialogRef.close();
  }
}