/* src/app/lessontree/calendar/lesson-calendar.component.ts - COMPLETE FILE WITH BULK EVENT METHODS */
// RESPONSIBILITY: Displays lessons in calendar format using official FullCalendar Angular pattern
// DOES NOT: Use computed signals for calendarOptions - uses simple object with reference updates
// CALLED BY: Main application router, displays calendar view of selected course lessons.

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  Input,
  computed,
  Signal,
  effect,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { UserConfigComponent } from '../../user-config/user-config.component';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { ContextMenuService } from '../services/ui/context-menu.service';
import { CourseDataService } from '../../lesson-tree/services/course-data/course-data.service';
import { UserService } from '../../user-config/user.service';
import { CalendarCoordinationService } from '../services/coordination/calendar-coordination.service';
import { ScheduleConfigurationStateService } from '../services/state/schedule-configuration-state.service';
import { ScheduleStateService } from '../services/state/schedule-state.service';
import { CalendarConfigurationService } from '../services/ui/calendar-configuration.service';
import { CalendarInteractionService } from '../services/ui/calendar-interaction.service';
import {EntitySelectionService} from '../../lesson-tree/services/state/entity-selection.service';
import { CalendarManagementService } from '../services/business/calendar-managment.service';
import {ScheduleBasicOperationsService} from '../services/business/schedule-basic-operations.service';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';



@Component({
  selector: 'app-lesson-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './lesson-calendar.component.html',
  styleUrls: ['./lesson-calendar.component.css']
})
export class LessonCalendarComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('contextMenuTrigger') contextMenuTrigger!: MatMenuTrigger;
  @ViewChild('calendar') calendar: any;

  // Input to control schedule controls visibility
  @Input() showScheduleControls: boolean = true;

  // Context menu state
  contextMenuPosition = { x: '0px', y: '0px' };
  private lastProcessedEventCount = 0;
  // ✅ OFFICIAL FULLCALENDAR PATTERN: Simple CalendarOptions object (not computed signal)
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: [
      {
        id: 'static1',
        title: 'Static Test Event',
        start: '2025-08-05', // Today's month
        backgroundColor: '#ff0000'
      },
      {
        id: 'static2',
        title: 'Another Static Event',
        start: '2025-08-06',
        backgroundColor: '#00ff00'
      }
    ]
  };

  // Debug mode flag for template
  debugMode: boolean = false;

  // PROPERLY FIXED: Readonly signals declared with proper initialization
  readonly hasSelection: Signal<boolean>;
  readonly selectedEntityType: Signal<string | null>;
  readonly selectedCourse: Signal<any | null>;

  // Schedule state signals - properly typed with Signal interface
  readonly selectedSchedule: Signal<any | null>;
  readonly isInMemorySchedule: Signal<boolean>;
  readonly hasUnsavedChanges: Signal<boolean>;
  readonly canSaveSchedule: Signal<boolean>;

  // Course and coordination signals
  readonly hasCoursesAvailable = computed(() => {
    return this.calendarCoordination.hasCoursesAvailable();
  });

  readonly coursesCount = computed(() => {
    return this.calendarCoordination.getActiveCourseCount();
  });

  readonly currentCourseId = computed(() => {
    return this.entitySelectionService.activeCourseId();
  });

  readonly selectedCourseData = computed(() => {
    return this.calendarCoordination.getCurrentCourse();
  });

  readonly canGenerateReports = computed(() => {
    const schedule = this.selectedSchedule();
    return schedule && !this.isInMemorySchedule();
  });

  // Get available context menu actions dynamically
  get contextMenuActions() {
    return this.scheduleContextService.getContextMenuActions();
  }

  constructor(
    private scheduleStateService: ScheduleStateService,
    private calendarConfigService: CalendarConfigurationService,
    private calendarCoordination: CalendarCoordinationService,
    private calendarManagementService: CalendarManagementService,
    private calendarInteraction: CalendarInteractionService,
    private scheduleContextService: ContextMenuService,
    private entitySelectionService: EntitySelectionService,
    private userService: UserService,
    private courseDataService: CourseDataService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleOperations: ScheduleBasicOperationsService,
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    // Initialize readonly signals
    this.hasSelection = this.entitySelectionService.hasSelection;
    this.selectedEntityType = this.entitySelectionService.selectedEntityType;
    this.selectedCourse = computed(() => {
      const entity = this.entitySelectionService.selectedEntity();
      return entity?.entityType === 'Course' ? entity : null;
    });

    this.selectedSchedule = this.scheduleStateService.selectedSchedule;
    this.isInMemorySchedule = this.scheduleStateService.isInMemorySchedule;
    this.hasUnsavedChanges = this.scheduleStateService.hasUnsavedChanges;
    this.canSaveSchedule = this.scheduleStateService.canSaveSchedule;

    // ✅ Set up effect to watch for events changes from services
    /* effect(() => {
      const events = this.calendarManagementService.calendarEvents();
      const config = this.scheduleConfigurationStateService.activeConfiguration();

      console.log('[LessonCalendarComponent] 🔄 Service events changed:', {
        eventCount: events.length,
        lastProcessed: this.lastProcessedEventCount,
        hasConfig: !!config,
        configId: config?.id
      });

      // ✅ LOOP BREAKER: Only process if event count actually changed
      if (events.length > 0 && events.length !== this.lastProcessedEventCount) {
        console.log('[LessonCalendarComponent] 📊 Processing NEW event count:', events.length);
        this.lastProcessedEventCount = events.length;

        // ✅ Force FullCalendar to refetch with your events function
        if (this.calendar) {
          this.calendar.getApi().refetchEvents();
        }
      } else if (events.length === this.lastProcessedEventCount) {
        console.log('[LessonCalendarComponent] ⚠️ Skipping duplicate event processing');
      }
    }); */
  }

  ngOnInit(): void {
    console.log('[LessonCalendarComponent] ngOnInit - MINIMAL TEST MODE');

    // ✅ Absolute minimal setup - no services, no signals
    this.calendarOptions = {
      initialView: 'dayGridMonth',
      plugins: [dayGridPlugin, interactionPlugin], // ✅ FIXED: Use imports instead of require
      events: [
        {
          id: 'test1',
          title: 'Hard-coded Test Event 1',
          start: '2025-08-05',
          backgroundColor: '#ff0000'
        },
        {
          id: 'test2',
          title: 'Hard-coded Test Event 2',
          start: '2025-08-06',
          backgroundColor: '#00ff00'
        }
      ]
    };

    console.log('[LessonCalendarComponent] Minimal calendar options set');
  }

  ngAfterViewInit(): void {
    console.log('🔍 [LessonCalendarComponent] Checking ViewChild connections...');
    console.log('Context menu trigger:', this.contextMenuTrigger ? 'Found' : 'NOT FOUND');
    console.log('Calendar ref:', this.calendar ? 'Found' : 'NOT FOUND');
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] ngOnDestroy');
    this.scheduleContextService.clearContext();
    this.calendarConfigService.cleanup();
  }

  handleEventClick(arg: EventClickArg): void {
    const shouldOpenContextMenu = this.calendarInteraction.handleEventClick(arg);

    if (shouldOpenContextMenu) {
      const fakeRightClick = new MouseEvent('contextmenu', {
        clientX: (arg.jsEvent as MouseEvent).clientX,
        clientY: (arg.jsEvent as MouseEvent).clientY,
        button: 2
      });
      this.handleEventContextMenu(arg, fakeRightClick);
    }
  }

  handleEventDrop(arg: EventDropArg): void {
    this.calendarInteraction.handleEventDrop(arg);
  }

  handleEventContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    console.log('🎯 [LessonCalendarComponent] Context menu handler called!', {
      hasEvent: !!eventInfo.event,
      hasDate: !!eventInfo.date,
      eventTitle: eventInfo.event?.title,
      date: eventInfo.date,
      mouseButton: jsEvent.button,
      clientX: jsEvent.clientX,
      clientY: jsEvent.clientY,
      timestamp: new Date().toISOString()
    });

    jsEvent.preventDefault();
    jsEvent.stopImmediatePropagation();

    if (!this.contextMenuTrigger) {
      console.error('❌ [LessonCalendarComponent] Context menu trigger not found!');
      return;
    }

    console.log('✅ [LessonCalendarComponent] Context menu trigger found, proceeding...');

    if (this.contextMenuTrigger?.menuOpen) {
      console.log('🔄 [LessonCalendarComponent] Closing existing menu first');
      this.contextMenuTrigger.closeMenu();
      setTimeout(() => this.openContextMenu(eventInfo, jsEvent), 200);
      return;
    }

    this.openContextMenu(eventInfo, jsEvent);
  }

  private openContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    console.log('🚀 [LessonCalendarComponent] Opening context menu...');

    try {
      if (eventInfo.date && !eventInfo.event) {
        console.log('📅 [LessonCalendarComponent] Setting day context for:', eventInfo.date);
        this.scheduleContextService.setDateContext(eventInfo.date);
      } else if (eventInfo.event) {
        console.log('📋 [LessonCalendarComponent] Setting event context for:', eventInfo.event.title);
        const eventClickArg: EventClickArg = {
          event: eventInfo.event,
          jsEvent: jsEvent,
          el: eventInfo.el,
          view: eventInfo.view
        };
        this.scheduleContextService.setEventContext(eventClickArg);
      } else {
        console.warn('⚠️ [LessonCalendarComponent] No valid context found');
        return;
      }

      const actions = this.scheduleContextService.getContextMenuActions();
      console.log('📋 [LessonCalendarComponent] Available context actions:', actions.length, actions);

      if (actions.length === 0) {
        console.warn('⚠️ [LessonCalendarComponent] No context actions available');
        return;
      }

      const menuX = Math.min(jsEvent.clientX, window.innerWidth - 200);
      const menuY = Math.min(jsEvent.clientY, window.innerHeight - 150);

      this.contextMenuPosition.x = menuX + 'px';
      this.contextMenuPosition.y = menuY + 'px';

      console.log('📍 [LessonCalendarComponent] Context menu position:', this.contextMenuPosition);

      requestAnimationFrame(() => {
        if (this.contextMenuTrigger && !this.contextMenuTrigger.menuOpen) {
          console.log('🎭 [LessonCalendarComponent] Actually opening menu now...');
          this.contextMenuTrigger.openMenu();

          setTimeout(() => {
            const isOpen = this.contextMenuTrigger.menuOpen;
            console.log('🔍 [LessonCalendarComponent] Menu open status after attempt:', isOpen);
          }, 100);
        } else {
          console.warn('⚠️ [LessonCalendarComponent] Cannot open menu - trigger unavailable or already open');
        }
      });

    } catch (error) {
      console.error('💥 [LessonCalendarComponent] Error opening context menu:', error);
    }
  }

  executeContextAction(action: any): void {
    action.handler();
    this.contextMenuTrigger?.closeMenu();
  }

  selectSchedule(scheduleId: number): void {
    this.scheduleOperations.loadActiveScheduleWithConfiguration().subscribe({
      next: (success: boolean) => {
        if (!success) {
          console.error(`[LessonCalendarComponent] Failed to select schedule ${scheduleId}`);
        }
      },
      error: (error: any) => {
        console.error(`[LessonCalendarComponent] Schedule selection error:`, error);
      }
    });
  }

  saveSchedule(): void {
    this.scheduleOperations.saveCurrentSchedule().subscribe({
      next: () => {
        console.log('[LessonCalendarComponent] Schedule saved successfully');
      },
      error: (error: any) => {
        console.error('[LessonCalendarComponent] Save schedule error:', error);
      }
    });
  }

  openConfigModal(): void {
    const dialogRef = this.dialog.open(UserConfigComponent, {
      width: '900px',
      maxWidth: '95vw',
      height: '80vh',
      maxHeight: '700px',
      panelClass: 'custom-dialog-container',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        // Optionally refresh calendar data if needed
      }
    });
  }

  generateFullReport(): void {
    console.log('[LessonCalendarComponent] generateFullReport');
  }

  generateWeekReport(): void {
    console.log('[LessonCalendarComponent] generateWeekReport');
  }

  readonly isLoadingSchedule = computed(() => {
    const displayState = this.calendarCoordination.scheduleReadyForDisplay();
    return this.hasCoursesAvailable() &&
      ((!displayState.hasEvents && !displayState.hasConfiguration) ||
        (displayState.hasEvents && !displayState.hasConfiguration));
  });

  readonly loadingMessage = computed(() => {
    const displayState = this.calendarCoordination.scheduleReadyForDisplay();

    if (!displayState.hasEvents && !displayState.hasConfiguration) {
      return 'Loading schedule...';
    } else if (displayState.hasEvents && !displayState.hasConfiguration) {
      return 'Loading configuration...';
    }
    return '';
  });

  debugEventDates(): void {
    console.log('🗓️ [DEBUG] === EVENT DATE ANALYSIS ===');

    // 1. Check what dates the events are for
    const serviceEvents = this.calendarManagementService.calendarEvents();
    const eventDates = serviceEvents.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      startDate: new Date(e.start).toDateString()
    }));

    console.log('🗓️ [DEBUG] Event dates:', {
      eventCount: serviceEvents.length,
      uniqueDates: [...new Set(eventDates.map(e => e.startDate))],
      firstFewEvents: eventDates.slice(0, 5)
    });

    // 2. Check what date the calendar is showing
    if (this.calendar) {
      const calendarApi = this.calendar.getApi();
      const currentDate = calendarApi.getDate();
      console.log('🗓️ [DEBUG] Calendar current date:', {
        currentDate: currentDate.toDateString(),
        currentMonth: currentDate.getMonth() + 1,
        currentYear: currentDate.getFullYear()
      });
    }

    console.log('🗓️ [DEBUG] === END DATE ANALYSIS ===');
  }

  testContextMenu(): void {
    console.log('🧪 [LessonCalendarComponent] Testing context menu...');

    if (!this.contextMenuTrigger) {
      console.error('❌ Test failed: Context menu trigger not found');
      return;
    }

    const fakeEvent = {
      event: {
        id: 'test',
        title: 'Test Event',
        extendedProps: {
          eventType: 'special'
        }
      },
      el: null,
      view: null
    };

    const fakeMouseEvent = new MouseEvent('contextmenu', {
      clientX: 200,
      clientY: 200,
      button: 2
    });

    this.scheduleContextService.setEventContext({
      event: fakeEvent.event,
      jsEvent: fakeMouseEvent,
      el: null,
      view: null
    } as any);

    this.contextMenuPosition.x = '200px';
    this.contextMenuPosition.y = '200px';

    console.log('🚀 Attempting to open test menu...');
    this.contextMenuTrigger.openMenu();

    setTimeout(() => {
      const isOpen = this.contextMenuTrigger.menuOpen;
      console.log('🔍 Test result - Menu opened:', isOpen);

      if (isOpen) {
        console.log('✅ Context menu trigger is working! Issue is with event listeners.');
      } else {
        console.log('❌ Context menu trigger itself is broken.');
      }
    }, 100);
  }

  debugDataFlow(): void {
    console.log('🔍 [DEBUG] === CALENDAR DATA FLOW ANALYSIS ===');

    // 1. Check service signal
    const serviceEvents = this.calendarManagementService.calendarEvents();
    console.log('🔍 [DEBUG] Service signal events:', {
      count: serviceEvents.length,
      firstThree: serviceEvents.slice(0, 3).map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        backgroundColor: e.backgroundColor
      }))
    });

    // 2. Check component calendarOptions
    console.log('🔍 [DEBUG] Component calendarOptions:', {
      hasEvents: !!this.calendarOptions.events,
      eventCount: Array.isArray(this.calendarOptions.events) ? this.calendarOptions.events.length : 0,
      eventsType: typeof this.calendarOptions.events,
      firstThree: Array.isArray(this.calendarOptions.events)
        ? this.calendarOptions.events.slice(0, 3).map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start
        }))
        : 'Not an array'
    });

    // 3. Check FullCalendar API
    if (this.calendar) {
      const calendarApi = this.calendar.getApi();
      const actualEvents = calendarApi.getEvents();
      console.log('🔍 [DEBUG] FullCalendar API events:', {
        count: actualEvents.length,
        firstThree: actualEvents.slice(0, 3).map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start?.toISOString(),
          startStr: e.startStr
        }))
      });
    } else {
      console.log('🔍 [DEBUG] ❌ Calendar API not available');
    }

    // 4. Check DOM
    const calendarElement = document.querySelector('.fc');
    const eventElements = document.querySelectorAll('.fc-event');
    console.log('🔍 [DEBUG] DOM state:', {
      hasCalendarElement: !!calendarElement,
      eventElementCount: eventElements.length
    });

    console.log('🔍 [DEBUG] === END DATA FLOW ANALYSIS ===');
  }
}
