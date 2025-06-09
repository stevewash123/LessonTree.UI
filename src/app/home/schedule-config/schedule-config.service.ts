// **COMPLETE FILE** - New schedule-config.service.ts
// RESPONSIBILITY: Schedule configuration form logic and validation
// DOES NOT: Handle UI concerns or dialog management
// CALLED BY: ScheduleConfigComponent

import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Course } from '../../models/course';
import { PeriodManagementService } from '../../core/services/period-management.service';

export interface ScheduleFormData {
  schoolYear: string;
  periodsPerDay: number;
  startDate: Date | null;
  endDate: Date | null;
  periodAssignments: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleConfigService {
  private fb = inject(FormBuilder);
  private periodMgmt = inject(PeriodManagementService);

  readonly specialPeriodOptions = [
    { value: 'Lunch', label: 'Lunch' },
    { value: 'Hall Duty', label: 'Hall Duty' },
    { value: 'Cafeteria Duty', label: 'Cafeteria Duty' },
    { value: 'Study Hall', label: 'Study Hall' },
    { value: 'Prep', label: 'Prep' },
    { value: 'Other Duty', label: 'Other Duty' }
  ];

  /**
   * Create the main schedule form
   */
  createScheduleForm(): FormGroup {
    return this.fb.group({
      schoolYear: ['2024-2025', Validators.required],
      periodsPerDay: [6, [Validators.required, Validators.min(1), Validators.max(10)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      periodAssignments: this.fb.array([])
    });
  }

  /**
   * Load existing configuration into form
   */
  loadConfigurationIntoForm(form: FormGroup, existingConfig: any): void {
    if (existingConfig) {
      form.patchValue({
        schoolYear: existingConfig.schoolYear || '2024-2025',
        periodsPerDay: existingConfig.periodsPerDay || 6,
        startDate: existingConfig.startDate || null,
        endDate: existingConfig.endDate || null
      });
      
      const periodAssignments = form.get('periodAssignments') as FormArray;
      
      if (existingConfig.periodAssignments && existingConfig.periodAssignments.length > 0) {
        this.periodMgmt.loadExistingPeriods(periodAssignments, existingConfig.periodAssignments);
      } else {
        this.initializePeriods(periodAssignments, existingConfig.periodsPerDay || 6);
      }
    } else {
      this.initializePeriods(form.get('periodAssignments') as FormArray, 6);
    }
  }

  /**
   * Initialize periods with defaults
   */
  initializePeriods(periodAssignments: FormArray, periodsPerDay: number): void {
    this.periodMgmt.initializePeriods(periodAssignments, periodsPerDay);
  }

  /**
   * Handle periods per day change
   */
  adjustPeriodsCount(periodAssignments: FormArray, newPeriodsPerDay: number): void {
    this.periodMgmt.adjustPeriodsCount(periodAssignments, newPeriodsPerDay);
  }

  /**
   * Get combined assignment value for select dropdown
   */
  getCombinedAssignmentValue(assignmentControl: any): string | null {
    const courseId = assignmentControl.get('courseId')?.value;
    const specialPeriodType = assignmentControl.get('specialPeriodType')?.value;
    
    if (courseId) {
      return `course:${courseId}`;
    } else if (specialPeriodType) {
      return `duty:${specialPeriodType}`;
    }
    return null;
  }

  /**
   * Handle assignment change from dropdown
   */
  onAssignmentChange(assignmentControl: any, value: string | null): void {
    if (!value) {
      assignmentControl.patchValue({
        courseId: null,
        specialPeriodType: null
      });
    } else if (value.startsWith('course:')) {
      const courseId = parseInt(value.substring(7));
      assignmentControl.patchValue({
        courseId: courseId,
        specialPeriodType: null
      });
    } else if (value.startsWith('duty:')) {
      const dutyType = value.substring(5);
      assignmentControl.patchValue({
        courseId: null,
        specialPeriodType: dutyType
      });
    }
  }

  /**
   * Check if teaching day is selected
   */
  isTeachingDaySelected(assignmentControl: any, day: string): boolean {
    const teachingDays = assignmentControl.get('teachingDays')?.value || [];
    return teachingDays.includes(day);
  }

  /**
   * Toggle teaching day selection
   */
  toggleTeachingDay(assignmentControl: any, day: string): void {
    const teachingDays = assignmentControl.get('teachingDays')?.value || [];
    const index = teachingDays.indexOf(day);
    
    if (index > -1) {
      teachingDays.splice(index, 1);
    } else {
      teachingDays.push(day);
    }
    
    assignmentControl.patchValue({
      teachingDays: [...teachingDays]
    });
  }

  /**
   * Get validation icon for period
   */
  getValidationIcon(periodControl: any): string {
    return this.periodMgmt.getPeriodValidationIcon(periodControl);
  }

  /**
   * Get validation icon color
   */
  getValidationIconColor(periodControl: any): string {
    const icon = this.getValidationIcon(periodControl);
    switch (icon) {
      case 'check_circle': return 'primary';
      case 'warning': return 'warn';
      case 'error': return 'warn';
      default: return '';
    }
  }

  /**
   * Check if entire form is valid
   */
  isFormValid(form: FormGroup): boolean {
    const basicFormValid = form.valid;
    const periodAssignments = form.get('periodAssignments') as FormArray;
    const periodValidation = this.periodMgmt.validatePeriodAssignments(periodAssignments);
    return basicFormValid && periodValidation.isValid;
  }

  /**
   * Get validation summary text
   */
  getValidationSummary(form: FormGroup): string {
    if (!form.valid) {
      return 'Complete required schedule fields';
    }
    
    const periodAssignments = form.get('periodAssignments') as FormArray;
    const validation = this.periodMgmt.validatePeriodAssignments(periodAssignments);
    
    if (validation.isValid) {
      return 'Schedule configuration is valid and ready to save';
    }
    
    const allIssues = [...validation.errors, ...validation.coverageGaps];
    if (allIssues.length <= 2) {
      return allIssues.join(', ');
    }
    
    return `${allIssues.slice(0, 2).join(', ')} ... and ${allIssues.length - 2} more issues`;
  }

  /**
   * Get save button tooltip
   */
  getSaveTooltip(form: FormGroup): string {
    if (!form.valid) return 'Complete required fields';
    
    const periodAssignments = form.get('periodAssignments') as FormArray;
    const validation = this.periodMgmt.validatePeriodAssignments(periodAssignments);
    if (!validation.isValid) return 'Fix period assignment issues';
    
    return '';
  }

  /**
   * Convert form data to API format
   */
  convertToApiFormat(form: FormGroup): any {
    const periodAssignments = form.get('periodAssignments') as FormArray;
    
    return {
      schoolYear: form.get('schoolYear')?.value || '2024-2025',
      periodsPerDay: form.get('periodsPerDay')?.value || 6,
      periodAssignments: this.periodMgmt.convertToApiFormat(periodAssignments)
    };
  }

  /**
   * Add assignment to period
   */
  addAssignmentToPeriod(periodControl: any): void {
    this.periodMgmt.addAssignmentToPeriod(periodControl);
  }

  /**
   * Remove assignment from period
   */
  removeAssignmentFromPeriod(periodControl: any, assignmentIndex: number): void {
    this.periodMgmt.removeAssignmentFromPeriod(periodControl, assignmentIndex);
  }

  /**
   * Get assignments FormArray from period
   */
  getPeriodAssignments(periodControl: any): FormArray {
    return this.periodMgmt.getPeriodAssignments(periodControl);
  }
}