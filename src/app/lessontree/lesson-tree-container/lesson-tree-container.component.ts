// src/app/lessontree/lesson-tree-container/lesson-tree-container.component.ts
import { Component, ViewChild, signal, OnDestroy } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { LessonCalendarComponent } from '../calendar/components/lesson-calendar.component';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PanelStateService } from '../../core/services/panel-state.service';
import { CourseDataService } from '../../core/services/course-data.service';
import { NodeOperationsService, DragMode } from '../../core/services/node-operations.service';
import { ContainerViewMode, ContainerViewModeService } from './container-view-mode.service';

@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
    CommonModule,
    CourseListComponent,
    InfoPanelComponent,
    LessonCalendarComponent,
    SplitComponent,
    SplitAreaComponent,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent implements OnDestroy {
  // Split pane size configurations for different views
  sizes: number[] = [50, 50];
  calendarSizes: number[] = [50, 50];
  calendarDetailsSizes: number[] = [40, 30, 30];

  // Panel references
  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;
  @ViewChild('sidebarInfoPanel') sidebarInfoPanel!: InfoPanelComponent;

  // Status bar visibility state
  private readonly _statusBarVisible = signal(false);
  readonly statusBarVisible = this._statusBarVisible.asReadonly();
  
  // Timer for delayed hide
  private hideTimer: number | null = null;

  constructor(
    private panelStateService: PanelStateService,
    public courseDataService: CourseDataService,
    public nodeOperationsService: NodeOperationsService,
    public viewModeService: ContainerViewModeService
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
      this._statusBarVisible.set(true);
    } else {
      // Delay hiding to prevent flicker
      this.hideTimer = window.setTimeout(() => {
        this._statusBarVisible.set(false);
        this.hideTimer = null;
      }, 150);
    }
  }

  onDragModeToggle(event: MatSlideToggleChange): void {
    const newMode = event.checked ? DragMode.Copy : DragMode.Move;
    this.nodeOperationsService.setDragMode(newMode);
  }
  
  onViewModeChange(mode: ContainerViewMode): void {
    console.log(`[LessonTreeContainer] View mode changed to: ${mode}`, { timestamp: new Date().toISOString() });
    this.viewModeService.setViewMode(mode);
  }
  
  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event, { timestamp: new Date().toISOString() });
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`, { timestamp: new Date().toISOString() });
    }
  }
  
  onCalendarDragEnd(event: any): void {
    if (event.sizes) {
      this.calendarSizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated calendar split sizes: ${this.calendarSizes}`, { timestamp: new Date().toISOString() });
    }
  }
  
  onCalendarDetailsDragEnd(event: any): void {
    if (event.sizes) {
      this.calendarDetailsSizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated calendar details split sizes: ${this.calendarDetailsSizes}`, { timestamp: new Date().toISOString() });
    }
  }
  
  toggleSidebar(): void {
    this.viewModeService.toggleSidebar();
    
    // Update split sizes after toggling
    if (this.viewModeService.sidebarVisible()) {
      this.calendarDetailsSizes = [40, 30, 30];
    } else {
      this.calendarDetailsSizes = [50, 50, 0];
    }
  }

  ngOnDestroy(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }
}