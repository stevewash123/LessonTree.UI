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
import { NodeSelectedEvent, NodeType, TopicMovedEvent, TreeNode } from '../../models/tree-node';
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
  @Input() newNode: TreeNode | null = null;
  @Input() courseEdited: Course | null = null;
  @Input() nodeEdited: TreeNode | null = null;
  @Output() activeNodeChange = new EventEmitter<TreeNode>();
  @Output() addNodeRequested = new EventEmitter<{ parentNode?: TreeNode; nodeType: NodeType; courseId?: number }>();
  @Output() addCourseRequested = new EventEmitter<void>();
  @Output() courseSelected = new EventEmitter<Course>();
  @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>(); // Pass through to LessonTreeContainerComponent
  @Output() lessonMoved = new EventEmitter<{ lesson: Lesson, sourceSubTopicId?: number, targetSubTopicId?: number, targetTopicId?: number }>(); // Pass through

  expandedCourseIds: number[] = [];
  refreshTrigger: boolean = false;
  activeNode: TreeNode | null = null;
  treeActiveNode: TreeNode | null = null;

  constructor(
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized', { timestamp: new Date().toISOString() });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['triggerRefresh'] && changes['triggerRefresh'].currentValue !== changes['triggerRefresh'].previousValue) {
      console.log(`[CourseList] Refresh triggered`, { newValue: changes['triggerRefresh'].currentValue, timestamp: new Date().toISOString() });
      this.triggerChangeDetection();
    }

    if (changes['newNode'] && changes['newNode'].currentValue) {
      const node = changes['newNode'].currentValue as TreeNode;
      console.log(`[CourseList] New node received`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
      this.treeActiveNode = node;
      this.triggerChangeDetection();
    }

    if (changes['courseEdited'] && changes['courseEdited'].currentValue) {
      const editedCourse = changes['courseEdited'].currentValue as Course;
      console.log(`[CourseList] Course edited received`, { courseId: editedCourse.id, title: editedCourse.title, timestamp: new Date().toISOString() });
      this.courseSelected.emit(editedCourse);
      this.triggerChangeDetection();
    }

    if (changes['nodeEdited'] && changes['nodeEdited'].currentValue) {
      const editedNode = changes['nodeEdited'].currentValue as TreeNode;
      console.log(`[CourseList] Node edited received`, { nodeId: editedNode.id, type: editedNode.nodeType, timestamp: new Date().toISOString() });
      this.treeActiveNode = editedNode;
      this.activeNode = editedNode;
      this.activeNodeChange.emit(editedNode);
      this.triggerChangeDetection();
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
    this.addNodeRequested.emit({ nodeType: 'Topic', courseId });
    this.toastr.info(`Adding topic to course with ID: ${courseId}`, 'Info');
  }

  toggleCourse(courseId: number): void {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) {
      console.warn('[CourseList] toggleCourse: Course not found for id:', courseId, { timestamp: new Date().toISOString() });
      return;
    }

    console.log('[CourseList] toggleCourse: Before toggle - courseId:', courseId, 'expandedCourseIds:', [...this.expandedCourseIds], { timestamp: new Date().toISOString() });

    const isExpanded = this.expandedCourseIds.includes(courseId);
    if (isExpanded) {
      this.expandedCourseIds = this.expandedCourseIds.filter(id => id !== courseId);
      console.log('[CourseList] toggleCourse: Collapsed course:', courseId, 'New expandedCourseIds:', [...this.expandedCourseIds], { timestamp: new Date().toISOString() });
    } else {
      if (this.expandedCourseIds.length >= 2) {
        const removedCourseId = this.expandedCourseIds.shift();
        console.log('[CourseList] toggleCourse: Removed oldest expanded course:', removedCourseId, { timestamp: new Date().toISOString() });
      }
      this.expandedCourseIds.push(courseId);
      console.log('[CourseList] toggleCourse: Expanded course:', courseId, 'New expandedCourseIds:', [...this.expandedCourseIds], { timestamp: new Date().toISOString() });

      if (!course.topics) {
        console.warn('[CourseList] toggleCourse: Topics not loaded for course:', course.id, 'Expected topics to be pre-loaded.', { timestamp: new Date().toISOString() });
      }
      this.selectFirstTopic(course);
    }

    this.triggerChangeDetection();
  }

  private selectFirstTopic(course: Course): void {
    if (course.topics && course.topics.length > 0) {
      const firstTopic = course.topics[0];
      const firstNode: TreeNode = {
        id: firstTopic.nodeId,
        text: firstTopic.title,
        nodeType: 'Topic',
        original: firstTopic
      };
      const activeNodeCourseId = this.getCourseIdForNode(this.activeNode);
      if (activeNodeCourseId !== course.id) {
        this.treeActiveNode = firstNode;
        this.activeNode = firstNode;
        this.activeNodeChange.emit(this.activeNode);
        console.log('[CourseList] selectFirstTopic: Selected first topic as active node:', firstNode, { timestamp: new Date().toISOString() });
      }
    }
  }

  private getCourseIdForNode(node: TreeNode | null): number | null {
    if (node && node.original) {
      if (node.nodeType === 'Topic') return (node.original as Topic).courseId;
      if (node.nodeType === 'SubTopic') return (node.original as SubTopic).courseId;
      if (node.nodeType === 'Lesson') return (node.original as Lesson).courseId;
    }
    return null;
  }

  onNodeSelected(event: NodeSelectedEvent): void {
    this.treeActiveNode = event.node;
    this.activeNode = event.node;
    this.activeNodeChange.emit(this.activeNode);
    console.log('[CourseList] onNodeSelected: Node selected in tree:', event.node, { timestamp: new Date().toISOString() });
  }

  selectCourse(course: Course): void {
    this.toggleCourse(course.id);
    this.courseSelected.emit(course);
    console.log('[CourseList] selectCourse: Selected course:', course.title, 'id:', course.id, { timestamp: new Date().toISOString() });
  }

  editCourse(course: Course): void {
    console.log('[CourseList] editCourse: Edit Course:', course, { timestamp: new Date().toISOString() });
    this.toastr.info(`Editing course: ${course.title}`, 'Info');
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

  triggerChangeDetection(): void {
    this.refreshTrigger = !this.refreshTrigger;
    console.log(`[CourseList] Triggered change detection`, { refreshTrigger: this.refreshTrigger, timestamp: new Date().toISOString() });
    this.cdr.detectChanges();
  }

  onAddNodeRequested(event: { parentNode: TreeNode; nodeType: NodeType }): void {
    console.log(`[CourseList] Add node requested: ${event.nodeType} under ${event.parentNode?.id || 'no parent'}`, { timestamp: new Date().toISOString() });
    const courseId = this.getCourseIdForNode(event.parentNode) ?? undefined;
    console.log(`[CourseList] Propagating addNodeRequested with courseId: ${courseId}`, { timestamp: new Date().toISOString() });
    this.addNodeRequested.emit({ parentNode: event.parentNode, nodeType: event.nodeType, courseId });
  }
}