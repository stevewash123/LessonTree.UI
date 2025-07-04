// **COMPLETE FILE** - CalendarInteractionService with Observable Events
// RESPONSIBILITY: Orchestrates user interactions with calendar events and coordinates cross-component side effects.
// DOES NOT: Handle reactive state effects or calendar configuration - pure interaction orchestration.
// CALLED BY: LessonCalendarComponent for all user interaction handling.

import { Injectable } from '@angular/core';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, Observable } from 'rxjs';
import { ScheduleApiService } from '../api/schedule-api.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { CalendarEventService } from './calendar-event.service';
import {CourseDataService} from '../../../lesson-tree/services/course-data/course-data.service';
import {ScheduleEvent} from '../../../models/schedule-event.model';
import {EntitySelectionService} from '../../../lesson-tree/services/state/entity-selection.service';

// ✅ NEW: Observable event interfaces for cross-component coordination
export interface LessonSelectionEvent {
  lessonId: number | null;
  lessonTitle: string | null;
  courseId: number | null;
  date: Date;
  period: number;
  source: 'calendar-click';
  timestamp: Date;
}

export interface EventInteractionEvent {
  interactionType: 'click' | 'drop' | 'context-menu';
  eventId: string | number;
  eventType: string | null;
  lessonId: number | null;
  date: Date;
  period: number;
  success: boolean;
  source: 'calendar-interaction';
  timestamp: Date;
}

export interface LessonMoveEvent {
  lessonId: number;
  lessonTitle: string;
  oldDate: Date | null;
  newDate: Date;
  oldPeriod: number | null;
  newPeriod: number;
  moveType: 'drag-drop' | 'manual';
  source: 'calendar-interaction';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarInteractionService {

  // ✅ NEW: Observable events for cross-component coordination
  private readonly _lessonSelected$ = new Subject<LessonSelectionEvent>();
  private readonly _eventInteraction$ = new Subject<EventInteractionEvent>();
  private readonly _lessonMoved$ = new Subject<LessonMoveEvent>();

  // Public observables for business logic subscriptions
  readonly lessonSelected$ = this._lessonSelected$.asObservable();
  readonly eventInteraction$ = this._eventInteraction$.asObservable();
  readonly lessonMoved$ = this._lessonMoved$.asObservable();

  constructor(
    private calendarEventService: CalendarEventService,
    private lessonCalendarService: ScheduleApiService,
    private scheduleStateService: ScheduleStateService,
    private entitySelectionService: EntitySelectionService,
    private courseDataService: CourseDataService,
    private toastr: ToastrService
  ) {
    console.log('[CalendarInteractionService] Initialized with Observable events for cross-component coordination');
  }

  // ✅ ENHANCED: Orchestrate event click handling with Observable event emission
  public handleEventClick(arg: any): any {
    console.log('[CalendarInteractionService] Handling event click:', arg);

    const extendedProps = arg.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];
    const lessonId = scheduleEvent?.lessonId || extendedProps['lessonId'];
    const eventType = scheduleEvent?.eventType || extendedProps['eventType'];

    const success = true;
    const interactionResult = {
      success,
      eventData: extendedProps,
      eventId: arg.event.id
    };

    // ✅ NEW: Emit event interaction Observable for business logic
    this._eventInteraction$.next({
      interactionType: 'click',
      eventId: arg.event.id,
      eventType: eventType,
      lessonId: lessonId,
      date: new Date(arg.event.start),
      period: extendedProps['period'] || 0,
      success,
      source: 'calendar-interaction',
      timestamp: new Date()
    });

    // ✅ NEW: Emit lesson selection event if this is a lesson
    if (lessonId && eventType === 'Lesson') {
      const lesson = this.findLessonById(lessonId);

      this._lessonSelected$.next({
        lessonId: lessonId,
        lessonTitle: lesson?.title || scheduleEvent?.lessonTitle || 'Unknown Lesson',
        courseId: scheduleEvent?.courseId || extendedProps['courseId'],
        date: new Date(arg.event.start),
        period: extendedProps['period'] || 0,
        source: 'calendar-click',
        timestamp: new Date()
      });

      console.log('🚨 [CalendarInteractionService] EMITTED lessonSelected event (Observable)', {
        lessonId: lessonId,
        lessonTitle: lesson?.title || 'Unknown',
        courseId: scheduleEvent?.courseId,
        period: extendedProps['period'],
        source: 'calendar-click'
      });
    }

    console.log('🚨 [CalendarInteractionService] EMITTED eventInteraction event (Observable)', {
      interactionType: 'click',
      eventId: arg.event.id,
      eventType: eventType,
      success,
      source: 'calendar-interaction'
    });

    return interactionResult;
  }

