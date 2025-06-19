// **COMPLETE FILE** - utils/shared.utils.ts
// RESPONSIBILITY: Pure utility functions used across multiple domains
// DOES NOT: Handle domain-specific logic or model definitions
// CALLED BY: Multiple services and components for common operations

// Common validation patterns
export function isValidId(id: any): boolean {
    return id !== null && id !== undefined && (typeof id === 'number' ? id > 0 : id.length > 0);
}

// Common array utilities
export function isNonEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
    return Array.isArray(arr) && arr.length > 0;
}

// Convert teaching days between string and string[] formats (used by multiple models)
export function parseTeachingDaysToArray(teachingDays: string | string[] | undefined): string[] {
    if (!teachingDays) {
        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    
    if (typeof teachingDays === 'string') {
        return teachingDays.split(',').map(day => day.trim()).filter(day => day.length > 0);
    }
    
    return teachingDays;
}

export function formatTeachingDaysToString(teachingDays: string[] | string | undefined): string {
    if (!teachingDays) {
        return 'Monday,Tuesday,Wednesday,Thursday,Friday';
    }
    
    if (typeof teachingDays === 'string') {
        return teachingDays;
    }
    
    return teachingDays.join(',');
}

// Get teaching day numbers for date calculations (0=Sunday, 1=Monday, etc.)
export function getTeachingDayNumbers(teachingDays: string | string[] | undefined): number[] {
    const dayArray = parseTeachingDaysToArray(teachingDays);
    const dayMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    return dayArray
        .map(day => dayMap[day.trim()])
        .filter(num => num !== undefined);
}