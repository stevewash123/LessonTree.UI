// src/app/lessontree/calendar/components/lesson-calendar.component.ts - COMPLETE FILE (COMPILATION FIXED)
import { Component, OnInit, ViewChild, inject, effect, Input, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
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

  // Computed signals for reactive data (using actual CourseDataService methods)
  readonly availableCourses = computed(() => {
    return this.courseDataService.getCourses();
  });

  readonly selectedCourseData = computed(() => {
    const selectedNode = this.nodeSelectionService.selectedNode();
    if (selectedNode?.nodeType === 'Course') {
      const courseId = parseId(selectedNode.id);
      return this.courseDataService.getCourseById(courseId);
    }
    return null;
  });

  readonly currentCourseId = computed(() => {
    const courseData = this.selectedCourseData();
    return courseData?.id || null;
  });

  readonly hasCoursesAvailable = computed(() => {
    return this.courseDataService.getCourses().length > 0;
  });

  readonly coursesCount = computed(() => {
    return this.courseDataService.getCourses().length;
  });

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
    console.log('[LessonCalendarComponent] Initializing', { 
      timestamp: new Date().toISOString() 
    });

    // Effect: React to course selection changes
    effect(() => {
      const courseId = this.currentCourseId();
      
      if (courseId) {
        console.log(`[LessonCalendarComponent] Course selected: ${courseId}`, {
          timestamp: new Date().toISOString()
        });
        
        this.loadSchedulesForCourse(courseId);
      } else {
        console.log('[LessonCalendarComponent] No course selected', {
          timestamp: new Date().toISOString()
        });
        
        // Try to select first available course
        this.loadDefaultCourse();
      }
    });

    // Effect: Update calendar events when schedule changes
    effect(() => {
      const scheduleDays = this.scheduleStateService.currentScheduleDays();
      const courseId = this.currentCourseId();
      
      if (courseId && scheduleDays.length > 0) {
        console.log(`[LessonCalendarComponent] Updating calendar events for course ${courseId}`, {
          scheduleDaysCount: scheduleDays.length,
          timestamp: new Date().toISOString()
        });
        
        this.calendarOptions.events = this.calendarEventService.mapScheduleDaysToEvents(scheduleDays, courseId);
        
        // Trigger calendar re-render if calendar is initialized
        if (this.calendar?.getApi) {
          this.calendar.getApi().refetchEvents();
        }
      } else {
        console.log('[LessonCalendarComponent] Clearing calendar events', {
          courseId,
          scheduleDaysCount: scheduleDays.length,
          timestamp: new Date().toISOString()
        });
        
        this.calendarOptions.events = [];
        if (this.calendar?.getApi) {
          this.calendar.getApi().refetchEvents();
        }
      }
    });

    // Effect: Update calendar date when schedule changes
    effect(() => {
      const schedule = this.scheduleStateService.selectedSchedule();
      
      if (schedule?.startDate) {
        console.log(`[LessonCalendarComponent] Updating calendar date to: ${schedule.startDate}`, {
          timestamp: new Date().toISOString()
        });
        
        this.calendarOptions.initialDate = schedule.startDate;
        
        // Update calendar view if already initialized
        if (this.calendar?.getApi) {
          this.calendar.getApi().gotoDate(schedule.startDate);
        }
      }
    });

    // Effect: React to courses data changes
    effect(() => {
      // Listen to any node changes that might affect the course list
      const nodeAdded = this.courseDataService.nodeAdded();
      const nodeDeleted = this.courseDataService.nodeDeleted();
      const coursesCount = this.coursesCount();
      
      console.log(`[LessonCalendarComponent] Courses data potentially changed`, {
        coursesCount,
        nodeAdded: nodeAdded?.nodeType || null,
        nodeDeleted: nodeDeleted?.nodeType || null,
        timestamp: new Date().toISOString()
      });
      
      // If courses were just loaded and no course is selected, try to select default
      if (coursesCount > 0 && !this.currentCourseId()) {
        this.loadDefaultCourse();
      }
    });
  }

  ngOnInit(): void {
    console.log('[LessonCalendarComponent] Component initialized', { 
      timestamp: new Date().toISOString() 
    });

    // Initialize user subscription
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (parseId(user?.id || '0')) {
        console.log(`[LessonCalendarComponent] User ID available: ${user!.id}`, { 
          timestamp: new Date().toISOString() 
        });
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] Component destroying', { 
      timestamp: new Date().toISOString() 
    });
    
    this.userSubscription?.unsubscribe();
    this.scheduleDayService.clearContext();
  }

  // Load default course when no course is selected
  private loadDefaultCourse(): void {
    const courses = this.availableCourses();
    
    if (courses.length > 0) {
      const firstCourse = courses[0];
      console.log(`[LessonCalendarComponent] Loading default course: ${firstCourse.id}`, {
        courseTitle: firstCourse.title,
        timestamp: new Date().toISOString()
      });
      
      // Select the first course programmatically
      this.nodeSelectionService.selectById(firstCourse.id, 'Course', 'calendar');
    } else {
      console.warn('[LessonCalendarComponent] No courses available for default selection', { 
        timestamp: new Date().toISOString() 
      });
    }
  }

  // Load schedules for a course
  private loadSchedulesForCourse(courseId: number): void {
    console.log(`[LessonCalendarComponent] Loading schedules for course: ${courseId}`, {
      timestamp: new Date().toISOString()
    });
    
    this.scheduleStateService.loadSchedulesForCourse(courseId).subscribe({
      next: (schedules: any) => {
        console.log(`[LessonCalendarComponent] Schedules loaded successfully`, {
          courseId,
          schedulesCount: Array.isArray(schedules) ? schedules.length : 0,
          timestamp: new Date().toISOString()
        });
      },
      error: (error) => {
        console.error(`[LessonCalendarComponent] Failed to load schedules for course ${courseId}:`, error, {
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Handle event click from calendar
  handleEventClick(arg: EventClickArg): void {
    console.log('[LessonCalendarComponent] Event clicked', {
      eventId: arg.event.id,
      eventTitle: arg.event.title,
      timestamp: new Date().toISOString()
    });
    
    const result = this.calendarEventService.handleEventClick(arg);
    
    if (result.shouldOpenContextMenu) {
      this.scheduleDayService.setEventContext(arg);
      this.contextMenu?.open(arg.jsEvent.pageY, arg.jsEvent.pageX);
    }
  }

  // Handle date click from calendar
  handleDateRightClick(info: any): void {
    console.log('[LessonCalendarComponent] Date right-clicked', {
      date: info.date,
      timestamp: new Date().toISOString()
    });
    
    this.scheduleDayService.setDateContext(info.date);
    this.contextMenu?.open(info.jsEvent.pageY, info.jsEvent.pageX);
  }

  // Handle event drop from calendar
  handleEventDrop(arg: EventDropArg): void {
    console.log('[LessonCalendarComponent] Event dropped', {
      eventId: arg.event.id,
      newDate: arg.event.start,
      timestamp: new Date().toISOString()
    });
    
    this.calendarEventService.handleEventDrop(arg);
  }

  // Handle context menu selection
  handleContextMenuSelect(args: MenuEventArgs): void {
    console.log('[LessonCalendarComponent] Context menu item selected', {
      itemId: args.item.id,
      timestamp: new Date().toISOString()
    });
    
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
    console.log(`[LessonCalendarComponent] Schedule selected: ${scheduleId}`, {
      timestamp: new Date().toISOString()
    });
    
    this.scheduleStateService.selectScheduleById(scheduleId).subscribe({
      next: (schedule: any) => {
        console.log(`[LessonCalendarComponent] Schedule selected successfully`, {
          scheduleId: schedule?.id || 'unknown',
          timestamp: new Date().toISOString()
        });
      },
      error: (error) => {
        console.error(`[LessonCalendarComponent] Failed to select schedule ${scheduleId}:`, error, {
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Handle save schedule from controls
  saveSchedule(): void {
    console.log('[LessonCalendarComponent] Save schedule requested', {
      timestamp: new Date().toISOString()
    });
    
    this.scheduleStateService.saveCurrentSchedule().subscribe({
      next: (schedule: any) => {
        console.log(`[LessonCalendarComponent] Schedule saved successfully`, {
          scheduleId: schedule?.id || 'unknown',
          timestamp: new Date().toISOString()
        });
      },
      error: (error) => {
        console.error('[LessonCalendarComponent] Failed to save schedule:', error, {
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Handle create schedule from controls
  openConfigModal(): void {
    console.log('[LessonCalendarComponent] Opening config modal', {
      timestamp: new Date().toISOString()
    });
    
    const courseData = this.selectedCourseData();
    let courseId: number;
    let courseTitle: string;
    
    if (courseData) {
      courseId = courseData.id;
      courseTitle = courseData.title;
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
          courseId,
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

  // Public getters for template usage
  get debugInfo() {
    return {
      selectedCourseId: this.currentCourseId(),
      availableCoursesCount: this.availableCourses().length,
      hasSelection: this.nodeSelectionService.hasSelection(),
      selectedNodeType: this.nodeSelectionService.selectedNodeType(),
      hasData: this.hasCoursesAvailable(),
      timestamp: new Date().toISOString()
    };
  }
}