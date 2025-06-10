// **COMPLETE FILE** - models/user.model.ts
// RESPONSIBILITY: User identity model only
// DOES NOT: Handle UserConfiguration (see user-configuration.model.ts)
// CALLED BY: UserService, auth services

import { UserConfiguration } from "./user-configuration.model";  // FIXED: Import and re-export

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

// Utility function to compute full name
export function getFullName(user: User): string {
    if (!user.firstName && !user.lastName) return user.username;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
}
