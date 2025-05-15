// src/app/lessontree/course-list/course-list.component.ts
import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input, SimpleChanges, OnChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';
import { TreeWrapperComponent } from './tree/tree-wrapper.component';
import { NodeSelectedEvent, NodeType, TopicMovedEvent, TreeData, TreeNode } from '../../models/tree-node';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CourseFilterDialogComponent } from './course-filter/course-filter-dialog.component';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'course-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SyncfusionModule,
    TreeWrapperComponent,
    MatDialogModule
  ],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit, OnChanges {
  @Input() courses: Course[] = []; // Now received from LessonTreeContainerComponent
  @Input() triggerRefresh: boolean = false;
  @Input() newNode: TreeData | null = null;
  @Input() nodeEdited: TreeData | null = null;
  @Output() activeNodeChange = new EventEmitter<TreeData>();
  @Output() addNodeRequested = new EventEmitter<{ parentNode?: TreeData; nodeType: NodeType; courseId?: number }>();
  @Output() addCourseRequested = new EventEmitter<void>();
   @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>(); // Pass through to LessonTreeContainerComponent
  @Output() lessonMoved = new EventEmitter<{ lesson: Lesson, sourceSubTopicId?: number, targetSubTopicId?: number, targetTopicId?: number }>();

  refreshTrigger: boolean = false;
  treeActiveNode: TreeNode | null = null;

  constructor(
    private toastr: ToastrService,
    private dialog: MatDialog,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized', { timestamp: new Date().toISOString() });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['triggerRefresh'] && changes['triggerRefresh'].currentValue !== changes['triggerRefresh'].previousValue) {
      console.log(`[CourseList] Refresh triggered`, { newValue: changes['triggerRefresh'].currentValue, timestamp: new Date().toISOString() });
      this.refreshTrigger = !this.refreshTrigger;
    }

    if (changes['newNode'] && changes['newNode'].currentValue) {
      const node = changes['newNode'].currentValue as TreeNode;
      console.log(`[CourseList] New node received`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
      this.treeActiveNode = node;
    }

    if (changes['nodeEdited'] && changes['nodeEdited'].currentValue) {
      const editedNode = changes['nodeEdited'].currentValue as TreeData;
      console.log(`[CourseList] Node edited received`, { nodeId: editedNode.nodeId, type: editedNode.nodeType, timestamp: new Date().toISOString() });
            
      // For all nodes, emit to activeNodeChange
      this.activeNodeChange.emit(editedNode);
      
      // We no longer need to track treeActiveNode here
    }
  }

  openFilterDialog(): void {
    const districtId = this.userService.getDistrictId();
    const dialogRef = this.dialog.open(CourseFilterDialogComponent, {
      width: '300px',
      data: {
        districtId: districtId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[CourseList] Filters applied from dialog', { 
          courseFilter: result.courseFilter, 
          visibilityFilter: result.visibilityFilter, 
          timestamp: new Date().toISOString() 
        });
        // Emit filter change event to parent if needed, or handle differently
      }
    });
  }

  addTopic(courseId: number): void {
    console.log(`[CourseList] addTopic: Requesting to add Topic to Course ID: ${courseId}`, { timestamp: new Date().toISOString() });
    
    // Find the course in the courses array
    const course = this.courses.find(c => c.id === courseId);
    if (course) {
      this.addNodeRequested.emit({ 
        parentNode: course, 
        nodeType: 'Topic', 
        courseId 
      });
      this.toastr.info(`Adding topic to course with ID: ${courseId}`, 'Info');
    }
  }

  deleteCourse(courseId: number): void {
    console.log('[CourseList] deleteCourse: Delete Course ID:', courseId, { timestamp: new Date().toISOString() });
    this.toastr.warning(`Deleting course with ID: ${courseId}`, 'Warning', { timeOut: 0 });
  }

  addCourse(): void {
    console.log('[CourseList] addCourse: Initiating new Course creation', { timestamp: new Date().toISOString() });
    this.addCourseRequested.emit();
    this.toastr.info('Initiating new course creation', 'Info');
  }

  onTopicMoved(event: TopicMovedEvent): void {
    console.log('[CourseList] onTopicMoved: Passing through event', event, { timestamp: new Date().toISOString() });
    this.nodeDragStop.emit(event);
  }

  onLessonMoved(event: { lesson: Lesson, sourceSubTopicId?: number, targetSubTopicId?: number, targetTopicId?: number }): void {
    console.log('[CourseList] onLessonMoved: Passing through event', event, { timestamp: new Date().toISOString() });
    this.lessonMoved.emit(event);
  }

  onNodeSelected(node: TreeData): void {
    console.log(`[CourseList] onNodeSelected: Node selected in tree:`, node, { timestamp: new Date().toISOString() });
    this.activeNodeChange.emit(node);    
  }

  onAddNodeRequested(event: { parentNode: TreeData; nodeType: NodeType }): void {
    console.log(`[CourseList] Add node requested: ${event.nodeType} under ${event.parentNode?.nodeId || 'no parent'}`, { timestamp: new Date().toISOString() });
    
    let courseId: number | undefined;
    
    if (event.parentNode.nodeType === 'Course') {
      courseId = event.parentNode.id;
    } else if (event.parentNode.nodeType === 'Topic') {
      courseId = (event.parentNode as Topic).courseId;
    } else if (event.parentNode.nodeType === 'SubTopic') {
      courseId = (event.parentNode as SubTopic).courseId;
    } else if (event.parentNode.nodeType === 'Lesson') {
      courseId = (event.parentNode as Lesson).courseId;
    }
    
    console.log(`[CourseList] Propagating addNodeRequested with courseId: ${courseId}`, { timestamp: new Date().toISOString() });
    this.addNodeRequested.emit({ 
      parentNode: event.parentNode, 
      nodeType: event.nodeType, 
      courseId 
    });
  }

  
}