// **COMPLETE FILE** - Replace models/period-assignment.ts
// RESPONSIBILITY: Period assignment models, utilities, and teaching schedule logic
// DOES NOT: Handle user identity, authentication, or generic shared utilities
// CALLED BY: Calendar services, schedule generation, user configuration components

export interface PeriodAssignment {
    id: number;
    period: number;
    courseId?: number | null;
    specialPeriodType?: string | null;  // 'Lunch', 'Hall Duty', 'Cafeteria Duty', etc.
    room?: string | null;
    notes?: string | null;
    teachingDays: string[];  // ["Monday", "Wednesday", "Friday"]
    backgroundColor?: string | null;
    fontColor?: string | null;
  }
    
  // Validation response from API
  export interface PeriodValidationResponse {
    isValid: boolean;
    canGenerate: boolean;
    errors: string[];
    message?: string;
  }
  
  // Teaching schedule wrapper
  export interface TeachingSchedule {
    periodsPerDay: number;
    periodAssignments: PeriodAssignment[];
  }
  
  // Period-course combination for event generation
  export interface PeriodCourseAssignment {
    period: number;
    courseId: number;
    periodAssignment: PeriodAssignment;
  }
  
  // === COLOR UTILITIES ===
  
  // DEFAULT COLOR SCHEMES: Pre-defined colors for all 10 periods
  export const DefaultPeriodColors = {
    1: { background: '#2196F3', font: '#FFFFFF' },   // Blue
    2: { background: '#4CAF50', font: '#FFFFFF' },   // Green  
    3: { background: '#FF9800', font: '#FFFFFF' },   // Orange
    4: { background: '#9C27B0', font: '#FFFFFF' },   // Purple
    5: { background: '#F44336', font: '#FFFFFF' },   // Red
    6: { background: '#00BCD4', font: '#FFFFFF' },   // Cyan
    7: { background: '#795548', font: '#FFFFFF' },   // Brown
    8: { background: '#607D8B', font: '#FFFFFF' },   // Blue Grey
    9: { background: '#E91E63', font: '#FFFFFF' },   // Pink
    10: { background: '#3F51B5', font: '#FFFFFF' }   // Indigo
  } as const;
  
  // Get default colors for a period
  export function getDefaultPeriodColors(period: number): { background: string; font: string } {
    return DefaultPeriodColors[period as keyof typeof DefaultPeriodColors] || DefaultPeriodColors[1];
  }
  
  // Create default PeriodAssignment with colors
  export function createDefaultPeriodAssignment(period: number): PeriodAssignment {
    const colors = getDefaultPeriodColors(period);
    return {
      id: 0, // Will be assigned by backend
      period,
      courseId: null,
      specialPeriodType: null,
      room: null,
      notes: null,
      teachingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], // Default M-F
      backgroundColor: colors.background,
      fontColor: colors.font
    };
  }
  
  // === VALIDATION UTILITIES ===
  
  // Validate period assignment data
  export function isValidPeriodAssignment(assignment: PeriodAssignment): boolean {
    return assignment.period >= 1 && 
           assignment.period <= 10 && 
           (assignment.backgroundColor?.length || 0) > 0 && 
           (assignment.fontColor?.length || 0) > 0 &&
           assignment.teachingDays.length > 0;
  }
  
  // Check if period has course assignment
  export function periodHasCourseAssignment(assignment: PeriodAssignment): boolean {
    return assignment.courseId !== null && assignment.courseId !== undefined && assignment.courseId > 0;
  }
  
  // Check if period has special period type (duties)
  export function periodHasSpecialPeriodType(assignment: PeriodAssignment): boolean {
    return assignment.specialPeriodType !== null && 
           assignment.specialPeriodType !== undefined && 
           assignment.specialPeriodType.trim().length > 0;
  }
  
  // Check if period has any assignment (course or special period type)
  export function periodHasAssignment(assignment: PeriodAssignment): boolean {
    return periodHasCourseAssignment(assignment) || periodHasSpecialPeriodType(assignment);
  }
  
  // === TEACHING SCHEDULE UTILITIES ===
  
  // Create teaching schedule from period assignments
  export function createTeachingSchedule(periodsPerDay: number, assignments: PeriodAssignment[]): TeachingSchedule {
    return {
      periodsPerDay,
      periodAssignments: assignments
    };
  }
  
  // Get all period-course combinations for event generation
  export function getPeriodCourseAssignments(schedule: TeachingSchedule): PeriodCourseAssignment[] {
    return schedule.periodAssignments
      .filter(assignment => periodHasCourseAssignment(assignment))
      .map(assignment => ({
        period: assignment.period,
        courseId: assignment.courseId as number,
        periodAssignment: assignment
      }));
  }
  
  // Get periods assigned to a specific course
  export function getPeriodsForCourse(schedule: TeachingSchedule, courseId: number): PeriodAssignment[] {
    return schedule.periodAssignments.filter(assignment => assignment.courseId === courseId);
  }
  
  // Get all unique courses assigned to periods
  export function getAssignedCourseIds(schedule: TeachingSchedule): number[] {
    const courseIds = schedule.periodAssignments
      .filter(assignment => periodHasCourseAssignment(assignment))
      .map(assignment => assignment.courseId as number);
    return Array.from(new Set(courseIds));
  }
  
  // Get all periods that have course assignments
  export function getPeriodsWithCourseAssignments(schedule: TeachingSchedule): number[] {
    const periodCourseAssignments = getPeriodCourseAssignments(schedule);
    return periodCourseAssignments.map(pca => pca.period).sort((a, b) => a - b);
  }
  
  // Get periods with special period types (duties)
  export function getSpecialPeriodAssignments(schedule: TeachingSchedule): PeriodAssignment[] {
    return schedule.periodAssignments.filter(assignment => periodHasSpecialPeriodType(assignment));
  }
  
  // Get periods that are truly unassigned
  export function getUnassignedPeriods(schedule: TeachingSchedule): PeriodAssignment[] {
    return schedule.periodAssignments.filter(assignment => !periodHasAssignment(assignment));
  }
  
  // Check if teaching schedule has any period assignments
  export function hasAnyPeriodAssignments(schedule: TeachingSchedule): boolean {
    return schedule.periodAssignments.length > 0;
  }
  
  // Get period assignment by period number
  export function getPeriodAssignment(schedule: TeachingSchedule, period: number): PeriodAssignment | null {
    return schedule.periodAssignments.find(assignment => assignment.period === period) || null;
  }
  
  // === PERIOD GENERATION UTILITIES ===
  
  // Generate complete period assignments array for user setup
  export function generateDefaultPeriodAssignments(periodsPerDay: number): PeriodAssignment[] {
    const assignments: PeriodAssignment[] = [];
    for (let period = 1; period <= periodsPerDay; period++) {
      assignments.push(createDefaultPeriodAssignment(period));
    }
    return assignments;
  }
  
  // Validate that all required periods have assignments
  export function validatePeriodAssignments(schedule: TeachingSchedule): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (schedule.periodsPerDay < 1 || schedule.periodsPerDay > 10) {
      errors.push('Periods per day must be between 1 and 10');
    }
    
    const assignedPeriods = schedule.periodAssignments.map(a => a.period);
    const expectedPeriods = Array.from({ length: schedule.periodsPerDay }, (_, i) => i + 1);
    
    for (const expectedPeriod of expectedPeriods) {
      if (!assignedPeriods.includes(expectedPeriod)) {
        errors.push(`Missing assignment for period ${expectedPeriod}`);
      }
    }
    
    for (const assignment of schedule.periodAssignments) {
      if (!isValidPeriodAssignment(assignment)) {
        errors.push(`Invalid assignment for period ${assignment.period}`);
      }
      
      // Validate that each period has either course or special period type
      if (!periodHasAssignment(assignment)) {
        errors.push(`Period ${assignment.period} must have either a course assignment or special period type`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // === SPECIAL PERIOD TYPE CONSTANTS ===
  
  // Special Period Type constants (matches backend)
  export const SpecialPeriodTypes = {
    LUNCH: 'Lunch',
    HALL_DUTY: 'Hall Duty',
    CAFETERIA_DUTY: 'Cafeteria Duty',
    STUDY_HALL: 'Study Hall',
    PREP: 'Prep',
    OTHER_DUTY: 'Other Duty'
  } as const;
  
  export type SpecialPeriodType = typeof SpecialPeriodTypes[keyof typeof SpecialPeriodTypes];
  
  // === API CONVERSION UTILITIES ===
  
  // Convert PeriodAssignment to API format (teachingDays as comma-separated string)
  export function convertToApiFormat(assignment: PeriodAssignment): any {
    return {
      ...assignment,
      teachingDays: assignment.teachingDays.join(',')
    };
  }
  
  // Convert from API format (teachingDays as comma-separated string) to PeriodAssignment
  export function convertFromApiFormat(apiAssignment: any): PeriodAssignment {
    return {
      ...apiAssignment,
      teachingDays: typeof apiAssignment.teachingDays === 'string' 
        ? apiAssignment.teachingDays.split(',').filter((day: string) => day.trim().length > 0)
        : apiAssignment.teachingDays || []
    };
  }
  
  // === TEACHING DAYS UTILITIES ===
  
  // Standard teaching days
  export const TEACHING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
  export const TEACHING_DAY_ABBREVIATIONS = ['M', 'T', 'W', 'T', 'F'] as const;
  
  // Get teaching days display string (abbreviations)
  export function getTeachingDaysDisplay(teachingDays: string[]): string {
    if (teachingDays.length === 0) return 'No days';
    
    return teachingDays
      .map(day => {
        const index = TEACHING_DAYS.indexOf(day as any);
        return index >= 0 ? TEACHING_DAY_ABBREVIATIONS[index] : day.charAt(0);
      })
      .join('');
  }
  
  // Check if teaching days array covers all weekdays
  export function hasFullWeekCoverage(teachingDays: string[]): boolean {
    return TEACHING_DAYS.every(day => teachingDays.includes(day));
  }
  
  // Get missing teaching days from full week
  export function getMissingTeachingDays(teachingDays: string[]): string[] {
    return TEACHING_DAYS.filter(day => !teachingDays.includes(day));
  }
  
  // === LEGACY COMPATIBILITY ===
  
  // Legacy type alias for backwards compatibility
  export interface TeachingConfig {
    periodsPerDay: number;
    periodAssignments: PeriodAssignment[];
  }