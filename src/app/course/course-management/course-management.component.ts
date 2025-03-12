// src/app/course/course-management/course-management.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../core/services/api.service';
import { Course } from '../../models/course';
import { createTopicNode, Topic } from '../../models/topic';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TreeComponent } from '../tree/tree.component';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';
import { NodeSelectedEvent, TopicMovedEvent, TreeNode } from '../tree/tree-node.interface';

@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TreeComponent,
    SyncfusionModule
  ],
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.scss']
})
export class CourseManagementComponent implements OnInit {
  courses: Course[] = [];
  expandedCourseIds: string[] = [];
  refreshTrigger: boolean = false;
  activeNode: TreeNode | null = null; // Store the active node

  constructor(
    private apiService: ApiService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef // Remains private
  ) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.apiService.get<Course[]>('course').subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: (err) => this.toastr.error('Failed to load courses: ' + err.message, 'Error', { timeOut: 0 })
    });
  }

  toggleCourse(courseNodeId: string) {
    const index = this.expandedCourseIds.indexOf(courseNodeId);
    if (index !== -1) {
      this.expandedCourseIds.splice(index, 1);
      console.log('Collapsed Course Node ID:', courseNodeId, 'Expanded Course IDs:', this.expandedCourseIds);
    } else {
      if (this.expandedCourseIds.length >= 2) {
        const removedCourseId = this.expandedCourseIds.shift();
        console.log('Removed oldest expanded Course Node ID:', removedCourseId);
      }
      this.expandedCourseIds.push(courseNodeId);
      console.log('Expanded Course Node ID:', courseNodeId, 'Expanded Course IDs:', this.expandedCourseIds);
    }
  }
  
  onNodeSelected(event: NodeSelectedEvent) {
    this.activeNode = event.node;
  }

  // Helper method to find node by ID
  private findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.child) {
        const found = this.findNodeById(node.child, id);
        if (found) return found;
      }
    }
    return undefined;
  }
  editCourse(course: Course) {
    console.log('Edit Course:', course);
    this.toastr.info(`Editing course: ${course.title}`, 'Info');
  }

  deleteCourse(courseId: number) {
    console.log('Delete Course ID:', courseId);
    this.toastr.warning(`Deleting course with ID: ${courseId}`, 'Warning', { timeOut: 0 });
  }

  addTopic(courseId: number) {
    console.log('Add Topic to Course ID:', courseId);
    this.toastr.info(`Adding topic to course with ID: ${courseId}`, 'Info');
  }

  openAddCourseDialog() {
    console.log('Open Add Course Dialog');
    this.toastr.info('Add Course dialog opened', 'Info');
  }

  onTopicMoved(event: TopicMovedEvent) {
    console.log('onTopicMoved called with event:', event);
    const { topic, sourceCourseId, targetCourseId } = event;
    const sourceCourse = this.courses.find(c => c.id === sourceCourseId);
    const targetCourse = this.courses.find(c => c.id === targetCourseId);

    if (sourceCourse && targetCourse) {
      sourceCourse.topics = sourceCourse.topics.filter(t => t.id !== topic.id);
      targetCourse.topics.push(topic);

      if (!this.expandedCourseIds.includes(targetCourse.nodeId)) {
        this.expandedCourseIds.push(targetCourse.nodeId);
        console.log('Expanded target Course after drop:', targetCourse.nodeId, 'Expanded Course IDs:', this.expandedCourseIds);
      }

      if (!this.expandedCourseIds.includes(sourceCourse.nodeId)) {
        this.expandedCourseIds.push(sourceCourse.nodeId);
        console.log('Re-expanded source Course after drop:', sourceCourse.nodeId, 'Expanded Course IDs:', this.expandedCourseIds);
      }

      console.log('Toggled refreshTrigger to (before):', this.refreshTrigger);
      this.refreshTrigger = !this.refreshTrigger;
      console.log('Toggled refreshTrigger to (after):', this.refreshTrigger);
      this.cdr.detectChanges();

      this.toastr.success(`Moved Topic ${topic.title} from Course ${sourceCourse.title} to Course ${targetCourse.title}`);
    } else {
      console.error('Source or target course not found:', { sourceCourseId, targetCourseId });
      this.toastr.error('Failed to update course data after moving topic', 'Error');
      this.loadCourses();
    }
  }

  public triggerChangeDetection() {
    this.refreshTrigger = !this.refreshTrigger;
    this.cdr.detectChanges();
  }
}