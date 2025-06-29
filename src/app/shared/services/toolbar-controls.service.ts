// **COMPLETE FILE** - New service for toolbar controls
// RESPONSIBILITY: Aggregates all toolbar controls (layout, drag mode, filters) for disclosure widget
// DOES NOT: Handle component rendering or complex business logic
// CALLED BY: HomeComponent disclosure widget, status bar components

import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LayoutModeService, LayoutMode } from '../../lesson-tree-container/layout-mode.service';
import { UserService } from '../../user-config/user.service';
import { DragMode } from '../../lesson-tree/services/tree-interactions/node-drag-mode.service';
import { NodeOperationsService } from '../../lesson-tree/services/node-operations/node-operations.service';
import { CourseDataService } from '../../lesson-tree/services/course-data/course-data.service';

export interface CourseFilterState {
  courseFilter: 'active' | 'archived' | 'both';
  visibilityFilter: 'private' | 'team';
  searchTerm: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToolbarControlsService {
  private layoutModeService = inject(LayoutModeService);
  private nodeOperationsService = inject(NodeOperationsService);
  private courseDataService = inject(CourseDataService);
  private userService = inject(UserService);

  // Course filter state signals
  private readonly _courseFilterState = signal<CourseFilterState>({
    courseFilter: 'active',
    visibilityFilter: 'private',
    searchTerm: ''
  });
  readonly courseFilterState = this._courseFilterState.asReadonly();

  // Computed properties that expose service states
  readonly layoutMode = this.layoutModeService.layoutMode;
  readonly layoutModeOptions = this.layoutModeService.layoutModeOptions;
  readonly dragMode = this.nodeOperationsService.dragMode;
  readonly coursesCount = this.courseDataService.coursesCount;

  // Computed property for district availability
  readonly hasDistrictId = computed(() => {
    const user = this.userService.getCurrentUser();
    return !!user?.district;
  });

  // Computed property for calendar visibility
  readonly isCalendarVisible = computed(() => {
    const layoutMode = this.layoutModeService.layoutMode();
    return layoutMode === 'tree-calendar' || layoutMode === 'calendar-details';
  });

  constructor() {
    console.log('[ToolbarControlsService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Layout mode methods
  setLayoutMode(mode: LayoutMode): void {
    console.log(`[ToolbarControlsService] Setting layout mode to: ${mode}`, { timestamp: new Date().toISOString() });
    this.layoutModeService.setViewMode(mode);
  }

  swapSplitPanels(): void {
    console.log('[ToolbarControlsService] Swapping split panels', { timestamp: new Date().toISOString() });
    this.layoutModeService.swapSplitPanels();
  }

  // Drag mode methods
  setDragMode(mode: DragMode): void {
    console.log(`[ToolbarControlsService] Setting drag mode to: ${mode}`, { timestamp: new Date().toISOString() });
    this.nodeOperationsService.setDragMode(mode);
  }

  toggleDragMode(): void {
    this.nodeOperationsService.toggleDragMode();
  }

  // Course filter methods
  setCourseFilterState(filterState: Partial<CourseFilterState>): void {
    const currentState = this._courseFilterState();
    const newState = { ...currentState, ...filterState };
    
    console.log('[ToolbarControlsService] Updating course filter state', {
      old: currentState,
      new: newState,
      timestamp: new Date().toISOString()
    });
    
    this._courseFilterState.set(newState);
  }

  setCourseFilter(filter: 'active' | 'archived' | 'both'): void {
    this.setCourseFilterState({ courseFilter: filter });
  }

  setVisibilityFilter(filter: 'private' | 'team'): void {
    this.setCourseFilterState({ visibilityFilter: filter });
  }

  setSearchTerm(searchTerm: string): void {
    this.setCourseFilterState({ searchTerm });
  }

  // Course filter application - this will trigger CourseListComponent updates
  applyCourseFilters(): Observable<void> {
    return new Observable(observer => {
      const filterState = this._courseFilterState();
      
      // Emit filter change event through CourseDataService or similar mechanism
      // This will be picked up by CourseListComponent
      console.log('[ToolbarControlsService] Applying course filters', {
        filterState,
        timestamp: new Date().toISOString()
      });
      
      // For now, just complete - the actual filter application will be handled
      // by the component that listens to courseFilterState changes
      observer.next();
      observer.complete();
    });
  }

  // Get current filter state for dialog initialization
  getCurrentCourseFilters(): CourseFilterState {
    return this._courseFilterState();
  }

  // Reset filters to defaults
  resetCourseFilters(): void {
    console.log('[ToolbarControlsService] Resetting course filters to defaults', { timestamp: new Date().toISOString() });
    this._courseFilterState.set({
      courseFilter: 'active',
      visibilityFilter: 'private',
      searchTerm: ''
    });
  }

  // User utilities
  getDistrictId(): number | null {
    return this.userService.getDistrictId();
  }

  getCurrentUser() {
    return this.userService.getCurrentUser();
  }
}