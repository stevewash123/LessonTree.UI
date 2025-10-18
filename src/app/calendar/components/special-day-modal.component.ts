// **COMPLETE FILE** - special-day-modal.component.ts - Clean version with external files

// RESPONSIBILITY: Provides UI for creating and editing special day events with multi-period selection.
// DOES NOT: Handle business logic, API calls, or data persistence - pure UI component.
// CALLED BY: SpecialDayModalService for special day UI interactions.
import {Component, Inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatIconModule} from '@angular/material/icon';
import {format} from 'date-fns';

import {ScheduleConfigurationStateService} from '../services/state/schedule-configuration-state.service';
import {SpecialDayModalData, SpecialDayResult} from '../../models/specialDay.model';
import {PeriodColorPickerComponent} from '../../schedule-config/period-color-picker.component';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-special-day-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './special-day-modal.component.html',
  styleUrls: ['./special-day-modal.component.css']
})
export class SpecialDayModalComponent implements OnInit {
  specialDayForm: FormGroup;
  availablePeriods: number[] = [];

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get isSubmitting(): boolean {
    // Future: Can be used for loading states
    return false;
  }

  get noPeriodSelected(): boolean {
    return this.selectedPeriods.length === 0;
  }

  get selectedPeriods(): number[] {
    return this.availablePeriods.filter(period =>
      this.specialDayForm.get(`period_${period}`)?.value === true
    );
  }

  constructor(
    private dialogRef: MatDialogRef<SpecialDayModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SpecialDayModalData,
    private fb: FormBuilder,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private dialog: MatDialog
  ) {
    // **ENHANCED: Get periods from ScheduleConfiguration with better error handling**
    this.initializeAvailablePeriods();

    // Build form with dynamic period checkboxes and color fields
    const formConfig: any = {
      date: [data.date, Validators.required],
      specialCode: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      backgroundColor: ['#B3E5E0'], // Default to light teal
      fontColor: ['#004D40'] // Default to dark teal
    };

    // Add period checkboxes - default to true for new special days
    const defaultPeriodValue = data.mode === 'add';
    this.availablePeriods.forEach(period => {
      formConfig[`period_${period}`] = [defaultPeriodValue];
    });

    this.specialDayForm = this.fb.group(formConfig);

    // If editing, populate form with existing data
    if (data.mode === 'edit' && data.existingSpecialDay) {
      this.populateFormFromExisting(data.existingSpecialDay);
    } else if (data.periods) {
      // If specific periods provided, pre-select them
      data.periods.forEach(period => {
        this.specialDayForm.get(`period_${period}`)?.setValue(true);
      });
    }
  }

  private initializeAvailablePeriods(): void {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    console.log('[SpecialDayModal] Initializing periods from config:', {
      hasConfig: !!activeConfig,
      periodsPerDay: activeConfig?.periodsPerDay,
      configId: activeConfig?.id
    });

    if (activeConfig && activeConfig.periodsPerDay > 0) {
      this.availablePeriods = Array.from({ length: activeConfig.periodsPerDay }, (_, i) => i + 1);
    } else {
      // Enhanced fallback - try to detect from existing schedule data or use reasonable default
      console.warn('[SpecialDayModal] No active configuration found, using fallback periods');
      this.availablePeriods = [1, 2, 3, 4, 5, 6, 7, 8]; // Extended default fallback
    }

    console.log('[SpecialDayModal] Available periods initialized:', this.availablePeriods);
  }

  ngOnInit(): void {
    // **DEBUG: Check configuration and periods**
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    console.log('[SpecialDayModal] Component initialized', {
      mode: this.data.mode,
      date: format(this.data.date, 'yyyy-MM-dd'),
      availablePeriods: this.availablePeriods,
      activeConfig: activeConfig,
      periodsPerDay: activeConfig?.periodsPerDay,
      hasExisting: !!this.data.existingSpecialDay,
      timestamp: new Date().toISOString()
    });
  }

