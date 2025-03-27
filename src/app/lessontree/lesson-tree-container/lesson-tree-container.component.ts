import { Component, ViewChild } from '@angular/core';
import { InfoPanelComponent, PanelMode, PanelType } from '../info-panel/info-panel.component'; // Import PanelType
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { TreeNode } from '../../models/tree-node';
import { Course } from '../../models/course'; // Import Course
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
  currentActiveNode: TreeNode | null = null; // Tree nodes only
  selectedCourse: Course | null = null; // Separate course selection
  refreshTrigger: boolean = false;
  panelMode: PanelMode = 'view';
  newNode: TreeNode | null = null;

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
    this.selectedCourse = null; // Clear course selection when a tree node is active
    console.log(`[LessonTreeContainer] Active node changed to ${node.id}`);
  }

  onCourseSelected(course: Course): void { // New method for course selection
    this.selectedCourse = course;
    this.currentActiveNode = null; // Clear tree node when a course is selected
    console.log(`[LessonTreeContainer] Course selected: ${course.title}, id: ${course.id}`);
  }

  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event);
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`);
    }
  }

  onAddNodeRequested(event: { parentNode?: TreeNode; nodeType: PanelType; courseId?: number }): void { // Use PanelType
    console.log(`[LessonTreeContainer] Handling add node request: ${event.nodeType}`);
    this.infoPanel.initiateAddMode(event.parentNode, event.nodeType, event.courseId);
  }

  onRefreshTree(): void {
    console.log(`[LessonTreeContainer] Handling refreshTree event`, { 
      timestamp: new Date().toISOString() 
    });
    this.refreshTrigger = !this.refreshTrigger;
    console.log(`[LessonTreeContainer] Toggled refreshTrigger for tree refresh`, { 
      newValue: this.refreshTrigger, 
      timestamp: new Date().toISOString() 
    });
  }

  onNodeAdded(node: TreeNode): void {
    console.log(`[LessonTreeContainer] Received nodeAdded event`, { 
      nodeId: node.id, 
      type: node.nodeType, 
      timestamp: new Date().toISOString() 
    });
    this.refreshTrigger = !this.refreshTrigger;
    console.log(`[LessonTreeContainer] Toggled refreshTrigger`, { 
      newValue: this.refreshTrigger, 
      timestamp: new Date().toISOString() 
    });
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Set active node`, { 
      nodeId: node.id, 
      timestamp: new Date().toISOString() 
    });
    this.newNode = node; // Set newNode to pass down to CourseList
    console.log(`[LessonTreeContainer] Set newNode for CourseList`, { 
      nodeId: node.id, 
      timestamp: new Date().toISOString() 
    });
  }

  onCourseAdded(course: Course): void { // New method for course addition
    console.log(`[LessonTreeContainer] New course added: ${course.title}, id: ${course.id}`);
    this.refreshTrigger = !this.refreshTrigger;
    this.selectedCourse = course; // Optionally select the new course
  }

  onPanelModeChange(mode: PanelMode): void {
    this.panelMode = mode;
    console.log(`[LessonTreeContainer] Panel mode changed to ${mode}`);
  }
}