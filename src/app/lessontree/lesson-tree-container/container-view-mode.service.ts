// src/app/core/services/container-view-mode.service.ts
import { Injectable, signal, computed } from '@angular/core';

// Define the available view modes
export type ContainerViewMode = 'tree-details' | 'tree-calendar' | 'calendar-details';

export interface ViewModeOption {
  value: ContainerViewMode;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContainerViewModeService {
  // Available view mode options
  readonly viewModeOptions: ViewModeOption[] = [
    { value: 'tree-details', label: 'Tree-Details' },
    { value: 'tree-calendar', label: 'Tree-Calendar' },
    { value: 'calendar-details', label: 'Calendar-Details' }
  ];

  // Current view mode signal
  private readonly _viewMode = signal<ContainerViewMode>('tree-details');
  readonly viewMode = this._viewMode.asReadonly();
  
  // Computed signals for specific layouts
  readonly isTreeDetailsMode = computed(() => this._viewMode() === 'tree-details');
  readonly isTreeCalendarMode = computed(() => this._viewMode() === 'tree-calendar');
  readonly isCalendarDetailsMode = computed(() => this._viewMode() === 'calendar-details');
  
  // For calendar-details mode, we also need to track sidebar visibility
  private readonly _sidebarVisible = signal<boolean>(true);
  readonly sidebarVisible = this._sidebarVisible.asReadonly();

  constructor() {
    console.log('[ContainerViewModeService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Set the view mode
  setViewMode(mode: ContainerViewMode): void {
    console.log(`[ContainerViewModeService] Setting view mode to ${mode}`, { timestamp: new Date().toISOString() });
    this._viewMode.set(mode);
  }

  // Toggle sidebar visibility (for calendar-details mode)
  toggleSidebar(): void {
    const newValue = !this._sidebarVisible();
    console.log(`[ContainerViewModeService] Toggling sidebar visibility to ${newValue}`, { timestamp: new Date().toISOString() });
    this._sidebarVisible.set(newValue);
  }
}