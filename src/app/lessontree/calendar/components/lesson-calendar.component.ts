/* src/app/lessontree/calendar/lesson-calendar.component.ts - UPDATED FOR NEW INTERACTION SERVICE */
// RESPONSIBILITY: Displays lessons in calendar format and handles direct UI interactions.
// DOES NOT: Store schedule data, handle API operations, manage calendar configuration, handle course management, manage node selection, or coordinate complex effects - delegates to appropriate services.
// CALLED BY: Main application router, displays calendar view of selected course lessons.
import { Component, OnInit, OnDestroy, ViewChild, Input, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { UserConfigComponent } from '../../../home/user-config/user-config.component';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { ScheduleStateService } from '../services/schedule-state.service';
import { SchedulePersistenceService } from '../services/schedule-persistence.service';
import { CalendarConfigurationService } from '../services/calendar-configuration.service';
import { CalendarCoordinationService } from '../services/calendar-coordination.service';
import { CalendarInteractionService } from '../services/calendar-interaction.service';
import { ContextMenuService } from '../services/context-menu.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { UserService } from '../../../core/services/user.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { CourseCrudService } from '../../../core/services/course-crud.service';
import { parseId } from '../../../core/utils/type-conversion.utils';

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
export class LessonCalendarComponent implements OnInit, OnDestroy {
  @ViewChild('contextMenuTrigger') contextMenuTrigger!: MatMenuTrigger;
  @ViewChild('calendar') calendar: any;
  
  // Input to control schedule controls visibility
  @Input() showScheduleControls: boolean = true;

  // Subscriptions
  private userSubscription?: Subscription;

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
  calendarOptions: CalendarOptions;

  constructor(
    private scheduleStateService: ScheduleStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarConfigService: CalendarConfigurationService,
    private calendarCoordination: CalendarCoordinationService,
    private calendarInteraction: CalendarInteractionService, // NEW: Interaction service
    private scheduleContextService: ContextMenuService,
    private nodeSelectionService: NodeSelectionService,
    private userService: UserService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService,
    private dialog: MatDialog
  ) {
    console.log('[LessonCalendarComponent] Initializing');

    // PROPERLY INITIALIZE: Assign signals in constructor to avoid readonly issues
    this.hasSelection = this.nodeSelectionService.hasSelection;
    this.selectedNodeType = this.nodeSelectionService.selectedNodeType;
    this.selectedCourse = computed(() => {
      const node = this.nodeSelectionService.selectedNode();
      return node?.nodeType === 'Course' ? node : null;
    });

    // Schedule state signals - assigned in constructor
    this.selectedSchedule = this.scheduleStateService.selectedSchedule;
    this.isInMemorySchedule = this.scheduleStateService.isInMemorySchedule;
    this.hasUnsavedChanges = this.scheduleStateService.hasUnsavedChanges;
    this.canSaveSchedule = this.scheduleStateService.canSaveSchedule;

    // Initialize calendar options using configuration service with right-click handler
    this.calendarOptions = this.calendarConfigService.createCalendarOptions(
        this.handleEventClick.bind(this),
        this.handleEventContextMenu.bind(this), // Event-based context menu
        this.handleEventDrop.bind(this)
      );

    // Initialize coordination service with simplified calendar callbacks
    this.calendarCoordination.initialize({
      getCalendarApi: () => this.calendar?.getApi(),
      getCalendarOptions: () => this.calendarOptions,
      setCalendarOptions: (options: CalendarOptions) => { this.calendarOptions = options; }
    });
  }

  ngOnInit(): void {
    console.log('[LessonCalendarComponent] ngOnInit');
    
    // Initialize user subscription
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (parseId(user?.id || '0')) {
        console.log(`[LessonCalendarComponent] User available: ${user!.id}`);
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] ngOnDestroy');
    
    this.userSubscription?.unsubscribe();
    this.scheduleContextService.clearContext();
    this.calendarConfigService.cleanup();
    this.calendarCoordination.cleanup();
  }

  // UPDATED: Use interaction service for event click orchestration
  handleEventClick(arg: EventClickArg): void {
    console.log('[LessonCalendarComponent] handleEventClick');
    
    // Delegate to interaction service - it handles node selection and toasts
    const shouldOpenContextMenu = this.calendarInteraction.handleEventClick(arg);
    
    // If the interaction service says we should open context menu, handle it
    if (shouldOpenContextMenu) {
      // Convert to right-click-like event for context menu
      const fakeRightClick = new MouseEvent('contextmenu', {
        clientX: (arg.jsEvent as MouseEvent).clientX,
        clientY: (arg.jsEvent as MouseEvent).clientY,
        button: 2
      });
      this.handleEventContextMenu(arg, fakeRightClick);
    }
  }

  // UPDATED: Use interaction service for event drop orchestration  
  handleEventDrop(arg: EventDropArg): void {
    console.log('[LessonCalendarComponent] handleEventDrop');
    
    // Delegate to interaction service - it handles persistence and state updates
    this.calendarInteraction.handleEventDrop(arg);
  }

  handleEventContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    console.log('[LessonCalendarComponent] handleEventContextMenu');
    
    // FIRST: Always close any existing context menu
    if (this.contextMenuTrigger?.menuOpen) {
      this.contextMenuTrigger.closeMenu();
    }
    
    // Create EventClickArg-compatible object for context service
    const eventClickArg: any = {
      event: eventInfo.event,
      jsEvent: { ...jsEvent, button: 2, which: 3 }, // Right click
      el: eventInfo.el,
      view: eventInfo.view
    };
    
    // Set event context for the context service
    this.scheduleContextService.setEventContext(eventClickArg);
    
    // Set context menu position and open
    this.contextMenuPosition.x = jsEvent.clientX + 'px';
    this.contextMenuPosition.y = jsEvent.clientY + 'px';
    
    // Small delay to ensure clean menu replacement
    setTimeout(() => {
      this.contextMenuTrigger?.openMenu();
    }, 10);
  }

  // Handle context menu selection
  executeContextAction(action: any): void {
    console.log('[LessonCalendarComponent] executeContextAction');
    action.handler();
    this.contextMenuTrigger?.closeMenu();
  }

  // Handle schedule selection from controls
  selectSchedule(scheduleId: number): void {
    console.log('[LessonCalendarComponent] selectSchedule');
    this.schedulePersistenceService.selectScheduleById(scheduleId).subscribe({
      error: (error: any) => {
        console.error(`[LessonCalendarComponent] Failed to select schedule ${scheduleId}:`, error);
      }
    });
  }

  // Handle save schedule from controls
  saveSchedule(): void {
    console.log('[LessonCalendarComponent] saveSchedule');
    this.schedulePersistenceService.saveCurrentSchedule().subscribe({
      error: (error: any) => {
        console.error('[LessonCalendarComponent] Failed to save schedule:', error);
      }
    });
  }

  // Handle create schedule from controls
  openConfigModal(): void {
    console.log('[LessonCalendarComponent] openConfigModal - redirecting to user configuration');
    
    // Open user configuration instead of calendar config modal
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
        console.log('[LessonCalendarComponent] User configuration updated');
        // Optionally refresh calendar data if needed
        // this.calendarCoordination.refreshCalendarData();
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

  // Public getters for template usage
  get debugInfo() {
    const coordinationDebug = this.calendarCoordination.getDebugInfo();
    
    return {
      ...coordinationDebug,
      teachingDays: this.calendarConfigService.getCurrentTeachingDays(),
      hiddenDays: this.calendarConfigService.getCurrentHiddenDays(),
      canInteract: this.calendarInteraction.canInteractWithCalendar(),
      interactionContext: this.calendarInteraction.getInteractionContext()
    };
  }
}