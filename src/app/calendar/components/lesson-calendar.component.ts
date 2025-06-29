/* src/app/lessontree/calendar/lesson-calendar.component.ts - UPDATED FOR NEW INTERACTION SERVICE */
// RESPONSIBILITY: Displays lessons in calendar format and handles direct UI interactions.
// DOES NOT: Store schedule data, handle API operations, manage calendar configuration, handle course management, manage node selection, or coordinate complex effects - delegates to appropriate services.
// CALLED BY: Main application router, displays calendar view of selected course lessons.
import { Component, OnInit, OnDestroy, ViewChild, Input, computed, Signal, effect, AfterViewInit } from '@angular/core';
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
import { NodeSelectionService } from '../../lesson-tree/services/node-operations/node-selection.service';
import { UserService } from '../../user-config/user.service';
import { CalendarCoordinationService } from '../services/coordination/calendar-coordination.service';
import { ScheduleCoordinationService } from '../services/coordination/schedule-coordination.service';
import { ScheduleConfigurationStateService } from '../services/state/schedule-configuration-state.service';
import { ScheduleStateService } from '../services/state/schedule-state.service';
import { CalendarConfigurationService } from '../services/ui/calendar-configuration.service';
import { CalendarInteractionService } from '../services/ui/calendar-interaction.service';

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

  // PROPERLY FIXED: Readonly signals declared with proper initialization
  readonly hasSelection: Signal<boolean>;
  readonly selectedNodeType: Signal<string | null>;
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
    return this.nodeSelectionService.activeCourseId(); // FIXED: Use nodeSelectionService directly
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

  // Calendar options - created by configuration service
  readonly calendarOptions = computed(() => {
    const config = this.scheduleConfigurationStateService.activeConfiguration();
    const events = this.calendarCoordination.calendarEvents(); // **NEW: Get events from coordination service**

    console.log('[LessonCalendarComponent] 🔄 Recomputing calendar options:', {
      hasConfig: !!config,
      configId: config?.id,
      periodsPerDay: config?.periodsPerDay || 6,
      eventCount: events.length // **NEW: Log event count**
    });

    // Create base options
    const baseOptions = this.calendarConfigService.createCalendarOptions(
      this.handleEventClick.bind(this),
      this.handleEventContextMenu.bind(this),
      this.handleEventDrop.bind(this)
    );

    // **NEW: Add reactive events to the options**
    return {
      ...baseOptions,
      events: events // This will update whenever calendarCoordination.calendarEvents() changes
    };
  });

  constructor(
    private scheduleStateService: ScheduleStateService,
    private calendarConfigService: CalendarConfigurationService,
    private calendarCoordination: CalendarCoordinationService,
    private calendarInteraction: CalendarInteractionService,
    private scheduleContextService: ContextMenuService,
    private nodeSelectionService: NodeSelectionService,
    private userService: UserService,
    private courseDataService: CourseDataService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleCoordinationService: ScheduleCoordinationService,
    private dialog: MatDialog
  ) {
    // Initialize readonly signals
    this.hasSelection = this.nodeSelectionService.hasSelection;
    this.selectedNodeType = this.nodeSelectionService.selectedNodeType;
    this.selectedCourse = computed(() => {
      const node = this.nodeSelectionService.selectedNode();
      return node?.nodeType === 'Course' ? node : null;
    });

    this.selectedSchedule = this.scheduleStateService.selectedSchedule;
    this.isInMemorySchedule = this.scheduleStateService.isInMemorySchedule;
    this.hasUnsavedChanges = this.scheduleStateService.hasUnsavedChanges;
    this.canSaveSchedule = this.scheduleStateService.canSaveSchedule;

    // Configuration change effect - simplified
    effect(() => {
      const config = this.scheduleConfigurationStateService.activeConfiguration();

      if (config && this.calendar?.getApi) {
        const calendarApi = this.calendar.getApi();

        setTimeout(() => {
          const newOptions = this.calendarOptions();

          if (newOptions.slotMinTime) calendarApi.setOption('slotMinTime', newOptions.slotMinTime);
          if (newOptions.slotMaxTime) calendarApi.setOption('slotMaxTime', newOptions.slotMaxTime);
          if (newOptions.slotDuration) calendarApi.setOption('slotDuration', newOptions.slotDuration);
          if (newOptions.hiddenDays) calendarApi.setOption('hiddenDays', newOptions.hiddenDays);

          calendarApi.render();
        }, 100);
      }
    });

    // Initialize coordination service
    this.calendarCoordination.initialize({
      getCalendarApi: () => this.calendar?.getApi(),
      getCalendarOptions: () => this.calendarOptions(),
      setCalendarOptions: (options: CalendarOptions) => {
        // No-op - using reactive signals instead
      }
    });
  }

  ngOnInit(): void {
    console.log('[LessonCalendarComponent] ngOnInit');
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

  // Use interaction service for event click orchestration
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

  // Use interaction service for event drop orchestration
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

    // Critical: Stop event from reaching split panel drag service
    jsEvent.preventDefault();
    jsEvent.stopImmediatePropagation();

    // Check if context menu trigger exists
    if (!this.contextMenuTrigger) {
      console.error('❌ [LessonCalendarComponent] Context menu trigger not found!');
      return;
    }

    console.log('✅ [LessonCalendarComponent] Context menu trigger found, proceeding...');

    // Close any existing menu
    if (this.contextMenuTrigger?.menuOpen) {
      console.log('🔄 [LessonCalendarComponent] Closing existing menu first');
      this.contextMenuTrigger.closeMenu();
      // Wait for close animation
      setTimeout(() => this.openContextMenu(eventInfo, jsEvent), 200);
      return;
    }

    this.openContextMenu(eventInfo, jsEvent);
  }


  // Enhanced openContextMenu with better error handling
  private openContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    console.log('🚀 [LessonCalendarComponent] Opening context menu...');

    try {
      // CASE 1: Day cell context (no event, just date)
      if (eventInfo.date && !eventInfo.event) {
        console.log('📅 [LessonCalendarComponent] Setting day context for:', eventInfo.date);

        // Set date context in service
        this.scheduleContextService.setDateContext(eventInfo.date);
      }
      // CASE 2: Event context (existing logic)
      else if (eventInfo.event) {
        console.log('📋 [LessonCalendarComponent] Setting event context for:', eventInfo.event.title);

        // Create proper event structure for context service
        const eventClickArg: EventClickArg = {
          event: eventInfo.event,
          jsEvent: jsEvent,
          el: eventInfo.el,
          view: eventInfo.view
        };

        // Set event context in service
        this.scheduleContextService.setEventContext(eventClickArg);
      } else {
        console.warn('⚠️ [LessonCalendarComponent] No valid context found');
        return;
      }

      // Check if we have any actions
      const actions = this.scheduleContextService.getContextMenuActions();
      console.log('📋 [LessonCalendarComponent] Available context actions:', actions.length, actions);

      if (actions.length === 0) {
        console.warn('⚠️ [LessonCalendarComponent] No context actions available');
        return;
      }

      // Calculate position with viewport bounds checking
      const menuX = Math.min(jsEvent.clientX, window.innerWidth - 200);
      const menuY = Math.min(jsEvent.clientY, window.innerHeight - 150);

      this.contextMenuPosition.x = menuX + 'px';
      this.contextMenuPosition.y = menuY + 'px';

      console.log('📍 [LessonCalendarComponent] Context menu position:', this.contextMenuPosition);

      // Use requestAnimationFrame for proper DOM timing
      requestAnimationFrame(() => {
        if (this.contextMenuTrigger && !this.contextMenuTrigger.menuOpen) {
          console.log('🎭 [LessonCalendarComponent] Actually opening menu now...');
          this.contextMenuTrigger.openMenu();

          // Check if menu actually opened
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

  // Handle context menu selection
  executeContextAction(action: any): void {
    action.handler();
    this.contextMenuTrigger?.closeMenu();
  }

  // Handle schedule selection from controls
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


  // Handle save schedule from controls
  saveSchedule(): void {
    this.scheduleCoordinationService.saveCurrentSchedule().subscribe({
      error: (error: any) => {
        console.error('[LessonCalendarComponent] Save schedule error:', error);
      }
    });
  }

  // Handle create schedule from controls
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

  // Generate reports (stubbed for now)
  generateFullReport(): void {
    console.log('[LessonCalendarComponent] generateFullReport');
    // TODO: Implement full report generation
  }

  generateWeekReport(): void {
    console.log('[LessonCalendarComponent] generateWeekReport');
    // TODO: Implement week report generation
  }

  //spinner
  readonly isLoadingSchedule = computed(() => {
    const displayState = this.calendarCoordination.scheduleReadyForDisplay();

    // Show loading when we have courses but schedule/config isn't ready
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

    // Create a fake event for testing
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

    // Set test context
    this.scheduleContextService.setEventContext({
      event: fakeEvent.event,
      jsEvent: fakeMouseEvent,
      el: null,
      view: null
    } as any);

    // Set position
    this.contextMenuPosition.x = '200px';
    this.contextMenuPosition.y = '200px';

    // Try to open menu
    console.log('🚀 Attempting to open test menu...');
    this.contextMenuTrigger.openMenu();

    // Check result
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
