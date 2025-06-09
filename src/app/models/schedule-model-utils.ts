// RESPONSIBILITY: Helper functions for schedule model compatibility and conversions
// DOES NOT: Handle business logic - pure utility functions
// CALLED BY: Services that need to work with schedule model inconsistencies

import { Schedule, ScheduleEvent } from './schedule';

// Convert teaching days between string and string[] formats
export function parseTeachingDaysToArray(teachingDays: string | string[] | undefined): string[] {
    if (!teachingDays) {
        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    
    if (typeof teachingDays === 'string') {
        return teachingDays.split(',').map(day => day.trim());
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

// Legacy compatibility functions for specialCode → eventType migration
export function hasSpecialCode(event: ScheduleEvent): boolean {
    return event.eventType !== null && 
           event.eventType !== undefined && 
           event.eventType.trim().length > 0 &&
           event.eventType !== 'Lesson';
}

export function isErrorDay(event: ScheduleEvent): boolean {
    return event.eventType === 'Error' || event.eventType === 'Error Day';
}

export function isSpecialDay(event: ScheduleEvent): boolean {
    return hasSpecialCode(event) && !isErrorDay(event);
}

// Helper to create error events with new structure
export function createErrorEvent(
    id: number,
    scheduleId: number,
    date: Date,
    period: number,
    comment?: string
): ScheduleEvent {
    return {
        id,
        scheduleId,
        courseId: null,
        date,
        period,
        lessonId: null,
        eventType: 'Error',
        eventCategory: null, // Error events have null category
        comment: comment || 'No lesson assigned - schedule needs more content'
    };
}