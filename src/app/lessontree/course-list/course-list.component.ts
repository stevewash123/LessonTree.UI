import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input, SimpleChanges, OnChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../core/services/api.service';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';
import { TreeWrapperComponent } from './tree/tree-wrapper.component';
import { NodeSelectedEvent, TopicMovedEvent, TreeNode } from '../../models/tree-node';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { CommonModule } from '@angular/common';

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
    TreeWrapperComponent
  ],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit, OnChanges {
  @Input() triggerRefresh: boolean = false;
  @Output() activeNodeChange = new EventEmitter<TreeNode>();
  @Output() addNodeRequested = new EventEmitter<{ parentNode?: TreeNode; nodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson'; courseId?: number }>();
  @Output() nodeAdded = new EventEmitter<TreeNode>();

  courses: Course[] = [];
  expandedCourseIds: string[] = [];
  refreshTrigger: boolean = false;
  activeNode: TreeNode | null = null;
  treeActiveNode: TreeNode | null = null;
  newNode: TreeNode | null = null;

  constructor(
    private apiService: ApiService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized');
    this.loadCourses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['triggerRefresh'] && changes['triggerRefresh'].currentValue) {
      console.log('[CourseList] Triggering refresh due to new node');
      this.loadCourses();
    }
  }

  loadCourses(): void {
    console.log('[CourseList] Loading courses from API');
    this.apiService.get<Course[]>('course').subscribe({
      next: (courses) => {
        this.courses = courses;
        console.log('[CourseList] Courses loaded successfully:', courses);
      },
      error: (err) => {
        console.error('[CourseList] Failed to load courses:', err);
        this.toastr.error('Failed to load courses: ' + err.message, 'Error', { timeOut: 0 });
      }
    });
  }

  toggleCourse(courseNodeId: string): void {
    const course = this.courses.find(c => c.nodeId === courseNodeId);
    if (!course) {
      console.warn('[CourseList] toggleCourse: Course not found for nodeId:', courseNodeId);
      return;
    }

    console.log('[CourseList] toggleCourse: Before toggle - courseNodeId:', courseNodeId, 'expandedCourseIds:', [...this.expandedCourseIds]);

    const isExpanded = this.expandedCourseIds.includes(courseNodeId);
    if (isExpanded) {
      this.expandedCourseIds = this.expandedCourseIds.filter(id => id !== courseNodeId);
      console.log('[CourseList] toggleCourse: Collapsed course:', courseNodeId, 'New expandedCourseIds:', [...this.expandedCourseIds]);
    } else {
      if (this.expandedCourseIds.length >= 2) {
        const removedCourseId = this.expandedCourseIds.shift();
        console.log('[CourseList] toggleCourse: Removed oldest expanded course:', removedCourseId);
      }
      this.expandedCourseIds.push(courseNodeId);
      console.log('[CourseList] toggleCourse: Expanded course:', courseNodeId, 'New expandedCourseIds:', [...this.expandedCourseIds]);

      if (!course.topics) {
        console.warn('[CourseList] toggleCourse: Topics not loaded for course:', course.id, 'Expected topics to be pre-loaded.');
      }
      console.log('[CourseList] toggleCourse: Topics for course:', course.id, ':', course.topics?.map(t => ({
        id: t.id,
        title: t.title,
        hasChildren: t.hasChildren
      })));
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
        this.activeNodeChange.next(this.activeNode);
        console.log('[CourseList] selectFirstTopic: Selected first topic as active node:', firstNode);
      }
    }
  }

  private getCourseIdForNode(node: TreeNode | null): number | null {
    if (node && node.original) {
      if (node.nodeType === 'Course') return (node.original as Course).id;
      if (node.nodeType === 'Topic') return (node.original as Topic).courseId;
      if (node.nodeType === 'SubTopic') return (node.original as SubTopic).courseId;
      if (node.nodeType === 'Lesson') return (node.original as Lesson).courseId;
    }
    return null;
  }

  onNodeSelected(event: NodeSelectedEvent): void {
    this.treeActiveNode = event.node;
    this.activeNode = event.node;
    this.activeNodeChange.next(this.activeNode);
    console.log('[CourseList] onNodeSelected: Node selected in tree:', event.node);
  }

  selectCourse(course: Course): void {
    const courseNode: TreeNode = {
      id: course.nodeId,
      text: course.title,
      nodeType: 'Course',
      original: course,
      hasChildren: course.hasChildren
    };
    this.treeActiveNode = null;
    this.activeNode = courseNode;
    this.activeNodeChange.next(this.activeNode);
    console.log('[CourseList] selectCourse: Selected course as active node:', courseNode);
  }

  editCourse(course: Course): void {
    console.log('[CourseList] editCourse: Edit Course:', course);
    this.toastr.info(`Editing course: ${course.title}`, 'Info');
  }

  deleteCourse(courseId: number): void {
    console.log('[CourseList] deleteCourse: Delete Course ID:', courseId);
    this.toastr.warning(`Deleting course with ID: ${courseId}`, 'Warning', { timeOut: 0 });
  }

  addTopic(courseId: number): void {
    console.log(`[CourseList] Requesting to add Topic to Course ID: ${courseId}`);
    this.addNodeRequested.emit({ nodeType: 'Topic', courseId });
    this.toastr.info(`Adding topic to course with ID: ${courseId}`, 'Info');
  }

  openAddCourseDialog(): void {
    console.log('[CourseList] openAddCourseDialog: Requesting to add a new Course');
    this.addNodeRequested.emit({ nodeType: 'Course' });
    this.toastr.info('Adding a new course', 'Info');
  }

  onTopicMoved(event: TopicMovedEvent): void {
    console.log('[CourseList] onTopicMoved: Topic moved event received:', event);
    const { topic, sourceCourseId, targetCourseId: initialTargetCourseId, targetNodeId } = event;
    const sourceCourse = this.courses.find(c => c.id === sourceCourseId);

    if (!sourceCourse) {
      console.error('[CourseList] onTopicMoved: Source course not found for ID:', sourceCourseId);
      this.toastr.error('Source course not found', 'Error');
      this.loadCourses();
      return;
    }

    let targetCourseId = initialTargetCourseId;
    let targetCourse: Course | undefined;

    if (targetCourseId === null && targetNodeId) {
      console.log('[CourseList] onTopicMoved: Resolving targetCourseId using targetNodeId:', targetNodeId);
      for (const course of this.courses) {
        if (course.topics) {
          const foundTopic = course.topics.find(t => t.nodeId === targetNodeId);
          if (foundTopic) {
            targetCourseId = course.id;
            targetCourse = course;
            console.log('[CourseList] onTopicMoved: Target course resolved:', targetCourseId, 'Title:', course.title);
            break;
          }
        }
      }
      if (!targetCourseId) {
        console.error('[CourseList] onTopicMoved: Could not resolve target course for targetNodeId:', targetNodeId);
        this.toastr.error('Target course not found for the dropped node', 'Error');
        return;
      }
    } else if (targetCourseId !== null) {
      targetCourse = this.courses.find(c => c.id === targetCourseId);
      console.log('[CourseList] onTopicMoved: Target course provided:', targetCourseId, 'Title:', targetCourse?.title);
    } else {
      console.error('[CourseList] onTopicMoved: Both targetCourseId and targetNodeId are null or undefined');
      this.toastr.error('Invalid target for topic move', 'Error');
      return;
    }

    if (!targetCourse) {
      console.error('[CourseList] onTopicMoved: Target course not found for ID:', targetCourseId);
      this.toastr.error('Target course not found', 'Error');
      this.loadCourses();
      return;
    }

    console.log(`[CourseList] onTopicMoved: Moving topic ${topic.title} (ID: ${topic.id}) from course ${sourceCourse.title} (ID: ${sourceCourseId}) to course ${targetCourse.title} (ID: ${targetCourseId})`);
    this.apiService.moveTopic(topic.id, targetCourseId!).subscribe({
      next: () => {
        console.log(`[CourseList] onTopicMoved: Successfully moved topic ${topic.title} to course ${targetCourse!.title}`);
        if (!sourceCourse.topics) sourceCourse.topics = [];
        if (!targetCourse!.topics) targetCourse!.topics = [];
        sourceCourse.topics = sourceCourse.topics.filter(t => t.id !== topic.id);
        targetCourse!.topics.push(topic);
        topic.courseId = targetCourseId!;

        if (!this.expandedCourseIds.includes(targetCourse!.nodeId)) {
          this.expandedCourseIds.push(targetCourse!.nodeId);
        }
        if (!this.expandedCourseIds.includes(sourceCourse.nodeId)) {
          this.expandedCourseIds.push(sourceCourse.nodeId);
        }

        this.refreshTrigger = !this.refreshTrigger;
        this.cdr.detectChanges();
        this.toastr.success(`Moved Topic ${topic.title} from Course ${sourceCourse.title} to Course ${targetCourse!.title}`);
      },
      error: (err) => {
        console.error('[CourseList] onTopicMoved: Failed to move topic via API:', err);
        this.toastr.error('Failed to move topic', 'Error');
        this.loadCourses();
      }
    });
  }

  onLessonMoved(event: { lesson: Lesson, sourceSubTopicId: number, targetSubTopicId: number }): void {
    console.log('[CourseList] onLessonMoved: Lesson moved event:', event);
    const { lesson, sourceSubTopicId, targetSubTopicId } = event;

    let sourceSubTopic: SubTopic | undefined;
    let targetSubTopic: SubTopic | undefined;

    for (const course of this.courses) {
      if (!course.topics) continue;
      for (const topic of course.topics) {
        if (!topic.subTopics) continue;
        if (!sourceSubTopic) {
          sourceSubTopic = topic.subTopics.find(st => st.id === sourceSubTopicId);
        }
        if (!targetSubTopic) {
          targetSubTopic = topic.subTopics.find(st => st.id === targetSubTopicId);
        }
        if (sourceSubTopic && targetSubTopic) break;
      }
      if (sourceSubTopic && targetSubTopic) break;
    }

    if (!sourceSubTopic || !targetSubTopic) {
      console.error('[CourseList] onLessonMoved: Source or target subtopic not found:', { sourceSubTopicId, targetSubTopicId });
      this.toastr.error('Failed to update course data after moving lesson', 'Error');
      this.loadCourses();
      return;
    }

    sourceSubTopic.lessons = sourceSubTopic.lessons.filter(l => l.id !== lesson.id);
    console.log(`[CourseList] onLessonMoved: Removed lesson ${lesson.id} from source subTopic ${sourceSubTopicId}`);

    if (!targetSubTopic.lessons) targetSubTopic.lessons = [];
    targetSubTopic.lessons.push(lesson);
    console.log(`[CourseList] onLessonMoved: Added lesson ${lesson.id} to target subTopic ${targetSubTopicId}`);

    lesson.subTopicId = targetSubTopicId;

    console.log('[CourseList] onLessonMoved: Skipping full refresh to preserve tree expanded state');
    this.cdr.detectChanges();
    this.toastr.success(`Moved Lesson ${lesson.title} from SubTopic ${sourceSubTopic.title} to SubTopic ${targetSubTopic.title}`);
  }

  public triggerChangeDetection(): void {
    this.refreshTrigger = !this.refreshTrigger;
    this.cdr.detectChanges();
    console.log('[CourseList] triggerChangeDetection: Triggered change detection, refreshTrigger:', this.refreshTrigger);
  }

  onAddNodeRequested(event: { parentNode: TreeNode; nodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' }): void {
    console.log(`[CourseList] Add node requested: ${event.nodeType} under ${event.parentNode?.id || 'no parent'}`);
    const courseId = this.getCourseIdForNode(event.parentNode) ?? undefined;
    console.log(`[CourseList] Propagating addNodeRequested with courseId: ${courseId}`);
    this.addNodeRequested.emit({ parentNode: event.parentNode, nodeType: event.nodeType, courseId });
  }

  onNodeAdded(node: TreeNode): void {
    console.log(`[CourseList] Node added: ${node.id}`);
    this.newNode = node;
    this.nodeAdded.emit(node);
    this.triggerChangeDetection();
  }
}