  // ✅ ENHANCED: Handle event drop with Observable event emission
  public handleEventDrop(arg: any): any {
    console.log('[CalendarInteractionService] Handling event drop:', arg);

    const extendedProps = arg.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];
    const lessonId = scheduleEvent?.lessonId || extendedProps['lessonId'];
    const eventType = scheduleEvent?.eventType || extendedProps['eventType'];

    const success = true;
    const dropResult = {
      success,
      eventData: extendedProps,
      newDate: arg.event.start,
      oldDate: arg.oldEvent?.start
    };

    // ✅ NEW: Emit event interaction Observable
    this._eventInteraction$.next({
      interactionType: 'drop',
      eventId: arg.event.id,
      eventType: eventType,
      lessonId: lessonId,
      date: new Date(arg.event.start),
      period: extendedProps['period'] || 0,
      success,
      source: 'calendar-interaction',
      timestamp: new Date()
    });

    // ✅ NEW: Emit lesson move event if this is a lesson
    if (lessonId && eventType === 'Lesson') {
      const lesson = this.findLessonById(lessonId);

      this._lessonMoved$.next({
        lessonId: lessonId,
        lessonTitle: lesson?.title || scheduleEvent?.lessonTitle || 'Unknown Lesson',
        oldDate: arg.oldEvent?.start || null,
        newDate: new Date(arg.event.start),
        oldPeriod: null, // Could be extracted from oldEvent if needed
        newPeriod: extendedProps['period'] || 0,
        moveType: 'drag-drop',
        source: 'calendar-interaction',
        timestamp: new Date()
      });

      console.log('🚨 [CalendarInteractionService] EMITTED lessonMoved event (Observable)', {
        lessonId: lessonId,
        lessonTitle: lesson?.title || 'Unknown',
        oldDate: arg.oldEvent?.start,
        newDate: arg.event.start,
        moveType: 'drag-drop',
        source: 'calendar-interaction'
      });
    }

    console.log('🚨 [CalendarInteractionService] EMITTED eventInteraction event (Observable)', {
      interactionType: 'drop',
      eventId: arg.event.id,
      eventType: eventType,
      success,
      source: 'calendar-interaction'
    });

    return dropResult;
  }

  private findLessonById(lessonId: number): any | null {
    const activeCourseId = this.entitySelectionService.activeCourseId();
    if (!activeCourseId) return null;

    const course = this.courseDataService.getCourseById(activeCourseId);
    if (!course?.topics) return null;

    // Search through course structure for lesson
    for (const topic of course.topics) {
      if (topic.lessons) {
        const lesson = topic.lessons.find((l: any) => l.id === lessonId);
        if (lesson) return lesson;
      }

      if (topic.subTopics) {
        for (const subTopic of topic.subTopics) {
          if (subTopic.lessons) {
            const lesson = subTopic.lessons.find((l: any) => l.id === lessonId);
            if (lesson) return lesson;
          }
        }
      }
    }

    return null;
  }

  // ✅ NEW: Cleanup method with Observable completion
  ngOnDestroy(): void {
    this._lessonSelected$.complete();
    this._eventInteraction$.complete();
    this._lessonMoved$.complete();
    console.log('[CalendarInteractionService] All Observable subjects completed on destroy');
  }
}
