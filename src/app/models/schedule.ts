// **COMPLETE FILE** - models/schedule.model.ts
// RESPONSIBILITY: Schedule model and related interfaces only
// DOES NOT: Handle ScheduleEvent (see schedule-event.model.ts) or utilities
// CALLED BY: Calendar services, schedule components

import { ScheduleEvent } from "./schedule-event.model";

export interface Schedule {
    id: number;
    title: string;
    userId: number;
    startDate: Date;
    endDate: Date;
    isLocked?: boolean;
    teachingDays: string[];  // Standardized on string[] everywhere
    scheduleEvents?: ScheduleEvent[];  // FIXED: Should be array, not single object
}

export interface ScheduleCreateResource {
    title: string;
    startDate: Date;
    endDate: Date;
    teachingDays: string[];  // Standardized on string[]
}

export interface ScheduleConfigUpdateResource {
    id: number;
    title: string;
    startDate: Date;
    endDate: Date;
    teachingDays: string[];  // Standardized on string[]
    isLocked: boolean;
}