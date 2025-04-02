import { Component, ViewChild } from '@angular/core';
import { InfoPanelComponent, PanelMode, PanelType } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { NodeType, TreeNode } from '../../models/tree-node';
import { Course } from '../../models/course';
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
  selectedCourse: Course | null = null;
  refreshTrigger: boolean = false;
  panelMode: PanelMode = 'view';
  newNode: TreeNode | null = null;
  nodeEdited: TreeNode | null = null; // New property
  courseEdited: Course | null = null; // New property

  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;

  constructor() {
    console.log(`[LessonTreeContainer] Component initialized with panelMode: ${this.panelMode}`, { timestamp: new Date().toISOString() });
  }

  get isOverlayActive(): boolean {
    const active = this.panelMode === 'add' || this.panelMode === 'edit';
    //console.log(`[LessonTreeContainer] isOverlayActive checked: ${active} (panelMode: ${this.panelMode})`, { timestamp: new Date().toISOString() });
    return active;
  }

  onActiveNodeChange(node: TreeNode): void {
    this.currentActiveNode = node;
    this.selectedCourse = null;
    //console.log(`[LessonTreeContainer] Active node changed to ${node.id}`, { timestamp: new Date().toISOString() });
  }

  onCourseSelected(course: Course): void {
    this.selectedCourse = course;
    this.currentActiveNode = null;
    console.log(`[LessonTreeContainer] Course selected: ${course.title}, id: ${course.id}`, { timestamp: new Date().toISOString() });
  }

  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event, { timestamp: new Date().toISOString() });
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`, { timestamp: new Date().toISOString() });
    }
  }

  onAddNodeRequested(event: { parentNode?: TreeNode; nodeType: NodeType; courseId?: number }): void {
    console.log(`[LessonTreeContainer] Handling add node request: ${event.nodeType}`, { timestamp: new Date().toISOString() });
    this.infoPanel.initiateAddMode(event.parentNode, event.nodeType, event.courseId);
  }

  onAddCourseRequested(): void {
    console.log('[LessonTreeContainer] onAddCourseRequested: Initiating add course', { timestamp: new Date().toISOString() });
    this.selectedCourse = {
      id: 0,
      title: '',
      description: '',
      hasChildren: false,
      archived: false,
      visibility: 'Private'
    };
    this.infoPanel.initiateAddMode(undefined, 'Course', undefined);
    console.log(`[LessonTreeContainer] Assigned empty course to selectedCourse and set mode to add`, { timestamp: new Date().toISOString() });
  }

  onRefreshTree(): void {
    console.log(`[LessonTreeContainer] Handling refreshTree event`, { timestamp: new Date().toISOString() });
    this.refreshTrigger = !this.refreshTrigger;
    console.log(`[LessonTreeContainer] Toggled refreshTrigger for tree refresh`, { newValue: this.refreshTrigger, timestamp: new Date().toISOString() });
  }

  onNodeAdded(node: TreeNode): void {
    console.log(`[LessonTreeContainer] Received nodeAdded event`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Set active node`, { nodeId: node.id, timestamp: new Date().toISOString() });
    this.newNode = node;
    console.log(`[LessonTreeContainer] Set newNode for propagation`, { nodeId: node.id, timestamp: new Date().toISOString() });
  }

  onCourseAdded(course: Course): void {
    console.log(`[LessonTreeContainer] New course added: ${course.title}, id: ${course.id}`, { timestamp: new Date().toISOString() });
    this.refreshTrigger = !this.refreshTrigger; // Trigger CourseList refresh
    this.selectedCourse = course; // Keep the new course selected
    console.log(`[LessonTreeContainer] Updated refreshTrigger and selectedCourse`, { refreshTrigger: this.refreshTrigger, timestamp: new Date().toISOString() });
  }

  onNodeEdited(node: TreeNode): void {
    console.log(`[LessonTreeContainer] Received nodeEdited event`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Set active node`, { nodeId: node.id, timestamp: new Date().toISOString() });
    this.nodeEdited = node;
    console.log(`[LessonTreeContainer] Set nodeEdited for propagation`, { nodeId: node.id, timestamp: new Date().toISOString() });
  }

  onCourseEdited(course: Course): void {
    console.log(`[LessonTreeContainer] Course edited: ${course.title}, id: ${course.id}`, { timestamp: new Date().toISOString() });
    this.refreshTrigger = !this.refreshTrigger; // Trigger CourseList refresh
    this.selectedCourse = course; // Keep the edited course selected
    this.courseEdited = course;
    console.log(`[LessonTreeContainer] Updated refreshTrigger, selectedCourse, and set courseEdited`, { refreshTrigger: this.refreshTrigger, timestamp: new Date().toISOString() });
  }

  onPanelModeChange(mode: PanelMode): void {
    this.panelMode = mode;
    console.log(`[LessonTreeContainer] Panel mode changed to ${mode}`, { timestamp: new Date().toISOString() });
  }
}