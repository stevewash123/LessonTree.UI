/* src/app/lessontree/calendar/lesson-calendar.component.ts - COMPLETE FILE */
// RESPONSIBILITY: Displays lessons in calendar format and handles direct UI interactions.
// DOES NOT: Store schedule data, handle API operations, manage calendar configuration, handle course management, manage node selection, or coordinate complex effects - delegates to appropriate services.
// CALLED BY: Main application router, displays calendar view of selected course lessons.
import { Component, OnInit, OnDestroy, ViewChild, Input, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg } from '@fullcalendar/core';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { CalendarConfigModalComponent } from './calendar-config-modal.component';

import { ScheduleStateService } from '../services/schedule-state.service';
import { SchedulePersistenceService } from '../services/schedule-persistence.service';
import { CalendarEventService } from '../services/calendar-event.service';
import { CalendarConfigurationService } from '../services/calendar-configuration.service';
import { CalendarCoordinationService } from '../services/calendar-coordination.service';
import { ScheduleContextService } from '../services/schedule-context.service';
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
    FormsModule,
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

  // Get available context menu actions dynamically
  get contextMenuActions() {
    return this.scheduleContextService.getContextMenuActions();
  }

  // Computed signals using services - will be initialized in constructor
  readonly hasCoursesAvailable = computed(() => {
    return this.calendarCoordination.hasCoursesAvailable();
  });

  readonly coursesCount = computed(() => {
    return this.calendarCoordination.getActiveCourseCount();
  });

  // NodeSelectionService signals - initialized in constructor
  readonly selectedCourse!: any;
  readonly hasSelection!: any;
  readonly selectedNodeType!: any;

  readonly currentCourseId = computed(() => {
    return this.calendarCoordination.getCurrentCourseId();
  });

  readonly selectedCourseData = computed(() => {
    return this.calendarCoordination.getCurrentCourse();
  });

  readonly canGenerateReports = computed(() => {
    const schedule = this.scheduleStateService.selectedSchedule();
    return schedule && !this.scheduleStateService.isInMemorySchedule();
  });

  // Calendar options - created by configuration service
  calendarOptions: CalendarOptions;

  // Expose services for template - initialized in constructor
  readonly scheduleState!: any;

  constructor(
    private scheduleStateService: ScheduleStateService,
    private schedulePersistenceService: SchedulePersistenceService,
    private calendarEventService: CalendarEventService,
    private calendarConfigService: CalendarConfigurationService,
    private calendarCoordination: CalendarCoordinationService,
    private scheduleContextService: ScheduleContextService,
    private nodeSelectionService: NodeSelectionService,
    private userService: UserService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService,
    private dialog: MatDialog
  ) {
    console.log('[LessonCalendarComponent] Initializing');

    // Initialize NodeSelectionService signals after injection
    (this as any).hasSelection = this.nodeSelectionService.hasSelection;
    (this as any).selectedNodeType = this.nodeSelectionService.selectedNodeType;

    // Initialize scheduleState service reference for template
    (this as any).scheduleState = this.scheduleStateService;

    // Initialize calendar options using configuration service with right-click handler
    this.calendarOptions = this.calendarConfigService.createCalendarOptions(
        this.handleEventClick.bind(this),
        this.handleEventContextMenu.bind(this), // NEW: Event-based context menu
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
    console.log('[LessonCalendarComponent] Initializing - using existing course data');
    
    // Initialize user subscription
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (parseId(user?.id || '0')) {
        console.log(`[LessonCalendarComponent] User available: ${user!.id}`);
      }
    });
  
    console.log('[LessonCalendarComponent] Initialization complete - coordination service handles the rest');
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] Component destroying');
    
    this.userSubscription?.unsubscribe();
    this.scheduleContextService.clearContext();
    this.calendarConfigService.cleanup(); // Simplified cleanup
    this.calendarCoordination.cleanup();
  }

  handleEventContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    console.log('[LessonCalendarComponent] Event right-clicked:', eventInfo.event.title);
    
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

  // Handle event click from calendar
  handleEventClick(arg: any): void {
  console.log('[LessonCalendarComponent] Event left-clicked:', arg.event.title);
  
  // Delegate to event service for processing
  const result = this.calendarEventService.handleEventClick(arg);
  // Service handles node selection automatically
}

  // Handle event drop from calendar
  handleEventDrop(arg: EventDropArg): void {
    this.calendarEventService.handleEventDrop(arg);
  }

  // Handle context menu selection
  executeContextAction(action: any): void {
    console.log('[LessonCalendarComponent] Context menu action selected:', action.label);
    action.handler();
    this.contextMenuTrigger?.closeMenu();
  }

  // Handle schedule selection from controls
  selectSchedule(scheduleId: number): void {
    this.schedulePersistenceService.selectScheduleById(scheduleId).subscribe({
      error: (error: any) => {
        console.error(`[LessonCalendarComponent] Failed to select schedule ${scheduleId}:`, error);
      }
    });
  }

  // Handle save schedule from controls
  saveSchedule(): void {
    this.schedulePersistenceService.saveCurrentSchedule().subscribe({
      error: (error: any) => {
        console.error('[LessonCalendarComponent] Failed to save schedule:', error);
      }
    });
  }

  // Handle create schedule from controls
  openConfigModal(): void {
    const selectedCourse = this.selectedCourse();
    
    if (!selectedCourse) {
      console.error('[LessonCalendarComponent] Cannot open modal - no course selected');
      return;
    }

    const courseId = parseId(selectedCourse.id);
    const courseData = this.selectedCourseData();
    
    if (!courseData) {
      console.error('[LessonCalendarComponent] Cannot open modal - course data not found');
      return;
    }
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('[LessonCalendarComponent] User ID not available');
      return;
    }
    
    const dialogRef = this.dialog.open(CalendarConfigModalComponent, {
      data: {
        courseId,
        userId: currentUser.id,
        courseTitle: courseData.title,
        existingSchedule: this.scheduleStateService.isInMemorySchedule() 
          ? this.scheduleStateService.selectedSchedule() 
          : null,
        mode: 'create'
      },
      width: '600px',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log(`[LessonCalendarComponent] Schedule created: ${result.id}`);
        this.schedulePersistenceService.loadSchedulesForCourse(courseId).subscribe();
      }
    });
  }

  // Generate reports (stubbed for now)
  generateFullReport(): void {
    console.log('[LessonCalendarComponent] Generating full report');
    // TODO: Implement full report generation
  }

  generateWeekReport(): void {
    console.log('[LessonCalendarComponent] Generating week report');
    // TODO: Implement week report generation
  }

  // Public getters for template usage
  get debugInfo() {
    const coordinationDebug = this.calendarCoordination.getDebugInfo();
    
    return {
      ...coordinationDebug,
      teachingDays: this.calendarConfigService.getCurrentTeachingDays(),
      hiddenDays: this.calendarConfigService.getCurrentHiddenDays()
    };
  }
}