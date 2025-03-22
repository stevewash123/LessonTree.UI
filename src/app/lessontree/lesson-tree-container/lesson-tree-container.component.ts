// src/app/lesson-tree-container/lesson-tree-container.component.ts
import { Component } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split'; // Import standalone components
import { CourseListPanelComponent } from '../course-list/course-list.component';
import { TreeNode } from '../../models/tree-node';

@Component({
    selector: 'lesson-tree-container',
    standalone: true,
    imports: [
      CourseListPanelComponent,
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

    onActiveNodeChange(node: TreeNode) {
      this.currentActiveNode = node; // Update the activeNode
    }
    
    onDragEnd(event: any) {
        console.log('Drag end event:', event);
        if (event.sizes) {
          this.sizes = event.sizes;
        }
      }
  }