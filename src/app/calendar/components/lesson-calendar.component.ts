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
import {ScheduleWorkflowCoordinationService} from '../services/coordination/schedule-workflow-coordination.service';
import { CalendarManagementService } from '../services/business/calendar-managment.service';

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

  // ✅ OFFICIAL FULLCALENDAR PATTERN: Simple CalendarOptions object (not computed signal)
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [],
    events: [
      { title: 'Initial Event 1', start: '2025-08-05', backgroundColor: '#ff0000' },
      { title: 'Initial Event 2', start: '2025-08-06', backgroundColor: '#00ff00' }
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
    private scheduleCoordinationService: ScheduleWorkflowCoordinationService,
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
    effect(() => {
      const events = this.calendarManagementService.calendarEvents();
      const config = this.scheduleConfigurationStateService.activeConfiguration();

      console.log('[LessonCalendarComponent] 🔄 Service events changed:', {
        eventCount: events.length,
        hasConfig: !!config,
        configId: config?.id
      });

      // Only update if we have real service events (not initial empty state)
      if (events.length > 0) {
        console.log('[LessonCalendarComponent] 📊 Updating calendar with service events');
        this.updateCalendarEvents(events);
      }
    });
  }

  ngOnInit(): void {
    console.log('[LessonCalendarComponent] ngOnInit - setting up calendar options');

    // ✅ Set up plugins and base options
    const baseOptions = this.calendarConfigService.createCalendarOptions(
      this.handleEventClick.bind(this),
      this.handleEventContextMenu.bind(this),
      this.handleEventDrop.bind(this)
    );

    // ✅ Initialize with base options and initial events
    this.calendarOptions = {
      ...baseOptions,
      events: [
        { title: 'Initial Event 1', start: '2025-08-05', backgroundColor: '#ff0000' },
        { title: 'Initial Event 2', start: '2025-08-06', backgroundColor: '#00ff00' }
      ]
    };

    console.log('[LessonCalendarComponent] Initial calendar options set:', {
      eventCount: Array.isArray(this.calendarOptions.events) ? this.calendarOptions.events.length : 0,
      plugins: this.calendarOptions.plugins?.length || 0
    });

    // Initialize coordination service
    this.calendarManagementService.initialize({
      getCalendarApi: () => this.calendar?.getApi(),
      getCalendarOptions: () => this.calendarOptions,
      setCalendarOptions: (options: CalendarOptions) => {
        this.calendarOptions = options;
      }
    });
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
    this.calendarCoordination.cleanup();
  }

  // ✅ OFFICIAL FULLCALENDAR EVENT UPDATE METHOD
  updateCalendarEvents(newEvents: any[]): void {
    const currentEvents = Array.isArray(this.calendarOptions.events) ? this.calendarOptions.events : [];

    console.log('🔄 [LessonCalendarComponent] Updating calendar events using official FullCalendar pattern:', {
      oldEventCount: currentEvents.length,
      newEventCount: newEvents.length,
      newEvents: newEvents.slice(0, 2).map(e => ({ id: e.id, title: e.title, start: e.start }))
    });

    // ✅ CRITICAL: Create entirely new CalendarOptions object
    // This is the official FullCalendar pattern for Angular
    this.calendarOptions = {
      ...this.calendarOptions, // Keep existing options (plugins, handlers, etc.)
      events: [...newEvents]   // New events array reference
    };

    console.log('✅ [LessonCalendarComponent] Calendar options updated with new object reference');
  }

  // ✅ BULK EVENT MANAGEMENT METHODS - Uses proven updateCalendarEvents pattern

  debugReplaceAllEvents(): void {
    console.log('🧪 [DEBUG] Replacing ALL events using proven pattern');

    // Create completely new event set
    const newEvents = [
      {
        id: `bulk-1-${Date.now()}`,
        title: '🚀 NEW Event 1',
        start: '2025-08-05',
        backgroundColor: '#ff6b6b'
      },
      {
        id: `bulk-2-${Date.now()}`,
        title: '🎯 NEW Event 2',
        start: '2025-08-06',
        backgroundColor: '#4ecdc4'
      },
      {
        id: `bulk-3-${Date.now()}`,
        title: '⭐ NEW Event 3',
        start: '2025-08-07',
        backgroundColor: '#45b7d1'
      }
    ];

    // Use your proven method - this WORKS
    this.updateCalendarEvents(newEvents);

    console.log('✅ Bulk replacement completed using proven pattern');
    console.log('📊 New events:', newEvents.length);
  }

  debugAddEventToBulk(): void {
    console.log('🧪 [DEBUG] Adding event via bulk update');

    // Get current events
    const currentEvents = Array.isArray(this.calendarOptions.events)
      ? this.calendarOptions.events as any[]
      : [];

    // Create new event
    const newEvent = {
      id: `added-${Date.now()}`,
      title: '➕ ADDED Event',
      start: '2025-08-08',
      backgroundColor: '#ffa500'
    };

    // Bulk update with all events + new one
    this.updateCalendarEvents([...currentEvents, newEvent]);

    console.log('✅ Event added via bulk update');
    console.log('📊 Total events:', currentEvents.length + 1);
  }

  debugRemoveEventFromBulk(targetTitle: string = 'Initial Event 1'): void {
    console.log('🧪 [DEBUG] Removing event via bulk update');

    // Get current events
    const currentEvents = Array.isArray(this.calendarOptions.events)
      ? this.calendarOptions.events as any[]
      : [];

    // Filter out the target event
    const filteredEvents = currentEvents.filter(event => event.title !== targetTitle);

    if (filteredEvents.length === currentEvents.length) {
      console.log(`❌ Event "${targetTitle}" not found`);
      return;
    }

    // Bulk update with filtered events
    this.updateCalendarEvents(filteredEvents);

    console.log(`✅ Event "${targetTitle}" removed via bulk update`);
    console.log('📊 Remaining events:', filteredEvents.length);
  }

  debugModifyEventInBulk(targetTitle: string = 'Initial Event 1'): void {
    console.log('🧪 [DEBUG] Modifying event via bulk update');

    // Get current events
    const currentEvents = Array.isArray(this.calendarOptions.events)
      ? this.calendarOptions.events as any[]
      : [];

    // Find and modify the target event
    const modifiedEvents = currentEvents.map(event => {
      if (event.title === targetTitle) {
        return {
          ...event,
          title: '🔄 MODIFIED Event',
          backgroundColor: '#9b59b6',
          extendedProps: {
            ...event.extendedProps,
            modifiedAt: new Date().toISOString(),
            originalTitle: targetTitle
          }
        };
      }
      return event;
    });

    // Check if anything was modified
    const wasModified = modifiedEvents.some(event => event.title === '🔄 MODIFIED Event');
    if (!wasModified) {
      console.log(`❌ Event "${targetTitle}" not found for modification`);
      return;
    }

    // Bulk update with modified events
    this.updateCalendarEvents(modifiedEvents);

    console.log(`✅ Event "${targetTitle}" modified via bulk update`);
    console.log('📊 Total events:', modifiedEvents.length);
  }

  debugSimulateServiceUpdate(): void {
    console.log('🧪 [DEBUG] Simulating service data update');

    // Simulate getting fresh events from a service
    const simulatedServiceEvents = [
      {
        id: 'service-1',
        title: '📚 Math Lesson 1',
        start: '2025-08-05',
        backgroundColor: '#e74c3c',
        extendedProps: {
          courseId: 'math-101',
          lessonNumber: 1,
          period: 1
        }
      },
      {
        id: 'service-2',
        title: '📚 Math Lesson 2',
        start: '2025-08-06',
        backgroundColor: '#e74c3c',
        extendedProps: {
          courseId: 'math-101',
          lessonNumber: 2,
          period: 1
        }
      },
      {
        id: 'service-3',
        title: '🔬 Science Lab',
        start: '2025-08-07',
        backgroundColor: '#27ae60',
        extendedProps: {
          courseId: 'science-101',
          lessonNumber: 1,
          period: 2
        }
      }
    ];

    // Use your proven method - exactly like service would do
    this.updateCalendarEvents(simulatedServiceEvents);

    console.log('✅ Service data simulation completed');
    console.log('📊 Service events loaded:', simulatedServiceEvents.length);
  }

  // ✅ EXISTING DEBUG METHODS (keep your current ones too)

  // REPLACE your existing testBasicUpdate() method with this:

  testBasicUpdate(): void {
    console.log('🧪 [DEBUG] Testing basic update via mock service signal update');

    // Step 1: Update mock data via service signal
    this.calendarManagementService.updateMockEvent('mock-lesson-1', {
      title: '🚀 UPDATED Math Lesson 1',
      backgroundColor: '#9b59b6',
      borderColor: '#8e44ad',
      extendedProps: {
        eventCategory: 'Lesson',
        lessonId: 101,
        courseId: 'math-101',
        period: 1,
        lessonSort: 1,
        updateSource: 'testBasicUpdate'
      }
    });

    // Step 2: Execute same code as connectToMockServices to get updated data
    console.log('🔗 [LessonCalendarComponent] Connecting to UPDATED mock service events');

    // Tell service to use the updated mock data (puts mock data into main signal)
    this.calendarManagementService.useMockData();

    // Get updated mock events (same signature as real service)
    const updatedMockEvents = this.calendarManagementService.mockCalendarEvents();

    if (updatedMockEvents.length > 0) {
      console.log('🎯 [LessonCalendarComponent] Got UPDATED mock events from service:', {
        count: updatedMockEvents.length,
        events: updatedMockEvents.map(e => ({
          title: e.title,
          start: e.start,
          backgroundColor: e.backgroundColor,
          wasModified: !!e.extendedProps?.modifiedAt || !!e['extendedProps']?.['modifiedAt']
        }))
      });

      // ✅ Use same pattern as connectToServices/connectToMockServices
      this.updateCalendarEvents(updatedMockEvents);

      console.log('✅ [LessonCalendarComponent] Mock data update completed via service signal flow');
    } else {
      console.log('❌ [LessonCalendarComponent] No updated mock events available');
    }
  }

  testBasicUpdateWithChangeDetection(): void {
    console.log('🧪 [DEBUG] Testing with manual change detection');

    const newEvents = [
      { id: 'force1', title: 'FORCED Update 1', start: '2025-08-05', backgroundColor: '#0000ff' },
      { id: 'force2', title: 'FORCED Update 2', start: '2025-08-06', backgroundColor: '#ffff00' }
    ];

    console.log('🔄 Before update:', this.calendarOptions.events);

    // Update using your method
    this.updateCalendarEvents(newEvents);

    console.log('🔄 After update:', this.calendarOptions.events);

    // Force Angular change detection
    this.changeDetectorRef.markForCheck();
    this.changeDetectorRef.detectChanges();

    console.log('✅ Manual change detection triggered');
  }
  testEventSwap(): void {
    console.log('🧪 [DEBUG] Testing event swap using official pattern');

    const currentEvents = Array.isArray(this.calendarOptions.events) ? this.calendarOptions.events as any[] : [];
    if (currentEvents.length >= 2) {
      // ✅ Swap the events
      const swappedEvents = [
        { ...currentEvents[1], start: '2025-08-05' },
        { ...currentEvents[0], start: '2025-08-06' }
      ];

      this.updateCalendarEvents(swappedEvents);
    }
  }

  testAddEvent(): void {
    console.log('🧪 [DEBUG] Testing add event using official pattern');

    const currentEvents = Array.isArray(this.calendarOptions.events) ? this.calendarOptions.events as any[] : [];
    const newEvent = {
      id: `new${Date.now()}`,
      title: 'Added Event',
      start: '2025-08-07',
      backgroundColor: '#ff00ff'
    };

    // ✅ Add event using official pattern (new array)
    this.updateCalendarEvents([...currentEvents, newEvent]);
  }

  inspectCalendarState(): void {
    console.log('🧪 [DEBUG] Current calendar state:', {
      optionsEvents: this.calendarOptions.events,
      optionsReference: !!this.calendarOptions,
      calendarReference: !!this.calendar
    });

    if (this.calendar) {
      const calendarApi = this.calendar.getApi();
      const actualEvents = calendarApi.getEvents();

      console.log('🧪 [DEBUG] FullCalendar actual events:', {
        count: actualEvents.length,
        events: actualEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start ? e.start.toISOString().split('T')[0] : null
        }))
      });
    }
  }

  connectToServices(): void {
    console.log('🔗 [LessonCalendarComponent] Connecting to service events');

    // Get events from your service
    const serviceEvents = this.calendarManagementService.calendarEvents();

    if (serviceEvents.length > 0) {
      console.log('📊 [LessonCalendarComponent] Got events from service:', {
        count: serviceEvents.length,
        firstTwo: serviceEvents.slice(0, 2).map(e => ({ title: e.title, start: e.start }))
      });

      // ✅ Use official pattern to update with service events
      this.updateCalendarEvents(serviceEvents);
    } else {
      console.log('📊 [LessonCalendarComponent] No service events available');
    }
  }

  connectToMockServices(): void {
    console.log('🎭 [LessonCalendarComponent] Connecting to MOCK service events');

    // Tell service to use mock data
    this.calendarManagementService.useMockData();

    // Get mock events (same signature as real service)
    const mockEvents = this.calendarManagementService.mockCalendarEvents();

    if (mockEvents.length > 0) {
      console.log('🎭 [LessonCalendarComponent] Got MOCK events from service:', {
        count: mockEvents.length,
        events: mockEvents.map(e => ({
          title: e.title,
          start: e.start,
          extendedProps: e.extendedProps?.eventCategory
        }))
      });

      // ✅ Use same pattern as connectToServices
      this.updateCalendarEvents(mockEvents);
    } else {
      console.log('🎭 [LessonCalendarComponent] No mock events available');
    }
  }

  // ✅ EXISTING EVENT HANDLERS (unchanged)

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
    this.scheduleCoordinationService.loadActiveScheduleWithConfiguration().subscribe({
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
    this.scheduleCoordinationService.saveCurrentSchedule().subscribe({
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
}
