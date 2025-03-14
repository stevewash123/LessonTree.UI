// src/app/lesson-tree-container/lesson-tree-container.component.ts
import { Component } from '@angular/core';
import { CourseManagementComponent } from '../../course/course-management/course-management.component';
import { InfoPanelComponent } from '../../course/info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split'; // Import standalone components
import { TreeNode } from '../../course/tree/tree-node.interface';

@Component({
    selector: 'app-lesson-tree-container',
    standalone: true,
    imports: [
      CourseManagementComponent,
      InfoPanelComponent,
      SplitComponent, 
      SplitAreaComponent
    ],
    templateUrl: './lesson-tree-container.component.html',
    styleUrls: ['./lesson-tree-container.component.scss']
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