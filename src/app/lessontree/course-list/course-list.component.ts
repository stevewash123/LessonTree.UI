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
import { NodeSelectedEvent, NodeType, TopicMovedEvent, TreeNode } from '../../models/tree-node';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { CommonModule } from '@angular/common';
import { PanelType } from '../info-panel/info-panel.component';

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
  @Input() newNode: TreeNode | null = null;
  @Input() courseEdited: Course | null = null; // New input
  @Input() nodeEdited: TreeNode | null = null; // New input
  @Output() activeNodeChange = new EventEmitter<TreeNode>();
  @Output() addNodeRequested = new EventEmitter<{ parentNode?: TreeNode; nodeType: NodeType; courseId?: number }>();
  @Output() addCourseRequested = new EventEmitter<void>();
  @Output() courseSelected = new EventEmitter<Course>();

  courses: Course[] = [];
  expandedCourseIds: number[] = [];
  refreshTrigger: boolean = false;
  activeNode: TreeNode | null = null;
  treeActiveNode: TreeNode | null = null;

  constructor(
    private apiService: ApiService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized', { timestamp: new Date().toISOString() });
    this.loadCourses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['triggerRefresh'] && changes['triggerRefresh'].currentValue !== changes['triggerRefresh'].previousValue) {
      console.log(`[CourseList] Refresh triggered`, { newValue: changes['triggerRefresh'].currentValue, timestamp: new Date().toISOString() });
      this.loadCourses();
      this.triggerChangeDetection();
    }

    if (changes['newNode'] && changes['newNode'].currentValue) {
      const node = changes['newNode'].currentValue as TreeNode;
      console.log(`[CourseList] New node received`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
      const courseId = this.getCourseIdForNode(node);
      if (courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (course) {
          if (node.nodeType === 'SubTopic' && course.topics) {
            const topic = course.topics.find(t => t.id === (node.original as SubTopic).topicId);
            if (topic) {
              if (!topic.subTopics) topic.subTopics = [];
              topic.subTopics.push(node.original as SubTopic);
              console.log(`[CourseList] Added SubTopic to course ${courseId}`, { topicId: topic.id, subTopicId: node.id, timestamp: new Date().toISOString() });
            }
          }
          this.treeActiveNode = node;
          this.triggerChangeDetection();
        } else {
          console.warn(`[CourseList] Course not found for new node`, { courseId, nodeId: node.id, timestamp: new Date().toISOString() });
          this.loadCourses();
        }
      }
    }

    if (changes['courseEdited'] && changes['courseEdited'].currentValue) {
      const editedCourse = changes['courseEdited'].currentValue as Course;
      console.log(`[CourseList] Course edited received`, { courseId: editedCourse.id, title: editedCourse.title, timestamp: new Date().toISOString() });
      const courseIndex = this.courses.findIndex(c => c.id === editedCourse.id);
      if (courseIndex !== -1) {
        this.courses[courseIndex] = { ...editedCourse };
        console.log(`[CourseList] Updated course in list`, { courseId: editedCourse.id, timestamp: new Date().toISOString() });
      }
      this.courseSelected.emit(editedCourse); // Update selectedCourse in parent
      this.triggerChangeDetection();
    }

    if (changes['nodeEdited'] && changes['nodeEdited'].currentValue) {
      const editedNode = changes['nodeEdited'].currentValue as TreeNode;
      console.log(`[CourseList] Node edited received`, { nodeId: editedNode.id, type: editedNode.nodeType, timestamp: new Date().toISOString() });
      const courseId = this.getCourseIdForNode(editedNode);
      if (courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (course && course.topics) {
          this.updateNodeInCourse(course, editedNode);
          this.treeActiveNode = editedNode; // Update the active node in the tree
          this.activeNode = editedNode; // Ensure activeNode is updated
          this.activeNodeChange.emit(editedNode); // Notify parent of active node change
          console.log(`[CourseList] Updated node in course ${courseId}`, { nodeId: editedNode.id, timestamp: new Date().toISOString() });
          this.triggerChangeDetection();
        } else {
          console.warn(`[CourseList] Course not found for edited node`, { courseId, nodeId: editedNode.id, timestamp: new Date().toISOString() });
          this.loadCourses();
        }
      }
    }
  }

  private updateNodeInCourse(course: Course, editedNode: TreeNode): void {
    if (!course.topics) return;

    const updateNode = (topics: Topic[]): boolean => {
      for (let i = 0; i < topics.length; i++) {
        if (editedNode.nodeType === 'Topic' && topics[i].nodeId === editedNode.id) {
          topics[i] = { ...editedNode.original as Topic };
          console.log(`[CourseList] Updated Topic`, { nodeId: editedNode.id, title: topics[i].title, timestamp: new Date().toISOString() });
          return true;
        }
        if (topics[i] && topics[i].subTopics && topics[i].subTopics!.length > 0) { // Check if subTopics exists and has items
          for (let j = 0; j < topics[i].subTopics!.length; j++) {
            if (editedNode.nodeType === 'SubTopic' && topics[i].subTopics![j].nodeId === editedNode.id) {
              topics[i].subTopics![j] = { ...editedNode.original as SubTopic };
              console.log(`[CourseList] Updated SubTopic`, { nodeId: editedNode.id, title: topics[i].subTopics![j].title, timestamp: new Date().toISOString() });
              return true;
            }
            if (topics[i]!.subTopics![j].lessons && topics[i].subTopics![j].lessons.length > 0) { // Check if lessons exists and has items
              for (let k = 0; k < topics[i].subTopics![j].lessons.length; k++) {
                if (editedNode.nodeType === 'Lesson' && topics[i].subTopics![j].lessons[k].nodeId === editedNode.id) {
                  topics[i].subTopics![j].lessons[k] = { ...editedNode.original as Lesson };
                  console.log(`[CourseList] Updated Lesson`, { nodeId: editedNode.id, title: topics[i].subTopics![j].lessons[k].title, timestamp: new Date().toISOString() });
                  return true;
                }
              }
            }
          }
        }
        if (topics[i] && topics[i].lessons && topics[i].lessons!.length > 0) { // Check if lessons exists and has items
          for (let k = 0; k < topics[i].lessons!.length; k++) {
            if (editedNode.nodeType === 'Lesson' && topics[i].lessons![k].nodeId === editedNode.id) {
              topics[i].lessons![k] = { ...editedNode.original as Lesson };
              console.log(`[CourseList] Updated Lesson`, { nodeId: editedNode.id, title: topics[i].lessons![k].title, timestamp: new Date().toISOString() });
              return true;
            }
          }
        }
      }
      return false;
    };

    if (updateNode(course.topics)) {
      console.log(`[CourseList] Node updated in course ${course.id}`, { nodeId: editedNode.id, timestamp: new Date().toISOString() });
    } else {
      console.warn(`[CourseList] Edited node not found in course ${course.id}`, { nodeId: editedNode.id, timestamp: new Date().toISOString() });
    }
  }

  loadCourses(): void {
    console.log('[CourseList] Loading courses from API', { timestamp: new Date().toISOString() });
    this.apiService.get<Course[]>('course').subscribe({
      next: (courses) => {
        this.courses = courses;
        console.log('[CourseList] Courses loaded successfully:', this.courses.map(c => ({ id: c.id, title: c.title, topics: c.topics })), { timestamp: new Date().toISOString() });
      },
      error: (err) => {
        console.error('[CourseList] Failed to load courses:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to load courses: ' + err.message, 'Error', { timeOut: 0 });
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
    console.log('[CourseList] onTopicMoved: Topic moved event received:', event, { timestamp: new Date().toISOString() });
    const { topic, sourceCourseId, targetCourseId: initialTargetCourseId, targetNodeId } = event;
    const sourceCourse = this.courses.find(c => c.id === sourceCourseId);

    if (!sourceCourse) {
      console.error('[CourseList] onTopicMoved: Source course not found for ID:', sourceCourseId, { timestamp: new Date().toISOString() });
      this.toastr.error('Source course not found', 'Error');
      this.loadCourses();
      return;
    }

    let targetCourseId = initialTargetCourseId;
    let targetCourse: Course | undefined;

    if (targetCourseId === null && targetNodeId) {
      console.log('[CourseList] onTopicMoved: Resolving targetCourseId using targetNodeId:', targetNodeId, { timestamp: new Date().toISOString() });
      for (const course of this.courses) {
        if (course.topics) {
          const foundTopic = course.topics.find(t => t.nodeId === targetNodeId);
          if (foundTopic) {
            targetCourseId = course.id;
            targetCourse = course;
            console.log('[CourseList] onTopicMoved: Target course resolved:', targetCourseId, 'Title:', course.title, { timestamp: new Date().toISOString() });
            break;
          }
        }
      }
      if (!targetCourseId) {
        console.error('[CourseList] onTopicMoved: Could not resolve target course for targetNodeId:', targetNodeId, { timestamp: new Date().toISOString() });
        this.toastr.error('Target course not found for the dropped node', 'Error');
        return;
      }
    } else if (targetCourseId !== null) {
      targetCourse = this.courses.find(c => c.id === targetCourseId);
      console.log('[CourseList] onTopicMoved: Target course provided:', targetCourseId, 'Title:', targetCourse?.title, { timestamp: new Date().toISOString() });
    } else {
      console.error('[CourseList] onTopicMoved: Both targetCourseId and targetNodeId are null or undefined', { timestamp: new Date().toISOString() });
      this.toastr.error('Invalid target for topic move', 'Error');
      return;
    }

    if (!targetCourse) {
      console.error('[CourseList] onTopicMoved: Target course not found for ID:', targetCourseId, { timestamp: new Date().toISOString() });
      this.toastr.error('Target course not found', 'Error');
      this.loadCourses();
      return;
    }

    console.log(`[CourseList] onTopicMoved: Moving topic ${topic.title} (ID: ${topic.id}) from course ${sourceCourse.title} (ID: ${sourceCourseId}) to course ${targetCourse.title} (ID: ${targetCourseId})`, { timestamp: new Date().toISOString() });
    this.apiService.moveTopic(topic.id, targetCourseId!).subscribe({
      next: () => {
        console.log(`[CourseList] onTopicMoved: Successfully moved topic ${topic.title} to course ${targetCourse!.title}`, { timestamp: new Date().toISOString() });
        if (!sourceCourse.topics) sourceCourse.topics = [];
        if (!targetCourse!.topics) targetCourse!.topics = [];
        sourceCourse.topics = sourceCourse.topics.filter(t => t.id !== topic.id);
        targetCourse!.topics.push(topic);
        topic.courseId = targetCourseId!;

        if (!this.expandedCourseIds.includes(targetCourse!.id)) {
          this.expandedCourseIds.push(targetCourse!.id);
        }
        if (!this.expandedCourseIds.includes(sourceCourse.id)) {
          this.expandedCourseIds.push(sourceCourse.id);
        }

        this.refreshTrigger = !this.refreshTrigger;
        this.cdr.detectChanges();
        this.toastr.success(`Moved Topic ${topic.title} from Course ${sourceCourse.title} to Course ${targetCourse!.title}`);
      },
      error: (err) => {
        console.error('[CourseList] onTopicMoved: Failed to move topic via API:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to move topic', 'Error');
        this.loadCourses();
      }
    });
  }

  onLessonMoved(event: { lesson: Lesson, sourceSubTopicId: number, targetSubTopicId: number }): void {
    console.log('[CourseList] onLessonMoved: Lesson moved event:', event, { timestamp: new Date().toISOString() });
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
      console.error('[CourseList] onLessonMoved: Source or target subtopic not found:', { sourceSubTopicId, targetSubTopicId }, { timestamp: new Date().toISOString() });
      this.toastr.error('Failed to update course data after moving lesson', 'Error');
      this.loadCourses();
      return;
    }

    sourceSubTopic.lessons = sourceSubTopic.lessons.filter(l => l.id !== lesson.id);
    console.log(`[CourseList] onLessonMoved: Removed lesson ${lesson.id} from source subTopic ${sourceSubTopicId}`, { timestamp: new Date().toISOString() });

    if (!targetSubTopic.lessons) targetSubTopic.lessons = [];
    targetSubTopic.lessons.push(lesson);
    console.log(`[CourseList] onLessonMoved: Added lesson ${lesson.id} to target subTopic ${targetSubTopicId}`, { timestamp: new Date().toISOString() });

    lesson.subTopicId = targetSubTopicId;

    console.log('[CourseList] onLessonMoved: Skipping full refresh to preserve tree expanded state', { timestamp: new Date().toISOString() });
    this.cdr.detectChanges();
    this.toastr.success(`Moved Lesson ${lesson.title} from SubTopic ${sourceSubTopic.title} to SubTopic ${targetSubTopic.title}`);
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