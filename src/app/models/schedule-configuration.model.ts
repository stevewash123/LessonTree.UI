// **COMPLETE FILE** - models/schedule-configuration.model.ts (SIMPLIFIED)
// RESPONSIBILITY: Schedule configuration models including period assignments
// DOES NOT: Handle schedule events or basic schedule data
// CALLED BY: Schedule configuration components, calendar services

import { PeriodAssignment } from "./period-assignment";

// Schedule configuration for creation
export interface ScheduleConfigurationCreateResource {
    title: string;
    schoolYear: string;
    startDate: Date;
    endDate: Date;
    periodsPerDay: number;
    teachingDays: string[];
    isTemplate: boolean;
    periodAssignments: SchedulePeriodAssignment[];
}

// Schedule configuration update
export interface ScheduleConfigUpdateResource {
    id: number;
    title: string;
    schoolYear: string; 
    startDate: Date;
    endDate: Date;
    teachingDays: string[];
    periodsPerDay: number;
    isActive: boolean;
    periodAssignments: SchedulePeriodAssignment[];
}

// SIMPLIFIED: Single period assignment interface (replaces 3 separate interfaces)
export interface SchedulePeriodAssignment {
    id?: number;                             // Nullable - undefined for creates, set for updates
    period: number;                          // Period number (1-10)
    courseId?: number | null;                // Course assigned to this period
    specialPeriodType?: string | null;       // 'Lunch', 'Hall Duty', etc.
    room?: string | null;                    // Room assignment
    notes?: string | null;                   // Period-specific notes
    teachingDays: string[];                  // Days this period assignment is active
    backgroundColor: string;                 // Period color for calendar display
    fontColor: string;                       // Text color for calendar display
}

// Complete schedule configuration
export interface ScheduleConfiguration {
    id: number;
    title: string;
    schoolYear: string; 
    startDate: Date;
    endDate: Date;
    teachingDays: string[];
    periodsPerDay: number;
    periodAssignments: SchedulePeriodAssignment[];
    
    isActive: boolean;
}

// Schedule configuration validation result
export interface ScheduleConfigValidationResult {
    isValid: boolean;
    canGenerate: boolean;
    errors: string[];
    warnings: string[];
}

// === UTILITY FUNCTIONS ===

// Convert PeriodAssignment to SchedulePeriodAssignment
export function convertPeriodAssignmentToSchedule(
    periodAssignment: PeriodAssignment
): SchedulePeriodAssignment {
    return {
        id: periodAssignment.id,
        period: periodAssignment.period,
        courseId: periodAssignment.courseId,
        specialPeriodType: periodAssignment.specialPeriodType,
        room: periodAssignment.room,
        notes: periodAssignment.notes,
        teachingDays: periodAssignment.teachingDays,
        backgroundColor: periodAssignment.backgroundColor || '#2196F3',
        fontColor: periodAssignment.fontColor || '#FFFFFF'
    };
}

// Convert SchedulePeriodAssignment to PeriodAssignment
export function convertScheduleToPeriodAssignment(
    schedulePeriodAssignment: SchedulePeriodAssignment
): PeriodAssignment {
    return {
        id: schedulePeriodAssignment.id || 0,
        period: schedulePeriodAssignment.period,
        courseId: schedulePeriodAssignment.courseId,
        specialPeriodType: schedulePeriodAssignment.specialPeriodType,
        room: schedulePeriodAssignment.room,
        notes: schedulePeriodAssignment.notes,
        teachingDays: schedulePeriodAssignment.teachingDays,
        backgroundColor: schedulePeriodAssignment.backgroundColor,
        fontColor: schedulePeriodAssignment.fontColor
    };
}

// Validate schedule configuration
export function validateScheduleConfiguration(config: ScheduleConfiguration): ScheduleConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.title?.trim()) {
        errors.push('Schedule title is required');
    }

    if (!config.startDate || !config.endDate) {
        errors.push('Start and end dates are required');
    }

    if (config.startDate && config.endDate && config.startDate >= config.endDate) {
        errors.push('End date must be after start date');
    }

    if (config.periodsPerDay < 1 || config.periodsPerDay > 10) {
        errors.push('Periods per day must be between 1 and 10');
    }

    if (!config.teachingDays || config.teachingDays.length === 0) {
        errors.push('At least one teaching day must be selected');
    }

    // Period assignment validation
    const expectedPeriods = Array.from({ length: config.periodsPerDay }, (_, i) => i + 1);
    const assignedPeriods = config.periodAssignments.map(pa => pa.period);
    
    for (const expectedPeriod of expectedPeriods) {
        if (!assignedPeriods.includes(expectedPeriod)) {
            errors.push(`Missing assignment for period ${expectedPeriod}`);
        }
    }

    // Check for valid assignments
    const unassignedPeriods = config.periodAssignments.filter(pa => 
        !pa.courseId && !pa.specialPeriodType
    );
    
    if (unassignedPeriods.length > 0) {
        warnings.push(`${unassignedPeriods.length} periods have no course or special period assignment`);
    }

    // Color validation
    for (const assignment of config.periodAssignments) {
        if (!assignment.backgroundColor) {
            errors.push(`Period ${assignment.period} missing background color`);
        }
        if (!assignment.fontColor) {
            errors.push(`Period ${assignment.period} missing font color`);
        }
    }

    return {
        isValid: errors.length === 0,
        canGenerate: errors.length === 0 && unassignedPeriods.length < config.periodsPerDay,
        errors,
        warnings
    };
}

// Create default schedule configuration
export function createDefaultScheduleConfiguration(): Partial<ScheduleConfiguration> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // School year logic: Aug-July
    const schoolYearStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
    const schoolYearEndYear = schoolYearStartYear + 1;

    return {
        title: `Schedule ${schoolYearStartYear}-${schoolYearEndYear}`,
        schoolYear: `${schoolYearStartYear}-${schoolYearEndYear}`,
        startDate: new Date(schoolYearStartYear, 7, 1), // August 1st
        endDate: new Date(schoolYearEndYear, 5, 15),    // June 15th
        teachingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        periodsPerDay: 6,
        periodAssignments: []
    };
}