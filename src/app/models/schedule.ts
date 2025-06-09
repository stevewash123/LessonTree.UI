// RESPONSIBILITY: Schedule and ScheduleEvent models - UPDATED for master schedule architecture
// DOES NOT: Handle user configuration or period assignments (see shared.ts)
// CALLED BY: Calendar services, schedule components

export interface Schedule {
    id: number;
    title: string;
    // REMOVED: courseId - now user-centric master schedule
    userId: number;
    startDate: Date;
    endDate: Date;
    isLocked?: boolean;
    teachingDays?: string;  // Keep as string for API compatibility - will be converted to/from string[]
    scheduleEvents?: ScheduleEvent[];
}

export interface ScheduleEvent {
    id: number;
    scheduleId: number;
    courseId?: number | null;              // NEW: Course assignment per event
    date: Date;
    period: number;                        // Period number (1-10)
    lessonId?: number | null;
    eventType: string;                     // RENAMED: was specialCode, now required
    eventCategory?: string | null;         // NEW: EventCategory enum values
    comment?: string | null;
}

export interface ScheduleEventCreateResource {
    scheduleId: number;
    courseId?: number | null;              // NEW: Course assignment per event
    date: Date;
    period: number;
    lessonId?: number | null;
    eventType: string;                     // RENAMED: was specialCode, now required
    eventCategory?: string | null;         // NEW: EventCategory enum values
    comment?: string | null;
}

export interface ScheduleEventUpdateResource {
    id: number;
    courseId?: number | null;              // NEW: Course assignment per event
    date: Date;
    period: number;
    lessonId?: number | null;
    eventType: string;                     // RENAMED: was specialCode, now required
    eventCategory?: string | null;         // NEW: EventCategory enum values
    comment?: string | null;
}

export interface ScheduleEventsUpdateResource {
    scheduleId: number;
    scheduleEvents: ScheduleEvent[];
}

export interface ScheduleConfigUpdateResource {
    id: number;
    title: string;
    startDate: Date;
    endDate: Date;
    teachingDays: string;                  // Still string for API compatibility
    isLocked: boolean;
}

export interface ScheduleCreateResource {
    title: string;
    startDate: Date;
    endDate: Date;
    teachingDays?: string;  // Keep as string for API compatibility
  }
  

// NEW: Event type constants for type safety
export const EventTypes = {
    LESSON: 'Lesson',
    ASSEMBLY: 'Assembly',
    TESTING: 'Testing',
    HOLIDAY: 'Holiday',
    PROFESSIONAL_DEVELOPMENT: 'ProfessionalDevelopment',
    FIELD_TRIP: 'FieldTrip',
    WEATHER_DELAY: 'WeatherDelay',
    EARLY_DISMISSAL: 'EarlyDismissal',
    LUNCH: 'Lunch',
    HALL_DUTY: 'HallDuty',
    CAFETERIA_DUTY: 'CafeteriaDuty',
    STUDY_HALL: 'StudyHall',
    PREP: 'Prep',
    OTHER_DUTY: 'OtherDuty',
    ERROR: 'Error'
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// NEW: Event category constants for type safety
export const EventCategories = {
    LESSON: 'Lesson',
    SPECIAL_PERIOD: 'SpecialPeriod',
    SPECIAL_DAY: 'SpecialDay'
    // Note: Error events have null EventCategory
} as const;

export type EventCategory = typeof EventCategories[keyof typeof EventCategories];

// NEW: Type guards for event classification
export function isLessonEvent(event: ScheduleEvent): boolean {
    return event.eventCategory === EventCategories.LESSON;
}

export function isSpecialDayEvent(event: ScheduleEvent): boolean {
    return event.eventCategory === EventCategories.SPECIAL_DAY;
}

export function isSpecialPeriodEvent(event: ScheduleEvent): boolean {
    return event.eventCategory === EventCategories.SPECIAL_PERIOD;
}

export function isErrorEvent(event: ScheduleEvent): boolean {
    return event.eventType === EventTypes.ERROR;
}