// **COMPLETE FILE** - models/period-assignment.model.ts
// RESPONSIBILITY: PeriodAssignment model and related types only
// DOES NOT: Handle utilities (see period-assignment.utils.ts)
// CALLED BY: User configuration, schedule generation services

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

// Special Period Type constants (used only in PeriodAssignment)
export const SpecialPeriodTypes = {
    LUNCH: 'Lunch',
    HALL_DUTY: 'Hall Duty',
    CAFETERIA_DUTY: 'Cafeteria Duty',
    STUDY_HALL: 'Study Hall',
    PREP: 'Prep',
    OTHER_DUTY: 'Other Duty'
} as const;

export type SpecialPeriodType = typeof SpecialPeriodTypes[keyof typeof SpecialPeriodTypes];

