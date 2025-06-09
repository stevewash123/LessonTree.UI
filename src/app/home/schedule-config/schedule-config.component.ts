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
  private dialogRef = inject(MatDialogRef<ScheduleConfigComponent>);
  private snackBar = inject(MatSnackBar);
  private courseDataService = inject(CourseDataService);
  private userService = inject(UserService);
  
  public periodMgmt = inject(PeriodManagementService);
  public scheduleConfigService = inject(ScheduleConfigService);

  scheduleForm: FormGroup;
  availableCourses: Course[] = [];

  constructor() {
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
    const existingConfig = this.userService.getUserConfiguration();
    this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, existingConfig);
  }

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

    const configurationUpdate = this.scheduleConfigService.convertToApiFormat(this.scheduleForm);

    this.userService.updateUserConfiguration(configurationUpdate).subscribe({
      next: (result) => {
        this.snackBar.open('Schedule configuration saved successfully', 'Close', { duration: 3000 });
        this.dialogRef.close({ saved: true, configuration: result });
      },
      error: (error) => {
        console.error('[ScheduleConfig] Save failed:', error);
        this.snackBar.open('Failed to save configuration. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}