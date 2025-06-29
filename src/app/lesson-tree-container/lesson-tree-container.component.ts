// **COMPLETE FILE** - Can directly replace existing lesson-tree-container.component.ts
// RESPONSIBILITY: Main container component managing layout views and panel reordering
// DOES NOT: Handle toolbar controls (moved to HomeComponent), hover status bar functionality
// CALLED BY: App routing system, parent components

import { CommonModule } from "@angular/common";
import { Component, ViewChild, inject, computed } from "@angular/core";
import { InfoPanelComponent } from "../info-panel/info-panel.component";
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { SplitPanelHeaderComponent } from "./split-panel-header.component";
import { PanelStateService } from "../info-panel/panel-state.service";
import { CourseListComponent } from "../lesson-tree/course-list/course-list.component";
import { CourseDataService } from "../lesson-tree/services/course-data/course-data.service";
import { NodeSelectionService } from "../lesson-tree/services/node-operations/node-selection.service";
import { ToolbarControlsService } from "../shared/services/toolbar-controls.service";
import { UserService } from "../user-config/user.service";
import { LayoutModeService, SplitPanelType } from "./layout-mode.service";
import { SplitPanelDragService } from "./split-panel-drag.service";
import {LessonCalendarComponent} from '../calendar/components/lesson-calendar.component';


@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
    CommonModule,
    CourseListComponent,
    InfoPanelComponent,
    LessonCalendarComponent,
    SplitPanelHeaderComponent,
    SplitComponent,
    SplitAreaComponent
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent {
  // Split pane size configurations for different views (always reset to defaults)
  readonly defaultSizes: number[] = [50, 50];

  // Panel references
  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;
  @ViewChild(CourseListComponent) courseListComponent!: CourseListComponent;

  // Injected services
  private panelStateService = inject(PanelStateService);
  private userService = inject(UserService);
  private toolbarControls = inject(ToolbarControlsService);
  public courseDataService = inject(CourseDataService);
  public nodeSelectionService = inject(NodeSelectionService);
  public viewModeService = inject(LayoutModeService);
  public splitPanelDragService = inject(SplitPanelDragService);

  // Computed panel titles for display (now dynamic for details panel)
  readonly panelTitles = computed(() => {
    const selectedNodeType = this.nodeSelectionService.selectedNodeType();
    const detailsTitle = selectedNodeType ? `${selectedNodeType} Details` : 'Details';

    const titles: Record<SplitPanelType, string> = {
      'tree': 'Course Tree',
      'calendar': 'Lesson Calendar',
      'details': detailsTitle
    };
    return titles;
  });

  // Computed property to check if calendar is visible in current layout
  readonly isCalendarVisible = computed(() => {
    const layoutMode = this.viewModeService.layoutMode();
    const isVisible = layoutMode === 'tree-calendar' || layoutMode === 'calendar-details';
    console.log(`[LessonTreeContainer] Calendar visibility check: ${layoutMode} -> ${isVisible}`);
    return isVisible;
  });

  constructor() {
    console.log(`[LessonTreeContainer] Component initialized`, { timestamp: new Date().toISOString() });

    // Subscribe to course filter changes from toolbar
    this.setupCourseFilterSubscription();
  }

  // Computed property for overlay state
  get isOverlayActive(): boolean {
    return this.panelStateService.isOverlayActive();
  }

  // Setup subscription to course filter changes from ToolbarControlsService
  private setupCourseFilterSubscription(): void {
    // Subscribe to filter state changes and apply them to CourseListComponent
    const filterState = this.toolbarControls.courseFilterState;

    // Create an effect to respond to filter changes
    // This will automatically apply filters when the toolbar controls change them
    setTimeout(() => {
      const currentState = filterState();
      console.log('[LessonTreeContainer] Initial course filter state:', currentState);

      // Apply initial filter state if CourseListComponent is available
      if (this.courseListComponent) {
        this.courseListComponent.setLocalFilters(
          currentState.courseFilter,
          currentState.visibilityFilter,
          currentState.searchTerm
        );
      }
    });
  }

  // Handle panel swap from drag and drop
  onSplitPanelSwap(): void {
    console.log('[LessonTreeContainer] Split panel swap requested', { timestamp: new Date().toISOString() });
    this.viewModeService.swapSplitPanels();
  }

  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Split drag end event:', event, { timestamp: new Date().toISOString() });
    // Sizes are handled by the split component automatically, no need to store them
  }

  // Helper methods for panel rendering
  getPanelTitle(panelType: SplitPanelType): string {
    return this.panelTitles()[panelType];
  }

  // Get the component selector for a panel type
  getPanelComponent(panelType: SplitPanelType): string {
    const components: Record<SplitPanelType, string> = {
      'tree': 'course-list',
      'calendar': 'app-lesson-calendar',
      'details': 'info-panel'
    };
    return components[panelType];
  }
}
