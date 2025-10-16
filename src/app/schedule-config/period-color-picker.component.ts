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
  
  // Enhanced pastel color combinations matching the main component defaults
  readonly colorPresets = [
    { backgroundColor: '#DCEDC8', fontColor: '#33691E', label: '1' }, // Medium Light Green
    { backgroundColor: '#BBDEFB', fontColor: '#0D47A1', label: '2' }, // Medium Light Blue
    { backgroundColor: '#FFCC80', fontColor: '#BF360C', label: '3' }, // Medium Light Orange
    { backgroundColor: '#CE93D8', fontColor: '#4A148C', label: '4' }, // Medium Light Purple
    { backgroundColor: '#F8BBD0', fontColor: '#880E4F', label: '5' }, // Medium Light Pink
    { backgroundColor: '#80CBC4', fontColor: '#004D40', label: '6' }, // Medium Light Teal
    { backgroundColor: '#AED581', fontColor: '#33691E', label: '7' }, // Medium Light Lime
    { backgroundColor: '#FFD54F', fontColor: '#E65100', label: '8' }, // Medium Light Amber
    { backgroundColor: '#FFCDD2', fontColor: '#B71C1C', label: '9' }, // Light Red
    { backgroundColor: '#D1C4E9', fontColor: '#4A148C', label: '10' }  // Light Purple
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