// src/app/lessontree/calendar/components/lesson-calendar.component.ts - COMPLETE FILE
import { Component, OnInit, ViewChild, inject, effect, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContextMenuComponent, ContextMenuModule } from '@syncfusion/ej2-angular-navigations';
import { MenuEventArgs } from '@syncfusion/ej2-navigations';
import { set } from 'date-fns';
import { Subscription } from 'rxjs';

import { ScheduleControlsComponent } from './schedule-controls.component';
import { CalendarConfigModalComponent } from './calendar-config-modal.component';

import { ScheduleStateService } from '../services/schedule-state.service';
import { CalendarEventService } from '../services/calendar-event.service';
import { ScheduleDayService } from '../services/schedule-day.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { UserService } from '../../../core/services/user.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { parseId } from '../../../core/utils/type-conversion.utils';


@Component({
  selector: 'app-lesson-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    MatDialogModule,
    ContextMenuModule,
    ScheduleControlsComponent
  ],
  templateUrl: './lesson-calendar.component.html',
  styleUrls: ['./lesson-calendar.component.css']
})
export class LessonCalendarComponent implements OnInit, OnDestroy {
  @ViewChild('contextMenu') contextMenu!: ContextMenuComponent;
  @ViewChild('calendar') calendar: any;
  
  // Input to control schedule controls visibility
  @Input() showScheduleControls: boolean = true;

  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly calendarEventService = inject(CalendarEventService);
  private readonly scheduleDayService = inject(ScheduleDayService);
  private readonly nodeSelectionService = inject(NodeSelectionService);
  private readonly userService = inject(UserService);
  private readonly courseDataService = inject(CourseDataService);
  private readonly dialog = inject(MatDialog);

  // Subscriptions
  private userSubscription?: Subscription;

