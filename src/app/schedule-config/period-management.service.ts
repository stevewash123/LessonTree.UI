// **COMPLETE FILE** - Replace period-management.service.ts
// RESPONSIBILITY: Multi-assignment period management with teaching days and validation
// DOES NOT: Handle form validation or user configuration persistence
// CALLED BY: UserConfigComponent for period operations

import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {PeriodAssignment} from '../models/period-assignment';

export interface PeriodStyleSet {
  backgroundColor: string;
  fontColor: string;
}

export interface TeachingDayDefault {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
}

export interface PeriodValidationResult {
  isValid: boolean;
  hasConflicts: boolean;
  hasIncomplete: boolean;
  errors: string[];
  coverageGaps: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PeriodManagementService {

  // Predefined style sets for periods 1-10
  readonly defaultStyleSets: PeriodStyleSet[] = [
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

  // Period options 1-10
  readonly periodOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} Period${i === 0 ? '' : 's'}`
  }));

  // Teaching days constants
  readonly teachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  readonly teachingDayAbbreviations = ['M', 'T', 'W', 'T', 'F'];

  // Default teaching days (M-F)
  readonly defaultTeachingDays: TeachingDayDefault = {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true
  };

  constructor(private fb: FormBuilder) {}

  /**
   * Creates a FormGroup for a single assignment within a period
   */
  createAssignmentForm(useGlobalDefaults: boolean = true): FormGroup {
    const defaultDays = useGlobalDefaults
      ? this.getTeachingDaysArray(this.defaultTeachingDays)
      : [];

    return this.fb.group({
      courseId: [null], // Course selection
      specialPeriodType: [null], // For duty assignments
      room: [''], // Room assignment
      notes: [''], // Assignment notes
      teachingDays: [defaultDays, Validators.required], // Array of day names
      backgroundColor: ['#2196F3'],
      fontColor: ['#FFFFFF']
    });
  }

  /**
   * Creates a FormGroup for a complete period (contains multiple assignments)
   */
  createPeriodForm(period: number, useDefaultStyle: boolean = true): FormGroup {
    const defaultStyle = useDefaultStyle && this.defaultStyleSets.length > 0
      ? this.defaultStyleSets[(period - 1) % this.defaultStyleSets.length]
      : { backgroundColor: '#2196F3', fontColor: '#FFFFFF' };

    const periodForm = this.fb.group({
      period: [period],
      assignments: this.fb.array([]) // Array of assignments for this period
    });

    // Add one default assignment with global teaching days
    const assignmentForm = this.createAssignmentForm(true);
    assignmentForm.patchValue({
      backgroundColor: defaultStyle.backgroundColor,
      fontColor: defaultStyle.fontColor
    });

    this.getPeriodAssignments(periodForm).push(assignmentForm);

    return periodForm;
  }

  /**
   * Initialize periods array with default structure (fresh setup)
   */
  initializePeriods(periodAssignments: FormArray, periodsPerDay: number): void {
    // Clear existing periods
    while (periodAssignments.length !== 0) {
      periodAssignments.removeAt(0);
    }

    // Add period forms with default assignments
    for (let i = 1; i <= periodsPerDay; i++) {
      periodAssignments.push(this.createPeriodForm(i, true));
    }

    console.log(`[PeriodManagement] Initialized ${periodsPerDay} periods with default assignments`);
  }

  /**
   * Smart period count adjustment - preserves existing data when possible
   */
  adjustPeriodsCount(periodAssignments: FormArray, newPeriodsPerDay: number): void {
    const currentPeriods = periodAssignments.length;

    console.log(`[PeriodManagement] Adjusting periods from ${currentPeriods} to ${newPeriodsPerDay}`);

    if (newPeriodsPerDay === currentPeriods) {
      return; // No change needed
    }

    if (newPeriodsPerDay > currentPeriods) {
      // Add new periods with default assignments, preserving existing ones
      for (let i = currentPeriods + 1; i <= newPeriodsPerDay; i++) {
        periodAssignments.push(this.createPeriodForm(i, true));
      }
      console.log(`[PeriodManagement] Added ${newPeriodsPerDay - currentPeriods} new periods`);
    } else {
      // Remove periods from the end, preserving user data in remaining periods
      while (periodAssignments.length > newPeriodsPerDay) {
        periodAssignments.removeAt(periodAssignments.length - 1);
      }
      console.log(`[PeriodManagement] Removed ${currentPeriods - newPeriodsPerDay} periods from end`);
    }
  }

  /**
   * Load existing period assignments from saved configuration
   */
  loadExistingPeriods(
    periodAssignments: FormArray,
    existingAssignments: PeriodAssignment[]
  ): void {
    // Clear existing period assignments
    while (periodAssignments.length !== 0) {
      periodAssignments.removeAt(0);
    }

    // Group assignments by period number
    const assignmentsByPeriod = this.groupAssignmentsByPeriod(existingAssignments);
    const maxPeriod = Math.max(...Object.keys(assignmentsByPeriod).map(Number));

    // Create period forms with their assignments
    for (let period = 1; period <= maxPeriod; period++) {
      const periodForm = this.fb.group({
        period: [period],
        assignments: this.fb.array([])
      });

      const assignmentsForPeriod = assignmentsByPeriod[period] || [];
      const assignmentsArray = this.getPeriodAssignments(periodForm);

      if (assignmentsForPeriod.length > 0) {
        // Load existing assignments for this period
        assignmentsForPeriod.forEach(assignment => {
          const assignmentForm = this.fb.group({
            courseId: [assignment.courseId],
            specialPeriodType: [assignment.specialPeriodType],
            room: [assignment.room || ''],
            notes: [assignment.notes || ''],
            teachingDays: [assignment.teachingDays || this.getTeachingDaysArray(this.defaultTeachingDays)],
            backgroundColor: [assignment.backgroundColor || '#2196F3'],
            fontColor: [assignment.fontColor || '#FFFFFF']
          });
          assignmentsArray.push(assignmentForm);
        });
      } else {
        // No existing assignments, add default assignment
        assignmentsArray.push(this.createAssignmentForm(true));
      }

      periodAssignments.push(periodForm);
    }

    console.log(`[PeriodManagement] Loaded ${existingAssignments.length} existing assignments across ${maxPeriod} periods`);
  }

  /**
   * Add new assignment to a specific period
   */
  addAssignmentToPeriod(periodForm: FormGroup): void {
    const assignmentsArray = this.getPeriodAssignments(periodForm);
    const newAssignment = this.createAssignmentForm(true);

    // Use the same color as the first assignment in the period
    const firstAssignment = assignmentsArray.at(0);
    if (firstAssignment) {
      newAssignment.patchValue({
        backgroundColor: firstAssignment.get('backgroundColor')?.value,
        fontColor: firstAssignment.get('fontColor')?.value
      });
    }

    assignmentsArray.push(newAssignment);
    console.log(`[PeriodManagement] Added assignment to Period ${periodForm.get('period')?.value}`);
  }

  /**
   * Remove assignment from a specific period
   */
  removeAssignmentFromPeriod(periodForm: FormGroup, assignmentIndex: number): void {
    const assignmentsArray = this.getPeriodAssignments(periodForm);

    if (assignmentsArray.length > 1) {
      assignmentsArray.removeAt(assignmentIndex);
      console.log(`[PeriodManagement] Removed assignment ${assignmentIndex} from Period ${periodForm.get('period')?.value}`);
    } else {
      console.log(`[PeriodManagement] Cannot remove last assignment from Period ${periodForm.get('period')?.value}`);
    }
  }

  /**
   * Get assignments FormArray from a period FormGroup
   */
  getPeriodAssignments(periodForm: FormGroup): FormArray {
    return periodForm.get('assignments') as FormArray;
  }

  /**
   * Convert FormArray to API-compatible period assignment data
   */
  convertToApiFormat(periodAssignments: FormArray): PeriodAssignment[] {
    const result: PeriodAssignment[] = [];

    periodAssignments.controls.forEach(periodControl => {
      const periodNumber = periodControl.get('period')?.value;
      const assignmentsArray = this.getPeriodAssignments(periodControl as FormGroup);

      assignmentsArray.controls.forEach(assignmentControl => {
        const assignment: PeriodAssignment = {
          id: 0,
          period: periodNumber,
          courseId: assignmentControl.get('courseId')?.value,
          specialPeriodType: assignmentControl.get('specialPeriodType')?.value,
          room: assignmentControl.get('room')?.value || '',
          notes: assignmentControl.get('notes')?.value || '',
          teachingDays: assignmentControl.get('teachingDays')?.value || [],
          backgroundColor: assignmentControl.get('backgroundColor')?.value,
          fontColor: assignmentControl.get('fontColor')?.value
        };
        result.push(assignment);
      });
    });

    return result;
  }

  /**
   *   Validate period assignments for conflicts and coverage (respects config-level teaching days)
   */
  validatePeriodAssignments(periodAssignments: FormArray, configTeachingDays?: string[]): PeriodValidationResult {
    const errors: string[] = [];
    const coverageGaps: string[] = [];
    let hasConflicts = false;
    let hasIncomplete = false;

    // Use config-level teaching days if provided, otherwise fall back to default
    const expectedDays = configTeachingDays || this.getTeachingDaysArray(this.defaultTeachingDays);

    periodAssignments.controls.forEach(periodControl => {
      const periodNumber = periodControl.get('period')?.value;
      const assignmentsArray = this.getPeriodAssignments(periodControl as FormGroup);

      // Check for day coverage conflicts within the period
      const dayAssignments: { [day: string]: number } = {};

      assignmentsArray.controls.forEach((assignmentControl, assignmentIndex) => {
        const courseId = assignmentControl.get('courseId')?.value;
        const specialPeriodType = assignmentControl.get('specialPeriodType')?.value;
        const teachingDays = assignmentControl.get('teachingDays')?.value || [];

        // Validate assignment has either course or special period type
        if (!courseId && !specialPeriodType) {
          hasIncomplete = true;
          errors.push(`Period ${periodNumber}, Assignment ${assignmentIndex + 1}: Must select a course or duty assignment`);
        }

        // Validate mutually exclusive courseId and specialPeriodType
        if (courseId && specialPeriodType) {
          hasConflicts = true;
          errors.push(`Period ${periodNumber}, Assignment ${assignmentIndex + 1}: Cannot assign both course and duty`);
        }

        // Validate teaching days are within config-level constraints
        const invalidDays = teachingDays.filter((day: string) => !expectedDays.includes(day));
        if (invalidDays.length > 0) {
          hasConflicts = true;
          errors.push(`Period ${periodNumber}, Assignment ${assignmentIndex + 1}: Invalid days ${invalidDays.join(', ')} (not in config-level teaching days)`);
        }

        // Check for teaching day conflicts within the period
        teachingDays.forEach((day: string) => {
          if (dayAssignments[day]) {
            hasConflicts = true;
            errors.push(`Period ${periodNumber}: Conflict on ${day} (multiple assignments)`);
          } else {
            dayAssignments[day] = assignmentIndex + 1;
          }
        });
      });

      // NOTE: Removed invalid "coverage gaps" validation - periods are allowed to have 
      // their own subset of teaching days (e.g., Lab periods only on T&Th)
    });

    return {
      isValid: errors.length === 0,
      hasConflicts,
      hasIncomplete,
      errors,
      coverageGaps
    };
  }

  /**
   * Get validation status icon for a period (respects config-level teaching days)
   */
  getPeriodValidationIcon(periodForm: FormGroup, configTeachingDays?: string[]): string {
    const assignmentsArray = this.getPeriodAssignments(periodForm);
    const expectedDays = configTeachingDays || this.getTeachingDaysArray(this.defaultTeachingDays);

    // Quick validation for this specific period
    const dayAssignments: { [day: string]: boolean } = {};
    let hasConflicts = false;
    let hasIncomplete = false;

    assignmentsArray.controls.forEach(assignmentControl => {
      const courseId = assignmentControl.get('courseId')?.value;
      const specialPeriodType = assignmentControl.get('specialPeriodType')?.value;
      const teachingDays = assignmentControl.get('teachingDays')?.value || [];

      if (!courseId && !specialPeriodType) {
        hasIncomplete = true;
      }

      if (courseId && specialPeriodType) {
        hasConflicts = true;
      }

      // Check for invalid days (not in config-level teaching days)
      const invalidDays = teachingDays.filter((day: string) => !expectedDays.includes(day));
      if (invalidDays.length > 0) {
        hasConflicts = true;
      }

      teachingDays.forEach((day: string) => {
        if (dayAssignments[day]) {
          hasConflicts = true;
        } else {
          dayAssignments[day] = true;
        }
      });
    });

    // Check coverage against config-level teaching days
    const coveredDays = Object.keys(dayAssignments);
    const hasGaps = expectedDays.some(day => !coveredDays.includes(day));

    if (hasConflicts) return 'error'; // Red X
    if (hasIncomplete || hasGaps) return 'warning'; // Yellow warning
    return 'check_circle'; // Green check
  }

  /**
   * Group assignments by period number
   */
  private groupAssignmentsByPeriod(assignments: PeriodAssignment[]): { [period: number]: PeriodAssignment[] } {
    return assignments.reduce((groups, assignment) => {
      const period = assignment.period;
      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(assignment);
      return groups;
    }, {} as { [period: number]: PeriodAssignment[] });
  }

  /**
   * Convert TeachingDayDefault to string array
   */
  getTeachingDaysArray(defaults: TeachingDayDefault): string[] {
    const days: string[] = [];
    if (defaults.monday) days.push('Monday');
    if (defaults.tuesday) days.push('Tuesday');
    if (defaults.wednesday) days.push('Wednesday');
    if (defaults.thursday) days.push('Thursday');
    if (defaults.friday) days.push('Friday');
    return days;
  }

  /**
   * Convert string array to TeachingDayDefault
   */
  getTeachingDayDefaults(days: string[]): TeachingDayDefault {
    return {
      monday: days.includes('Monday'),
      tuesday: days.includes('Tuesday'),
      wednesday: days.includes('Wednesday'),
      thursday: days.includes('Thursday'),
      friday: days.includes('Friday')
    };
  }

  /**
   * Get style set for a specific period number
   */
  getStyleForPeriod(periodNumber: number): PeriodStyleSet {
    if (periodNumber < 1 || periodNumber > this.defaultStyleSets.length) {
      return { backgroundColor: '#2196F3', fontColor: '#FFFFFF' };
    }
    return this.defaultStyleSets[(periodNumber - 1) % this.defaultStyleSets.length];
  }

  /**
   * Apply colors to all assignments in a period
   */
  applyColorsToperiod(periodForm: FormGroup, backgroundColor: string, fontColor: string): void {
    const assignmentsArray = this.getPeriodAssignments(periodForm);

    assignmentsArray.controls.forEach(assignmentControl => {
      assignmentControl.patchValue({
        backgroundColor,
        fontColor
      });
    });

    console.log(`[PeriodManagement] Applied colors to Period ${periodForm.get('period')?.value}`);
  }

  /**
   * Get assignment display text for UI
   */
  getAssignmentDisplayText(assignmentForm: FormGroup, availableCourses: any[]): string {
    const courseId = assignmentForm.get('courseId')?.value;
    const specialPeriodType = assignmentForm.get('specialPeriodType')?.value;
    const room = assignmentForm.get('room')?.value;
    const teachingDays = assignmentForm.get('teachingDays')?.value || [];

    let assignmentText = '';

    if (courseId) {
      const course = availableCourses.find(c => c.id === courseId);
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
}
