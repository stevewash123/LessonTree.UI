// **COMPLETE FILE** - Replace schedule-config.component.ts  
// RESPONSIBILITY: Schedule configuration UI controller
// DOES NOT: Handle business logic (delegated to ScheduleConfigService)
// CALLED BY: Home component via dialog service

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CourseDataService } from '../../core/services/course-data.service';
import { PeriodManagementService } from '../../core/services/period-management.service';
import { ScheduleConfigService } from './schedule-config.service';
import { ScheduleConfigurationApiService } from './schedule-config-api.service';
import { Course } from '../../models/course';
import { ScheduleConfiguration } from '../../models/schedule-configuration.model';
import { catchError, of } from 'rxjs';
import { PeriodColorData, PeriodColorPickerComponent, PeriodColorResult } from './period-color-picker.component';

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
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './schedule-config.component.html',
  styleUrls: ['./schedule-config.component.css']
})
export class ScheduleConfigComponent implements OnInit {
  
  scheduleForm: FormGroup;
  availableCourses: Course[] = [];
  isLoading = false;
  isSaving = false;
  existingConfiguration: ScheduleConfiguration | null = null;
  isUpdateMode = false;

  constructor(
    private dialogRef: MatDialogRef<ScheduleConfigComponent>,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private courseDataService: CourseDataService,
    private scheduleConfigApi: ScheduleConfigurationApiService,
    public periodMgmt: PeriodManagementService,  // public for template
    public scheduleConfigService: ScheduleConfigService  // public for template
  ) {
    this.scheduleForm = this.scheduleConfigService.createScheduleForm();
  }

  ngOnInit(): void {
    console.log('[ScheduleConfig] Component initializing');
    this.loadCourses();
    this.loadActiveConfiguration();
    
    // NEW: Set form reference for service to use in validation
    this.scheduleConfigService.setCurrentFormReference(this.scheduleForm);
  }

  private loadCourses(): void {
    this.availableCourses = this.courseDataService.getCourses();
    console.log('[ScheduleConfig] Loaded courses:', this.availableCourses.length);
  }

  private loadActiveConfiguration(): void {
    this.isLoading = true;
    console.log('[ScheduleConfig] Loading active schedule configuration');
    
    this.scheduleConfigApi.getActiveConfiguration().pipe(
      catchError((error) => {
        console.log('[ScheduleConfig] No active configuration found, creating new one');
        // If no active configuration exists, that's fine - we'll create a new one
        return of(null);
      })
    ).subscribe({
      next: (activeConfig) => {
        this.isLoading = false;
        
        if (activeConfig) {
          console.log('[ScheduleConfig] Loading from existing active configuration:', activeConfig.id);
          this.existingConfiguration = activeConfig;
          this.isUpdateMode = true;
          this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, activeConfig);
        } else {
          console.log('[ScheduleConfig] No existing configuration, using defaults');
          this.isUpdateMode = false;
          this.loadDefaultConfiguration();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('[ScheduleConfig] Failed to load configuration:', error);
        this.snackBar.open('Failed to load configuration. Using defaults.', 'Close', { duration: 3000 });
        this.loadDefaultConfiguration();
      }
    });
  }

  private loadDefaultConfiguration(): void {
    const defaultConfig = {
      schoolYear: '2024-2025',
      periodsPerDay: 6,
      startDate: null,
      endDate: null,
      periodAssignments: []
    };
    
    this.scheduleConfigService.loadConfigurationIntoForm(this.scheduleForm, defaultConfig);
  }

  // Getters for template
  get periodAssignments(): FormArray {
    return this.scheduleForm.get('periodAssignments') as FormArray;
  }

  get isFormValid(): boolean {
    return this.scheduleConfigService.isFormValid(this.scheduleForm);
  }

  get saveButtonText(): string {
    if (this.isSaving) {
      return this.isUpdateMode ? 'Updating...' : 'Saving...';
    }
    return this.isUpdateMode ? 'Update Configuration' : 'Save Configuration';
  }

