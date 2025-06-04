// src/app/models/shared.ts - SHARED DOMAIN MODELS
// RESPONSIBILITY: Models that span multiple domains (User, Schedule, etc.)
// DOES NOT: Handle domain-specific logic
// CALLED BY: User, Schedule, and Calendar services

// === PERIOD ASSIGNMENT MODEL ===
// Used by: User configuration, Schedule assignment logic, Calendar rendering
export interface PeriodAssignment {
    id: number;                        // For database persistence
    period: number;                    // Period number (1-10)
    courseId?: number | null;          // Which course is assigned to this period
    sectionName?: string | null;       // Section name (e.g., "Advanced Math")
    room?: string | null;              // Room assignment (e.g., "Room A", "Lab B")
    notes?: string | null;             // Additional notes
    backgroundColor: string;           // UI display color for period
    fontColor: string;                 // UI text color for period
  }
  
  // === TEACHING CONFIGURATION MODEL ===
  // Used by: User configuration, Schedule generation, Calendar display
  export interface TeachingConfig {
    schoolYear: string;                // e.g., "2024-2025"
    periodsPerDay: number;             // Number of periods per teaching day (1-10)
    periodAssignments: PeriodAssignment[];  // Period-to-course mappings
    lastModified: Date;                // When configuration was last updated
  }
  
  // === PERIOD-RELATED UTILITIES ===
  export interface PeriodInfo {
    period: number;
    isAssigned: boolean;
    courseId?: number;
    courseName?: string;
    room?: string;
    backgroundColor: string;
    fontColor: string;
  }
  
  // === PERIOD VALIDATION ===
  export interface PeriodValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }
  
  // Helper function to validate period assignments
  export function validatePeriodAssignments(assignments: PeriodAssignment[], maxPeriods: number): PeriodValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for duplicate periods
    const periods = assignments.map(a => a.period);
    const duplicates = periods.filter((period, index) => periods.indexOf(period) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate period assignments: ${duplicates.join(', ')}`);
    }
    
    // Check for invalid period numbers
    const invalidPeriods = assignments.filter(a => a.period < 1 || a.period > maxPeriods);
    if (invalidPeriods.length > 0) {
      errors.push(`Invalid period numbers (must be 1-${maxPeriods}): ${invalidPeriods.map(a => a.period).join(', ')}`);
    }
    
    // Check for duplicate course assignments
    const courseIds = assignments.map(a => a.courseId).filter(id => id !== null);
    const duplicateCourses = courseIds.filter((id, index) => courseIds.indexOf(id) !== index);
    if (duplicateCourses.length > 0) {
      warnings.push(`Same course assigned to multiple periods: ${duplicateCourses.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }