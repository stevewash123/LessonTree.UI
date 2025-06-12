// RESPONSIBILITY: Handles special day API calls and schedule override logic
// DOES NOT: Generate base events, manage state, or handle UI notifications
// CALLED BY: ScheduleGenerationService for special day integration

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ScheduleEvent, EventCategories } from '../../../models/schedule-event.model';
import { environment } from '../../../../environments/environment';

// Special Day DTO interface (matches API)
interface SpecialDayResource {
  id: number;
  scheduleId: number;
  date: string; // ISO date string
  periods: number[]; // Array of period numbers
  eventType: string; // 'Assembly', 'Testing', etc.
  title: string;
}

export interface SpecialDayIntegrationResult {
  success: boolean;
  events: ScheduleEvent[];
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SpecialDayIntegrationService {
  private apiUrl: string = environment.apiUrl + '/api';

  constructor(private http: HttpClient) {
    console.log('[SpecialDayIntegrationService] Initialized for special day API integration');
  }

  // Load special days and apply them to schedule events
  async loadAndApplySpecialDays(
    scheduleId: number, 
    baseEvents: ScheduleEvent[]
  ): Promise<SpecialDayIntegrationResult> {
    console.log(`[SpecialDayIntegrationService] Loading special days for schedule ${scheduleId}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Load special days from API
      const specialDays = await this.loadSpecialDaysFromAPI(scheduleId);
      console.log(`[SpecialDayIntegrationService] Loaded ${specialDays.length} special days`);

      if (specialDays.length === 0) {
        console.log('[SpecialDayIntegrationService] No special days found, returning base events');
        return { success: true, events: baseEvents, errors, warnings };
      }

      // Convert special days to schedule events
      const specialDayEvents = this.convertSpecialDaysToScheduleEvents(specialDays, scheduleId);
      console.log(`[SpecialDayIntegrationService] Converted ${specialDayEvents.length} special day events`);

      // Apply special days to base events (replace conflicting periods)
      const finalEvents = this.applySpecialDayOverrides(baseEvents, specialDayEvents);
      console.log(`[SpecialDayIntegrationService] Applied special day overrides, final count: ${finalEvents.length}`);

      // Count overrides for user feedback
      const overrideCount = specialDayEvents.length;
      if (overrideCount > 0) {
        warnings.push(`Applied ${overrideCount} special day overrides to schedule`);
      }

      return { success: true, events: finalEvents, errors, warnings };

    } catch (error: any) {
      console.error('[SpecialDayIntegrationService] Failed to load/apply special days:', error);
      errors.push(`Special day integration failed: ${error.message}`);
      return { success: false, events: baseEvents, errors, warnings };
    }
  }

  // Load special days from API
  private loadSpecialDaysFromAPI(scheduleId: number): Promise<SpecialDayResource[]> {
    console.log(`[SpecialDayIntegrationService] Fetching special days from API for schedule ${scheduleId}`);
    
    return this.http.get<SpecialDayResource[]>(`${this.apiUrl}/Schedule/${scheduleId}/specialDays`).pipe(
      map(response => {
        // Handle $values wrapper if present
        let data = response;
        if (response && typeof response === 'object' && '$values' in response) {
          data = (response as any).$values;
        }
        console.log(`[SpecialDayIntegrationService] API returned ${data.length} special days`);
        return data;
      }),
      catchError((error) => {
        if (error.status === 404) {
          console.log('[SpecialDayIntegrationService] No special days found (404)');
          return of([]);
        }
        console.error(`[SpecialDayIntegrationService] API error loading special days: ${error.message}`);
        throw error;
      })
    ).toPromise() as Promise<SpecialDayResource[]>;
  }

  // Convert special days to schedule events
  private convertSpecialDaysToScheduleEvents(specialDays: SpecialDayResource[], scheduleId: number): ScheduleEvent[] {
    console.log('[SpecialDayIntegrationService] Converting special days to schedule events');
    
    const scheduleEvents: ScheduleEvent[] = [];
    let eventIdCounter = -10000; // Use distinct negative range for special day events

    for (const specialDay of specialDays) {
      for (const period of specialDay.periods) {
        const scheduleEvent: ScheduleEvent = {
          id: eventIdCounter--,
          scheduleId: scheduleId,
          courseId: null,
          date: new Date(specialDay.date),
          period: period,
          lessonId: null,
          eventType: specialDay.eventType,
          eventCategory: EventCategories.SPECIAL_DAY,
          comment: specialDay.title
        };

        scheduleEvents.push(scheduleEvent);
        console.log(`[SpecialDayIntegrationService] Created special day event: ${specialDay.title} on ${specialDay.date} Period ${period}`);
      }
    }

    return scheduleEvents;
  }

  // Apply special day overrides to base events (special days win conflicts)
  private applySpecialDayOverrides(baseEvents: ScheduleEvent[], specialDayEvents: ScheduleEvent[]): ScheduleEvent[] {
    console.log(`[SpecialDayIntegrationService] Applying special day overrides to ${baseEvents.length} base events`);
    
    // Create lookup for special day events by date+period
    const specialDayLookup = new Map<string, ScheduleEvent>();
    for (const specialEvent of specialDayEvents) {
      const key = this.createDatePeriodKey(specialEvent.date, specialEvent.period);
      specialDayLookup.set(key, specialEvent);
    }

    // Filter out base events that conflict with special days
    const filteredBaseEvents = baseEvents.filter(baseEvent => {
      const key = this.createDatePeriodKey(baseEvent.date, baseEvent.period);
      const hasSpecialDayOverride = specialDayLookup.has(key);
      
      if (hasSpecialDayOverride) {
        console.log(`[SpecialDayIntegrationService] Override: ${key} replaced by special day`);
      }
      
      return !hasSpecialDayOverride;
    });

    // Combine filtered base events with special day events
    const finalEvents = [...filteredBaseEvents, ...specialDayEvents];
    
    console.log(`[SpecialDayIntegrationService] Final events: ${filteredBaseEvents.length} base + ${specialDayEvents.length} special = ${finalEvents.length} total`);
    
    return finalEvents;
  }

  // Create date+period lookup key
  private createDatePeriodKey(date: Date, period: number): string {
    const dateStr = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
    return `${dateStr}-P${period}`;
  }
}