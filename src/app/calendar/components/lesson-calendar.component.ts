// lesson-calendar.component.ts - FIXED IMPORTS AND MISSING METHODS
// RESPONSIBILITY: Display calendar and coordinate with initialization service
// DOES: Initialize calendar, handle UI interactions, display loading states

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

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

// NEW: Core services for clean architecture
import { CalendarInitializationService } from '../services/core/calendar-initialization.service';
import { CalendarDateService } from '../services/core/calendar-date.service';
import { CalendarDisplayService } from '../services/core/calendar-display.service';

// UI services (preserved excellent specialized services)
import { CalendarConfigurationService } from '../services/ui/calendar-configuration.service';

// State services (clean)
import { ScheduleStateService } from '../services/state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../services/state/schedule-configuration-state.service';

// Other services
import { EntitySelectionService } from '../../lesson-tree/services/state/entity-selection.service';
import { UserService } from '../../user-config/user.service';
import { LayoutModeService } from '../../lesson-tree-container/layout-mode.service';

// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

// Modals
import { ScheduleConfigComponent } from '../../schedule-config/schedule-config.component';
import { CalendarInteractionService } from '../services/ui/calendar-interaction.service';
import {CalendarEventLoaderService} from '../services/core/calendar-event-loader.service';
import {ContextMenuCoordinationService} from '../services/integration/context-menu-coordination.service';
import {CalendarRefreshService} from '../services/integration/calendar-refresh.service';
import { ApiService } from '../../shared/services/api.service';
// REMOVED: ContextMenuService import - service was deleted

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

  @Input() showScheduleControls: boolean = true;

  // Context menu state
  contextMenuPosition = { x: '0px', y: '0px' };

  // Calendar options - initialized by configuration service
  calendarOptions: CalendarOptions = {
    initialView: 'timeGridWeek',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    events: [] // Will be populated by display service
  };

  // Debug mode flag
  debugMode: boolean = false;

  // Subscriptions
  private subscriptions = new Subscription();
  
  // Calendar initialization flag to distinguish setup vs user navigation
  private isCalendarInitialized = false;

  // === COMPUTED SIGNALS (Clean and Simple) ===

  readonly hasSelection: Signal<boolean>;
  readonly selectedEntityType: Signal<string | null>;
  readonly selectedCourse: Signal<any | null>;

  readonly selectedSchedule: Signal<any | null>;
  readonly isInMemorySchedule: Signal<boolean>;
  readonly hasUnsavedChanges: Signal<boolean>;
  readonly canSaveSchedule: Signal<boolean>;

  // Calendar-specific computed signals using new services
  readonly isInitialized = computed(() => {
    return this.calendarInitializationService.isCalendarReady();
  });

  readonly calendarEvents = computed(() => {
    return this.calendarDisplayService.calendarEvents();
  });

  readonly displayState = computed(() => {
    return this.calendarDisplayService.getDisplayState();
  });

  readonly isLoadingCalendar = computed(() => {
    const state = this.displayState();
    return !state.isReady || !state.hasConfiguration;
  });

  // REMOVED: isLoadingSchedule - template should use isLoadingCalendar instead

  readonly loadingMessage = computed(() => {
    const state = this.displayState();
    if (!state.hasConfiguration) {
      return 'Loading configuration...';
    }
    if (!state.isReady) {
      return 'Initializing calendar...';
    }
    if (state.eventCount === 0) {
      return 'Loading events...';
    }
    return '';
  });



  // REMOVED: isLoadingSchedule - spinner handled by API code

  // Context menu actions - FIXED TYPE (no context menu service)
  get contextMenuActions(): Array<{id: string, label: string, handler: () => void}> {
    return this.contextMenuService.getContextMenuActions();
  }

  constructor(
    // NEW: Core services
    private calendarInitializationService: CalendarInitializationService,
    private calendarDateService: CalendarDateService,
    private calendarDisplayService: CalendarDisplayService,
    private calendarEventLoaderService: CalendarEventLoaderService,
    private calendarRefreshService: CalendarRefreshService,

    // Preserved specialized services
    private calendarConfigService: CalendarConfigurationService,
    private calendarInteraction: CalendarInteractionService,
    // REMOVED: scheduleContextService: ContextMenuService,

    // State services
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private entitySelectionService: EntitySelectionService,

    // Other services
    private contextMenuService: ContextMenuCoordinationService,
    private userService: UserService,
    private layoutModeService: LayoutModeService,
    private apiService: ApiService,
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

    // Set up effect to watch for calendar events and update FullCalendar
    effect(() => {
      const events = this.calendarEvents();

      console.log('[LessonCalendarComponent] 📊 Calendar events changed:', {
        eventCount: events.length,
        sampleEvent: events[0] ? {
          id: events[0].id,
          title: events[0].title,
          start: events[0].start
        } : null
      });

      // Update FullCalendar options with new events
      if (events.length >= 0) { // Update even if 0 events (to clear)
        this.calendarOptions = {
          ...this.calendarOptions,
          events: [...events]
        };
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    console.log('[LessonCalendarComponent] 🚀 Starting simplified initialization');

    // Set up FullCalendar configuration using excellent existing service
    const baseOptions = this.calendarConfigService.createCalendarOptions(
      this.handleEventClick.bind(this),
      this.handleEventContextMenu.bind(this),
      this.handleEventDrop.bind(this),
      this.handleCalendarNavigation.bind(this), // NEW: Navigation callback
      undefined // initialDate will be set later during initialization
    );

    this.calendarOptions = {
      ...baseOptions,
      events: [] // Start with empty events
    };

    // ✅ DEBUG: Enhanced refresh listener with detailed logging
    console.log('[LessonCalendarComponent] 📡 CalendarRefreshService available?', !!this.calendarRefreshService);

    if (this.calendarRefreshService) {
      console.log('[LessonCalendarComponent] 📡 Setting up refresh notification listener...');

      // Test that the observable exists
      console.log('[LessonCalendarComponent] refreshRequested$ observable available?', !!this.calendarRefreshService.refreshRequested$);

      this.subscriptions.add(
        this.calendarRefreshService.refreshRequested$.subscribe({
          next: (refreshEvent) => {
            console.log('[LessonCalendarComponent] 🔄 ✅ Refresh notification RECEIVED:', {
              reason: refreshEvent.reason,
              scope: refreshEvent.scope,
              scheduleId: refreshEvent.scheduleId,
              timestamp: refreshEvent.timestamp
            });
            this.handleRefreshNotification(refreshEvent);
          },
          error: (error) => {
            console.error('[LessonCalendarComponent] ❌ Refresh subscription error:', error);
          },
          complete: () => {
            console.log('[LessonCalendarComponent] 📡 Refresh subscription completed');
          }
        })
      );

      console.log('[LessonCalendarComponent] ✅ Refresh listener subscription added successfully');
    } else {
      console.error('[LessonCalendarComponent] ❌ CalendarRefreshService not available in constructor!');
    }

    // ✅ FIXED: Subscribe to lesson moved events from calendar drag-drop
    console.log('[LessonCalendarComponent] 📡 Setting up lesson move listener...');
    this.subscriptions.add(
      this.calendarInteraction.lessonMoved$.subscribe({
        next: (moveEvent) => {
          console.log('[LessonCalendarComponent] 🚚 ✅ Lesson move detected:', {
            lessonId: moveEvent.lessonId,
            lessonTitle: moveEvent.lessonTitle,
            oldDate: moveEvent.oldDate?.toDateString(),
            newDate: moveEvent.newDate.toDateString(),
            newPeriod: moveEvent.newPeriod,
            moveType: moveEvent.moveType
          });

          // Call API to persist the move
          this.handleLessonMoveFromCalendar(moveEvent);
        },
        error: (error) => {
          console.error('[LessonCalendarComponent] ❌ Lesson move subscription error:', error);
        }
      })
    );

    console.log('[LessonCalendarComponent] ✅ Calendar options configured');
  }

  ngAfterViewInit(): void {
    console.log('[LessonCalendarComponent] 🔧 Initializing calendar services after view init');

    // Initialize core services with calendar callbacks
    this.initializeCalendarServices();

    // Start the complete initialization workflow
    this.startCalendarInitialization();
    
    // Removed over-engineered navigation detection
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] 🧹 Cleaning up');
    this.subscriptions.unsubscribe();
    this.contextMenuService.clearContext();
    this.calendarConfigService.cleanup();
    
    // Removed over-engineered navigation detection cleanup
  }

  // === INITIALIZATION WORKFLOW ===

  /**
   * Initialize core services with calendar callbacks
   */
  private initializeCalendarServices(): void {
    console.log('[LessonCalendarComponent] 🔧 Setting up calendar service callbacks');

    // Initialize date service with calendar navigation callbacks
    this.calendarDateService.initialize({
      getCalendarApi: () => this.calendar?.getApi()
    });

    // Initialize display service with FullCalendar callbacks
    this.calendarDisplayService.initialize({
      getCalendarApi: () => this.calendar?.getApi(),
      getCalendarOptions: () => this.calendarOptions,
      setCalendarOptions: (options: CalendarOptions) => {
        this.calendarOptions = options;
        this.changeDetectorRef.detectChanges();
      }
    });

    console.log('[LessonCalendarComponent] ✅ Calendar services initialized with callbacks');
  }

  /**
   * Start the complete calendar initialization workflow
   * SIMPLIFIED: Single method call to orchestrate everything
   */
  private startCalendarInitialization(): void {
    console.log('[LessonCalendarComponent] 🚀 Starting calendar initialization workflow');

    // Reset initialization flag
    this.isCalendarInitialized = false;
    console.log('[LessonCalendarComponent] 🔄 Reset initialization flag - navigation callbacks will be ignored during setup');

    this.subscriptions.add(
      this.calendarInitializationService.initializeCalendar().subscribe({
        next: (result) => {
          console.log('[LessonCalendarComponent] 📊 Initialization result:', result);

          if (result.success) {
            console.log('[LessonCalendarComponent] ✅ Calendar initialized successfully:', {
              hasConfiguration: result.hasConfiguration,
              hasSchedule: result.hasSchedule,
              hasEvents: result.hasEvents,
              eventCount: result.eventCount,
              activeDate: result.activeDate?.toDateString()
            });
            
            // Mark calendar as fully initialized (navigation callbacks are now user-initiated)
            this.isCalendarInitialized = true;
            console.log('[LessonCalendarComponent] 🏁 Calendar initialization complete - user navigation now enabled');
          } else {
            console.warn('[LessonCalendarComponent] ⚠️ Calendar initialization failed:', result.error);
          }
        },
        error: (error) => {
          console.error('[LessonCalendarComponent] ❌ Initialization error:', error);
        }
      })
    );
  }

  // === EVENT HANDLERS (Preserved Working Logic) ===

  /**
   * NEW: Handle calendar navigation (when user clicks < > buttons)
   * Updated to use LayoutModeService directly for date preservation
   */
  handleCalendarNavigation(dateInfo: { start: Date; end: Date; view: any }): void {
    console.log('[LessonCalendarComponent] 🧭 Calendar navigation detected:', {
      start: dateInfo.start.toDateString(),
      end: dateInfo.end.toDateString(),
      view: dateInfo.view.type,
      isInitialized: this.isCalendarInitialized
    });

    // Calculate week center for potential storage
    const weekCenter = new Date(dateInfo.start);
    weekCenter.setDate(weekCenter.getDate() + 3); // Move to middle of week (Wednesday)
    
    // Only store navigation dates after calendar initialization is complete
    if (this.isCalendarInitialized) {
      this.layoutModeService.setCurrentCalendarDate(weekCenter);
      console.log('[LessonCalendarComponent] 📅 ✅ User navigation - stored calendar date:', weekCenter.toDateString());
    } else {
      console.log('[LessonCalendarComponent] 📅 ⏳ Initialization navigation - NOT storing date:', weekCenter.toDateString());
    }

    // Get current schedule ID from state
    const currentSchedule = this.scheduleStateService.selectedSchedule();

    if (!currentSchedule?.id) {
      console.warn('[LessonCalendarComponent] ⚠️ No schedule available for navigation');
      return;
    }

    // Load events for the new date range
    console.log('[LessonCalendarComponent] 📊 Loading events for navigation range');

    this.subscriptions.add(
      this.calendarEventLoaderService.loadEventsForDateRange(
        currentSchedule.id,
        { start: dateInfo.start, end: dateInfo.end }
      ).subscribe({
        next: (result) => {
          console.log('[LessonCalendarComponent] ✅ Navigation events loaded:', {
            eventCount: result.events.length,
            dateRange: {
              start: result.dateRange.start.toDateString(),
              end: result.dateRange.end.toDateString()
            }
          });

          // Update calendar display with new events
          const displayResult = this.calendarDisplayService.updateCalendarEvents(result.events);

          if (!displayResult.success) {
            console.error('[LessonCalendarComponent] ❌ Failed to display navigation events:', displayResult.error);
          }
        },
        error: (error) => {
          console.error('[LessonCalendarComponent] ❌ Navigation event loading failed:', error);
        }
      })
    );
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

  // ✅ FIXED: Handle lesson move from calendar drag-drop
  private handleLessonMoveFromCalendar(moveEvent: any): void {
    console.log('[LessonCalendarComponent] 🚚 Processing lesson move from calendar:', moveEvent);

    // Extract date and period information from the new date
    const newDate = new Date(moveEvent.newDate);
    const newPeriod = moveEvent.newPeriod || 1; // Default to period 1 if not specified

    // TODO: Call the API to move the lesson once calendar move endpoint is added
    console.log('[LessonCalendarComponent] 🚚 WOULD CALL API with:', {
      lessonId: moveEvent.lessonId,
      newDate: newDate.toISOString(),
      newPeriod: newPeriod
    });
    
    // For now, just refresh to test the UI flow
    console.log('[LessonCalendarComponent] ✅ Lesson move detected successfully - refreshing calendar');
    // TODO: Get courseId from moveEvent when calendar drag-drop provides it
    this.calendarRefreshService.refreshCalendar();
  }

  handleEventContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    console.log('[LessonCalendarComponent] 🎯 Context menu triggered');

    jsEvent.preventDefault();
    jsEvent.stopImmediatePropagation();

    if (!this.contextMenuTrigger) {
      console.error('[LessonCalendarComponent] ❌ Context menu trigger not found');
      return;
    }

    if (this.contextMenuTrigger?.menuOpen) {
      this.contextMenuTrigger.closeMenu();
      setTimeout(() => this.openContextMenu(eventInfo, jsEvent), 200);
      return;
    }

    this.openContextMenu(eventInfo, jsEvent);
  }

  private openContextMenu(eventInfo: any, jsEvent: MouseEvent): void {
    try {
      console.log('[LessonCalendarComponent] 🎯 Setting up context menu for event:', eventInfo.event.title);

      // Set the event context in the service
      this.contextMenuService.setEventContext(eventInfo);

      // Position the context menu
      const menuX = Math.min(jsEvent.clientX, window.innerWidth - 200);
      const menuY = Math.min(jsEvent.clientY, window.innerHeight - 150);

      this.contextMenuPosition.x = menuX + 'px';
      this.contextMenuPosition.y = menuY + 'px';

      // Open the context menu
      setTimeout(() => {
        this.contextMenuTrigger?.openMenu();
      }, 0);

    } catch (error) {
      console.error('[LessonCalendarComponent] ❌ Error opening context menu:', error);
    }
  }

  executeContextAction(action: any): void {
    console.log('[LessonCalendarComponent] ✅ Executing context action:', action.id);

    if (action.handler) {
      action.handler();
    }

    // Close the context menu
    this.contextMenuTrigger?.closeMenu();
  }

  // === CONFIGURATION MODAL ===

  openConfigModal(): void {
    console.log('[LessonCalendarComponent] 📋 Opening configuration modal');

    const dialogRef = this.dialog.open(ScheduleConfigComponent, {
      width: '900px',
      maxWidth: '95vw',
      height: '80vh',
      maxHeight: '700px',
      panelClass: 'custom-dialog-container',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('[LessonCalendarComponent] 📋 Configuration modal closed:', result);

      if (result?.saved) {
        console.log('[LessonCalendarComponent] ✅ Configuration saved - reinitializing calendar');
        // Restart initialization workflow
        this.startCalendarInitialization();
      }
    });
  }

  // === SCHEDULE OPERATIONS ===

  saveSchedule(): void {
    // Delegate to appropriate service
    console.log('[LessonCalendarComponent] 💾 Save schedule requested');
    // Implementation would use schedule persistence service
  }

  // === DEBUG METHODS ===

  debugCalendarState(): void {
    console.log('[LessonCalendarComponent] 🔍 === CALENDAR STATE DEBUG ===');

    const initStatus = this.calendarInitializationService.getInitializationStatus();
    const displayState = this.calendarDisplayService.getDisplayState();
    const dateDebug = this.calendarDateService.getDebugInfo();

    console.log('Initialization Status:', initStatus);
    console.log('Display State:', displayState);
    console.log('Date Service:', dateDebug);
    console.log('Calendar Events Count:', this.calendarEvents().length);

    console.log('[LessonCalendarComponent] 🔍 === END DEBUG ===');
  }

  forceReinitialize(): void {
    console.log('[LessonCalendarComponent] 🔄 Forcing calendar re-initialization');

    this.subscriptions.add(
      this.calendarInitializationService.forceReinitialize().subscribe({
        next: (result) => {
          console.log('[LessonCalendarComponent] ✅ Force re-initialization completed:', result);
        },
        error: (error) => {
          console.error('[LessonCalendarComponent] ❌ Force re-initialization failed:', error);
        }
      })
    );
  }
  private handleRefreshNotification(refreshEvent: any): void {
    console.log('[LessonCalendarComponent] 🔄 ===== REFRESH NOTIFICATION HANDLER START =====');
    console.log('[LessonCalendarComponent] 🔄 Processing refresh event:', {
      scope: refreshEvent.scope,
      courseId: refreshEvent.courseId,
      reason: refreshEvent.reason,
      timestamp: refreshEvent.timestamp
    });

    switch (refreshEvent.scope) {
      case 'full':
        // Full calendar reinitialize (configuration changes)
        console.log('[LessonCalendarComponent] 🔄 Full refresh - reinitializing calendar');
        // Note: startCalendarInitialization() will reset the isCalendarInitialized flag
        this.startCalendarInitialization();
        break;

      case 'course-specific':
        // Reload events for specific course - PRESERVE current view date
        console.log('[LessonCalendarComponent] 🔄 Course-specific refresh - preserving current view for course:', refreshEvent.courseId);
        console.log('[LessonCalendarComponent] 🔄 Calling refreshCurrentViewEvents to preserve calendar position');
        this.refreshCurrentViewEvents(refreshEvent.courseId);
        break;

      default:
        console.warn('[LessonCalendarComponent] ⚠️ Unknown refresh scope:', refreshEvent.scope);
        // Default to preserving current view
        console.log('[LessonCalendarComponent] 🔄 Default refresh - preserving current view');
        this.refreshCurrentViewEvents();
    }

    console.log('[LessonCalendarComponent] 🔄 ===== REFRESH NOTIFICATION HANDLER END =====');
  }

  
  private refreshCurrentViewEvents(courseId?: number): void {
    console.log('[LessonCalendarComponent] 🔄 === REFRESH CURRENT VIEW DEBUG START ===');
    
    const currentSchedule = this.scheduleStateService.selectedSchedule();

    if (!currentSchedule?.id) {
      console.warn('[LessonCalendarComponent] ⚠️ No schedule available for refresh');
      return;
    }

    // FIXED: Preserve current calendar view date instead of recalculating
    let currentDate = this.calendarDateService.getCurrentCalendarDate();
    
    if (!currentDate) {
      console.warn('[LessonCalendarComponent] ⚠️ Could not get current calendar date, falling back to schedule logic');
      
      // Fallback to schedule-based calculation only if we can't get the current view
      const scheduleConfig = this.scheduleConfigurationStateService.activeConfiguration();
      if (!scheduleConfig) {
        console.warn('[LessonCalendarComponent] ⚠️ No schedule configuration available for refresh');
        return;
      }
      
      const today = new Date();
      const scheduleStart = new Date(scheduleConfig.startDate);
      const scheduleEnd = new Date(scheduleConfig.endDate);
      
      if (today >= scheduleStart && today <= scheduleEnd) {
        currentDate = today;
        console.log('[LessonCalendarComponent] 📅 Fallback: Using TODAY (within schedule range)');
      } else {
        currentDate = scheduleStart;
        console.log('[LessonCalendarComponent] 📅 Fallback: Using SCHEDULE START (outside range)');
      }
    } else {
      console.log('[LessonCalendarComponent] ✅ Using CURRENT CALENDAR VIEW date:', currentDate.toDateString());
    }

    console.log('[LessonCalendarComponent] 🔍 === REFRESH PRESERVING CURRENT VIEW ===');
    console.log('[LessonCalendarComponent] 📅 Refresh will use current view date:', {
      currentViewDate: currentDate.toDateString(),
      scheduleId: currentSchedule?.id,
      preservingUserPosition: true
    });

    console.log('[LessonCalendarComponent] 🔄 Refreshing events for current view date:', currentDate.toDateString());

    // FIXED: Load fresh events for current VIEW (week) instead of always loading month
    // TODO: When month view is added, get actual view mode from service
    const currentViewMode = 'week'; // Hard-coded for now, will be dynamic later

    this.subscriptions.add(
      this.calendarEventLoaderService.loadEventsForCurrentView(
        currentSchedule.id,
        currentDate,
        currentViewMode,
        courseId
      ).subscribe({
        next: (events) => {
          console.log('[LessonCalendarComponent] ✅ Fresh events loaded:', {
            eventCount: events.length,
            currentDate: currentDate.toDateString(),
            viewMode: currentViewMode
          });

          // Update calendar display with fresh events
          const displayResult = this.calendarDisplayService.updateCalendarEvents(events);

          if (!displayResult.success) {
            console.error('[LessonCalendarComponent] ❌ Failed to display refreshed events:', displayResult.error);
          }
        },
        error: (error) => {
          console.error('[LessonCalendarComponent] ❌ Failed to refresh events:', error);
        }
      })
    );
  }

  // Removed over-engineered navigation detection system

  // === COMPUTED PROPERTIES FOR TEMPLATE ===

  readonly canGenerateReports = computed(() => {
    const schedule = this.selectedSchedule();
    return schedule && !this.isInMemorySchedule();
  });

  generateFullReport(): void {
    console.log('[LessonCalendarComponent] 📊 Generate full report');
  }

  generateWeekReport(): void {
    console.log('[LessonCalendarComponent] 📊 Generate week report');
  }

  /**
   * FIXED: Load events directly using current calendar week (preserves user position)
   */
  private loadEventsDirectlyWithCurrentWeek(courseId?: number): void {
    console.log('[LessonCalendarComponent] 🔄 === DIRECT CURRENT WEEK LOAD DEBUG START ===');
    
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.id) {
      console.warn('[LessonCalendarComponent] ⚠️ No schedule available for direct load');
      return;
    }

    // FIXED: Use current calendar date instead of today's date
    let currentDate = this.calendarDateService.getCurrentCalendarDate();
    
    if (!currentDate) {
      console.warn('[LessonCalendarComponent] ⚠️ Could not get current calendar date, using today');
      currentDate = new Date();
    }

    // Get current week based on calendar's current date (preserves user navigation)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    
    console.log('[LessonCalendarComponent] 📅 Direct week calculation (preserving calendar position):', {
      calendarCurrentDate: currentDate.toDateString(),
      startOfWeek: startOfWeek.toDateString(),
      endOfWeek: endOfWeek.toDateString(),
      scheduleId: currentSchedule?.id,
      courseId: courseId || 'all courses',
      preservingUserPosition: true
    });

    // Load events for current week directly
    this.subscriptions.add(
      this.calendarEventLoaderService.loadEventsForDateRange(
        currentSchedule.id,
        { start: startOfWeek, end: endOfWeek },
        courseId
      ).subscribe({
        next: (result) => {
          console.log('[LessonCalendarComponent] ✅ Direct week events loaded:', {
            eventCount: result.events.length,
            dateRange: {
              start: result.dateRange.start.toDateString(),
              end: result.dateRange.end.toDateString()
            },
            courseFilter: courseId || 'all'
          });

          // Update calendar display with new events
          const displayResult = this.calendarDisplayService.updateCalendarEvents(result.events);
          if (!displayResult.success) {
            console.error('[LessonCalendarComponent] ❌ Failed to display direct week events:', displayResult.error);
          }
        },
        error: (error) => {
          console.error('[LessonCalendarComponent] ❌ Direct week event loading failed:', error);
        }
      })
    );
  }
}
