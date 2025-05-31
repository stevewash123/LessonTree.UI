// RESPONSIBILITY: Main container component managing layout views, hover status bar, panel reordering, and course filtering
// DOES NOT: Handle individual tree operations or lesson data management
// CALLED BY: App routing system, parent components

import { Component, ViewChild, signal, OnDestroy, computed } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { LessonCalendarComponent } from '../calendar/components/lesson-calendar.component';
import { SplitPanelHeaderComponent } from '../shared/split-panel-header.component';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PanelStateService } from '../../core/services/panel-state.service';
import { CourseDataService } from '../../core/services/course-data.service';
import { NodeOperationsService, DragMode } from '../../core/services/node-operations.service';
import { NodeSelectionService } from '../../core/services/node-selection.service';
import { UserService } from '../../core/services/user.service';
import { SplitPanelDragService } from '../../core/services/split-panel-drag.service';
import { SplitPanelType, ContainerViewModeService, ContainerViewMode } from './container-view-mode.service';
import { CourseFilterDialogComponent } from '../course-list/course-filter/course-filter-dialog.component';
import { ScheduleStateService } from '../calendar/services/schedule-state.service';
import { parseId } from '../../core/utils/type-conversion.utils';
import { CalendarConfigModalComponent } from '../calendar/components/calendar-config-modal.component';

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
    SplitAreaComponent,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent implements OnDestroy {
  // Split pane size configurations for different views (always reset to defaults)
  readonly defaultSizes: number[] = [50, 50];
  readonly defaultCalendarDetailsSizes: number[] = [40, 30, 30];

  // Panel references
  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;
  @ViewChild('sidebarInfoPanel') sidebarInfoPanel!: InfoPanelComponent;
  @ViewChild(CourseListComponent) courseListComponent!: CourseListComponent;

  // Status bar visibility state
  private readonly _statusBarVisible = signal(false);
  readonly statusBarVisible = this._statusBarVisible.asReadonly();
  
  // Timer for delayed hide - increased delay for better UX
  private hideTimer: number | null = null;
  private showStartTime: number | null = null;
  private readonly HIDE_DELAY_MS = 500;
  private readonly MIN_DISPLAY_TIME_MS = 2000; // Minimum 2 seconds display time

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
    const viewMode = this.viewModeService.viewMode();
    const isVisible = viewMode === 'tree-calendar' || viewMode === 'calendar-details';
    console.log(`[LessonTreeContainer] Calendar visibility check: ${viewMode} -> ${isVisible}`);
    return isVisible;
  });

  constructor(
    private panelStateService: PanelStateService,
    private dialog: MatDialog,
    private userService: UserService,
    public courseDataService: CourseDataService,
    public nodeOperationsService: NodeOperationsService,
    public nodeSelectionService: NodeSelectionService,
    public viewModeService: ContainerViewModeService,
    public splitPanelDragService: SplitPanelDragService,
    public scheduleStateService: ScheduleStateService
  ) {
    console.log(`[LessonTreeContainer] Component initialized`, { timestamp: new Date().toISOString() });
  }

  // Computed property for overlay state
  get isOverlayActive(): boolean {
    return this.panelStateService.isOverlayActive();
  }

  onStatusBarHover(isHovering: boolean): void {
    if (isHovering) {
      // Cancel any pending hide
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      
      // Show the status bar and record when it was shown
      if (!this._statusBarVisible()) {
        this.showStartTime = Date.now();
      }
      this._statusBarVisible.set(true);
    } else {
      // Calculate how long the status bar has been visible
      const currentTime = Date.now();
      const timeVisible = this.showStartTime ? currentTime - this.showStartTime : this.MIN_DISPLAY_TIME_MS;
      
      // If it hasn't been visible for the minimum time, delay hiding until it has
      const remainingMinTime = Math.max(0, this.MIN_DISPLAY_TIME_MS - timeVisible);
      const totalDelay = remainingMinTime + this.HIDE_DELAY_MS;
      
      this.hideTimer = window.setTimeout(() => {
        this._statusBarVisible.set(false);
        this.showStartTime = null;
        this.hideTimer = null;
      }, totalDelay);
    }
  }

  onDragModeChange(mode: string): void {
    const dragMode = mode === 'copy' ? DragMode.Copy : DragMode.Move;
    this.nodeOperationsService.setDragMode(dragMode);
  }
  
  onViewModeChange(mode: ContainerViewMode): void {
    console.log(`[LessonTreeContainer] View mode changed to: ${mode}`, { timestamp: new Date().toISOString() });
    this.viewModeService.setViewMode(mode);
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
  
  toggleSidebar(): void {
    this.viewModeService.toggleSidebar();
  }

  // Course filter dialog method (moved from CourseList)
  openCourseFilterDialog(): void {
    if (!this.courseListComponent) {
      console.warn('[LessonTreeContainer] CourseList component not available for filter dialog');
      return;
    }

    const districtId = this.userService.getDistrictId();
    const dialogRef = this.dialog.open(CourseFilterDialogComponent, {
      width: '300px',
      data: {
        districtId: districtId,
        courseFilter: this.courseListComponent.localCourseFilter,
        visibilityFilter: this.courseListComponent.localVisibilityFilter,
        searchTerm: this.courseListComponent.localSearchTerm
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.courseListComponent) {
        console.log('[LessonTreeContainer] Course filters applied from dialog', { 
          courseFilter: result.courseFilter, 
          visibilityFilter: result.visibilityFilter, 
          timestamp: new Date().toISOString() 
        });
        
        // Update CourseList local filters
        this.courseListComponent.setLocalFilters(
          result.courseFilter,
          result.visibilityFilter,
          result.searchTerm
        );
      }
    });
  }

  // Calendar configuration dialog method (moved from Calendar)
  openCalendarConfigModal(): void {
    const selectedCourse = this.nodeSelectionService.selectedCourse();
    
    if (!selectedCourse) {
      console.error('[LessonTreeContainer] Cannot open calendar config modal - no course selected');
      return;
    }

    const courseId = parseId(selectedCourse.id);
    const courseData = this.courseDataService.getCourseById(courseId);
    
    if (!courseData) {
      console.error('[LessonTreeContainer] Cannot open calendar config modal - course data not found');
      return;
    }
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('[LessonTreeContainer] User ID not available for calendar config');
      return;
    }
    
    const dialogRef = this.dialog.open(CalendarConfigModalComponent, {
      data: {
        courseId,
        userId: currentUser.id,
        courseTitle: courseData.title,
        existingSchedule: null, // Could be enhanced to pass current schedule
        mode: 'create'
      },
      width: '600px',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log(`[LessonTreeContainer] Schedule configuration updated: ${result.id}`, {
          timestamp: new Date().toISOString()
        });
        // Calendar will automatically refresh through its services
      }
    });
  }

  // Handle schedule selection from status bar
  onScheduleSelectionChange(scheduleId: number): void {
    console.log(`[LessonTreeContainer] Schedule selection changed: ${scheduleId}`, { 
      timestamp: new Date().toISOString() 
    });
    this.scheduleStateService.selectScheduleById(scheduleId).subscribe({
      error: (error) => {
        console.error(`[LessonTreeContainer] Failed to select schedule ${scheduleId}:`, error);
      }
    });
  }

  // Handle save schedule from status bar
  saveSchedule(): void {
    console.log('[LessonTreeContainer] Save schedule clicked from status bar', { 
      timestamp: new Date().toISOString() 
    });
    this.scheduleStateService.saveCurrentSchedule().subscribe({
      error: (error) => {
        console.error('[LessonTreeContainer] Failed to save schedule:', error);
      }
    });
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

  ngOnDestroy(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }
}