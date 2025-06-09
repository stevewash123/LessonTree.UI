// RESPONSIBILITY: User identity and configuration models - CLEAN focus on user data
// DOES NOT: Handle period logic (see period-assignments.ts) or schedule data (see schedule.ts)
// CALLED BY: UserService, user-config components, auth services

// Import period models from dedicated module
import { PeriodAssignment, TeachingSchedule } from "./period-assignment";

// User Configuration (matches API UserConfigurationResource)
export interface UserConfiguration {
    lastUpdated: Date;
    schoolYear?: string;
    startDate: Date;     
    endDate: Date;       
    periodsPerDay: number;
    periodAssignments?: PeriodAssignment[];
}

// User identity model (clean JWT + API separation)
export interface User {
    // Identity data (from JWT)
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    roles: string[];
    claims?: { [key: string]: string | string[] };
    
    // Application data (from API)
    district?: number;
    configuration?: UserConfiguration;
}

// Configuration update payload (matches API UserConfigurationUpdate)
export interface UserConfigurationUpdate {
    schoolYear: string;
    periodsPerDay: number;
    startDate?: Date | null;
    endDate?: Date | null;
    periodAssignments: PeriodAssignment[];
  }

// Profile update interface for updateUserProfile method
export interface UserProfileUpdate {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}

// Application data update (for future pure JWT endpoints)
export interface UserApplicationUpdate {
    district?: number;
}

// User creation resource (before JWT exists)
export interface UserCreateResource {
    // Identity data (will become JWT claims)
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;

    // Initial application data
    district?: number;
    schoolYear?: string;
    periodsPerDay?: number;  // Will default to 6 on backend
}

// User update resource (admin endpoints, non-JWT)
export interface UserUpdateResource {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    district?: number;
}

// Authentication request
export interface LoginRequest {
    username: string;
    password: string;
}

// === USER UTILITY FUNCTIONS ===

// Utility function to compute full name
export function getFullName(user: User): string {
    if (!user.firstName && !user.lastName) return user.username;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
}

// Check if user has any configuration
export function hasUserConfiguration(user: User): boolean {
    return user.configuration !== null && user.configuration !== undefined;
}

// Check if user configuration is complete
export function isUserConfigurationComplete(user: User): boolean {
    const config = user.configuration;
    return config !== null && 
           config !== undefined && 
           config.periodsPerDay > 0 && 
           (config.periodAssignments?.length || 0) >= config.periodsPerDay;
}

// Extract teaching schedule from user configuration (simple wrapper)
export function getUserTeachingSchedule(user: User): TeachingSchedule {
    const config = user.configuration;
    return {
        periodsPerDay: config?.periodsPerDay || 6,
        periodAssignments: config?.periodAssignments || []
    };
}

// LEGACY: Keep for backward compatibility during transition
export interface TeachingConfigUpdate extends UserConfigurationUpdate {}