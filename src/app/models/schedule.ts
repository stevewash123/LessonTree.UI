export interface Schedule {
    id: number;
    title: string;
    courseId: number;
    userId: number;
    startDate: Date;
    endDate: Date;  // ← Changed from numSchoolDays
    isLocked?: boolean;  // ← New
    teachingDays?: string;  // ← New (CSV format)
    scheduleDays?: ScheduleDay[];
  }
  
  // Add new resource interfaces for the split endpoints
  export interface ScheduleConfigUpdateResource {
    id: number;
    title: string;
    startDate: Date;
    endDate: Date;
    teachingDays: string;
    isLocked: boolean;
  }
  
  export interface ScheduleDaysUpdateResource {
    scheduleId: number;
    scheduleDays: ScheduleDay[];
  }
  
  export interface ScheduleDay {
    id: number;
    scheduleId: number;
    date: Date;
    lessonId?: number | null;
    specialCode?: string | null;
    comment?: string | null;
  }