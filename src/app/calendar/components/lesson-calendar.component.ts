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
      this.handleCalendarNavigation.bind(this) // NEW: Navigation callback
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

    console.log('[LessonCalendarComponent] ✅ Calendar options configured');
  }

  ngAfterViewInit(): void {
    console.log('[LessonCalendarComponent] 🔧 Initializing calendar services after view init');

    // Initialize core services with calendar callbacks
    this.initializeCalendarServices();

    // Start the complete initialization workflow
    this.startCalendarInitialization();
  }

  ngOnDestroy(): void {
    console.log('[LessonCalendarComponent] 🧹 Cleaning up');
    this.subscriptions.unsubscribe();
    this.contextMenuService.clearContext();
    this.calendarConfigService.cleanup();
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
   */
  handleCalendarNavigation(dateInfo: { start: Date; end: Date; view: any }): void {
    console.log('[LessonCalendarComponent] 🧭 Calendar navigation detected:', {
      start: dateInfo.start.toDateString(),
      end: dateInfo.end.toDateString(),
      view: dateInfo.view.type
    });

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
    console.log('[LessonCalendarComponent] 🔄 Processing refresh event:', {
      reason: refreshEvent.reason,
      scope: refreshEvent.scope,
      scheduleId: refreshEvent.scheduleId
    });

    switch (refreshEvent.scope) {
      case 'full':
        // Full calendar reinitialize (configuration changes)
        console.log('[LessonCalendarComponent] 🔄 Full refresh - reinitializing calendar');
        this.startCalendarInitialization();
        break;

      case 'current-view':
        // Reload current month/week events
        console.log('[LessonCalendarComponent] 🔄 Current view refresh - reloading events');
        this.refreshCurrentViewEvents();
        break;

      case 'events-only':
        // Just reload events without changing calendar position
        console.log('[LessonCalendarComponent] 🔄 Events only refresh');
        this.refreshCurrentViewEvents();
        break;

      default:
        console.warn('[LessonCalendarComponent] ⚠️ Unknown refresh scope:', refreshEvent.scope);
        // Default to current view refresh
        this.refreshCurrentViewEvents();
    }
  }

  
  private refreshCurrentViewEvents(): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();

    if (!currentSchedule?.id) {
      console.warn('[LessonCalendarComponent] ⚠️ No schedule available for refresh');
      return;
    }

    // Get current calendar date to determine what events to reload
    const calendarApi = this.calendar?.getApi();
    if (!calendarApi) {
      console.warn('[LessonCalendarComponent] ⚠️ Calendar API not available for refresh');
      return;
    }

    const currentDate = calendarApi.getDate();
    console.log('[LessonCalendarComponent] 🔄 Refreshing events for current date:', currentDate.toDateString());

    // FIXED: Load fresh events for current VIEW (week) instead of always loading month
    // TODO: When month view is added, get actual view mode from service
    const currentViewMode = 'week'; // Hard-coded for now, will be dynamic later

    this.subscriptions.add(
      this.calendarEventLoaderService.loadEventsForCurrentView(
        currentSchedule.id,
        currentDate,
        currentViewMode
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
}
