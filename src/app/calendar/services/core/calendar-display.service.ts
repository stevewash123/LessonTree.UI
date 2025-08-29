// calendar-display.service.ts
// RESPONSIBILITY: Coordinate calendar display and event transformation
// DOES: Manage calendar events signal, coordinate with FullCalendar, transform events for display
// CALLED BY: CalendarInitializationService
// LOCATION: /calendar/services/core/

import { Injectable, signal, computed } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';

// Models
import { ScheduleEvent } from '../../../models/schedule-event.model';

// UI Services (the excellent specialized services we preserved)
import { CalendarEventService } from '../ui/calendar-event.service';

// State Services
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';

export interface CalendarDisplayCallbacks {
  getCalendarApi: () => any;
  getCalendarOptions: () => CalendarOptions;
  setCalendarOptions: (options: CalendarOptions) => void;
}

export interface DisplayUpdateResult {
  success: boolean;
  eventCount: number;
  transformedSuccessfully: boolean;
  calendarUpdated: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarDisplayService {

  // === SIGNAL STATE (Simple and Clean) ===
  private readonly _calendarEvents = signal<any[]>([]);
  private readonly _isDisplayReady = signal<boolean>(false);

  // Public readonly signals
  readonly calendarEvents = computed(() => this._calendarEvents());
  readonly isDisplayReady = computed(() => this._isDisplayReady());

  // Calendar callbacks for FullCalendar integration
  private displayCallbacks: CalendarDisplayCallbacks | null = null;

  constructor(
    private calendarEventService: CalendarEventService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService
  ) {
    console.log('[CalendarDisplayService] Display coordination service initialized');
  }

  // === INITIALIZATION ===

  /**
   * Initialize with calendar callbacks for FullCalendar integration
   */
  initialize(callbacks: CalendarDisplayCallbacks): void {
    this.displayCallbacks = callbacks;
    this._isDisplayReady.set(true);
    console.log('[CalendarDisplayService] ✅ Initialized with calendar callbacks');
  }

  // === MAIN DISPLAY COORDINATION ===

  /**
   * Update calendar with new events
   * SIMPLIFIED FROM: CalendarManagementService.refreshCalendarEventsOnly()
   */
  updateCalendarEvents(scheduleEvents: ScheduleEvent[]): DisplayUpdateResult {
    console.log('[CalendarDisplayService] 🎨 Updating calendar with events:', {
      inputEventCount: scheduleEvents.length,
      hasDisplayCallbacks: !!this.displayCallbacks
    });

    try {
      // Transform events using the excellent existing service
      const transformedEvents = this.transformEventsForDisplay(scheduleEvents);

      if (!transformedEvents || transformedEvents.length === 0) {
        console.warn('[CalendarDisplayService] ⚠️ No events after transformation');
        this._calendarEvents.set([]);
        return {
          success: true,
          eventCount: 0,
          transformedSuccessfully: false,
          calendarUpdated: true
        };
      }

      // Update signal with transformed events
      this._calendarEvents.set([...transformedEvents]);

      console.log('[CalendarDisplayService] ✅ Calendar events updated:', {
        originalEventCount: scheduleEvents.length,
        transformedEventCount: transformedEvents.length,
        signalUpdated: true
      });

      return {
        success: true,
        eventCount: transformedEvents.length,
        transformedSuccessfully: true,
        calendarUpdated: true
      };

    } catch (error: any) {
      console.error('[CalendarDisplayService] ❌ Failed to update calendar events:', error);

      // Clear events on error
      this._calendarEvents.set([]);

      return {
        success: false,
        eventCount: 0,
        transformedSuccessfully: false,
        calendarUpdated: false,
        error: error.message || 'Event transformation failed'
      };
    }
  }

  /**
   * Clear calendar events
   */
  clearCalendarEvents(): void {
    console.log('[CalendarDisplayService] 🗑️ Clearing calendar events');
    this._calendarEvents.set([]);
  }

  // === EVENT TRANSFORMATION ===

  /**
   * Transform schedule events for FullCalendar display
   * DELEGATES TO: CalendarEventService (excellent existing logic)
   */
  private transformEventsForDisplay(scheduleEvents: ScheduleEvent[]): any[] {
    console.log('[CalendarDisplayService] 🔄 Transforming events for display:', {
      inputCount: scheduleEvents.length,
      hasConfiguration: this.scheduleConfigurationStateService.hasActiveConfiguration()
    });

    if (!scheduleEvents || scheduleEvents.length === 0) {
      console.log('[CalendarDisplayService] ⚠️ No input events to transform');
      return [];
    }

    // Use the excellent existing transformation service
    const transformedEvents = this.calendarEventService.transformEventsForCalendar(scheduleEvents);

    console.log('[CalendarDisplayService] ✅ Events transformed:', {
      inputCount: scheduleEvents.length,
      outputCount: transformedEvents.length,
      transformationSuccess: transformedEvents.length > 0
    });

    // Validate transformed events
    const validEvents = transformedEvents.filter(event =>
      event.id && event.title && event.start && event.end
    );

    if (validEvents.length !== transformedEvents.length) {
      console.warn('[CalendarDisplayService] ⚠️ Some events failed validation:', {
        totalTransformed: transformedEvents.length,
        validEvents: validEvents.length,
        invalidCount: transformedEvents.length - validEvents.length
      });
    }

    return validEvents;
  }

  // === FULLCALENDAR CONFIGURATION UPDATES ===

  /**
   * Update FullCalendar configuration options
   */
  updateCalendarConfiguration(updates: Partial<CalendarOptions>): boolean {
    if (!this.displayCallbacks) {
      console.error('[CalendarDisplayService] ❌ Cannot update configuration - no callbacks set');
      return false;
    }

    try {
      const currentOptions = this.displayCallbacks.getCalendarOptions();
      const updatedOptions = { ...currentOptions, ...updates };

      this.displayCallbacks.setCalendarOptions(updatedOptions);

      console.log('[CalendarDisplayService] ✅ Calendar configuration updated:', {
        updatedProperties: Object.keys(updates)
      });

      return true;

    } catch (error) {
      console.error('[CalendarDisplayService] ❌ Failed to update calendar configuration:', error);
      return false;
    }
  }

  /**
   * Update hidden days on calendar
   */
  updateHiddenDays(hiddenDays: number[]): boolean {
    console.log('[CalendarDisplayService] 📅 Updating hidden days:', hiddenDays);

    if (!this.displayCallbacks) {
      console.error('[CalendarDisplayService] ❌ Cannot update hidden days - no callbacks set');
      return false;
    }

    // Update calendar options
    const configUpdated = this.updateCalendarConfiguration({ hiddenDays });

    // Update FullCalendar API directly if available
    const calendarApi = this.displayCallbacks.getCalendarApi();
    if (calendarApi && configUpdated) {
      try {
        calendarApi.setOption('hiddenDays', hiddenDays);
        console.log('[CalendarDisplayService] ✅ FullCalendar hidden days updated');
        return true;
      } catch (error) {
        console.error('[CalendarDisplayService] ❌ Failed to update FullCalendar hidden days:', error);
        return false;
      }
    }

    return configUpdated;
  }

  // === DISPLAY STATE MANAGEMENT ===

  /**
   * Check if display is ready for updates
   */
  isReadyForDisplay(): boolean {
    const hasCallbacks = !!this.displayCallbacks;
    const hasConfiguration = this.scheduleConfigurationStateService.hasActiveConfiguration();
    const isReady = this._isDisplayReady();

    return hasCallbacks && hasConfiguration && isReady;
  }

  /**
   * Get current display state
   */
  getDisplayState(): {
    isReady: boolean;
    eventCount: number;
    hasConfiguration: boolean;
    hasCallbacks: boolean;
  } {
    return {
      isReady: this._isDisplayReady(),
      eventCount: this._calendarEvents().length,
      hasConfiguration: this.scheduleConfigurationStateService.hasActiveConfiguration(),
      hasCallbacks: !!this.displayCallbacks
    };
  }

  // === COMPUTED STATE HELPERS ===

  /**
   * Check if calendar has events to display
   */
  readonly hasEvents = computed(() => this._calendarEvents().length > 0);

  /**
   * Get event count as computed signal
   */
  readonly eventCount = computed(() => this._calendarEvents().length);

  /**
   * Check if ready for display as computed signal
   */
  readonly readyForDisplay = computed(() => {
    return this._isDisplayReady() &&
      this.scheduleConfigurationStateService.hasActiveConfiguration() &&
      !!this.displayCallbacks;
  });

  // === UTILITY METHODS ===

  /**
   * Force refresh of current events (useful for testing)
   */
  forceRefresh(): void {
    console.log('[CalendarDisplayService] 🔄 Forcing display refresh');
    const currentEvents = this._calendarEvents();
    this._calendarEvents.set([...currentEvents]); // Trigger signal update
  }

  /**
   * Reset display service to initial state
   */
  reset(): void {
    console.log('[CalendarDisplayService] 🔄 Resetting display service');
    this._calendarEvents.set([]);
    this._isDisplayReady.set(false);
    this.displayCallbacks = null;
  }

  // === DEBUG METHODS ===

  /**
   * Get debug information about display service
   */
  getDebugInfo(): any {
    const currentEvents = this._calendarEvents();
    const displayState = this.getDisplayState();

    return {
      displayService: {
        initialized: true,
        isReady: displayState.isReady,
        hasCallbacks: displayState.hasCallbacks,
        hasConfiguration: displayState.hasConfiguration
      },
      events: {
        count: currentEvents.length,
        hasEvents: currentEvents.length > 0,
        sampleEvents: currentEvents.slice(0, 3).map(e => ({
          id: e.id,
          title: e.title,
          start: e.start,
          hasRequiredFields: !!(e.id && e.title && e.start && e.end)
        }))
      },
      signals: {
        calendarEventsCount: this.calendarEvents().length,
        isDisplayReady: this.isDisplayReady(),
        hasEvents: this.hasEvents(),
        eventCount: this.eventCount(),
        readyForDisplay: this.readyForDisplay()
      }
    };
  }

  /**
   * Test event transformation with mock data
   */
  testEventTransformation(mockEvents: ScheduleEvent[]): DisplayUpdateResult {
    console.log('[CalendarDisplayService] 🧪 Testing event transformation');
    return this.updateCalendarEvents(mockEvents);
  }
}