  private populateFormFromExisting(existing: any): void {
    this.specialDayForm.patchValue({
      date: new Date(existing.date),
      specialCode: existing.eventType || existing.specialCode, // ✅ FIX: API returns eventType, not specialCode
      title: existing.title,
      description: existing.description || '',
      backgroundColor: existing.backgroundColor || '#B3E5E0', // Default to light teal if not set
      fontColor: existing.fontColor || '#004D40' // Default to dark teal if not set
    });

    // Set period checkboxes
    if (existing.periods) {
      existing.periods.forEach((period: number) => {
        this.specialDayForm.get(`period_${period}`)?.setValue(true);
      });
    }

    console.log('[SpecialDayModal] Form populated from existing data', {
      periods: existing.periods,
      specialCode: existing.specialCode,
      title: existing.title,
      backgroundColor: existing.backgroundColor,
      fontColor: existing.fontColor,
      formValid: this.specialDayForm.valid,
      formErrors: this.getFormErrors(),
      selectedPeriods: this.selectedPeriods.length
    });
  }

  // **UPDATED METHOD** - Get period assignment from ScheduleConfiguration
  getPeriodAssignment(period: number): any {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    return activeConfig?.periodAssignments?.find((assignment: any) => assignment.period === period) || null;
  }

  formatDate(date: Date): string {
    return date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : '';
  }

  save(): void {
    console.log('[SpecialDayModal] Save button clicked', {
      formValid: this.specialDayForm.valid,
      noPeriodSelected: this.noPeriodSelected,
      selectedPeriods: this.selectedPeriods,
      formValue: this.specialDayForm.value,
      timestamp: new Date().toISOString()
    });

    if (this.specialDayForm.valid && !this.noPeriodSelected) {
      const formValue = this.specialDayForm.value;

      const result: SpecialDayResult = {
        action: 'save',
        data: {
          id: this.isEditMode && this.data.existingSpecialDay ? this.data.existingSpecialDay.id : undefined, // ✅ FIX: Include ID for edit mode
          date: formValue.date,
          periods: this.selectedPeriods,
          specialCode: formValue.specialCode,
          title: formValue.title,
          description: formValue.description || undefined,
          backgroundColor: formValue.backgroundColor,
          fontColor: formValue.fontColor
        }
      };

      console.log('[SpecialDayModal] Saving special day', {
        periods: result.data?.periods,
        specialCode: result.data?.specialCode,
        title: result.data?.title,
        timestamp: new Date().toISOString()
      });

      this.dialogRef.close(result);
    } else {
      console.log('[SpecialDayModal] Form validation failed', {
        formErrors: this.getFormErrors(),
        noPeriodSelected: this.noPeriodSelected,
        timestamp: new Date().toISOString()
      });
      this.specialDayForm.markAllAsTouched();
    }
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.specialDayForm.controls).forEach(key => {
      const control = this.specialDayForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  delete(): void {
    console.log('[SpecialDayModal] Deleting special day', {
      mode: this.data.mode,
      timestamp: new Date().toISOString()
    });

    const result: SpecialDayResult = {
      action: 'delete'
    };

    this.dialogRef.close(result);
  }

  // === COLOR PICKER METHODS ===

  /**
   * Open color picker dialog
   */
  openColorPicker(): void {
    const currentBackgroundColor = this.specialDayForm.get('backgroundColor')?.value || '#B3E5E0';
    const currentFontColor = this.specialDayForm.get('fontColor')?.value || '#004D40';

    const dialogRef = this.dialog.open(PeriodColorPickerComponent, {
      data: {
        backgroundColor: currentBackgroundColor,
        fontColor: currentFontColor
      },
      width: '400px',
      panelClass: 'color-picker-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[SpecialDayModal] Color picker result:', result);
        this.specialDayForm.patchValue({
          backgroundColor: result.backgroundColor,
          fontColor: result.fontColor
        });
      }
    });
  }

  /**
   * Get current background color for preview
   */
  get currentBackgroundColor(): string {
    return this.specialDayForm.get('backgroundColor')?.value || '#B3E5E0';
  }

  /**
   * Get current font color for preview
   */
  get currentFontColor(): string {
    return this.specialDayForm.get('fontColor')?.value || '#004D40';
  }

  cancel(): void {
    console.log('[SpecialDayModal] Modal cancelled', {
      timestamp: new Date().toISOString()
    });
    this.dialogRef.close();
  }
}
