// **COMPLETE FILE** - Replace schedule-config.component.ts  
// RESPONSIBILITY: Schedule configuration UI controller
// DOES NOT: Handle business logic (delegated to ScheduleConfigService)
// CALLED BY: Home component via dialog service

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseDataService } from '../../core/services/course-data.service';
import { UserService } from '../../core/services/user.service';
import { PeriodManagementService } from '../../core/services/period-management.service';
import { ScheduleConfigService } from './schedule-config.service';
import { Course } from '../../models/course';
import { SchedulePersistenceService } from '../../lessontree/calendar/services/schedule-persistence.service';

@Component({
  selector: 'app-schedule-config',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './schedule-config.component.html',
  styleUrls: ['./schedule-config.component.css']
})
export class ScheduleConfigComponent implements OnInit {
  

  scheduleForm: FormGroup;
  availableCourses: Course[] = [];

  constructor(
    private dialogRef: MatDialogRef<ScheduleConfigComponent>,
    private snackBar: MatSnackBar,
    private courseDataService: CourseDataService,
    private userService: UserService,
    public periodMgmt: PeriodManagementService,  // public for template
    public scheduleConfigService: ScheduleConfigService,  // public for template
    private schedulePersistenceService: SchedulePersistenceService
  ) {
    this.scheduleForm = this.scheduleConfigService.createScheduleForm();
  }

  ngOnInit(): void {
    console.log('[ScheduleConfig] Component initializing');
    this.loadCourses();
    this.loadConfiguration();
  }

  private loadCourses(): void {
    this.availableCourses = this.courseDataService.getCourses();
    console.log('[ScheduleConfig] Loaded courses:', this.availableCourses.length);
  }

  private loadConfiguration(): void {
    // FIXED: Load from UserService temporarily until we have proper schedule config loading
    // Don't generate schedule - just load the saved configuration data
    const existingConfig = this.userService.getUserConfiguration();
    
    if (existingConfig) {
      console.log('[ScheduleConfig] Loading existing config:', existingConfig);
      this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, existingConfig);
    } else {
      console.log('[ScheduleConfig] No existing config, using defaults');
      this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, null);
    }
  }
//   private loadScheduleConfiguration(): void {
//     // FIXED: Get schedule config from schedule service, not user service
//     this.schedulePersistenceService.getMasterSchedule().subscribe({
//       next: (existingSchedule) => {
//         console.log('[ScheduleConfig] Loaded existing schedule:', existingSchedule);
        
//         // Convert schedule to config format for the form
//         const configData = existingSchedule ? {
//           schoolYear: existingSchedule.title?.includes('2024') ? '2024-2025' : '2025-2026',
//           periodsPerDay: this.extractPeriodsFromSchedule(existingSchedule),
//           startDate: existingSchedule.startDate ? new Date(existingSchedule.startDate) : null,
//           endDate: existingSchedule.endDate ? new Date(existingSchedule.endDate) : null,
//           periodAssignments: this.extractPeriodAssignments(existingSchedule)
//         } : null;
        
//         this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, configData);
//       },
//       error: (error) => {
//         console.warn('[ScheduleConfig] No existing schedule found, using defaults:', error);
//         this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, null);
//       }
//     });
//   }

//   private extractPeriodsFromSchedule(schedule: any): number {
//     if (!schedule.scheduleEvents || schedule.scheduleEvents.length === 0) return 6;
    
//     const maxPeriod = Math.max(...schedule.scheduleEvents.map((event: any) => event.period || 0));
//     return maxPeriod > 0 ? maxPeriod : 6;
//   }
  
//   // Helper to extract period assignments from schedule events
//   private extractPeriodAssignments(schedule: any): any[] {
//     if (!schedule.scheduleEvents) return [];
    
//     const periodMap = new Map<number, any>();
    
//     schedule.scheduleEvents.forEach((event: any) => {
//       if (!periodMap.has(event.period)) {
//         periodMap.set(event.period, {
//           period: event.period,
//           courseId: event.courseId,
//           specialPeriodType: event.eventType === 'SpecialDay' ? event.eventCategory : null,
//           teachingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], // Default
//           room: '',
//           notes: event.comment || '',
//           backgroundColor: '',
//           fontColor: ''
//         });
//       }
//     });
    
