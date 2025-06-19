// RESPONSIBILITY: Manages container view modes and split-panel ordering configurations
// DOES NOT: Handle drag operations or component rendering logic
// CALLED BY: LessonTreeContainerComponent, split-panel drag handlers

import { Injectable, signal, computed } from '@angular/core';

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
  // Available view mode options
  readonly layoutModeOptions: LayoutModeOption[] = [
    { value: 'tree-details', label: 'Tree-Details' },
    { value: 'tree-calendar', label: 'Tree-Calendar' },
    { value: 'calendar-details', label: 'Calendar-Details' }
  ];

  // Current view mode signal
  private readonly _layoutMode = signal<LayoutMode>('tree-details');
  readonly layoutMode = this._layoutMode.asReadonly();
  
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
  
  // For calendar-details mode, we also need to track sidebar visibility
  private readonly _sidebarVisible = signal<boolean>(true);
  readonly sidebarVisible = this._sidebarVisible.asReadonly();

  constructor() {
    console.log('[LayoutModeService] Initialized', { timestamp: new Date().toISOString() });
    
    // Load saved configurations from localStorage if available
    this.loadSplitPanelConfigurations();
  }

  // Set the view mode
  setViewMode(mode: LayoutMode): void {
    console.log(`[LayoutModeService] Setting view mode to ${mode}`, { timestamp: new Date().toISOString() });
    this._layoutMode.set(mode);
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