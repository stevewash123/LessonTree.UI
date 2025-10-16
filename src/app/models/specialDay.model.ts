export interface SpecialDay {
  id: number;
  scheduleId: number;
  date: Date;
  periods: number[]; // Array of affected periods (e.g., [1, 2, 3])
  eventType: string; // 'Assembly', 'ProfessionalDevelopment', etc.
  title: string;
  description?: string;
  backgroundColor?: string; // Custom color for this Special Day
  fontColor?: string; // Custom font color for this Special Day
}

// For creating new special days
export interface SpecialDayCreateResource {
  date: Date;
  periods: number[];
  eventType: string;
  title: string;
  description?: string;
  backgroundColor?: string;
  fontColor?: string;
}

// For updating existing special days
export interface SpecialDayUpdateResource {
  id: number;
  date: Date;
  periods: number[];
  eventType: string;
  title: string;
  description?: string;
  backgroundColor?: string;
  fontColor?: string;
}

// Response from updating special days
export interface SpecialDayUpdateResponse {
  specialDay: SpecialDay;
  calendarRefreshNeeded: boolean;
  refreshReason?: string;
}

// Existing modal interfaces remain unchanged
export interface SpecialDayModalData {
  date: Date;
  periods?: number[];
  mode: 'add' | 'edit';
  existingSpecialDay?: {
    id: number;
    periods: number[];
    eventType: string;
    title: string;
    description?: string;
    date: Date;
    backgroundColor?: string;
    fontColor?: string;
  } | null;
}

export interface SpecialDayResult {
  action: 'save' | 'delete';
  data?: {
    id?: number; // ✅ ADD: ID field for edit operations
    date: Date;
    periods: number[];
    specialCode: string;
    title: string;
    description?: string;
    backgroundColor?: string;
    fontColor?: string;
  };
}