  // Calendar options
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    initialDate: set(new Date(), { month: 7, date: 1 }),
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: [],
    eventClick: this.handleEventClick.bind(this),
    dateClick: this.handleDateRightClick.bind(this),
    editable: true,
    eventDrop: this.handleEventDrop.bind(this)
  };

  // Context menu items
  contextMenuItems: { text: string; id: string }[] = [
    { text: 'Add Non-Teaching Day', id: 'nonTeaching' },
    { text: 'Add Instructor PT', id: 'instructorPT' },
    { text: 'Edit Special Day', id: 'editSpecialDay' },
    { text: 'Delete Special Day', id: 'deleteSpecialDay' }
  ];

  // Expose services for template
  readonly scheduleState = this.scheduleStateService;

  constructor() {
    // Set up effect to react to selection changes
    effect(() => {
        const selectedCourse = this.nodeSelectionService.selectedCourse();
        if (selectedCourse) {
          this.loadSchedulesForCourse(parseId(selectedCourse.id));
        }
      });

    // Set up effect to update calendar when schedule changes
    effect(() => {
      const scheduleDays = this.scheduleStateService.currentScheduleDays();
      const courseId = this.getCurrentCourseId();
      
      if (courseId && scheduleDays.length > 0) {
        this.calendarOptions.events = this.calendarEventService.mapScheduleDaysToEvents(scheduleDays, courseId);
      }
    });

    // Set up effect to update calendar date when schedule changes
    effect(() => {
      const schedule = this.scheduleStateService.selectedSchedule();
      if (schedule?.startDate) {
        this.calendarOptions.initialDate = schedule.startDate;
      }
    });

    console.log('[LessonCalendarComponent] Initialized', { timestamp: new Date().toISOString() });
  }

  ngOnInit(): void {
    // Initialize user subscription
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (parseId(user?.id || '0')) {
        console.log(`[LessonCalendarComponent] User ID available: ${user!.id}`, { 
          timestamp: new Date().toISOString() 
        });
      }
    });

    // Load initial course
    this.loadInitialCourse();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.scheduleDayService.clearContext();
  }

  // Load initial course schedules
  private loadInitialCourse(): void {
    const selectedNode = this.nodeSelectionService.selectedNode();
    if (selectedNode && selectedNode.nodeType === 'Course') {
      this.loadSchedulesForCourse(parseId(selectedNode.id));
    } else {
      // Default to first course if none selected
      const courses = this.courseDataService.getCourses();
      if (courses.length > 0) {
        this.loadSchedulesForCourse(courses[0].id);
      } else {
        console.warn('[LessonCalendarComponent] No courses available', { 
          timestamp: new Date().toISOString() 
        });
      }
    }
  }

  // Load schedules for a course
  private loadSchedulesForCourse(courseId: number): void {
    this.scheduleStateService.loadSchedulesForCourse(courseId).subscribe();
  }

  // Get current course ID
  private getCurrentCourseId(): number | null {
    return this.calendarEventService.getCurrentCourseId();
  }

  // Handle event click from calendar
  handleEventClick(arg: EventClickArg): void {
    const result = this.calendarEventService.handleEventClick(arg);
    
    if (result.shouldOpenContextMenu) {
      this.scheduleDayService.setEventContext(arg);
      this.contextMenu?.open(arg.jsEvent.pageY, arg.jsEvent.pageX);
    }
  }

  // Handle date click from calendar
  handleDateRightClick(info: any): void {
    this.scheduleDayService.setDateContext(info.date);
    this.contextMenu?.open(info.jsEvent.pageY, info.jsEvent.pageX);
  }

  // Handle event drop from calendar
  handleEventDrop(arg: EventDropArg): void {
    this.calendarEventService.handleEventDrop(arg);
  }

  // Handle context menu selection
  handleContextMenuSelect(args: MenuEventArgs): void {
    const actions = this.scheduleDayService.getContextMenuActions();
    const selectedAction = actions.find(action => action.id === args.item.id);
    
    if (selectedAction) {
      selectedAction.handler();
    } else {
      console.warn(`[LessonCalendarComponent] Unknown context menu action: ${args.item.id}`, { 
        timestamp: new Date().toISOString() 
      });
    }
  }

  // Handle schedule selection from controls
  selectSchedule(scheduleId: number): void {
    this.scheduleStateService.selectScheduleById(scheduleId).subscribe();
  }

  // Handle save schedule from controls
  saveSchedule(): void {
    this.scheduleStateService.saveCurrentSchedule().subscribe();
  }

  // Handle create schedule from controls
  openConfigModal(): void {
    const selectedNode = this.nodeSelectionService.selectedNode();
    let courseId: number;
    let courseTitle: string;
    
    if (selectedNode && selectedNode.nodeType === 'Course') {
      courseId = parseId(selectedNode.id);
      const course = this.courseDataService.getCourseById(courseId);
      if (!course) {
        console.error('[LessonCalendarComponent] Course not found for selected node', { 
          timestamp: new Date().toISOString() 
        });
        return;
      }
      courseTitle = course.title;
    } else {
      const schedule = this.scheduleStateService.selectedSchedule();
      if (!schedule) {
        console.error('[LessonCalendarComponent] No course selected and no schedule available', { 
          timestamp: new Date().toISOString() 
        });
        return;
      }
      
      courseId = schedule.courseId;
      const course = this.courseDataService.getCourseById(courseId);
      if (!course) {
        console.error('[LessonCalendarComponent] Course not found for current schedule', { 
          timestamp: new Date().toISOString() 
        });
        return;
      }
      courseTitle = course.title;
    }
    
    // Get current user from user service
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('[LessonCalendarComponent] User ID not available', { 
        timestamp: new Date().toISOString() 
      });
      return;
    }
    
    const dialogRef = this.dialog.open(CalendarConfigModalComponent, {
      data: {
        courseId,
        userId: currentUser.id,
        courseTitle,
        inMemorySchedule: this.scheduleStateService.isInMemorySchedule() 
          ? this.scheduleStateService.selectedSchedule() 
          : null
      },
      width: '600px',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log(`[LessonCalendarComponent] New schedule created: ${result.id}`, { 
          timestamp: new Date().toISOString() 
        });
        this.loadSchedulesForCourse(courseId);
      }
    });
  }
}