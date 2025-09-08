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
    private scheduleConfigurationStateService: ScheduleConfigurationStateService
  ) {
    // **FIXED: Get periods from ScheduleConfiguration instead of UserConfiguration**
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    if (activeConfig) {
      this.availablePeriods = Array.from({ length: activeConfig.periodsPerDay }, (_, i) => i + 1);
    } else {
      this.availablePeriods = [1, 2, 3, 4, 5, 6]; // Default fallback
    }

    // Build form with dynamic period checkboxes
    const formConfig: any = {
      date: [data.date, Validators.required],
      specialCode: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)]
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

  ngOnInit(): void {
    console.log('[SpecialDayModal] Component initialized', {
      mode: this.data.mode,
      date: format(this.data.date, 'yyyy-MM-dd'),
      availablePeriods: this.availablePeriods,
      hasExisting: !!this.data.existingSpecialDay,
      timestamp: new Date().toISOString()
    });
  }

  private populateFormFromExisting(existing: any): void {
    this.specialDayForm.patchValue({
      date: new Date(existing.date),
      specialCode: existing.specialCode,
      title: existing.title,
      description: existing.description || ''
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
      title: existing.title
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
          date: formValue.date,
          periods: this.selectedPeriods,
          specialCode: formValue.specialCode,
          title: formValue.title,
          description: formValue.description || undefined
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

  cancel(): void {
    console.log('[SpecialDayModal] Modal cancelled', {
      timestamp: new Date().toISOString()
    });
    this.dialogRef.close();
  }
}
