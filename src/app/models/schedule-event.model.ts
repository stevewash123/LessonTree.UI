// **COMPLETE FILE** - models/schedule-event.model.ts
// RESPONSIBILITY: ScheduleEvent model and related types only
// DOES NOT: Handle Schedule model or utilities
// CALLED BY: Calendar services, schedule generation

export interface ScheduleEvent {
    id: number;
    scheduleId: number;
    courseId?: number | null;
    date: Date;
    period: number;                        // Period number (1-10)
    lessonId?: number | null;
    specialDayId?: number | null;          // NEW: Link to SpecialDay that created this event
    eventType: string;                     // Required: 'Lesson', 'Assembly', etc.
    eventCategory?: string | null;         // 'Lesson', 'SpecialPeriod', 'SpecialDay'
    comment?: string | null;

    // **NEW** - Rich lesson display properties from API
    lessonTitle?: string | null;
    lessonObjective?: string | null;
    lessonMethods?: string | null;
    lessonMaterials?: string | null;
    lessonAssessment?: string | null;
    lessonSort?: number;
}

export interface ScheduleEventCreateResource {
    scheduleId: number;
    courseId?: number | null;
    date: Date;
    period: number;
    lessonId?: number | null;
    eventType: string;
    eventCategory?: string | null;
    comment?: string | null;
}

export interface ScheduleEventUpdateResource {
    id: number;
    courseId?: number | null;
    date: Date;
    period: number;
    lessonId?: number | null;
    eventType: string;
    eventCategory?: string | null;
    comment?: string | null;
}

export interface ScheduleEventsUpdateResource {
    scheduleId: number;
    scheduleEvents: ScheduleEvent[];
}

// Event type constants (used only with ScheduleEvent)
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

// Event category constants (used only with ScheduleEvent)
export const EventCategories = {
    LESSON: 'Lesson',
    SPECIAL_PERIOD: 'SpecialPeriod',
    SPECIAL_DAY: 'SpecialDay'
    // Note: Error events have null EventCategory
} as const;

export type EventCategory = typeof EventCategories[keyof typeof EventCategories];

// Type guards for event classification
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