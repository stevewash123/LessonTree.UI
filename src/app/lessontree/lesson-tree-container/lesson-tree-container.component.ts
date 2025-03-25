import { Component, ViewChild } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { TreeNode } from '../../models/tree-node';

@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
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
  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;

  onActiveNodeChange(node: TreeNode) {
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Active node changed to ${node.id}`);
  }

  onDragEnd(event: any) {
    console.log('[LessonTreeContainer] Drag end event:', event);
    if (event.sizes) {
      this.sizes = event.sizes;
    }
  }

  onAddNodeRequested(event: { parentNode?: TreeNode; nodeType: 'Topic' | 'SubTopic' | 'Lesson'; courseId?: number }) {
    console.log(`[LessonTreeContainer] Handling add node request: ${event.nodeType}`);
    this.infoPanel.initiateAddMode(event.parentNode, event.nodeType, event.courseId);
  }

  onRefreshTree() {
    console.log('[LessonTreeContainer] Refreshing tree due to new SubTopic');
    this.refreshTrigger = !this.refreshTrigger;
  }
}