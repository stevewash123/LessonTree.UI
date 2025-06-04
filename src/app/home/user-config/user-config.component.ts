// **COMPLETE FILE** - Can directly replace existing user-config.component.ts
// RESPONSIBILITY: Modal dialog for user configuration including teaching schedule with course assignments
// DOES NOT: Handle complex multi-course setups (use full page for that)
// CALLED BY: Header/profile components via dialog service

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseDataService } from '../../core/services/course-data.service';
import { Course } from '../../models/course';
import { TeachingConfigUpdate } from '../../models/user';

@Component({
  selector: 'app-user-config',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './user-config.component.html',
  styleUrls: ['./user-config.component.css']
})
export class UserConfigComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<UserConfigComponent>);
  private snackBar = inject(MatSnackBar);
  private courseDataService = inject(CourseDataService);

  profileForm: FormGroup;
  teachingForm: FormGroup;
  availableCourses: Course[] = [];

  // Period options 1-10
  readonly periodOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} Period${i === 0 ? '' : 's'}`
  }));

  // Predefined style sets for periods 1-10
  readonly defaultStyleSets = [
    { backgroundColor: '#2196F3', fontColor: '#FFFFFF' }, // Blue
    { backgroundColor: '#4CAF50', fontColor: '#FFFFFF' }, // Green
    { backgroundColor: '#FF9800', fontColor: '#FFFFFF' }, // Orange
    { backgroundColor: '#9C27B0', fontColor: '#FFFFFF' }, // Purple
    { backgroundColor: '#F44336', fontColor: '#FFFFFF' }, // Red
    { backgroundColor: '#00BCD4', fontColor: '#FFFFFF' }, // Cyan
    { backgroundColor: '#795548', fontColor: '#FFFFFF' }, // Brown
    { backgroundColor: '#607D8B', fontColor: '#FFFFFF' }, // Blue Grey
    { backgroundColor: '#E91E63', fontColor: '#FFFFFF' }, // Pink
    { backgroundColor: '#3F51B5', fontColor: '#FFFFFF' }  // Indigo
  ];

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['']
    });

    this.teachingForm = this.fb.group({
      schoolYear: ['2024-2025', Validators.required],
      periodsPerDay: [6, [Validators.required, Validators.min(1), Validators.max(10)]],
      periodAssignments: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Load available courses for selection
    this.availableCourses = this.courseDataService.getCourses();
    console.log('[UserConfig] Loaded courses for period assignment:', this.availableCourses.length);
    
    this.initializePeriods();
  }

  get periodAssignments(): FormArray {
    return this.teachingForm.get('periodAssignments') as FormArray;
  }

  private initializePeriods(): void {
    const periodsPerDay = this.teachingForm.get('periodsPerDay')?.value || 6;
    
    // Clear existing periods
    while (this.periodAssignments.length !== 0) {
      this.periodAssignments.removeAt(0);
    }

    // Add period forms with default style assignments
    for (let i = 1; i <= periodsPerDay; i++) {
      this.periodAssignments.push(this.createPeriodForm(i, true));
    }

    console.log(`[UserConfig] Initialized ${periodsPerDay} periods with default color styles`);
  }

  private createPeriodForm(period: number, useDefaultStyle: boolean = true): FormGroup {
    // Get default style for this period (cycling through available styles)
    const defaultStyle = useDefaultStyle && this.defaultStyleSets.length > 0
      ? this.defaultStyleSets[(period - 1) % this.defaultStyleSets.length]
      : { backgroundColor: '#2196F3', fontColor: '#FFFFFF' };

    return this.fb.group({
      period: [period],
      courseId: [null], // Course selection
      room: [''], // Room assignment
      backgroundColor: [defaultStyle.backgroundColor],
      fontColor: [defaultStyle.fontColor]
    });
  }

  onPeriodsPerDayChange(): void {
    this.initializePeriods();
  }

  addPeriod(): void {
    const currentPeriods = this.periodAssignments.length;
    this.periodAssignments.push(this.createPeriodForm(currentPeriods + 1, true));
    this.teachingForm.patchValue({ periodsPerDay: currentPeriods + 1 });
  }

  removePeriod(index: number): void {
    if (this.periodAssignments.length > 1) {
      this.periodAssignments.removeAt(index);
      this.teachingForm.patchValue({ periodsPerDay: this.periodAssignments.length });
      this.reorderPeriods();
    }
  }

  private reorderPeriods(): void {
    this.periodAssignments.controls.forEach((control, index) => {
      const newPeriod = index + 1;
      control.patchValue({ period: newPeriod });
      
      // Update colors to match the new period position
      const defaultStyle = this.defaultStyleSets[(newPeriod - 1) % this.defaultStyleSets.length];
      control.patchValue({
        backgroundColor: defaultStyle.backgroundColor,
        fontColor: defaultStyle.fontColor
      });
    });
  }

  // Reset all periods to default color scheme
  resetToDefaultColors(): void {
    this.periodAssignments.controls.forEach((control, index) => {
      const period = index + 1;
      const defaultStyle = this.defaultStyleSets[(period - 1) % this.defaultStyleSets.length];
      control.patchValue({
        backgroundColor: defaultStyle.backgroundColor,
        fontColor: defaultStyle.fontColor
      });
    });
    
    console.log('[UserConfig] Reset all periods to default color scheme');
  }

  // Get course title by ID for display
  getCourseTitle(courseId: number): string {
    const course = this.availableCourses.find(c => c.id === courseId);
    return course ? course.title : 'Unknown Course';
  }

  save(): void {
    if (this.profileForm.valid && this.teachingForm.valid) {
      const result = {
        profile: this.profileForm.value,
        teaching: this.teachingForm.value as TeachingConfigUpdate
      };
      
      // TODO: Integrate with API service
      console.log('Saving configuration:', result);
      
      this.snackBar.open('Configuration saved successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(result);
    } else {
      this.snackBar.open('Please correct the errors before saving', 'Close', { duration: 3000 });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  openAdvancedSettings(): void {
    // TODO: Navigate to full page or open larger modal
    this.snackBar.open('Advanced settings coming soon', 'Close', { duration: 2000 });
  }
}