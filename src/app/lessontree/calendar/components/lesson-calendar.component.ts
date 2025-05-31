/* src/app/lessontree/calendar/lesson-calendar.component.ts - COMPLETE FILE */
// RESPONSIBILITY: Displays lessons in calendar format and handles direct UI interactions.
// DOES NOT: Store schedule data, handle API operations, manage calendar configuration, handle course management, manage node selection, or coordinate complex effects - delegates to appropriate services.
// CALLED BY: Main application router, displays calendar view of selected course lessons.
import { Component, OnInit, OnDestroy, ViewChild, Input, computed, signal } from '@angular/core';
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
    (this as any).selectedCourse = this.nodeSelectionService.selectedCourse;
    (this as any).hasSelection = this.nodeSelectionService.hasSelection;
    (this as any).selectedNodeType = this.nodeSelectionService.selectedNodeType;

    // Initialize scheduleState service reference for template
    (this as any).scheduleState = this.scheduleStateService;

    // Initialize calendar options using configuration service
    this.calendarOptions = this.calendarConfigService.createCalendarOptions(
      this.handleEventClick.bind(this),
      this.handleDateClick.bind(this),
      this.handleEventDrop.bind(this),
      this.handleDateContextMenu.bind(this) // Add this line
    );

    // Initialize coordination service with simplified calendar callbacks
    this.calendarCoordination.initialize({
      getCalendarApi: () => this.calendar?.getApi(),
      getCalendarOptions: () => this.calendarOptions,
      setCalendarOptions: (options: CalendarOptions) => { this.calendarOptions = options; }
    });
  }

  ngOnInit(): void {
    // Initialize user subscription
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (parseId(user?.id || '0')) {
        console.log(`[LessonCalendarComponent] User available: ${user!.id}`);
      }
    });

    // Load courses and let coordination service handle the rest
    this.calendarCoordination.loadCoursesAndEnsureSelection().subscribe({
      next: (courses) => {
        console.log(`[LessonCalendarComponent] Courses loaded: ${courses.length}`);
      },
      error: (error) => {
        console.error('[LessonCalendarComponent] Failed to load courses:', error);
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] Component destroying', { 
      timestamp: new Date().toISOString() 
    });
    
    this.userSubscription?.unsubscribe();
    this.scheduleContextService.clearContext();
    this.calendarCoordination.cleanup();
  }

  // Handle right-click on dates (separate from left-click)
  handleDateContextMenu(date: Date, jsEvent: MouseEvent): void {
    console.log('[LessonCalendarComponent] Date right-clicked:', date);
    this.scheduleContextService.setDateContext(date);
    
    // Set context menu position and open
    jsEvent.preventDefault(); // Prevent browser context menu
    this.contextMenuPosition.x = jsEvent.clientX + 'px';
    this.contextMenuPosition.y = jsEvent.clientY + 'px';
    this.contextMenuTrigger?.openMenu();
  }
  // Handle date click from calendar
  handleDateClick(info: any): void {
    // This now only handles left-clicks since right-clicks go through handleDateContextMenu
    console.log('[LessonCalendarComponent] Date left-clicked:', info.date);
    this.scheduleContextService.setDateContext(info.date);
  }

  // Handle event click from calendar
  handleEventClick(arg: EventClickArg): void {
    // Check if this is a right-click from our custom listener
    if ((arg.jsEvent as any).which === 3) {
      // Right-click - show context menu for events
      console.log('[LessonCalendarComponent] Event right-clicked:', arg.event.title);
      const result = this.calendarEventService.handleEventClick(arg);
      
      if (result.shouldOpenContextMenu) {
        console.log('[LessonCalendarComponent] Opening context menu for event');
        this.scheduleContextService.setEventContext(arg);
        
        // Set context menu position and open
        if (arg.jsEvent) {
          arg.jsEvent.preventDefault(); // Prevent browser context menu
          this.contextMenuPosition.x = arg.jsEvent.clientX + 'px';
          this.contextMenuPosition.y = arg.jsEvent.clientY + 'px';
          this.contextMenuTrigger?.openMenu();
        }
      }
    } else {
      // Left-click - primary action (view/edit lesson details)
      console.log('[LessonCalendarComponent] Event left-clicked:', arg.event.title);
      const result = this.calendarEventService.handleEventClick(arg);
      // Service already handles node selection for left-clicks
    }
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
    this.scheduleStateService.selectScheduleById(scheduleId).subscribe({
      error: (error) => {
        console.error(`[LessonCalendarComponent] Failed to select schedule ${scheduleId}:`, error);
      }
    });
  }

  // Handle save schedule from controls
  saveSchedule(): void {
    this.scheduleStateService.saveCurrentSchedule().subscribe({
      error: (error) => {
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
        this.scheduleStateService.loadSchedulesForCourse(courseId).subscribe();
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