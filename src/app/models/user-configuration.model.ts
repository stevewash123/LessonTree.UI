// **COMPLETE FILE** - models/user-configuration.model.ts
// RESPONSIBILITY: UserConfiguration model and related interfaces only
// DOES NOT: Handle User identity or utilities
// CALLED BY: User configuration components, UserService

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

// Configuration update payload (matches API UserConfigurationUpdate)
export interface UserConfigurationUpdate {
    schoolYear: string;
    periodsPerDay: number;
    startDate?: Date | null;
    endDate?: Date | null;
    periodAssignments: PeriodAssignment[];
}

// Check if user has any configuration
export function hasUserConfiguration(user: { configuration?: UserConfiguration | null }): boolean {
    return user.configuration !== null && user.configuration !== undefined;
}

// Check if user configuration is complete
export function isUserConfigurationComplete(user: { configuration?: UserConfiguration | null }): boolean {
    const config = user.configuration;
    return config !== null && 
           config !== undefined && 
           config.periodsPerDay > 0 && 
           (config.periodAssignments?.length || 0) >= config.periodsPerDay;
}

// Extract teaching schedule from user configuration (simple wrapper)
export function getUserTeachingSchedule(user: { configuration?: UserConfiguration | null }): TeachingSchedule {
    const config = user.configuration;
    return {
        periodsPerDay: config?.periodsPerDay || 6,
        periodAssignments: config?.periodAssignments || []
    };
}
