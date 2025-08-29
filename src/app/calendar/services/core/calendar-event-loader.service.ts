// calendar-event-loader.service.ts - FIXED TYPE ERRORS
// RESPONSIBILITY: Paginated event loading and date range management
// DOES: Load events for specific date ranges, handle pagination, API coordination
// CALLED BY: CalendarInitializationService
// LOCATION: /calendar/services/core/

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

// API Services
import { ScheduleApiService } from '../api/schedule-api.service';

// State Services
import { ScheduleStateService } from '../state/schedule-state.service';

// Models
import { ScheduleEvent } from '../../../models/schedule-event.model';

export interface EventLoadResult {
  events: ScheduleEvent[];
  dateRange: {
    start: Date;
    end: Date;
  };
  scheduleId: number;
  eventCount: number;
  loadedSuccessfully: boolean;
  source: 'api' | 'cache' | 'error';
}

export interface DateRange {
  start: Date;
  end: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarEventLoaderService {

  // Simple cache for current month (optional optimization)
  private currentEventCache: {
    scheduleId: number;
    dateRange: DateRange;
    events: ScheduleEvent[];
    loadedAt: Date;
  } | null = null;

  constructor(
    private scheduleApiService: ScheduleApiService,
    private scheduleStateService: ScheduleStateService
  ) {
    console.log('[CalendarEventLoaderService] Paginated event loading service initialized');
  }

  // === MAIN EVENT LOADING METHODS ===

  /**
   * Load events for specific month containing the given date
   * EXTRACTED FROM: CalendarCoordinationService.refreshCurrentPage()
   * FIXED: Returns proper Observable<ScheduleEvent[]> type
   */
  loadEventsForMonth(scheduleId: number, activeDate: Date): Observable<ScheduleEvent[]> {
    const dateRange = this.getMonthRangeForDate(activeDate);

    console.log('[CalendarEventLoaderService] 📊 Loading events for month:', {
      scheduleId,
      activeDate: activeDate.toDateString(),
      dateRange: {
        start: dateRange.start.toDateString(),
        end: dateRange.end.toDateString()
      }
    });

    return this.loadEventsForDateRange(scheduleId, dateRange).pipe(
      map(result => result.events),
      tap(events => {
        console.log('[CalendarEventLoaderService] ✅ Month events loaded:', {
          eventCount: events.length,
          scheduleId,
          month: `${activeDate.getFullYear()}-${activeDate.getMonth() + 1}`
        });
      }),
      catchError(error => {
        console.error('[CalendarEventLoaderService] ❌ Failed to load month events:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Load events for specific date range
   * CORE API INTEGRATION: Uses existing date range endpoint
   */
  loadEventsForDateRange(scheduleId: number, dateRange: DateRange): Observable<EventLoadResult> {
    console.log('[CalendarEventLoaderService] 🔄 Loading events for date range:', {
      scheduleId,
      startDate: dateRange.start.toDateString(),
      endDate: dateRange.end.toDateString()
    });

    // Check cache first (optional optimization)
    if (this.isCacheValid(scheduleId, dateRange)) {
      console.log('[CalendarEventLoaderService] 📦 Returning cached events');
      return of({
        events: this.currentEventCache!.events,
        dateRange,
        scheduleId,
        eventCount: this.currentEventCache!.events.length,
        loadedSuccessfully: true,
        source: 'cache'
      });
    }

    // Load from API using existing endpoint
    return this.scheduleApiService.getScheduleEventsByDateRange(
      scheduleId,
      dateRange.start,
      dateRange.end
    ).pipe(
      map(events => ({
        events: events || [], // FIXED: Handle undefined response
        dateRange,
        scheduleId,
        eventCount: (events || []).length,
        loadedSuccessfully: true,
        source: 'api' as const
      })),
      tap(result => {
        console.log('[CalendarEventLoaderService] 📡 API events loaded:', {
          eventCount: result.eventCount,
          scheduleId: result.scheduleId,
          dateRange: {
            start: result.dateRange.start.toDateString(),
            end: result.dateRange.end.toDateString()
          }
        });

        // Update cache
        this.updateCache(scheduleId, dateRange, result.events);
      }),
      catchError(error => {
        console.error('[CalendarEventLoaderService] ❌ Failed to load events:', error);
        return of({
          events: [],
          dateRange,
          scheduleId,
          eventCount: 0,
          loadedSuccessfully: false,
          source: 'error' as const
        });
      })
    );
  }

  /**
   * Load events for specific week
   */
  loadEventsForWeek(scheduleId: number, weekStartDate: Date): Observable<ScheduleEvent[]> {
    const dateRange = this.getWeekRangeForDate(weekStartDate);

    console.log('[CalendarEventLoaderService] 📅 Loading events for week:', {
      scheduleId,
      weekStart: weekStartDate.toDateString(),
      dateRange: {
        start: dateRange.start.toDateString(),
        end: dateRange.end.toDateString()
      }
    });

    return this.loadEventsForDateRange(scheduleId, dateRange).pipe(
      map(result => result.events)
    );
  }

  // === DATE RANGE CALCULATION ===

  /**
   * Get month range for specific date
   * EXTRACTED FROM: CalendarCoordinationService.refreshCurrentPage()
   */
  private getMonthRangeForDate(date: Date): DateRange {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return {
      start: startOfMonth,
      end: endOfMonth
    };
  }

  /**
   * Get week range for specific date
   */
  private getWeekRangeForDate(date: Date, startDayOfWeek: number = 1): DateRange {
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek - startDayOfWeek;

    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      start: startOfWeek,
      end: endOfWeek
    };
  }

  // === SCHEDULE ID MANAGEMENT ===

  /**
   * Get schedule ID with fallback loading
   * EXTRACTED FROM: CalendarCoordinationService.ensureScheduleId()
   * FIXED: Proper async/await handling
   */
  async ensureScheduleId(): Promise<number | null> {
    console.log('[CalendarEventLoaderService] 🔍 Ensuring schedule ID is available');

    // Check if we already have a schedule in state
    const currentSchedule = this.scheduleStateService.getSchedule();

    if (currentSchedule?.id) {
      console.log('[CalendarEventLoaderService] ✅ Using schedule ID from state:', currentSchedule.id);
      return currentSchedule.id;
    }

    // If no schedule in state, load the active schedule
    console.log('[CalendarEventLoaderService] 📡 No schedule in state - loading active schedule');

    try {
      const activeSchedule = await this.scheduleApiService.getActiveSchedule().toPromise();

      if (activeSchedule?.id) {
        // Set the schedule in state for future use
        this.scheduleStateService.setSchedule(activeSchedule, false);
        console.log('[CalendarEventLoaderService] ✅ Loaded and cached active schedule:', {
          scheduleId: activeSchedule.id,
          title: activeSchedule.title
        });
        return activeSchedule.id;
      } else {
        console.log('[CalendarEventLoaderService] ❌ No active schedule found');
        return null;
      }
    } catch (error) {
      console.error('[CalendarEventLoaderService] ❌ Failed to load active schedule:', error);
      return null;
    }
  }

  /**
   * Load events with automatic schedule ID resolution
   * FIXED: Proper async/await and error handling
   */
  async loadEventsWithAutoScheduleId(activeDate: Date): Promise<ScheduleEvent[]> {
    console.log('[CalendarEventLoaderService] 🔄 Loading events with auto schedule ID resolution');

    try {
      const scheduleId = await this.ensureScheduleId();

      if (!scheduleId) {
        console.warn('[CalendarEventLoaderService] ❌ No schedule ID available - returning empty events');
        return [];
      }

      const events = await this.loadEventsForMonth(scheduleId, activeDate).toPromise();
      return events || []; // FIXED: Handle undefined result
    } catch (error) {
      console.error('[CalendarEventLoaderService] ❌ Failed to load events with auto schedule ID:', error);
      return [];
    }
  }

  // === CURRENT VIEW REFRESH METHODS ===

  /**
   * Load events for current calendar view (week or month)
   * OPTIMIZED: Loads only the data needed for current view mode
   * Used for: Lesson move refreshes, configuration changes
   */
  loadEventsForCurrentView(scheduleId: number, activeDate: Date, viewMode: 'week' | 'month' = 'week'): Observable<ScheduleEvent[]> {
    console.log('[CalendarEventLoaderService] 🔄 Loading events for current view:', {
      scheduleId,
      activeDate: activeDate.toDateString(),
      viewMode
    });

    if (viewMode === 'week') {
      return this.loadEventsForCurrentWeek(scheduleId, activeDate);
    } else {
      return this.loadEventsForMonth(scheduleId, activeDate);
    }
  }

  /**
   * Load events for current week view
   * OPTIMIZED: Loads same week range that's currently displayed
   */
  loadEventsForCurrentWeek(scheduleId: number, activeDate: Date): Observable<ScheduleEvent[]> {
    // Find the Monday of the week containing activeDate (matching FullCalendar's week view)
    const weekStart = this.getWeekStart(activeDate);

    console.log('[CalendarEventLoaderService] 📅 Loading events for current week:', {
      scheduleId,
      activeDate: activeDate.toDateString(),
      weekStart: weekStart.toDateString()
    });

    return this.loadEventsForWeek(scheduleId, weekStart);
  }

  /**
   * Get the start of week (Monday) for any given date
   * MATCHES: FullCalendar's week view logic
   */
  private getWeekStart(date: Date): Date {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Make Monday = 0

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0); // Start of day

    return weekStart;
  }

  // === CACHE MANAGEMENT (Optional Optimization) ===

  /**
   * Check if current cache is valid for date range
   */
  private isCacheValid(scheduleId: number, dateRange: DateRange): boolean {
    if (!this.currentEventCache) {
      return false;
    }

    const cache = this.currentEventCache;

    // Check if same schedule and date range
    const sameSchedule = cache.scheduleId === scheduleId;
    const sameDateRange =
      cache.dateRange.start.getTime() === dateRange.start.getTime() &&
      cache.dateRange.end.getTime() === dateRange.end.getTime();

    // Check if cache is recent (within 5 minutes)
    const cacheAge = Date.now() - cache.loadedAt.getTime();
    const isFresh = cacheAge < 5 * 60 * 1000; // 5 minutes

    return sameSchedule && sameDateRange && isFresh;
  }

  /**
   * Update cache with new data
   */
  private updateCache(scheduleId: number, dateRange: DateRange, events: ScheduleEvent[]): void {
    this.currentEventCache = {
      scheduleId,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      events: [...events], // Copy array
      loadedAt: new Date()
    };

    console.log('[CalendarEventLoaderService] 📦 Cache updated:', {
      scheduleId,
      eventCount: events.length,
      dateRange: {
        start: dateRange.start.toDateString(),
        end: dateRange.end.toDateString()
      }
    });
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.currentEventCache = null;
    console.log('[CalendarEventLoaderService] 🗑️ Cache cleared');
  }

  // === NAVIGATION HELPERS ===

  /**
   * Load events for next month
   */
  loadNextMonth(currentDate: Date): Observable<ScheduleEvent[]> {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return this.loadEventsWithAutoScheduleIdObservable(nextMonth);
  }

  /**
   * Load events for previous month
   */
  loadPreviousMonth(currentDate: Date): Observable<ScheduleEvent[]> {
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return this.loadEventsWithAutoScheduleIdObservable(previousMonth);
  }

  /**
   * Observable version of loadEventsWithAutoScheduleId
   * FIXED: Proper error handling
   */
  private loadEventsWithAutoScheduleIdObservable(activeDate: Date): Observable<ScheduleEvent[]> {
    return new Observable(subscriber => {
      this.loadEventsWithAutoScheduleId(activeDate)
        .then(events => {
          subscriber.next(events);
          subscriber.complete();
        })
        .catch(error => {
          console.error('[CalendarEventLoaderService] ❌ Observable error:', error);
          subscriber.next([]); // Return empty array on error
          subscriber.complete();
        });
    });
  }

  // === DEBUG AND UTILITY ===

  /**
   * Get debug information about data service
   */
  getDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.getSchedule();

    return {
      dataService: {
        initialized: true,
        canLoadEvents: true,
        hasScheduleInState: !!currentSchedule,
        scheduleId: currentSchedule?.id || null
      },
      cache: this.currentEventCache ? {
        hasCache: true,
        scheduleId: this.currentEventCache.scheduleId,
        eventCount: this.currentEventCache.events.length,
        dateRange: {
          start: this.currentEventCache.dateRange.start.toDateString(),
          end: this.currentEventCache.dateRange.end.toDateString()
        },
        cacheAge: Date.now() - this.currentEventCache.loadedAt.getTime(),
        isValid: this.isCacheValid(
          this.currentEventCache.scheduleId,
          this.currentEventCache.dateRange
        )
      } : {
        hasCache: false
      }
    };
  }

  /**
   * Test event loading with specific parameters
   */
  testEventLoading(scheduleId: number, testDate: Date): Observable<EventLoadResult> {
    console.log('[CalendarEventLoaderService] 🧪 Testing event loading');
    const dateRange = this.getMonthRangeForDate(testDate);
    return this.loadEventsForDateRange(scheduleId, dateRange);
  }
}
