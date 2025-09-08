// **COMPLETE FILE** - LayoutModeService with Dual Signal/Observable Pattern
// RESPONSIBILITY: Manages container view modes, split-panel ordering, and automatic InfoPanel visibility
// DOES NOT: Handle drag operations or component rendering logic
// CALLED BY: LessonTreeContainerComponent, split-panel drag handlers, InfoPanel components

import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { PanelStateService } from '../info-panel/panel-state.service';

// Define the available view modes
export type LayoutMode = 'tree-details' | 'tree-calendar' | 'calendar-details' | 'course-focus';

// Define split-panel types
export type SplitPanelType = 'tree' | 'calendar' | 'details';

export interface LayoutModeOption {
  value: LayoutMode;
  label: string;
}

export interface SplitPanelConfiguration {
  left: SplitPanelType;
  right: SplitPanelType;
}

export interface LayoutModeConfigurations {
  'tree-details': SplitPanelConfiguration;
  'tree-calendar': SplitPanelConfiguration;
  'calendar-details': SplitPanelConfiguration;
  'course-focus': SplitPanelConfiguration;
}

// ✅ Observable event interfaces
export interface LayoutModeChangeEvent {
  previousMode: LayoutMode | null;
  newMode: LayoutMode;
  source: 'manual' | 'auto-switch' | 'restoration';
  reason?: string;
  timestamp: Date;
}

export interface SidebarToggleEvent {
  previousState: boolean;
  newState: boolean;
  layoutMode: LayoutMode;
  timestamp: Date;
}

export interface AutoSwitchEvent {
  fromMode: LayoutMode;
  toMode: LayoutMode;
  trigger: 'infopanel-edit' | 'infopanel-add' | 'infopanel-view';
  panelMode: string;
  timestamp: Date;
}

