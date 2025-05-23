// src/app/lessontree/calendar/calendar-config-modal.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { set } from 'date-fns';
import { LessonCalendarService } from '../services/lesson-calendar.service';
import { Schedule } from '../../../models/schedule';
import { ToastrService } from 'ngx-toastr';

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
    MatCheckboxModule
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

  constructor(
    private dialogRef: MatDialogRef<CalendarConfigModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      courseId: number; 
      userId: number; 
      courseTitle: string;
      inMemorySchedule: Schedule | null;
    },
    private calendarService: LessonCalendarService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    // Initialize form with default values
    const formConfig: any = {
      title: [`${data.courseTitle || 'New Course'} - ${new Date().getFullYear()}`, [Validators.required, Validators.maxLength(200)]],
      startDate: [set(new Date(), { month: 7, date: 1 }), Validators.required],
      numSchoolDays: [180, [Validators.required, Validators.min(1), Validators.max(365)]]
    };
    
    // Add weekday checkboxes with defaults
    this.weekdays.forEach(day => {
      formConfig[day] = [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day)];
    });
    
    this.configForm = this.fb.group(formConfig);
    
    // If we have an in-memory schedule, populate the form with its values
    if (data.inMemorySchedule) {
      const schedule = data.inMemorySchedule;
      this.configForm.patchValue({
        title: schedule.title,
        startDate: new Date(schedule.startDate),
        numSchoolDays: schedule.numSchoolDays
      });
      
      // Reset all days to false
      this.weekdays.forEach(day => {
        this.configForm.get(day)?.setValue(false);
      });
      
      // Set the teaching days from the schedule
      if (schedule.teachingDays) {
        schedule.teachingDays.forEach(day => {
          this.configForm.get(day)?.setValue(true);
        });
      }
    }
  }

  ngOnInit(): void {
    console.log(`[CalendarConfigModal] Component initialized, data:`, {
      courseId: this.data.courseId,
      userId: this.data.userId,
      courseTitle: this.data.courseTitle,
      hasInMemorySchedule: !!this.data.inMemorySchedule,
      timestamp: new Date().toISOString()
    });
  }

  save(): void {
    if (this.configForm.valid && !this.noTeachingDaySelected) {
      const formValue = this.configForm.value;
      
      // Get selected teaching days
      const teachingDays = this.weekdays.filter(day => formValue[day]);
      
      const schedule: Schedule = {
        id: 0,
        title: formValue.title,
        courseId: this.data.courseId,
        userId: this.data.userId,
        startDate: formValue.startDate,
        numSchoolDays: formValue.numSchoolDays,
        teachingDays: teachingDays,
        scheduleDays: []
      };
      
      console.log(`[CalendarConfigModal] Creating new schedule with title ${schedule.title}`, {
        startDate: schedule.startDate,
        numSchoolDays: schedule.numSchoolDays,
        teachingDays: schedule.teachingDays?.join(', ') || '',
        timestamp: new Date().toISOString()
      });
      
      this.calendarService.createSchedule(schedule).subscribe({
        next: (newSchedule: Schedule) => {
          console.log(`[CalendarConfigModal] Created schedule ID ${newSchedule.id}`, { timestamp: new Date().toISOString() });
          this.toastr.success('Schedule created successfully', 'Success');
          this.dialogRef.close(newSchedule);
        },
        error: (err: any) => {
          console.error(`[CalendarConfigModal] Failed to create schedule: ${err.message}`, { timestamp: new Date().toISOString() });
          this.toastr.error('Failed to create schedule', 'Error');
        }
      });
    } else {
      console.log(`[CalendarConfigModal] Form invalid on save attempt`, {
        valid: this.configForm.valid,
        noTeachingDaySelected: this.noTeachingDaySelected,
        timestamp: new Date().toISOString()
      });
      
      if (this.noTeachingDaySelected) {
        this.toastr.error('Please select at least one teaching day', 'Validation Error');
      }
    }
  }

  cancel(): void {
    console.log(`[CalendarConfigModal] Modal cancelled`, { timestamp: new Date().toISOString() });
    this.dialogRef.close();
  }
}