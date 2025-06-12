// **NEW FILE** - Create as period-color-picker.component.ts
// RESPONSIBILITY: Modal dialog for selecting period colors with presets and live preview
// DOES NOT: Handle period data management (parent component responsibility)
// CALLED BY: UserConfigComponent via MatDialog service

import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface PeriodColorData {
  backgroundColor: string;
  fontColor: string;
  periodNumber: number;
}

export interface PeriodColorResult {
  backgroundColor: string;
  fontColor: string;
}

@Component({
  selector: 'app-period-color-picker',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './period-color-picker.component.html',
  styleUrls: ['./period-color-picker.component.css']
})
export class PeriodColorPickerComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<PeriodColorPickerComponent>);
  
  colorForm: FormGroup;
  
  // Preset color combinations matching the main component defaults
  readonly colorPresets = [
    { backgroundColor: '#2196F3', fontColor: '#FFFFFF', label: '1' }, // Blue
    { backgroundColor: '#4CAF50', fontColor: '#FFFFFF', label: '2' }, // Green
    { backgroundColor: '#FF9800', fontColor: '#FFFFFF', label: '3' }, // Orange
    { backgroundColor: '#9C27B0', fontColor: '#FFFFFF', label: '4' }, // Purple
    { backgroundColor: '#F44336', fontColor: '#FFFFFF', label: '5' }, // Red
    { backgroundColor: '#00BCD4', fontColor: '#FFFFFF', label: '6' }, // Cyan
    { backgroundColor: '#795548', fontColor: '#FFFFFF', label: '7' }, // Brown
    { backgroundColor: '#607D8B', fontColor: '#FFFFFF', label: '8' }, // Blue Grey
    { backgroundColor: '#E91E63', fontColor: '#FFFFFF', label: '9' }, // Pink
    { backgroundColor: '#3F51B5', fontColor: '#FFFFFF', label: '10' }  // Indigo
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: PeriodColorData) {
    this.colorForm = this.fb.group({
      backgroundColor: [data.backgroundColor || '#2196F3', Validators.required],
      fontColor: [data.fontColor || '#FFFFFF', Validators.required]
    });
  }

  applyPreset(preset: { backgroundColor: string; fontColor: string; label: string }): void {
    this.colorForm.patchValue({
      backgroundColor: preset.backgroundColor,
      fontColor: preset.fontColor
    });
  }

  resetToDefault(): void {
    // Reset to the default for this period number
    const defaultPreset = this.colorPresets[(this.data.periodNumber - 1) % this.colorPresets.length];
    this.applyPreset(defaultPreset);
  }

  save(): void {
    if (this.colorForm.valid) {
      const result: PeriodColorResult = {
        backgroundColor: this.colorForm.get('backgroundColor')?.value,
        fontColor: this.colorForm.get('fontColor')?.value
      };
      this.dialogRef.close(result);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  // Get current preview values for template
  get previewBackground(): string {
    return this.colorForm.get('backgroundColor')?.value || '#2196F3';
  }

  get previewFontColor(): string {
    return this.colorForm.get('fontColor')?.value || '#FFFFFF';
  }
}