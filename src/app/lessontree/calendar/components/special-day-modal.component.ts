// RESPONSIBILITY: Provides UI for creating and editing special day events with multi-period selection.
// DOES NOT: Handle business logic, API calls, or data persistence - pure UI component.
// CALLED BY: SpecialDayModalService for special day UI interactions.
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { format } from 'date-fns';

import { UserService } from '../../../core/services/user.service';

export interface SpecialDayModalData {
  date: Date;
  periods?: number[];                    // Optional initial periods
  mode: 'add' | 'edit';
  existingSpecialDay?: {
    id: number;
    periods: number[];                   // Updated to support multiple periods
    specialCode: string;
    title: string;
    description?: string;
    date: Date;
  } | null;
}

export interface SpecialDayResult {
  action: 'save' | 'delete';
  data?: {
    date: Date;
    periods: number[];                   // Updated to array
    specialCode: string;
    title: string;
    description?: string;
  };
}

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
  template: `
    <div class="modal-container">
      <h2>{{ data.mode === 'add' ? 'Add Special Day' : 'Edit Special Day' }}</h2>
      
      <form [formGroup]="specialDayForm">
        <!-- Date -->
        <mat-form-field>
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="datePicker" formControlName="date" [readonly]="data.mode === 'edit'" />
          <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
          <mat-datepicker #datePicker></mat-datepicker>
          @if (specialDayForm.get('date')?.hasError('required')) {
            <mat-error>Date is required</mat-error>
          }
        </mat-form-field>

        <!-- Period Selection -->
        <div class="period-selection">
          <h3>Affected Periods</h3>
          <p class="period-help">Select which periods this special day affects:</p>
          
          <div class="period-checkboxes">
            @for (period of availablePeriods; track period) {
              <mat-checkbox 
                [formControlName]="'period_' + period"
                class="period-checkbox">
                Period {{ period }}
                @if (getPeriodAssignment(period); as assignment) {
                  <span class="period-info">({{ assignment.sectionName || 'No section' }}{{ assignment.room ? ' - ' + assignment.room : '' }})</span>
                }
              </mat-checkbox>
            }
          </div>
          
          @if (noPeriodSelected) {
            <mat-error>Please select at least one period</mat-error>
          }
        </div>

        <!-- Special Code -->
        <mat-form-field>
          <mat-label>Special Code</mat-label>
          <mat-select formControlName="specialCode">
            <mat-option value="Assembly">Assembly</mat-option>
            <mat-option value="Field Trip">Field Trip</mat-option>
            <mat-option value="Testing">Testing</mat-option>
            <mat-option value="Holiday">Holiday</mat-option>
            <mat-option value="Professional Development">Professional Development</mat-option>
            <mat-option value="Early Dismissal">Early Dismissal</mat-option>
            <mat-option value="Weather Delay">Weather Delay</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
          @if (specialDayForm.get('specialCode')?.hasError('required')) {
            <mat-error>Special code is required</mat-error>
          }
        </mat-form-field>

        <!-- Title -->
        <mat-form-field>
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" maxlength="100" />
          @if (specialDayForm.get('title')?.hasError('required')) {
            <mat-error>Title is required</mat-error>
          }
          @if (specialDayForm.get('title')?.hasError('maxlength')) {
            <mat-error>Maximum 100 characters</mat-error>
          }
        </mat-form-field>

        <!-- Description -->
        <mat-form-field>
          <mat-label>Description (Optional)</mat-label>
          <textarea matInput formControlName="description" maxlength="500" rows="3"></textarea>
          @if (specialDayForm.get('description')?.hasError('maxlength')) {
            <mat-error>Maximum 500 characters</mat-error>
          }
        </mat-form-field>

        <!-- Preview -->
        @if (selectedPeriods.length > 0) {
          <div class="preview-section">
            <h4>Preview</h4>
            <p><strong>Date:</strong> {{ formatDate(specialDayForm.get('date')?.value) }}</p>
            <p><strong>Periods:</strong> {{ selectedPeriods.join(', ') }}</p>
            <p><strong>Event:</strong> {{ specialDayForm.get('specialCode')?.value }} - {{ specialDayForm.get('title')?.value }}</p>
          </div>
        }
      </form>

      <!-- Actions -->
      <div class="actions">
        <button mat-button (click)="cancel()">Cancel</button>
        
        @if (data.mode === 'edit') {
          <button mat-button color="warn" (click)="delete()" class="delete-button">
            <mat-icon>delete</mat-icon>
            Delete
          </button>
        }
        
        <button 
          mat-raised-button 
          color="primary" 
          (click)="save()" 
          [disabled]="specialDayForm.invalid || noPeriodSelected">
          {{ data.mode === 'add' ? 'Create' : 'Update' }} Special Day
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      padding: 24px;
      min-width: 500px;
      max-width: 600px;
    }

    h2 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 500;
    }

    h3 {
      margin: 20px 0 12px 0;
      font-size: 16px;
      font-weight: 500;
    }

    h4 {
      margin: 16px 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .period-selection {
      margin-bottom: 20px;
    }

    .period-help {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #666;
    }

    .period-checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 8px;
    }

    .period-checkbox {
      display: flex;
      align-items: center;
    }

    .period-info {
      font-size: 12px;
      color: #666;
      margin-left: 4px;
    }

    .preview-section {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .preview-section p {
      margin: 4px 0;
      font-size: 14px;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .delete-button {
      margin-right: auto;
    }

    mat-error {
      font-size: 12px;
      margin-top: 4px;
    }
  `]
})
export class SpecialDayModalComponent implements OnInit {
  specialDayForm: FormGroup;
  availablePeriods: number[] = [];

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
    private userService: UserService
  ) {
    // Initialize available periods from user config
    const teachingConfig = this.userService.getTeachingConfig();
    if (teachingConfig) {
      this.availablePeriods = Array.from({ length: teachingConfig.periodsPerDay }, (_, i) => i + 1);
    } else {
      this.availablePeriods = [1, 2, 3, 4, 5]; // Default fallback
    }

    // Build form with dynamic period checkboxes
    const formConfig: any = {
      date: [data.date, Validators.required],
      specialCode: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)]
    };

    // Add period checkboxes
    this.availablePeriods.forEach(period => {
      formConfig[`period_${period}`] = [false];
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

  getPeriodAssignment(period: number): any {
    const teachingConfig = this.userService.getTeachingConfig();
    return teachingConfig?.periodAssignments.find(assignment => assignment.period === period) || null;
  }

  formatDate(date: Date): string {
    return date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : '';
  }

  save(): void {
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
      this.specialDayForm.markAllAsTouched();
    }
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