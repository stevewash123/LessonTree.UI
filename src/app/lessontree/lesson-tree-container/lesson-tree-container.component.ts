import { Component, ViewChild } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { TreeNode } from '../../models/tree-node';
import { PanelMode } from '../info-panel/info-panel.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
    CommonModule,
    CourseListComponent,
    InfoPanelComponent,
    SplitComponent,
    SplitAreaComponent
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent {
  sizes: number[] = [50, 50];
  currentActiveNode: TreeNode | null = null;
  refreshTrigger: boolean = false;
  panelMode: PanelMode = 'view'; // Initial state is 'view'
  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;

  constructor() {
    console.log(`[LessonTreeContainer] Component initialized with panelMode: ${this.panelMode}`);
  }

  get isOverlayActive(): boolean {
    const active = this.panelMode === 'add' || this.panelMode === 'edit';
    console.log(`[LessonTreeContainer] isOverlayActive checked: ${active} (panelMode: ${this.panelMode})`);
    return active;
  }

  onActiveNodeChange(node: TreeNode): void {
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Active node changed to ${node.id}`);
  }

  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event);
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`);
    }
  }

  onAddNodeRequested(event: { parentNode?: TreeNode; nodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson'; courseId?: number }): void {
    console.log(`[LessonTreeContainer] Handling add node request: ${event.nodeType}`);
    this.infoPanel.initiateAddMode(event.parentNode, event.nodeType, event.courseId);
  }

  onRefreshTree(): void {
    console.log('[LessonTreeContainer] Refreshing tree due to new node');
    this.refreshTrigger = !this.refreshTrigger;
  }

  onNodeAdded(node: TreeNode): void {
    console.log(`[LessonTreeContainer] New node added: ${node.id}`);
    this.refreshTrigger = !this.refreshTrigger;
  }

  onPanelModeChange(mode: PanelMode): void {
    this.panelMode = mode;
    console.log(`[LessonTreeContainer] Panel mode changed to ${mode}`);
  }
}