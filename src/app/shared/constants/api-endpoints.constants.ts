export const API_ENDPOINTS = {
    // ScheduleEvent endpoints
    SCHEDULE_EVENTS: '/api/ScheduleEvent',
    SCHEDULE_EVENT_BY_ID: (id: number) => `/api/ScheduleEvent/${id}`,
    SCHEDULE_EVENTS_BY_DATE: (scheduleId: number, date: string) => 
      `/api/ScheduleEvent/byDate/${scheduleId}/${date}`,
    SCHEDULE_EVENTS_BULK_UPDATE: (scheduleId: number) => 
      `/api/Schedule/${scheduleId}/events`,
    
    // User Configuration endpoints
    USER_CONFIGURATION: (userId: number) => `/api/User/${userId}/configuration`,
  } as const;