export interface SplitPanelSwapEvent {
  layoutMode: LayoutMode;
  previousConfig: SplitPanelConfiguration;
  newConfig: SplitPanelConfiguration;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutModeService {

  // ✅ Observable events for cross-component coordination
  private readonly _layoutModeChanged$ = new Subject<LayoutModeChangeEvent>();
  private readonly _sidebarToggled$ = new Subject<SidebarToggleEvent>();
  private readonly _autoSwitchTriggered$ = new Subject<AutoSwitchEvent>();
  private readonly _splitPanelSwapped$ = new Subject<SplitPanelSwapEvent>();

  // Public observables for business logic subscriptions
  readonly layoutModeChanged$ = this._layoutModeChanged$.asObservable();
  readonly sidebarToggled$ = this._sidebarToggled$.asObservable();
  readonly autoSwitchTriggered$ = this._autoSwitchTriggered$.asObservable();
  readonly splitPanelSwapped$ = this._splitPanelSwapped$.asObservable();

  // Injected services
  private panelStateService = inject(PanelStateService);
  private document = inject(DOCUMENT);

  // Available view mode options
  readonly layoutModeOptions: LayoutModeOption[] = [
    { value: 'tree-details', label: 'Tree-Details' },
    { value: 'tree-calendar', label: 'Tree-Calendar' },
    { value: 'calendar-details', label: 'Calendar-Details' },
    { value: 'course-focus', label: 'Course Focus' }
  ];

  // ✅ Signal state for reactive UI
  private readonly _layoutMode = signal<LayoutMode>('tree-details');
  readonly layoutMode = this._layoutMode.asReadonly();

  // Track the mode before auto-switching for restoration
  private readonly _previousMode = signal<LayoutMode | null>(null);
  readonly previousMode = this._previousMode.asReadonly();

  // Panel configurations for each view mode
  private readonly _splitPanelConfigurations = signal<LayoutModeConfigurations>({
    'tree-details': { left: 'tree', right: 'details' },
    'tree-calendar': { left: 'tree', right: 'calendar' },
    'calendar-details': { left: 'calendar', right: 'details' },
    'course-focus': { left: 'tree', right: 'calendar' }  // Focus mode uses tree + calendar layout
  });
  readonly splitPanelConfigurations = this._splitPanelConfigurations.asReadonly();

  // Computed signals for specific layouts (keep as signals for reactive UI)
  readonly isTreeDetailsMode = computed(() => this._layoutMode() === 'tree-details');
  readonly isTreeCalendarMode = computed(() => this._layoutMode() === 'tree-calendar');
  readonly isCalendarDetailsMode = computed(() => this._layoutMode() === 'calendar-details');
  readonly isCourseFocusMode = computed(() => this._layoutMode() === 'course-focus');

  // Computed signal for current split-panel configuration
  readonly currentSplitPanelConfig = computed(() => {
    const currentMode = this._layoutMode();
    return this._splitPanelConfigurations()[currentMode];
  });

  // Check if details panel is currently visible
  readonly isDetailsVisible = computed(() => {
    const config = this.currentSplitPanelConfig();
    return config.left === 'details' || config.right === 'details';
  });

  // For calendar-details mode, we also need to track sidebar visibility
  private readonly _sidebarVisible = signal<boolean>(true);
  readonly sidebarVisible = this._sidebarVisible.asReadonly();

  // ✅ Calendar view date preservation across layout changes
  // JUSTIFICATION: Layout transitions destroy/recreate calendar component, so layout service
  // owns the responsibility for preserving calendar state during these transitions
  private _currentCalendarDate: Date | null = null;

  // ✅ Course Focus Mode state
  private readonly _focusedCourseId = signal<number | null>(null);
  readonly focusedCourseId = this._focusedCourseId.asReadonly();

  // Track the mode before entering course focus for restoration
  private readonly _preFocusMode = signal<LayoutMode | null>(null);
  readonly preFocusMode = this._preFocusMode.asReadonly();

  constructor() {
    console.log('[LayoutModeService] Initialized with dual Signal/Observable pattern', {
      timestamp: new Date().toISOString()
    });

    // Load saved configurations from localStorage if available
    this.loadSplitPanelConfigurations();

    // Setup automatic mode switching for InfoPanel visibility
    this.setupInfoPanelAutoSwitching();

    // Setup CSS class management for course focus mode
    this.setupCourseFocusCssClass();
  }

  /**
   * ✅ ENHANCED: Automatic InfoPanel visibility management with Observable events
   * Switches to a details-visible mode when InfoPanel enters edit/add mode
   * Accommodates future calendar-based lesson additions
   */
  private setupInfoPanelAutoSwitching(): void {
    effect(() => {
      const panelMode = this.panelStateService.panelMode();
      const currentLayoutMode = this._layoutMode();
      const isDetailsCurrentlyVisible = this.isDetailsVisible();

      console.log(`[LayoutModeService] InfoPanel mode effect triggered`, {
        panelMode,
        currentLayoutMode,
        isDetailsVisible: isDetailsCurrentlyVisible,
        timestamp: new Date().toISOString()
      });

      // If InfoPanel enters edit/add mode and details panel is not visible
      if ((panelMode === 'edit' || panelMode === 'add') && !isDetailsCurrentlyVisible) {
        // Store current mode for potential restoration
        this._previousMode.set(currentLayoutMode);

        // Choose appropriate details-visible mode based on current context
        const targetMode = this.determineTargetDetailsMode(currentLayoutMode);

        console.log(`[LayoutModeService] Auto-switching to show details panel`, {
          from: currentLayoutMode,
          to: targetMode,
          reason: `InfoPanel entered ${panelMode} mode`,
          timestamp: new Date().toISOString()
        });

        // ✅ Update signal state
        this._layoutMode.set(targetMode);

        // ✅ Emit Observable events for business logic
        this._autoSwitchTriggered$.next({
          fromMode: currentLayoutMode,
          toMode: targetMode,
          trigger: panelMode === 'edit' ? 'infopanel-edit' : 'infopanel-add',
          panelMode,
          timestamp: new Date()
        });

        this._layoutModeChanged$.next({
          previousMode: currentLayoutMode,
          newMode: targetMode,
          source: 'auto-switch',
          reason: `InfoPanel entered ${panelMode} mode`,
          timestamp: new Date()
        });
      }
      // If InfoPanel exits edit/add mode and we had auto-switched
      else if (panelMode === 'view' && this._previousMode() !== null) {
        const previousMode = this._previousMode();

        console.log(`[LayoutModeService] Restoring previous mode after InfoPanel editing`, {
          restoringTo: previousMode,
          timestamp: new Date().toISOString()
        });

        if (previousMode) {
          // ✅ Update signal state
          this._layoutMode.set(previousMode);

          // ✅ Emit Observable events
          this._autoSwitchTriggered$.next({
            fromMode: currentLayoutMode,
            toMode: previousMode,
            trigger: 'infopanel-view',
            panelMode,
            timestamp: new Date()
          });

          this._layoutModeChanged$.next({
            previousMode: currentLayoutMode,
            newMode: previousMode,
            source: 'restoration',
            reason: 'InfoPanel exited edit/add mode',
            timestamp: new Date()
          });
        }
        this._previousMode.set(null);
      }
    });
  }

  /**
   * ✅ Setup CSS class management for course focus mode
   * Automatically adds/removes the 'course-focus-mode' class on the body element
   */
  private setupCourseFocusCssClass(): void {
    effect(() => {
      const isCourseFocusMode = this.isCourseFocusMode();
      
      if (isCourseFocusMode) {
        this.document.body.classList.add('course-focus-mode');
        console.log('[LayoutModeService] 🎯 Added course-focus-mode CSS class to body');
      } else {
        this.document.body.classList.remove('course-focus-mode');
        console.log('[LayoutModeService] 🎯 Removed course-focus-mode CSS class from body');
      }
    });
  }

  /**
   * Determines the best details-visible mode based on current context
   * Future enhancement: Could consider calendar context for lesson additions from calendar
   */
  private determineTargetDetailsMode(currentMode: LayoutMode): LayoutMode {
    // If currently in tree-calendar mode, prefer tree-details to maintain tree context
    // This supports the current workflow where lessons are added from the tree
    if (currentMode === 'tree-calendar') {
      return 'tree-details';
    }

    // If currently in calendar-details, details is already visible (shouldn't reach here)
    if (currentMode === 'calendar-details') {
      return 'calendar-details';
    }

    // Default fallback - tree-details mode
    // Future enhancement: When calendar-based lesson addition is implemented,
    // this could check if the lesson addition was initiated from calendar context
    // and return 'calendar-details' in that case
    return 'tree-details';
  }

  // ✅ ENHANCED: Set the view mode with Observable event emission
  setViewMode(mode: LayoutMode): void {
    const previousMode = this._layoutMode();

    console.log(`[LayoutModeService] Manual view mode change to ${mode}`, {
      previousMode,
      timestamp: new Date().toISOString()
    });

    // ✅ Update signal state
    this._layoutMode.set(mode);
    this._previousMode.set(null); // Clear auto-switch tracking on manual change

    // ✅ Emit Observable event for business logic
    this._layoutModeChanged$.next({
      previousMode,
      newMode: mode,
      source: 'manual',
      timestamp: new Date()
    });
  }

  // ✅ ENHANCED: Swap split-panels with Observable event emission
  swapSplitPanels(): void {
    const currentMode = this._layoutMode();
    const currentConfig = this._splitPanelConfigurations()[currentMode];

    console.log(`[LayoutModeService] Swapping split-panels for ${currentMode}`, {
      before: currentConfig,
      timestamp: new Date().toISOString()
    });

    const newConfig = {
      left: currentConfig.right,
      right: currentConfig.left
    };

    const newConfigurations = {
      ...this._splitPanelConfigurations(),
      [currentMode]: newConfig
    };

    // ✅ Update signal state
    this._splitPanelConfigurations.set(newConfigurations);
    this.saveSplitPanelConfigurations();

    // ✅ Emit Observable event for business logic
    this._splitPanelSwapped$.next({
      layoutMode: currentMode,
      previousConfig: currentConfig,
      newConfig,
      timestamp: new Date()
    });

    console.log(`[LayoutModeService] Split-panels swapped`, {
      after: newConfig,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ ENHANCED: Toggle sidebar with Observable event emission
  toggleSidebar(): void {
    const previousState = this._sidebarVisible();
    const newState = !previousState;
    const currentMode = this._layoutMode();

    console.log(`[LayoutModeService] Toggling sidebar visibility to ${newState}`, {
      previousState,
      layoutMode: currentMode,
      timestamp: new Date().toISOString()
    });

    // ✅ Update signal state
    this._sidebarVisible.set(newState);

    // ✅ Emit Observable event for business logic
    this._sidebarToggled$.next({
      previousState,
      newState,
      layoutMode: currentMode,
      timestamp: new Date()
    });
  }

  // Check if a specific split-panel is on the left
  isSplitPanelOnLeft(splitPanelType: SplitPanelType): boolean {
    return this.currentSplitPanelConfig().left === splitPanelType;
  }

  // Check if a specific split-panel is on the right
  isSplitPanelOnRight(splitPanelType: SplitPanelType): boolean {
    return this.currentSplitPanelConfig().right === splitPanelType;
  }

  // Get the split-panel type for a specific position
  getLeftSplitPanel(): SplitPanelType {
    return this.currentSplitPanelConfig().left;
  }

  getRightSplitPanel(): SplitPanelType {
    return this.currentSplitPanelConfig().right;
  }

  // Reset split-panel configuration for current mode to default
  resetCurrentSplitPanelConfiguration(): void {
    const currentMode = this._layoutMode();
    const currentConfig = this._splitPanelConfigurations()[currentMode];
    const defaultConfigurations: LayoutModeConfigurations = {
      'tree-details': { left: 'tree', right: 'details' },
      'tree-calendar': { left: 'tree', right: 'calendar' },
      'calendar-details': { left: 'calendar', right: 'details' },
      'course-focus': { left: 'tree', right: 'calendar' }
    };

    const defaultConfig = defaultConfigurations[currentMode];
    const newConfigurations = {
      ...this._splitPanelConfigurations(),
      [currentMode]: defaultConfig
    };

    // ✅ Update signal state
    this._splitPanelConfigurations.set(newConfigurations);
    this.saveSplitPanelConfigurations();

    // ✅ Emit Observable event if configuration actually changed
    if (JSON.stringify(currentConfig) !== JSON.stringify(defaultConfig)) {
      this._splitPanelSwapped$.next({
        layoutMode: currentMode,
        previousConfig: currentConfig,
        newConfig: defaultConfig,
        timestamp: new Date()
      });
    }

    console.log(`[LayoutModeService] Reset ${currentMode} to default configuration`, {
      config: defaultConfig,
      timestamp: new Date().toISOString()
    });
  }

  // === COURSE FOCUS MODE METHODS ===

  /**
   * ✅ Enter course focus mode - focuses on a single course
   * Preserves current layout mode for restoration
   */
  enterCourseFocusMode(courseId: number): void {
    const currentMode = this._layoutMode();
    
    console.log(`[LayoutModeService] 🎯 Entering course focus mode for course ${courseId}`, {
      previousMode: currentMode,
      timestamp: new Date().toISOString()
    });

    // Store current mode for restoration
    this._preFocusMode.set(currentMode);
    this._focusedCourseId.set(courseId);

    // Switch to course focus layout
    this._layoutMode.set('course-focus');

    // Emit Observable event
    this._layoutModeChanged$.next({
      previousMode: currentMode,
      newMode: 'course-focus',
      source: 'manual',
      reason: `Focused on course ${courseId}`,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Exit course focus mode - returns to previous layout
   * Clears focused course state
   */
  exitCourseFocusMode(): void {
    const currentMode = this._layoutMode();
    const previousMode = this._preFocusMode();
    const focusedCourseId = this._focusedCourseId();
    
    if (currentMode !== 'course-focus') {
      console.warn('[LayoutModeService] Cannot exit course focus mode - not currently in focus mode');
      return;
    }

    const targetMode = previousMode || 'tree-calendar'; // Fallback to tree-calendar

    console.log(`[LayoutModeService] 🎯 Exiting course focus mode`, {
      previousMode,
      targetMode,
      focusedCourseId,
      timestamp: new Date().toISOString()
    });

    // Clear focus state
    this._focusedCourseId.set(null);
    this._preFocusMode.set(null);

    // Return to previous mode
    this._layoutMode.set(targetMode);

    // Emit Observable event
    this._layoutModeChanged$.next({
      previousMode: currentMode,
      newMode: targetMode,
      source: 'restoration',
      reason: `Exited course focus for course ${focusedCourseId}`,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Toggle course focus mode - smart toggle based on current state
   */
  toggleCourseFocusMode(courseId: number): void {
    const currentMode = this._layoutMode();
    const currentFocusedId = this._focusedCourseId();

    if (currentMode === 'course-focus' && currentFocusedId === courseId) {
      // Exit focus mode if already focused on this course
      this.exitCourseFocusMode();
    } else if (currentMode === 'course-focus' && currentFocusedId !== courseId) {
      // Switch focus to different course (don't change mode, just update course)
      console.log(`[LayoutModeService] 🎯 Switching course focus from ${currentFocusedId} to ${courseId}`);
      this._focusedCourseId.set(courseId);
      
      // Emit event for course change
      this._layoutModeChanged$.next({
        previousMode: currentMode,
        newMode: currentMode,
        source: 'manual',
        reason: `Switched focus from course ${currentFocusedId} to ${courseId}`,
        timestamp: new Date()
      });
    } else {
      // Enter focus mode
      this.enterCourseFocusMode(courseId);
    }
  }

  // === CALENDAR DATE PRESERVATION METHODS ===

  /**
   * ✅ Set current calendar view date (called when user navigates calendar)
   * JUSTIFICATION: Layout changes destroy calendar component, so layout service preserves state
   */
  setCurrentCalendarDate(date: Date): void {
    this._currentCalendarDate = new Date(date);
    console.log('[LayoutModeService] 📅 Calendar view date preserved:', {
      date: this._currentCalendarDate.toDateString(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * ✅ Get preserved calendar view date (called when calendar component re-initializes)
   * Returns null if no date has been preserved yet
   */
  getCurrentCalendarDate(): Date | null {
    console.log('[LayoutModeService] 📅 Retrieving preserved calendar date:', {
      preservedDate: this._currentCalendarDate?.toDateString() || 'none',
      timestamp: new Date().toISOString()
    });
    return this._currentCalendarDate;
  }

  /**
   * ✅ Clear preserved calendar date (optional cleanup)
   */
  clearCurrentCalendarDate(): void {
    console.log('[LayoutModeService] 📅 Clearing preserved calendar date');
    this._currentCalendarDate = null;
  }

  // Persistence methods
  private saveSplitPanelConfigurations(): void {
    try {
      const configsToSave = this._splitPanelConfigurations();
      localStorage.setItem('lessonTree.splitPanelConfigurations', JSON.stringify(configsToSave));
    } catch (error) {
      console.warn('[LayoutModeService] Failed to save split-panel configurations', error);
    }
  }

  private loadSplitPanelConfigurations(): void {
    try {
      const saved = localStorage.getItem('lessonTree.splitPanelConfigurations');
      if (saved) {
        const parsedConfigs = JSON.parse(saved) as LayoutModeConfigurations;
        this._splitPanelConfigurations.set(parsedConfigs);
        console.log('[LayoutModeService] Loaded saved split-panel configurations', parsedConfigs);
      }
    } catch (error) {
      console.warn('[LayoutModeService] Failed to load split-panel configurations, using defaults', error);
    }
  }

  // === CLEANUP ===
  ngOnDestroy(): void {
    this._layoutModeChanged$.complete();
    this._sidebarToggled$.complete();
    this._autoSwitchTriggered$.complete();
    this._splitPanelSwapped$.complete();
    console.log('[LayoutModeService] All Observable subjects completed');
  }
}
