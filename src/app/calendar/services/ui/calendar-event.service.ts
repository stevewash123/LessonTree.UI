// **COMPLETE FILE** - CalendarEventService Final Clean Version
// RESPONSIBILITY: Event transformation and handling for calendar display
// DOES NOT: Create events, manage course data, or handle generation logic
// CALLED BY: Calendar components for event transformation and display formatting

import { Injectable } from '@angular/core';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService {
  constructor(private scheduleConfigurationStateService: ScheduleConfigurationStateService) {
    console.log('[CalendarEventService] Initialized for event transformation');
  }

  // === EVENT TRANSFORMATION METHODS (CORE RESPONSIBILITY) ===

  /**
   * Transform schedule events for calendar display
   */
  transformEventsForCalendar(events: ScheduleEvent[]): any[] {
    console.log(`[CalendarEventService] Transforming ${events.length} events for calendar`);
    console.log('🔍 [CalendarEventService] RAW INPUT EVENTS:', {
      eventCount: events.length,
      firstEventSample: events[0],
      allEventDates: events.map(e => ({
        id: e.id,
        date: e.date,
        period: e.period,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle,
        eventType: e.eventType
      }))
    });

    const transformedEvents = events.map(event => this.transformSingleEvent(event));

    return transformedEvents;
  }

  /**
   * Transform a single schedule event
   */
  transformSingleEvent(event: ScheduleEvent): any {
    // Get time slot mapping for this event
    const timeSlot = this.mapPeriodToTimeSlot(event.period, new Date(event.date));

    console.log('🔍 TRANSFORM SINGLE EVENT:', {
      inputDate: event.date,
      inputPeriod: event.period,
      outputStart: timeSlot.start,
      outputEnd: timeSlot.end,
      title: this.getEventDisplayTitle(event)
    });

    // Get colors based on event type
    const eventColors = this.getEventColors(event);

    return {
      id: event.id,
      title: this.getEventDisplayTitle(event),
      start: timeSlot.start,
      end: timeSlot.end,
      backgroundColor: eventColors.backgroundColor,
      borderColor: eventColors.borderColor,
      textColor: eventColors.textColor,
      extendedProps: {
        scheduleEvent: event,
        period: event.period,
        courseId: event.courseId,
        lessonId: event.lessonId,
        specialDayId: event.specialDayId, // ✅ CRITICAL FIX: Include Special Day ID for edit/delete operations
        eventType: event.eventType,
        eventCategory: event.eventCategory, // ✅ Also include category for easier identification
        room: eventColors.room,
        lessonTitle: event.lessonTitle,
        lessonObjective: event.lessonObjective,
        lessonMethods: event.lessonMethods
      }
    };
  }

  /**
   * Map period number to time slot for FullCalendar
   */
  private mapPeriodToTimeSlot(period: number, date: Date): { start: string; end: string } {
    const startHour = 8;
    const eventStartHour = startHour + period - 1;
    const eventEndHour = eventStartHour + 1;

    const eventDate = new Date(date);
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');

    const start = `${year}-${month}-${day}T${eventStartHour.toString().padStart(2, '0')}:00:00`;
    const end = `${year}-${month}-${day}T${eventEndHour.toString().padStart(2, '0')}:00:00`;

    return { start, end };
  }

  /**
   * Get event colors based on event type and category
   */
  private getEventColors(event: ScheduleEvent): { backgroundColor: string; borderColor: string; textColor: string; room: string } {
    console.log('🎨 [CalendarEventService] Getting colors for event:', {
      id: event.id,
      eventCategory: event.eventCategory,
      eventType: event.eventType,
      specialDayId: event.specialDayId,
      period: event.period,
      title: event.lessonTitle || event.eventType
    });

    // Special Day events get consistent colors across all periods
    // Check for both eventCategory='SpecialDay' OR presence of specialDayId
    if ((event.eventCategory === 'SpecialDay' || event.specialDayId) && event.specialDayId) {
      console.log('🎨 [CalendarEventService] ✅ USING SPECIAL DAY COLORS for:', {
        eventType: event.eventType,
        specialDayId: event.specialDayId,
        period: event.period,
        eventCategory: event.eventCategory
      });
      return this.getSpecialDayColors(event);
    }

    // Regular lesson events use enhanced period assignment colors or attractive defaults
    const periodAssignment = this.getPeriodAssignmentForEvent(event);
    if (periodAssignment) {
      console.log('🎨 [CalendarEventService] Using enhanced period assignment colors for period:', event.period);

      // Use our enhanced default colors instead of the old bright ones
      const enhancedColors = this.getDefaultEventColors(event);

      return {
        backgroundColor: enhancedColors.backgroundColor,
        borderColor: enhancedColors.borderColor,
        textColor: enhancedColors.textColor,
        room: periodAssignment.room || ''
      };
    }

    // Default fallback colors
    console.log('🎨 [CalendarEventService] Using default colors for event:', event.eventType);
    return this.getDefaultEventColors(event);
  }

  /**
   * Get consistent colors for all periods of the same Special Day
   */
  private getSpecialDayColors(event: ScheduleEvent): { backgroundColor: string; borderColor: string; textColor: string; room: string } {
    // Debug: Check what color properties are available on the event
    console.log('🎨 [DEBUG] Special Day color check:', {
      specialDayId: event.specialDayId,
      eventType: event.eventType,
      period: event.period,
      hasSpecialDayBackgroundColor: !!(event as any).specialDayBackgroundColor,
      hasSpecialDayFontColor: !!(event as any).specialDayFontColor,
      specialDayBackgroundColor: (event as any).specialDayBackgroundColor,
      specialDayFontColor: (event as any).specialDayFontColor,
      // Legacy fields for backwards compatibility
      hasBackgroundColor: !!event.backgroundColor,
      hasFontColor: !!event.fontColor,
      backgroundColor: event.backgroundColor,
      fontColor: event.fontColor,
      fullEvent: event
    });

    // ✅ NEW: Check for embedded SpecialDay color fields first (from API response)
    if ((event as any).specialDayBackgroundColor && (event as any).specialDayFontColor) {
      console.log(`🎨 ✅ Using embedded SpecialDay colors:`, {
        specialDayId: event.specialDayId,
        eventType: event.eventType,
        period: event.period,
        specialDayBackgroundColor: (event as any).specialDayBackgroundColor,
        specialDayFontColor: (event as any).specialDayFontColor
      });

      return {
        backgroundColor: (event as any).specialDayBackgroundColor,
        borderColor: this.adjustColorBrightness((event as any).specialDayBackgroundColor, -20), // Slightly darker border
        textColor: (event as any).specialDayFontColor,
        room: ''
      };
    }

    // Legacy: Check if the event has custom colors stored (backwards compatibility)
    if (event.backgroundColor && event.fontColor) {
      console.log(`🎨 Using legacy stored colors for Special Day:`, {
        specialDayId: event.specialDayId,
        eventType: event.eventType,
        period: event.period,
        backgroundColor: event.backgroundColor,
        fontColor: event.fontColor
      });

      return {
        backgroundColor: event.backgroundColor,
        borderColor: this.adjustColorBrightness(event.backgroundColor, -20), // Slightly darker border
        textColor: event.fontColor,
        room: ''
      };
    }

    // Fallback to palette if no custom colors (for legacy Special Days)
    const specialDayId = event.specialDayId!;

    // Define bright, standout color palette for special days - varied shades, no white text
    const specialDayPalette = [
      { bg: '#FFB3B3', text: '#8B0000', border: '#CD5C5C' }, // Light Red with Dark Red text
      { bg: '#B3E5E0', text: '#004D40', border: '#00695C' }, // Light Teal with Dark Teal text
      { bg: '#B3D9FF', text: '#0D47A1', border: '#1976D2' }, // Light Blue with Dark Blue text
      { bg: '#C8E6C9', text: '#1B5E20', border: '#388E3C' }, // Light Green with Dark Green text
      { bg: '#FFF9C4', text: '#F57F17', border: '#FBC02D' }, // Very Light Yellow with Orange text
      { bg: '#E1BEE7', text: '#4A148C', border: '#7B1FA2' }, // Light Purple with Dark Purple text
      { bg: '#B2DFDB', text: '#00695C', border: '#26A69A' }, // Light Mint with Dark Teal text
      { bg: '#FFECB3', text: '#E65100', border: '#FF9800' }  // Light Amber with Dark Orange text
    ];

    // Use modulo to cycle through colors consistently
    const colorIndex = specialDayId % specialDayPalette.length;
    const selectedColor = specialDayPalette[colorIndex];

    console.log(`🎨 Using fallback palette for Special Day ${specialDayId}:`, {
      specialDayId,
      colorIndex,
      selectedColor,
      eventType: event.eventType,
      period: event.period
    });

    return {
      backgroundColor: selectedColor.bg,
      borderColor: selectedColor.border,
      textColor: selectedColor.text,
      room: ''
    };
  }

  /**
   * Adjust color brightness by a percentage
   */
  private adjustColorBrightness(hex: string, percent: number): string {
    // Remove # if present
    const color = hex.replace('#', '');

    const num = parseInt(color, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  /**
   * Get attractive default colors for events without specific assignments
   */
  private getDefaultEventColors(event: ScheduleEvent): { backgroundColor: string; borderColor: string; textColor: string; room: string } {
    // Use period number to assign attractive default colors
    const period = event.period || 1;

    // Define attractive color palette for default period assignments - varied shades
    const defaultPeriodColors = [
      { bg: '#DCEDC8', text: '#33691E', border: '#689F38' }, // Period 1: Medium Light Green
      { bg: '#BBDEFB', text: '#0D47A1', border: '#1976D2' }, // Period 2: Medium Light Blue
      { bg: '#FFCC80', text: '#BF360C', border: '#F57C00' }, // Period 3: Medium Light Orange
      { bg: '#CE93D8', text: '#4A148C', border: '#8E24AA' }, // Period 4: Medium Light Purple
      { bg: '#F8BBD0', text: '#880E4F', border: '#C2185B' }, // Period 5: Medium Light Pink
      { bg: '#80CBC4', text: '#004D40', border: '#00695C' }, // Period 6: Medium Light Teal
      { bg: '#AED581', text: '#33691E', border: '#689F38' }, // Period 7: Medium Light Lime
      { bg: '#FFD54F', text: '#E65100', border: '#FF8F00' }  // Period 8: Medium Light Amber
    ];

    // Use modulo to cycle through colors if more than 8 periods
    const colorIndex = (period - 1) % defaultPeriodColors.length;
    const selectedColor = defaultPeriodColors[colorIndex];

    console.log(`🎨 Default period ${period} color assignment:`, {
      period,
      colorIndex,
      selectedColor
    });

    return {
      backgroundColor: selectedColor.bg,
      borderColor: selectedColor.border,
      textColor: selectedColor.text,
      room: ''
    };
  }

  /**
   * Look up period assignment colors and details for an event
   */
  private getPeriodAssignmentForEvent(event: ScheduleEvent): any | null {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!activeConfig?.periodAssignments) {
      return null;
    }

    const periodAssignment = activeConfig.periodAssignments.find(
      (assignment: any) => assignment.period === event.period
    );

    if (!periodAssignment) {
      return null;
    }

    return {
      backgroundColor: periodAssignment.backgroundColor,
      fontColor: periodAssignment.fontColor,
      period: periodAssignment.period,
      room: periodAssignment.room,
      notes: periodAssignment.notes
    };
  }

  /**
   * Get display title for an event
   */
  getEventDisplayTitle(event: ScheduleEvent): string {
    // Use rich lesson data if available (from enhanced API)
    if (event.lessonTitle) {
      return event.lessonTitle;
    }

    // Special Day events get their title displayed
    if (event.eventCategory === 'SpecialDay') {
      // Try to use the actual special day title if available
      const specialDayTitle = event.eventType || 'Special Day';

      // Add period information for clarity
      return `${specialDayTitle} (P${event.period})`;
    }

    // Fallback to generic titles for other non-lesson events
    if (event.eventCategory === 'SpecialPeriod') {
      return event.eventType || 'Special Period';
    }

    // Final fallback
    return event.eventType || 'Event';
  }

  /**
   * Map schedule events to calendar format - used by calendar-coordination.service
   */
  mapScheduleEventsToCalendarEvents(scheduleEvents: ScheduleEvent[]): any[] {
    console.log('[CalendarEventService] 🔍 MAPPING SCHEDULE EVENTS TO CALENDAR:', {
      inputEventCount: scheduleEvents.length,
      timestamp: new Date().toISOString()
    });

    // ✅ ADD THIS DETAILED DEBUG
    console.log('🔍 [CalendarEventService] DETAILED INPUT ANALYSIS:', {
      totalEvents: scheduleEvents.length,
      eventsByType: scheduleEvents.reduce((acc, e) => {
        acc[e.eventType || 'unknown'] = (acc[e.eventType || 'unknown'] || 0) + 1;
        return acc;
      }, {} as any),
      eventsByCategory: scheduleEvents.reduce((acc, e) => {
        acc[e.eventCategory || 'null'] = (acc[e.eventCategory || 'null'] || 0) + 1;
        return acc;
      }, {} as any),
      sampleEvents: scheduleEvents.slice(0, 3).map(e => ({
        id: e.id,
        date: e.date,
        period: e.period,
        eventType: e.eventType,
        eventCategory: e.eventCategory,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle
      }))
    });

    const lessonEvents = scheduleEvents.filter(e => e.eventCategory === 'Lesson');
    console.log('[CalendarEventService] 📚 LESSON EVENTS IN SCHEDULE:', {
      totalLessonEvents: lessonEvents.length,
      lessonEventDetails: lessonEvents.map(e => ({
        eventId: e.id,
        date: e.date,
        period: e.period,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle,
        lessonSort: e.lessonSort,
        courseId: e.courseId
      }))
    });

    // ✅ CALL THE TRANSFORMATION AND LOG RESULT
    const result = this.transformEventsForCalendar(scheduleEvents);

    console.log('🔍 [CalendarEventService] FINAL MAPPING RESULT:', {
      inputCount: scheduleEvents.length,
      outputCount: result.length,
      successful: result.length === scheduleEvents.length
    });

    return result;
  }
}
