import { PeriodAssignment } from "./schedule";

export interface TeachingConfig {
    schoolYear: string;
    periodsPerDay: number;
    periodAssignments: PeriodAssignment[];
    lastModified: Date;
  }
  
  export interface User {
    id: string;
    username: string;
    fullName: string;
    district: number | null;
    roles: string[];
    claims?: { [key: string]: string | string[] };
    teachingConfig?: TeachingConfig;
  }
  
  export interface TeachingConfigUpdate {
    schoolYear: string;
    periodsPerDay: number;
    periodAssignments: PeriodAssignment[];
  }
  