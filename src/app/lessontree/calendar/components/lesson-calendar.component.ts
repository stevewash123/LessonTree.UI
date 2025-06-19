/* src/app/lessontree/calendar/lesson-calendar.component.ts - UPDATED FOR NEW INTERACTION SERVICE */
// RESPONSIBILITY: Displays lessons in calendar format and handles direct UI interactions.
// DOES NOT: Store schedule data, handle API operations, manage calendar configuration, handle course management, manage node selection, or coordinate complex effects - delegates to appropriate services.
// CALLED BY: Main application router, displays calendar view of selected course lessons.
import { Component, OnInit, OnDestroy, ViewChild, Input, computed, Signal, effect } from '@angular/core';
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
import { CalendarConfigurationService } from '../services/calendar-configuration.service';
import { CalendarCoordinationService } from '../services/calendar-coordination.service';
import { CalendarInteractionService } from '../services/calendar-interaction.service';
import { ContextMenuService } from '../services/context-menu.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { UserService } from '../../../core/services/user.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { parseId } from '../../../core/utils/type-conversion.utils';
import { ScheduleConfigurationStateService } from '../services/schedule-configuration-state.service';
import { ScheduleCoordinationService } from '../services/schedule-coordination.service';

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
    if (this.contextMenuTrigger?.menuOpen) {
      this.contextMenuTrigger.closeMenu();
    }
    
    const eventClickArg: any = {
      event: eventInfo.event,
      jsEvent: { ...jsEvent, button: 2, which: 3 },
      el: eventInfo.el,
      view: eventInfo.view
    };
    
    this.scheduleContextService.setEventContext(eventClickArg);
    
    this.contextMenuPosition.x = jsEvent.clientX + 'px';
    this.contextMenuPosition.y = jsEvent.clientY + 'px';
    
    setTimeout(() => {
      this.contextMenuTrigger?.openMenu();
    }, 10);
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

}