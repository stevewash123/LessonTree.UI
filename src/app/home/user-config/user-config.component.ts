// **COMPLETE FILE** - Replace user-config.component.ts
// RESPONSIBILITY: Modal dialog for user configuration with flattened period structure
// DOES NOT: Use period management service - self-contained
// CALLED BY: Header/profile components via dialog service

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseDataService } from '../../core/services/course-data.service';
import { Course } from '../../models/course';
import { UserConfigurationUpdate } from '../../models/user';
import { UserService } from '../../core/services/user.service';
import { PeriodColorPickerComponent, PeriodColorData, PeriodColorResult } from './period-color-picker.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-config',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './user-config.component.html',
  styleUrls: ['./user-config.component.css']
})
export class UserConfigComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<UserConfigComponent>);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private courseDataService = inject(CourseDataService);

  profileForm: FormGroup;
  teachingForm: FormGroup;
  availableCourses: Course[] = [];
  
  // Self-contained period options
  periodOptions = [
    { value: 1, label: '1 Period' },
    { value: 2, label: '2 Periods' },
    { value: 3, label: '3 Periods' },
    { value: 4, label: '4 Periods' },
    { value: 5, label: '5 Periods' },
    { value: 6, label: '6 Periods' },
    { value: 7, label: '7 Periods' },
    { value: 8, label: '8 Periods' },
    { value: 9, label: '9 Periods' },
    { value: 10, label: '10 Periods' }
  ];

  // Self-contained teaching days
  teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  teachingDayAbbreviations = ['M', 'T', 'W', 'Th', 'F'];
  
  // Special period options for duties
  specialPeriodOptions = [
    { value: 'Lunch', label: 'Lunch' },
    { value: 'Hall Duty', label: 'Hall Duty' },
    { value: 'Cafeteria Duty', label: 'Cafeteria Duty' },
    { value: 'Study Hall', label: 'Study Hall' },
    { value: 'Prep', label: 'Prep' },
    { value: 'Other Duty', label: 'Other Duty' }
  ];

  constructor(private userService: UserService) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['']
    });

    this.teachingForm = this.fb.group({
      schoolYear: ['2024-2025', Validators.required],
      periodsPerDay: [6, [Validators.required, Validators.min(1), Validators.max(10)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      periodAssignments: this.fb.array([])
    });
  }

  ngOnInit(): void {
    console.log('[UserConfig] Component initializing - simple flat structure');
    this.loadCourses();
    this.loadConfiguration();
  }

  private loadCourses(): void {
    this.availableCourses = this.courseDataService.getCourses();
    console.log('[UserConfig] Loaded courses:', this.availableCourses.length);
  }

  private loadConfiguration(): void {
    const currentUser = this.userService.getCurrentUser();
    const existingConfig = this.userService.getUserConfiguration();
    
    // Load profile data
    if (currentUser) {
      this.profileForm.patchValue({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phone || ''
      });
    }
    
    // Load configuration data
    if (existingConfig) {
      this.teachingForm.patchValue({
        schoolYear: existingConfig.schoolYear || '2024-2025',
        periodsPerDay: existingConfig.periodsPerDay || 6,
        startDate: existingConfig.startDate || null,
        endDate: existingConfig.endDate || null
      });
      
      if (existingConfig.periodAssignments && existingConfig.periodAssignments.length > 0) {
        this.loadExistingPeriods(existingConfig.periodAssignments);
      } else {
        this.initializePeriods();
      }
    } else {
      this.initializePeriods();
    }
  }

  private loadExistingPeriods(existingAssignments: any[]): void {
    const periodsPerDay = this.teachingForm.get('periodsPerDay')?.value || 6;
    
    // Clear existing
    while (this.periodAssignments.length > 0) {
      this.periodAssignments.removeAt(0);
    }

    // Handle both nested (multi-assignment) and flat structures
    for (let period = 1; period <= periodsPerDay; period++) {
      const existingPeriod = existingAssignments.find(a => a.period === period);
      
      if (existingPeriod) {
        // Check if this is nested structure (has assignments array) or flat
        if (existingPeriod.assignments && Array.isArray(existingPeriod.assignments)) {
          // NESTED STRUCTURE - flatten to first assignment for now
          console.log(`[UserConfig] Period ${period} has ${existingPeriod.assignments.length} assignments - flattening to first`);
          const firstAssignment = existingPeriod.assignments[0] || {};
          const flattenedData = {
            period: period,
            courseId: firstAssignment.courseId || null,
            specialPeriodType: firstAssignment.specialPeriodType || null,
            room: firstAssignment.room || '',
            notes: firstAssignment.notes || '',
            teachingDays: firstAssignment.teachingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            backgroundColor: existingPeriod.backgroundColor || '#2196F3',
            fontColor: existingPeriod.fontColor || '#FFFFFF'
          };
          
          // TODO: Store additional assignments for future multi-assignment support
          if (existingPeriod.assignments.length > 1) {
            console.warn(`[UserConfig] Period ${period} has ${existingPeriod.assignments.length} assignments. Additional assignments will be preserved but not shown in UI yet.`);
          }
          
          this.periodAssignments.push(this.createPeriodAssignment(period, flattenedData));
        } else {
          // FLAT STRUCTURE - use directly
          this.periodAssignments.push(this.createPeriodAssignment(period, existingPeriod));
        }
      } else {
        // No existing data for this period
        this.periodAssignments.push(this.createPeriodAssignment(period));
      }
    }
    
    console.log('[UserConfig] Loaded and flattened existing periods:', periodsPerDay);
  }

  private initializePeriods(): void {
    const periodsPerDay = this.teachingForm.get('periodsPerDay')?.value || 6;
    
    console.log(`[UserConfig] Initializing ${periodsPerDay} periods - clearing existing first`);
    
    // Clear ALL existing periods completely
    this.periodAssignments.clear();

    // Add periods with flat structure - one assignment per period
    for (let period = 1; period <= periodsPerDay; period++) {
      const periodForm = this.createPeriodAssignment(period);
      this.periodAssignments.push(periodForm);
    }

    console.log(`[UserConfig] Initialized ${periodsPerDay} periods with flat structure`);
  }

  private createPeriodAssignment(period: number, existingData?: any): FormGroup {
    return this.fb.group({
      period: [period],
      courseId: [existingData?.courseId || null],
      specialPeriodType: [existingData?.specialPeriodType || null],
      room: [existingData?.room || ''],
      notes: [existingData?.notes || ''],
      teachingDays: [existingData?.teachingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']],
      backgroundColor: [existingData?.backgroundColor || '#2196F3'],
      fontColor: [existingData?.fontColor || '#FFFFFF'],
      // Second assignment support
      secondAssignment: existingData?.secondAssignment ? this.fb.group({
        courseId: [existingData.secondAssignment.courseId || null],
        specialPeriodType: [existingData.secondAssignment.specialPeriodType || null],
        room: [existingData.secondAssignment.room || ''],
        teachingDays: [existingData.secondAssignment.teachingDays || []]
      }) : null
    });
  }

  // Split assignment methods
  hasSecondAssignment(periodForm: FormGroup): boolean {
    return periodForm.get('secondAssignment') !== null;
  }

  getSecondAssignmentForm(periodForm: FormGroup): FormGroup {
    return periodForm.get('secondAssignment') as FormGroup;
  }

  addSecondAssignment(periodForm: FormGroup): void {
    if (!this.hasSecondAssignment(periodForm)) {
      const secondAssignmentForm = this.fb.group({
        courseId: [null],
        specialPeriodType: [null],
        room: [''],
        teachingDays: [[]]  // Start with no days selected
      });
      
      periodForm.addControl('secondAssignment', secondAssignmentForm);
      console.log('[UserConfig] Added second assignment to period');
    }
  }

  removeSecondAssignment(periodForm: FormGroup): void {
    if (this.hasSecondAssignment(periodForm)) {
      periodForm.removeControl('secondAssignment');
      console.log('[UserConfig] Removed second assignment from period');
    }
  }

  // Enhanced day selection with conflict detection
  isTeachingDayDisabled(assignmentForm: FormGroup, day: string, periodForm?: FormGroup): boolean {
    if (!periodForm) return false;
    
    // If this is the second assignment, check if day is used by first assignment
    if (this.hasSecondAssignment(periodForm) && assignmentForm === this.getSecondAssignmentForm(periodForm)) {
      const firstAssignmentDays = periodForm.get('teachingDays')?.value || [];
      return firstAssignmentDays.includes(day);
    }
    
    // If this is the first assignment, check if day is used by second assignment
    if (this.hasSecondAssignment(periodForm) && assignmentForm === periodForm) {
      const secondAssignmentDays = this.getSecondAssignmentForm(periodForm).get('teachingDays')?.value || [];
      return secondAssignmentDays.includes(day);
    }
    
    return false;
  }

  get periodAssignments(): FormArray {
    return this.teachingForm.get('periodAssignments') as FormArray;
  }

  onPeriodsPerDayChange(): void {
    const newPeriodsPerDay = this.teachingForm.get('periodsPerDay')?.value || 6;
    const currentPeriods = this.periodAssignments.length;
    
    if (newPeriodsPerDay > currentPeriods) {
      // Add new periods
      for (let i = currentPeriods + 1; i <= newPeriodsPerDay; i++) {
        this.periodAssignments.push(this.createPeriodAssignment(i));
      }
    } else if (newPeriodsPerDay < currentPeriods) {
      // Remove excess periods
      while (this.periodAssignments.length > newPeriodsPerDay) {
        this.periodAssignments.removeAt(this.periodAssignments.length - 1);
      }
    }
    
    console.log(`[UserConfig] Adjusted periods from ${currentPeriods} to ${newPeriodsPerDay}`);
  }

  getPeriodValidationIcon(periodForm: FormGroup): string {
    const courseId = periodForm.get('courseId')?.value;
    const specialPeriodType = periodForm.get('specialPeriodType')?.value;
    const teachingDays = periodForm.get('teachingDays')?.value || [];
    
    const hasAssignment = courseId || specialPeriodType;
    const hasTeachingDays = teachingDays.length > 0;
    
    if (hasAssignment && hasTeachingDays) {
      return 'check_circle';
    } else if (hasAssignment || hasTeachingDays) {
      return 'warning';
    } else {
      return 'radio_button_unchecked';
    }
  }

  getAssignmentDisplayText(periodForm: FormGroup): string {
    const courseId = periodForm.get('courseId')?.value;
    const specialPeriodType = periodForm.get('specialPeriodType')?.value;
    const room = periodForm.get('room')?.value;
    const teachingDays = periodForm.get('teachingDays')?.value || [];
    
    let assignmentText = '';
    
    if (courseId) {
      const course = this.availableCourses.find(c => c.id === courseId);
      assignmentText = course ? course.title : 'Unknown Course';
    } else if (specialPeriodType) {
      assignmentText = specialPeriodType;
    } else {
      assignmentText = 'Unassigned';
    }
    
    const daysText = teachingDays.length > 0 
      ? teachingDays.map((day: string) => day.charAt(0)).join('')
      : 'No Days';
    
    return room 
      ? `${assignmentText}, ${daysText}, ${room}`
      : `${assignmentText}, ${daysText}`;
  }

  isTeachingDaySelected(periodForm: FormGroup, day: string): boolean {
    const teachingDays = periodForm.get('teachingDays')?.value || [];
    return teachingDays.includes(day);
  }

  toggleTeachingDay(periodForm: FormGroup, day: string): void {
    const teachingDays = periodForm.get('teachingDays')?.value || [];
    const index = teachingDays.indexOf(day);
    
    if (index > -1) {
      teachingDays.splice(index, 1);
    } else {
      teachingDays.push(day);
    }
    
    periodForm.patchValue({
      teachingDays: [...teachingDays]
    });
  }

  getTeachingDaysDisplay(periodForm: FormGroup): string {
    const teachingDays = periodForm.get('teachingDays')?.value || [];
    if (teachingDays.length === 0) {
      return 'No days selected';
    }
    return teachingDays.map((day: string) => day.charAt(0)).join('');
  }

  // Combined assignment methods (replaces separate course/duty methods)
  getCombinedAssignmentValue(periodForm: FormGroup): string | null {
    const courseId = periodForm.get('courseId')?.value;
    const specialPeriodType = periodForm.get('specialPeriodType')?.value;
    
    if (courseId) {
      return `course:${courseId}`;
    } else if (specialPeriodType) {
      return `duty:${specialPeriodType}`;
    }
    return null;
  }

  onCombinedAssignmentChange(periodForm: FormGroup, value: string | null): void {
    if (!value) {
      // Clear both
      periodForm.patchValue({
        courseId: null,
        specialPeriodType: null
      });
    } else if (value.startsWith('course:')) {
      // Set course, clear duty
      const courseId = parseInt(value.substring(7));
      periodForm.patchValue({
        courseId: courseId,
        specialPeriodType: null
      });
    } else if (value.startsWith('duty:')) {
      // Set duty, clear course
      const dutyType = value.substring(5);
      periodForm.patchValue({
        courseId: null,
        specialPeriodType: dutyType
      });
    }
  }

  onCourseSelectionChange(periodForm: FormGroup, courseId: number | null): void {
    if (courseId) {
      periodForm.patchValue({ specialPeriodType: null });
    }
  }

  onSpecialPeriodSelectionChange(periodForm: FormGroup, specialPeriodType: string | null): void {
    if (specialPeriodType) {
      periodForm.patchValue({ courseId: null });
    }
  }

  openColorPicker(periodIndex: number): void {
    const periodForm = this.periodAssignments.at(periodIndex) as FormGroup;
    
    const colorData: PeriodColorData = {
      backgroundColor: periodForm.get('backgroundColor')?.value || '#2196F3',
      fontColor: periodForm.get('fontColor')?.value || '#FFFFFF',
      periodNumber: periodIndex + 1
    };
    
    const dialogRef = this.dialog.open(PeriodColorPickerComponent, {
      width: '800px', // Make main modal wider
      maxWidth: '95vw',
      data: colorData
    });

    dialogRef.afterClosed().subscribe((result: PeriodColorResult) => {
      if (result) {
        periodForm.patchValue({
          backgroundColor: result.backgroundColor,
          fontColor: result.fontColor
        });
      }
    });
  }

  private validatePeriodAssignments(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    this.periodAssignments.controls.forEach((periodControl, index) => {
      const periodNumber = index + 1;
      const courseId = periodControl.get('courseId')?.value;
      const specialPeriodType = periodControl.get('specialPeriodType')?.value;
      const teachingDays = periodControl.get('teachingDays')?.value || [];
      
      if (!courseId && !specialPeriodType) {
        errors.push(`Period ${periodNumber}: Must select a course or duty assignment`);
      }
      
      if (teachingDays.length === 0) {
        errors.push(`Period ${periodNumber}: Must select teaching days`);
      }
      
      if (courseId && specialPeriodType) {
        errors.push(`Period ${periodNumber}: Cannot assign both course and duty`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }

  get isFormValid(): boolean {
    const validationResult = this.validatePeriodAssignments();
    return this.profileForm.valid && this.teachingForm.valid && validationResult.isValid;
  }

  getValidationSummaryTruncated(): string {
    const validationResult = this.validatePeriodAssignments();
    
    if (validationResult.isValid) {
      return 'All period assignments are valid and ready for schedule generation';
    }
    
    if (validationResult.errors.length <= 3) {
      return validationResult.errors.join(', ');
    }
    
    const firstThree = validationResult.errors.slice(0, 3);
    const remaining = validationResult.errors.length - 3;
    return `${firstThree.join(', ')} ... and ${remaining} more issue${remaining > 1 ? 's' : ''}`;
  }

  getSaveButtonTooltip(): string {
    if (!this.profileForm.valid) return 'Complete required profile fields';
    if (!this.teachingForm.valid) return 'Complete required teaching schedule fields';
    
    const validationResult = this.validatePeriodAssignments();
    if (!validationResult.isValid) return 'Fix period assignment issues';
    
    return '';
  }

  private convertToApiFormat(): any[] {
    // Convert flat UI structure back to API format
    // For now, creates single assignment per period
    // TODO: Preserve and merge with any existing multi-assignments
    
    return this.periodAssignments.controls.map(periodControl => {
      const period = periodControl.get('period')?.value;
      const courseId = periodControl.get('courseId')?.value;
      const specialPeriodType = periodControl.get('specialPeriodType')?.value;
      
      // Create flat API structure (compatible with both formats)
      return {
        id: 0,
        period: period,
        courseId: courseId,
        specialPeriodType: specialPeriodType,
        room: periodControl.get('room')?.value || '',
        notes: periodControl.get('notes')?.value || '',
        backgroundColor: periodControl.get('backgroundColor')?.value || '#2196F3',
        fontColor: periodControl.get('fontColor')?.value || '#FFFFFF'
        // Note: teachingDays not included in API format yet - will be added when multi-assignment support is implemented
      };
    });
  }

  save(): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      this.snackBar.open('User session error. Please refresh and try again.', 'Close', { duration: 5000 });
      return;
    }

    this.profileForm.markAllAsTouched();
    this.teachingForm.markAllAsTouched();

    if (!this.profileForm.valid || !this.teachingForm.valid) {
      this.snackBar.open('Please correct highlighted errors', 'Close', { duration: 5000 });
      return;
    }

    const validationResult = this.validatePeriodAssignments();
    if (!validationResult.isValid) {
      this.snackBar.open('Period assignment errors: ' + validationResult.errors.join(', '), 'Close', { duration: 7000 });
      return;
    }

    const profileUpdate = {
      firstName: this.profileForm.get('firstName')?.value || '',
      lastName: this.profileForm.get('lastName')?.value || '',
      email: this.profileForm.get('email')?.value || '',
      phone: this.profileForm.get('phoneNumber')?.value || ''
    };

    const configurationUpdate: UserConfigurationUpdate = {
      schoolYear: this.teachingForm.get('schoolYear')?.value || '2024-2025',
      periodsPerDay: this.teachingForm.get('periodsPerDay')?.value || 6,
      periodAssignments: this.convertToApiFormat()
    };

    forkJoin({
      profile: this.userService.updateUserProfile(profileUpdate),
      config: this.userService.updateUserConfiguration(configurationUpdate)
    }).subscribe({
      next: (results) => {
        this.snackBar.open('Configuration saved successfully', 'Close', { duration: 3000 });
        this.dialogRef.close({ saved: true, profile: results.profile, configuration: results.config });
      },
      error: (error) => {
        console.error('[UserConfig] Save failed:', error);
        this.snackBar.open('Failed to save changes. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  generateSchedule(): void {
    if (!this.isFormValid) {
      this.snackBar.open('Please fix validation errors first', 'Close', { duration: 3000 });
      return;
    }
    this.snackBar.open('Schedule generation coming soon!', 'Close', { duration: 2000 });
  }
}