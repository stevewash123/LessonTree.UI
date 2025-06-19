// **COMPLETE FILE** - models/user-configuration.model.ts
// RESPONSIBILITY: UserConfiguration model and related interfaces only
// DOES NOT: Handle User identity or utilities
// CALLED BY: User configuration components, UserService

import { PeriodAssignment } from "./period-assignment";


// User Configuration (matches API UserConfigurationResource)
export interface UserConfiguration {
    
}

// Configuration update payload (matches API UserConfigurationUpdate)
export interface UserConfigurationUpdate {
    
}

// Check if user has any configuration
export function hasUserConfiguration(user: { configuration?: UserConfiguration | null }): boolean {
    return user.configuration !== null && user.configuration !== undefined;
}

// Check if user configuration is complete
export function isUserConfigurationComplete(user: { configuration?: UserConfiguration | null }): boolean {
    const config = user.configuration;
    return config !== null && 
           config !== undefined;
}