//     return Array.from(periodMap.values()).sort((a, b) => a.period - b.period);
//   }

  // Getters for template
  get periodAssignments(): FormArray {
    return this.scheduleForm.get('periodAssignments') as FormArray;
  }

  get isFormValid(): boolean {
    return this.scheduleConfigService.isFormValid(this.scheduleForm);
  }

  // Event handlers - delegate to service
  onPeriodsPerDayChange(): void {
    const newPeriodsPerDay = this.scheduleForm.get('periodsPerDay')?.value || 6;
    this.scheduleConfigService.adjustPeriodsCount(this.periodAssignments, newPeriodsPerDay);
  }

  addAssignment(periodControl: any): void {
    this.scheduleConfigService.addAssignmentToPeriod(periodControl);
  }

  removeAssignment(periodControl: any, assignmentIndex: number): void {
    this.scheduleConfigService.removeAssignmentFromPeriod(periodControl, assignmentIndex);
  }

  getCombinedAssignmentValue(assignmentControl: any): string | null {
    return this.scheduleConfigService.getCombinedAssignmentValue(assignmentControl);
  }

  onAssignmentChange(assignmentControl: any, value: string | null): void {
    this.scheduleConfigService.onAssignmentChange(assignmentControl, value);
  }

  isTeachingDaySelected(assignmentControl: any, day: string): boolean {
    return this.scheduleConfigService.isTeachingDaySelected(assignmentControl, day);
  }

  toggleTeachingDay(assignmentControl: any, day: string): void {
    this.scheduleConfigService.toggleTeachingDay(assignmentControl, day);
  }

  getAssignments(periodControl: any): FormArray {
    return this.scheduleConfigService.getPeriodAssignments(periodControl);
  }

  getValidationIcon(periodControl: any): string {
    return this.scheduleConfigService.getValidationIcon(periodControl);
  }

  getValidationIconColor(periodControl: any): string {
    return this.scheduleConfigService.getValidationIconColor(periodControl);
  }

  getValidationSummary(): string {
    return this.scheduleConfigService.getValidationSummary(this.scheduleForm);
  }

  getSaveTooltip(): string {
    return this.scheduleConfigService.getSaveTooltip(this.scheduleForm);
  }

  // Dialog actions
  save(): void {
    if (!this.isFormValid) {
      this.scheduleForm.markAllAsTouched();
      this.snackBar.open('Please complete required fields and fix validation errors', 'Close', { duration: 3000 });
      return;
    }
  
    // Use the actual available method signature
    const title = this.scheduleForm.get('schoolYear')?.value + ' Master Schedule' || '2024-2025 Master Schedule';
    const startDate = this.scheduleForm.get('startDate')?.value || new Date();
    const endDate = this.scheduleForm.get('endDate')?.value || new Date();
    const teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; // Default
  
    // FIXED: Use actual method name and signature
    this.schedulePersistenceService.createNewMasterSchedule(title, startDate, endDate, teachingDays).subscribe({
      next: (result: any) => {
        this.snackBar.open('Schedule configuration saved successfully', 'Close', { duration: 3000 });
        
        // Generate master schedule immediately after save  
        this.schedulePersistenceService.generateAndSetMasterSchedule().subscribe({
          next: () => {
            this.snackBar.open('Master schedule generated', 'Close', { duration: 3000 });
            this.dialogRef.close({ saved: true, generated: true, configuration: result });
          },
          error: (error: any) => {
            console.error('Failed to generate master schedule:', error);
            this.snackBar.open('Configuration saved, but schedule generation failed', 'Close', { duration: 5000 });
            this.dialogRef.close({ saved: true, generated: false, configuration: result });
          }
        });
      },
      error: (error: any) => {
        console.error('[ScheduleConfig] Save failed:', error);
        this.snackBar.open('Failed to save configuration. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}