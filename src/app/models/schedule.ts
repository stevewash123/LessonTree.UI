// **COMPLETE FILE** - models/schedule.model.ts
// RESPONSIBILITY: Schedule model and related interfaces only
// DOES NOT: Handle ScheduleEvent (see schedule-event.model.ts) or utilities
// CALLED BY: Calendar services, schedule components

import { ScheduleEvent } from "./schedule-event.model";
import {SpecialDay} from './specialDay.model';

export interface Schedule {
    id: number;
    title: string;
    userId: number;
    scheduleConfigurationId: number; // Reference to configuration
    isLocked: boolean;
    createdDate: Date;
    scheduleEvents: ScheduleEvent[]; // Event data only
    specialDays: SpecialDay[]; // User-created special days
}

export interface ScheduleCreateResource {
    title: string;
    scheduleConfigurationId: number;
    scheduleEvents?: ScheduleEvent[]; // Optional for creation
}
