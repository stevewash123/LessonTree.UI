import { Component, ViewChild, signal, OnDestroy } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { PanelStateService } from '../../core/services/panel-state.service';
import { CourseDataService } from '../../core/services/course-data.service';
import { NodeOperationsService, DragMode } from '../../core/services/node-operations.service';

@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
    CommonModule,
    CourseListComponent,
    InfoPanelComponent,
    SplitComponent,
    SplitAreaComponent,
    MatSlideToggleModule
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent implements OnDestroy {
  sizes: number[] = [50, 50];

  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;

  // Status bar visibility state
  private readonly _statusBarVisible = signal(false);
  readonly statusBarVisible = this._statusBarVisible.asReadonly();
  
  // Timer for delayed hide
  private hideTimer: number | null = null;

  constructor(
    private panelStateService: PanelStateService,
    public courseDataService: CourseDataService,
    public nodeOperationsService: NodeOperationsService
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
    this.nodeOperationsService.setDragMode(newMode);  // Use new service
  }
  
  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event, { timestamp: new Date().toISOString() });
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`, { timestamp: new Date().toISOString() });
    }
  }

  ngOnDestroy(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }
}