  get dialogTitle(): string {
    return this.isUpdateMode ? 'Update Schedule Configuration' : 'Create Schedule Configuration';
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

    this.isSaving = true;
    console.log(`[ScheduleConfig] Starting ${this.isUpdateMode ? 'update' : 'create'} workflow`);

    // Choose create or update based on whether we have an existing configuration
    const saveOperation = this.isUpdateMode && this.existingConfiguration
      ? this.scheduleConfigService.update(this.existingConfiguration.id, this.scheduleForm)
      : this.scheduleConfigService.save(this.scheduleForm);

    saveOperation.subscribe({
      next: (result) => {
        this.isSaving = false;
        const action = this.isUpdateMode ? 'updated' : 'created';
        const message = `Schedule configuration ${action} and schedule regenerated successfully`;
        
        console.log(`[ScheduleConfig] ${action} workflow completed successfully:`, result.configurationId);
        this.snackBar.open(message, 'Close', { duration: 4000 });
        this.dialogRef.close({ 
          saved: true, 
          configurationId: result.configurationId,
          isUpdate: this.isUpdateMode 
        });
      },
      error: (error: any) => {
        this.isSaving = false;
        const action = this.isUpdateMode ? 'update' : 'save';
        
        console.error(`[ScheduleConfig] ${action} workflow failed:`, error);
        
        // Provide more specific error messaging
        let errorMessage = `Failed to ${action} configuration. `;
        if (error.message?.includes('Configuration')) {
          errorMessage += 'Configuration validation failed.';
        } else if (error.message?.includes('Schedule')) {
          errorMessage += 'Schedule generation failed.';
        } else {
          errorMessage += 'Please try again.';
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  // Helper methods for template
  canSave(): boolean {
    return this.isFormValid && !this.isSaving && !this.isLoading;
  }

  getLoadingMessage(): string {
    if (this.isLoading) return 'Loading configuration...';
    if (this.isSaving) return this.isUpdateMode ? 'Updating configuration and regenerating schedule...' : 'Saving configuration and generating schedule...';
    return '';
  }

/**
 * Check if config-level teaching day is selected
 */
isConfigTeachingDaySelected(day: string): boolean {
  return this.scheduleConfigService.isConfigTeachingDaySelected(this.scheduleForm, day);
}

/**
 * Toggle config-level teaching day and update all period assignments
 */
toggleConfigTeachingDay(day: string): void {
  this.scheduleConfigService.toggleConfigTeachingDay(this.scheduleForm, day);
}

/**
 * Enhanced toggle teaching day that respects config-level constraints
 */
toggleTeachingDay(assignmentControl: any, day: string): void {
    // Check if day is enabled at config level before allowing toggle
    if (!this.isConfigTeachingDaySelected(day)) {
      console.log(`[ScheduleConfig] Cannot select ${day} - not enabled in config-level teaching days`);
      return;
    }
    
    this.scheduleConfigService.toggleTeachingDay(assignmentControl, day);
  }

/**
 * Check if teaching day checkbox should be disabled for period assignments
 */
isTeachingDayDisabled(day: string): boolean {
  return !this.isConfigTeachingDaySelected(day);
}


/**
 * Open color picker for assignment
 */
openColorPicker(assignmentControl: any): void {
    const currentBackgroundColor = assignmentControl.get('backgroundColor')?.value || '#2196F3';
    const currentFontColor = assignmentControl.get('fontColor')?.value || '#FFFFFF';
    
    // Get period number from parent control
    const periodControl = this.findPeriodControlForAssignment(assignmentControl);
    const periodNumber = periodControl?.get('period')?.value || 1;
    
    const dialogData: PeriodColorData = {
      backgroundColor: currentBackgroundColor,
      fontColor: currentFontColor,
      periodNumber: periodNumber
    };
    
    const dialogRef = this.dialog.open(PeriodColorPickerComponent, {
      width: '500px',
      data: dialogData,
      disableClose: false
    });
    
    dialogRef.afterClosed().subscribe((result: PeriodColorResult | undefined) => {
      if (result) {
        assignmentControl.patchValue({
          backgroundColor: result.backgroundColor,
          fontColor: result.fontColor
        });
        console.log(`[ScheduleConfig] Updated colors for assignment:`, result);
      }
    });
  }
  
  /**
   * Find the period control that contains the given assignment control
   */
  private findPeriodControlForAssignment(assignmentControl: any): any {
    // Walk up the form structure to find the period control
    for (let i = 0; i < this.periodAssignments.length; i++) {
      const periodControl = this.periodAssignments.at(i);
      const assignments = this.getAssignments(periodControl);
      
      for (let j = 0; j < assignments.length; j++) {
        if (assignments.at(j) === assignmentControl) {
          return periodControl;
        }
      }
    }
    return null;
  }

}