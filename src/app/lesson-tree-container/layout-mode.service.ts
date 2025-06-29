// **COMPLETE FILE** - Enhanced layout-mode.service.ts with InfoPanel auto-switching
// RESPONSIBILITY: Manages container view modes, split-panel ordering, and automatic InfoPanel visibility
// DOES NOT: Handle drag operations or component rendering logic
// CALLED BY: LessonTreeContainerComponent, split-panel drag handlers, InfoPanel components

import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { PanelStateService } from '../info-panel/panel-state.service';

// Define the available view modes
export type LayoutMode = 'tree-details' | 'tree-calendar' | 'calendar-details';

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
}

@Injectable({
  providedIn: 'root'
})
export class LayoutModeService {
  // Injected services
  private panelStateService = inject(PanelStateService);

  // Available view mode options
  readonly layoutModeOptions: LayoutModeOption[] = [
    { value: 'tree-details', label: 'Tree-Details' },
    { value: 'tree-calendar', label: 'Tree-Calendar' },
    { value: 'calendar-details', label: 'Calendar-Details' }
  ];

  // Current view mode signal
  private readonly _layoutMode = signal<LayoutMode>('tree-details');
  readonly layoutMode = this._layoutMode.asReadonly();
  
  // Track the mode before auto-switching for restoration
  private readonly _previousMode = signal<LayoutMode | null>(null);
  readonly previousMode = this._previousMode.asReadonly();
  
  // Panel configurations for each view mode
  private readonly _splitPanelConfigurations = signal<LayoutModeConfigurations>({
    'tree-details': { left: 'tree', right: 'details' },
    'tree-calendar': { left: 'tree', right: 'calendar' },
    'calendar-details': { left: 'calendar', right: 'details' }
  });
  readonly splitPanelConfigurations = this._splitPanelConfigurations.asReadonly();
  
  // Computed signals for specific layouts
  readonly isTreeDetailsMode = computed(() => this._layoutMode() === 'tree-details');
  readonly isTreeCalendarMode = computed(() => this._layoutMode() === 'tree-calendar');
  readonly isCalendarDetailsMode = computed(() => this._layoutMode() === 'calendar-details');
  
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

  constructor() {
    console.log('[LayoutModeService] Initialized with InfoPanel auto-switching', { timestamp: new Date().toISOString() });
    
    // Load saved configurations from localStorage if available
    this.loadSplitPanelConfigurations();
    
    // Setup automatic mode switching for InfoPanel visibility
    this.setupInfoPanelAutoSwitching();
  }

  /**
   * Automatic InfoPanel visibility management
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
        
        this._layoutMode.set(targetMode);
      }
      // If InfoPanel exits edit/add mode and we had auto-switched
      else if (panelMode === 'view' && this._previousMode() !== null) {
        const previousMode = this._previousMode();
        
        console.log(`[LayoutModeService] Restoring previous mode after InfoPanel editing`, {
          restoringTo: previousMode,
          timestamp: new Date().toISOString()
        });
        
        if (previousMode) {
          this._layoutMode.set(previousMode);
        }
        this._previousMode.set(null);
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

  // Set the view mode (manual user action - clears previous mode tracking)
  setViewMode(mode: LayoutMode): void {
    console.log(`[LayoutModeService] Manual view mode change to ${mode}`, { timestamp: new Date().toISOString() });
    this._layoutMode.set(mode);
    this._previousMode.set(null); // Clear auto-switch tracking on manual change
  }

  // Swap split-panels for the current view mode
  swapSplitPanels(): void {
    const currentMode = this._layoutMode();
    const currentConfig = this._splitPanelConfigurations()[currentMode];
    
    console.log(`[LayoutModeService] Swapping split-panels for ${currentMode}`, { 
      before: currentConfig,
      timestamp: new Date().toISOString() 
    });
    
    const newConfigurations = {
      ...this._splitPanelConfigurations(),
      [currentMode]: {
        left: currentConfig.right,
        right: currentConfig.left
      }
    };
    
    this._splitPanelConfigurations.set(newConfigurations);
    this.saveSplitPanelConfigurations();
    
    console.log(`[LayoutModeService] Split-panels swapped`, { 
      after: newConfigurations[currentMode],
      timestamp: new Date().toISOString() 
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

  // Toggle sidebar visibility (for calendar-details mode)
  toggleSidebar(): void {
    const newValue = !this._sidebarVisible();
    console.log(`[LayoutModeService] Toggling sidebar visibility to ${newValue}`, { timestamp: new Date().toISOString() });
    this._sidebarVisible.set(newValue);
  }

  // Reset split-panel configuration for current mode to default
  resetCurrentSplitPanelConfiguration(): void {
    const currentMode = this._layoutMode();
    const defaultConfigurations: LayoutModeConfigurations = {
      'tree-details': { left: 'tree', right: 'details' },
      'tree-calendar': { left: 'tree', right: 'calendar' },
      'calendar-details': { left: 'calendar', right: 'details' }
    };

    const newConfigurations = {
      ...this._splitPanelConfigurations(),
      [currentMode]: defaultConfigurations[currentMode]
    };

    this._splitPanelConfigurations.set(newConfigurations);
    this.saveSplitPanelConfigurations();
    
    console.log(`[LayoutModeService] Reset ${currentMode} to default configuration`, { 
      config: defaultConfigurations[currentMode],
      timestamp: new Date().toISOString() 
    });
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
}