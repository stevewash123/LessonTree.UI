// RESPONSIBILITY: Provides UI for adding and editing special days with validation and proper data handling.
// DOES NOT: Handle lesson shifting logic or schedule state management - delegates to calling service.
// CALLED BY: ScheduleDayService for special day creation and modification operations.
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { format } from 'date-fns';

export interface SpecialDayModalData {
  date: Date;
  mode: 'add' | 'edit';
  existingSpecialDay?: {
    id: number;
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
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './special-day-modal.component.html',
  styleUrls: ['./special-day-modal.component.css']
})
export class SpecialDayModalComponent implements OnInit {
  specialDayForm: FormGroup;
  isSubmitting = false;
  private userHasEditedTitle = false; // Track if user manually edited title

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  constructor(
    private dialogRef: MatDialogRef<SpecialDayModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SpecialDayModalData,
    private fb: FormBuilder
  ) {
    // Initialize form with validation
    this.specialDayForm = this.fb.group({
      date: [this.data.date, Validators.required],
      specialCode: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]]
    });

    // If editing, populate form with existing data
    if (this.isEditMode && this.data.existingSpecialDay) {
      this.populateFormFromExisting();
    } else {
      // Set default values for new special day
      this.setDefaultValues();
    }
  }

  ngOnInit(): void {
    console.log('[SpecialDayModal] Component initialized', {
      mode: this.data.mode,
      date: format(this.data.date, 'yyyy-MM-dd'),
      hasExistingData: !!this.data.existingSpecialDay,
      timestamp: new Date().toISOString()
    });

    // Set up reactive title defaulting (only for add mode)
    if (!this.isEditMode) {
      this.setupTitleDefaulting();
    }
  }

  private populateFormFromExisting(): void {
    const existing = this.data.existingSpecialDay!;
    
    this.specialDayForm.patchValue({
      date: new Date(existing.date),
      specialCode: existing.specialCode,
      title: this.extractTitleFromComment(existing.specialCode, existing.title),
      description: existing.description || ''
    });

    console.log('[SpecialDayModal] Form populated from existing special day', {
      specialCode: existing.specialCode,
      title: existing.title,
      timestamp: new Date().toISOString()
    });
  }

  private setDefaultValues(): void {
    // Set intelligent defaults based on common use cases
    this.specialDayForm.patchValue({
      specialCode: 'Other', // Most common non-teaching day type
      title: this.getDefaultTitleForType('Special Day'),
      description: ''
    });
  }

  private setupTitleDefaulting(): void {
    // Track when user manually edits the title
    this.specialDayForm.get('title')?.valueChanges.subscribe((newTitle) => {
      const currentSpecialCode = this.specialDayForm.get('specialCode')?.value;
      const expectedDefault = this.getDefaultTitleForType(currentSpecialCode);
      
      // If user typed something different from the default, mark as manually edited
      if (newTitle !== expectedDefault && newTitle !== '') {
        this.userHasEditedTitle = true;
      }
    });

    // Auto-update title when special code changes (only if user hasn't manually edited)
    this.specialDayForm.get('specialCode')?.valueChanges.subscribe((newSpecialCode) => {
      if (!this.userHasEditedTitle) {
        const defaultTitle = this.getDefaultTitleForType(newSpecialCode);
        this.specialDayForm.get('title')?.setValue(defaultTitle, { emitEvent: false });
      }
    });
  }

  private getDefaultTitleForType(specialCode: string): string {
    const defaults: { [key: string]: string } = {
      'Professional Development': 'Professional Development',
      'School Holiday': 'School Holiday',
      'Assembly': 'School Assembly',
      'Testing Day': 'Standardized Testing',
      'Field Trip': 'Field Trip',
      'Weather Day': 'Weather Closure',
      'Other': 'Special Day'
    };
    return defaults[specialCode] || 'Special Day';
  }

  private extractTitleFromComment(specialCode: string, originalTitle: string): string {
    // Handle cases where title might include the special code
    // e.g., "Non-Teaching Day: All School Assembly" -> "All School Assembly"
    if (originalTitle.startsWith(specialCode + ':')) {
      return originalTitle.substring((specialCode + ':').length).trim();
    }
    return originalTitle;
  }

  private buildFullTitle(specialCode: string, title: string): string {
    // Build the full title that will be displayed in the calendar
    return title ? `${specialCode}: ${title}` : specialCode;
  }

  save(): void {
    if (this.specialDayForm.invalid) {
      this.specialDayForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.specialDayForm.value;

    const result: SpecialDayResult = {
      action: 'save',
      data: {
        date: formValue.date,
        specialCode: formValue.specialCode,
        title: formValue.title,
        description: formValue.description || undefined
      }
    };

    console.log('[SpecialDayModal] Saving special day', {
      action: result.action,
      specialCode: result.data?.specialCode,
      title: result.data?.title,
      date: result.data?.date ? format(result.data.date, 'yyyy-MM-dd') : null,
      isEditMode: this.isEditMode,
      timestamp: new Date().toISOString()
    });

    // Simulate brief loading state for better UX
    setTimeout(() => {~
      this.dialogRef.close(result);
    }, 100);
  }

  delete(): void {
    if (!this.isEditMode) {
      console.warn('[SpecialDayModal] Delete called but not in edit mode');
      return;
    }

    this.isSubmitting = true;

    const result: SpecialDayResult = {
      action: 'delete'
    };

    console.log('[SpecialDayModal] Deleting special day', {
      action: result.action,
      existingId: this.data.existingSpecialDay?.id,
      timestamp: new Date().toISOString()
    });

    // Simulate brief loading state for better UX
    setTimeout(() => {
      this.dialogRef.close(result);
    }, 100);
  }

  cancel(): void {
    console.log('[SpecialDayModal] Modal cancelled', {
      mode: this.data.mode,
      timestamp: new Date().toISOString()
    });
    this.dialogRef.close();
  }

  // Helper method for template to get special code display name
  getSpecialCodeDisplayName(code: string): string {
    const displayNames: { [key: string]: string } = {
      'Instructor PT': 'Instructor Professional Development',
      'School Holiday': 'School Holiday',
      'Assembly': 'School Assembly',
      'Testing Day': 'Testing Day',
      'Field Trip': 'Field Trip',
      'Weather Day': 'Weather Closure',
      'Other': 'Other'
    };
    return displayNames[code] || code;
  }
}