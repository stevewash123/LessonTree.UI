// **COMPLETE FILE** - Replace schedule-config.service.ts
// RESPONSIBILITY: Schedule configuration form logic, validation, and triggering schedule regeneration
// DOES NOT: Handle UI concerns or dialog management
// CALLED BY: ScheduleConfigComponent

import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors  } from '@angular/forms';
import { Observable, tap, map, switchMap } from 'rxjs';
import {PeriodManagementService} from './period-management.service';
import {ScheduleConfigurationApiService} from './schedule-config-api.service';
import {ScheduleConfigurationStateService} from '../calendar/services/state/schedule-configuration-state.service';
import {
  ScheduleConfigUpdateResource,
  ScheduleConfigurationCreateResource,
  SchedulePeriodAssignment
} from '../models/schedule-configuration.model';



/**
 * Custom validator for reasonable date ranges
 */
export function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;

  const date = control.value;
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { invalidDate: { message: 'Invalid date format' } };
  }

  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return { invalidDateRange: { message: `Year ${year} is not valid. Use 1900-2100.` } };
  }

  return null;
}

/**
 * Custom validator to ensure end date is after start date
 */
export function endDateAfterStartValidator(startDateControlName: string) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent || !control.value) return null;

    const startDate = control.parent.get(startDateControlName)?.value;
    const endDate = control.value;

    if (startDate && endDate && startDate instanceof Date && endDate instanceof Date) {
      if (endDate <= startDate) {
        return { endDateBeforeStart: { message: 'End date must be after start date' } };
      }
    }

    return null;
  };
}
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

  readonly specialPeriodOptions = [
    { value: 'Lunch', label: 'Lunch' },
    { value: 'Hall Duty', label: 'Hall Duty' },
    { value: 'Cafeteria Duty', label: 'Cafeteria Duty' },
    { value: 'StudyHall', label: 'Study Hall' },
    { value: 'Prep', label: 'Prep' },
    { value: 'Other Duty', label: 'Other Duty' }
  ];

  constructor(
    private fb: FormBuilder,
    private periodMgmt: PeriodManagementService,
    private scheduleConfigApi: ScheduleConfigurationApiService,
    private scheduleConfigStateService: ScheduleConfigurationStateService
  ) {}

  /**
   * Create the main schedule form
   */
  createScheduleForm(): FormGroup {
    return this.fb.group({
      schoolYear: ['2024-2025', Validators.required],
      periodsPerDay: [6, [Validators.required, Validators.min(1), Validators.max(10)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      teachingDays: [this.periodMgmt.getTeachingDaysArray(this.periodMgmt.defaultTeachingDays), Validators.required], // NEW: Config-level teaching days
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
        endDate: existingConfig.endDate || null,
        teachingDays: existingConfig.teachingDays || this.periodMgmt.getTeachingDaysArray(this.periodMgmt.defaultTeachingDays) // NEW: Load config-level teaching days
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
   * Get validation icon for period
   */
  getValidationIcon(periodControl: any): string {
    const globalTeachingDays = this.currentFormRef?.get('teachingDays')?.value || [];
    return this.periodMgmt.getPeriodValidationIcon(periodControl, globalTeachingDays);
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
    const globalTeachingDays = form.get('teachingDays')?.value || [];

    // Validate that at least one global teaching day is selected
    if (globalTeachingDays.length === 0) {
      return false;
    }

    const periodValidation = this.periodMgmt.validatePeriodAssignments(periodAssignments, globalTeachingDays);
    return basicFormValid && periodValidation.isValid;
  }

  /**
   * Get validation summary text
   */
  getValidationSummary(form: FormGroup): string {
    const globalTeachingDays = form.get('teachingDays')?.value || [];

    // Check global teaching days first
    if (globalTeachingDays.length === 0) {
      return 'Select at least one teaching day';
    }

    if (!form.valid) {
      return 'Complete required schedule fields';
    }

    const periodAssignments = form.get('periodAssignments') as FormArray;
    const validation = this.periodMgmt.validatePeriodAssignments(periodAssignments, globalTeachingDays);

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
    const globalTeachingDays = form.get('teachingDays')?.value || [];

    if (globalTeachingDays.length === 0) {
      return 'Select at least one teaching day';
    }

    if (!form.valid) return 'Complete required fields';

    const periodAssignments = form.get('periodAssignments') as FormArray;
    const validation = this.periodMgmt.validatePeriodAssignments(periodAssignments, globalTeachingDays);
    if (!validation.isValid) return 'Fix period assignment issues';

    return '';
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

  /**
   * Save schedule configuration and trigger schedule regeneration
   * This is the complete save workflow: Configuration → Schedule Generation → Schedule Save
   */
  save(form: FormGroup): Observable<{ success: boolean; configurationId: number; configuration: any }> {
    if (!this.isFormValid(form)) {
      console.error('[ScheduleConfigService] Cannot save invalid form');
      throw new Error('Form validation failed');
    }

    console.log('[ScheduleConfigService] Starting simplified save workflow');

    // Convert form data to API format
    const formData = this.convertToApiFormat(form);

    // Create period assignments in API format
    const periodAssignments: SchedulePeriodAssignment[] = formData.periodAssignments.map((pa: any) => ({
      period: pa.period,
      courseId: pa.courseId,
      specialPeriodType: pa.specialPeriodType,
      room: pa.room || '',
      notes: pa.notes || '',
      teachingDays: pa.teachingDays,
      backgroundColor: pa.backgroundColor || '#2196F3',
      fontColor: pa.fontColor || '#FFFFFF'
    }));

    // Create the configuration resource for API
    const configurationResource: ScheduleConfigurationCreateResource = {
      title: formData.schoolYear,
      schoolYear: formData.schoolYear,
      startDate: formData.startDate,
      endDate: formData.endDate,
      periodsPerDay: formData.periodsPerDay,
      teachingDays: formData.teachingDays,
      isTemplate: false,
      periodAssignments: periodAssignments
    };

    // ✅ SIMPLIFIED: Just save configuration (remove workflow coordination)
    return this.scheduleConfigApi.createConfiguration(configurationResource).pipe(
      tap((savedConfig: any) => {
        console.log('[ScheduleConfigService] Configuration saved successfully:', savedConfig.id);
        this.scheduleConfigStateService.setActiveConfiguration(savedConfig);
        this.scheduleConfigStateService.addConfiguration(savedConfig);
      }),
      map((savedConfig: any) => ({
        success: true,
        configurationId: savedConfig.id,
        configuration: savedConfig
      }))
    );
  }

  /**
   * Update existing schedule configuration and trigger schedule regeneration
   */
  update(configurationId: number, form: FormGroup): Observable<{ success: boolean; configurationId: number; configuration: any }> {
    if (!this.isFormValid(form)) {
      console.error('[ScheduleConfigService] Cannot update invalid form');
      throw new Error('Form validation failed');
    }

    console.log(`[ScheduleConfigService] Starting simplified update workflow for configuration ID ${configurationId}`);

    // Convert form data to API format
    const formData = this.convertToApiFormat(form);

    const periodAssignments: SchedulePeriodAssignment[] = formData.periodAssignments.map((pa: any) => ({
      period: pa.period,
      courseId: pa.courseId,
      specialPeriodType: pa.specialPeriodType,
      room: pa.room || '',
      notes: pa.notes || '',
      teachingDays: pa.teachingDays,
      backgroundColor: pa.backgroundColor || '#2196F3',
      fontColor: pa.fontColor || '#FFFFFF'
    }));

    const configurationResource: ScheduleConfigUpdateResource = {
      id: configurationId,
      title: formData.schoolYear,
      schoolYear: formData.schoolYear,
      startDate: form.get('startDate')?.value,
      endDate: form.get('endDate')?.value,
      periodsPerDay: formData.periodsPerDay,
      teachingDays: formData.teachingDays,
      isActive: true,
      periodAssignments: periodAssignments
    };

    // ✅ SIMPLIFIED: Just update configuration (remove workflow coordination)
    return this.scheduleConfigApi.updateConfiguration(configurationId, configurationResource).pipe(
      tap((updatedConfig: any) => {
        console.log('[ScheduleConfigService] Configuration updated successfully:', updatedConfig.id);
        this.scheduleConfigStateService.setActiveConfiguration(updatedConfig);
      }),
      map((updatedConfig: any) => ({
        success: true,
        configurationId: updatedConfig.id,
        configuration: updatedConfig
      }))
    );
  }

  /**
 * Check if config-level teaching day is selected
 */
  isConfigTeachingDaySelected(form: FormGroup, day: string): boolean {
    const configTeachingDays = form.get('teachingDays')?.value || [];
    return configTeachingDays.includes(day);
  }

  /**
   * Toggle config-level teaching day and update all period assignments
   */
  toggleConfigTeachingDay(form: FormGroup, day: string): void {
    const configTeachingDays = form.get('teachingDays')?.value || [];
    const periodAssignments = form.get('periodAssignments') as FormArray;

    if (configTeachingDays.includes(day)) {
      // Remove day from config-level and all period assignments
      const updatedConfigDays = configTeachingDays.filter((d: string) => d !== day);
      form.patchValue({ teachingDays: updatedConfigDays });

      // Remove this day from all period assignments
      this.removeDayFromAllPeriodAssignments(periodAssignments, day);

      console.log(`[ScheduleConfigService] Removed ${day} from config-level teaching days and all period assignments`);
    } else {
      // Add day to config-level (but don't automatically add to period assignments)
      const updatedConfigDays = [...configTeachingDays, day];
      form.patchValue({ teachingDays: updatedConfigDays });

      console.log(`[ScheduleConfigService] Added ${day} to config-level teaching days`);
    }
  }

  /**
   * Enhanced toggle teaching day - respects config-level constraints
   */
  toggleTeachingDay(assignmentControl: any, day: string): void {
    // Get current form to check config-level teaching days
    const currentForm = this.getCurrentFormReference(); // This will need to be set by component
    if (!currentForm) {
      console.error('[ScheduleConfigService] Cannot toggle teaching day - no form reference');
      return;
    }

    const configTeachingDays = currentForm.get('teachingDays')?.value || [];

    // Only allow toggle if day is enabled at config level
    if (!configTeachingDays.includes(day)) {
      console.log(`[ScheduleConfigService] Cannot toggle ${day} - not enabled in config-level teaching days`);
      return;
    }

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
   * Remove a specific day from all period assignments
   */
  private removeDayFromAllPeriodAssignments(periodAssignments: FormArray, dayToRemove: string): void {
    periodAssignments.controls.forEach(periodControl => {
      const assignmentsArray = this.periodMgmt.getPeriodAssignments(periodControl as FormGroup);

      assignmentsArray.controls.forEach(assignmentControl => {
        const teachingDays = assignmentControl.get('teachingDays')?.value || [];
        const updatedDays = teachingDays.filter((day: string) => day !== dayToRemove);

        if (updatedDays.length !== teachingDays.length) {
          assignmentControl.patchValue({ teachingDays: updatedDays });
        }
      });
    });
  }

  /**
   * Convert form data to API format with config-level teaching days
   */
  convertToApiFormat(form: FormGroup): any {
    const periodAssignments = form.get('periodAssignments') as FormArray;

    return {
      schoolYear: form.get('schoolYear')?.value || '2024-2025',
      periodsPerDay: form.get('periodsPerDay')?.value || 6,
      startDate: form.get('startDate')?.value,
      endDate: form.get('endDate')?.value,
      teachingDays: form.get('teachingDays')?.value || [], // NEW: Include config-level teaching days
      periodAssignments: this.periodMgmt.convertToApiFormat(periodAssignments)
    };
  }

  // Form reference management (needed for enhanced teaching day validation)
  private currentFormRef: FormGroup | null = null;

  setCurrentFormReference(form: FormGroup): void {
    this.currentFormRef = form;
  }

  private getCurrentFormReference(): FormGroup | null {
    return this.currentFormRef;
  }
}
