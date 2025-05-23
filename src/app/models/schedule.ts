export interface Schedule {
    id: number;
    title: string;
    courseId: number;
    userId: number;
    startDate: Date;
    numSchoolDays: number;
    scheduleDays?: ScheduleDay[]; // Optional to handle API responses that might not include this
    teachingDays?: string[]; // Optional as it might not be in all API responses
}

export interface ScheduleDay {
    id: number;
    scheduleId: number;
    date: Date;
    lessonId: number | null;
    specialCode: string | null;
    comment: string | null;
}