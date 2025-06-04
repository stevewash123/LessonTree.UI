// src/app/models/schedule.ts - CLEAN SCHEDULE EVENT IMPLEMENTATION
// RESPONSIBILITY: Schedule and ScheduleEvent models only
// DOES NOT: Handle legacy ScheduleDay compatibility
// CALLED BY: All calendar services and components

// Import shared models
export type { PeriodAssignment, TeachingConfig } from './shared';

export interface Schedule {
  id: number;
  title: string;
  courseId: number;
  userId: number;
  startDate: Date;
  endDate: Date;
  isLocked?: boolean;
  teachingDays?: string;
  scheduleEvents?: ScheduleEvent[];
}

export interface ScheduleEvent {
  id: number;
  scheduleId: number;
  date: Date;
  period: number;                    // Period number (1-10)
  lessonId?: number | null;
  specialCode?: string | null;
  comment?: string | null;
}

export interface ScheduleEventCreateResource {
  scheduleId: number;
  date: Date;
  period: number;
  lessonId?: number | null;
  specialCode?: string | null;
  comment?: string | null;
}

export interface ScheduleEventUpdateResource {
  id: number;
  date: Date;
  period: number;
  lessonId?: number | null;
  specialCode?: string | null;
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
  teachingDays: string;
  isLocked: boolean;
}

export interface ScheduleCreateResource {
  title: string;
  courseId: number;
  startDate: Date;
  endDate: Date;
  teachingDays?: string[];
}