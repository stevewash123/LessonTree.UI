// Full File: info-panel.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Lesson, LessonDetail, createLessonNode } from '../../models/lesson';
import { Topic, createTopicNode } from '../../models/topic';
import { createSubTopicNode, SubTopic } from '../../models/subTopic';
import { Course } from '../../models/course';
import { Observable, take } from 'rxjs';
import { LessonInfoPanelComponent } from './lesson-info-panel/lesson-info-panel.component';
import { SubtopicPanelComponent } from './subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from './topic-panel/topic-panel.component';
import { CoursePanelComponent } from './course-panel/course-panel.component';
import { CommonModule } from '@angular/common';
import { TreeNode } from '../../models/tree-node';

export type PanelMode = 'view' | 'edit' | 'add';

@Component({
  selector: 'info-panel',
  standalone: true,
  imports: [
    CommonModule,
    LessonInfoPanelComponent,
    SubtopicPanelComponent,
    TopicPanelComponent,
    CoursePanelComponent
  ],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})
export class InfoPanelComponent implements OnChanges {
  @Input() activeNode: TreeNode | null = null;
  @Output() modeChange = new EventEmitter<PanelMode>();
  @Output() refreshTree = new EventEmitter<void>();
  @Output() nodeAdded = new EventEmitter<TreeNode>();

  data: Course | Topic | SubTopic | LessonDetail | null = null;
  mode: PanelMode = 'view';
  parentNode: TreeNode | null = null;
  addNodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' | null = null;

  get lessonDetail(): LessonDetail | null {
    return this.activeNode?.nodeType === 'Lesson' ? (this.data as LessonDetail) : null;
  }

  get topic(): Topic | null {
    return this.activeNode?.nodeType === 'Topic' ? (this.data as Topic) : null;
  }

  get subtopic(): SubTopic | null {
    return this.activeNode?.nodeType === 'SubTopic' ? (this.data as SubTopic) : null;
  }

  get course(): Course | null {
    return this.activeNode?.nodeType === 'Course' ? (this.data as Course) : null;
  }

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode'] && this.activeNode && this.activeNode.original && this.mode !== 'add') {
      this.loadNodeData();
    }
  }

  private loadNodeData() {
    this.mode = 'view';
    this.data = null;
    this.parentNode = null;
    this.addNodeType = null;
    console.log(`[InfoPanel] Active node changed`, { nodeId: this.activeNode?.id ?? 'none', mode: 'view', timestamp: new Date().toISOString() });
    if (!this.activeNode || !this.activeNode.original) {
      console.warn('[InfoPanel] No active node or original data to load', { timestamp: new Date().toISOString() });
      return;
    }
    switch (this.activeNode.nodeType) {
      case 'Course':
        this.data = this.activeNode.original as Course;
        console.log(`[InfoPanel] Loaded Course`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'Topic':
        this.data = this.activeNode.original as Topic;
        console.log(`[InfoPanel] Loaded Topic`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'SubTopic':
        this.data = this.activeNode.original as SubTopic;
        console.log(`[InfoPanel] Loaded SubTopic`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'Lesson':
        this.fetchLessonDetails().pipe(take(1)).subscribe({
          next: (detail) => {
            this.data = detail;
            console.log(`[InfoPanel] Loaded LessonDetail`, { title: detail.title, timestamp: new Date().toISOString() });
            this.cdr.detectChanges();
          },
          error: (err) => console.error(`[InfoPanel] Failed to fetch LessonDetail`, { error: err, timestamp: new Date().toISOString() })
        });
        break;
      default:
        console.warn(`[InfoPanel] Unknown node type`, { nodeType: this.activeNode.nodeType, timestamp: new Date().toISOString() });
    }
    this.modeChange.emit(this.mode);
    this.cdr.detectChanges();
  }

  fetchLessonDetails(): Observable<LessonDetail> {
    const id = (this.activeNode!.original as Lesson).id;
    console.log(`[InfoPanel] Fetching LessonDetail`, { id, timestamp: new Date().toISOString() });
    return this.apiService.get<LessonDetail>(`lesson/${id}`);
  }

  handleModeChange(isEditing: boolean) {
    const previousMode = this.mode;
    this.mode = isEditing ? (this.mode === 'add' ? 'add' : 'edit') : 'view';
    console.log(`[InfoPanel] Mode changed`, { from: previousMode, to: this.mode, timestamp: new Date().toISOString() });
    this.modeChange.emit(this.mode);

    if (previousMode === 'add' && this.mode === 'view' && this.activeNode) {
      console.log(`[InfoPanel] Exiting add mode, reloading active node`, { nodeId: this.activeNode.id, timestamp: new Date().toISOString() });
      this.loadNodeData();
    } else {
      this.cdr.detectChanges();
    }
  }

  initiateAddMode(parentNode: TreeNode | undefined, nodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson', courseId?: number) {
    this.mode = 'add';
    this.parentNode = parentNode || null;
    this.addNodeType = nodeType;
    console.log(`[InfoPanel] Initiating add mode`, { nodeType, parentId: parentNode?.id ?? 'none', courseId, timestamp: new Date().toISOString() });

    switch (nodeType) {
      case 'Course':
        this.data = {
          id: 0,
          nodeId: `course_${Date.now()}`,
          title: '',
          description: '',
          hasChildren: false,
          archived: false,
          visibility: 'Private',
          teamId: undefined
        };
        break;
      case 'Topic':
        if (!courseId) {
          console.error('[InfoPanel] Course ID required for adding a Topic', { timestamp: new Date().toISOString() });
          throw new Error('Course ID must be provided when adding a Topic');
        }
        this.data = {
          id: 0,
          nodeId: `topic_${Date.now()}`,
          courseId,
          title: '',
          description: '',
          hasChildren: false,
          archived: false,
          visibility: 'Private',
          teamId: undefined,
          subTopics: [],
          lessons: []
        };
        break;
      case 'SubTopic':
        if (!parentNode || parentNode.nodeType !== 'Topic') {
          console.error('[InfoPanel] Parent must be a Topic for adding a SubTopic', { timestamp: new Date().toISOString() });
          throw new Error('Invalid parent for SubTopic');
        }
        const topicParent = parentNode.original as Topic;
        this.data = {
          id: 0,
          nodeId: `subtopic_${Date.now()}`,
          topicId: topicParent.id,
          courseId: topicParent.courseId,
          title: '',
          description: '',
          lessons: [],
          hasChildren: false,
          archived: false,
          visibility: 'Private',
          teamId: undefined
        };
        break;
      case 'Lesson':
        if (!parentNode || (parentNode.nodeType !== 'Topic' && parentNode.nodeType !== 'SubTopic')) {
          console.error('[InfoPanel] Parent must be a Topic or SubTopic for adding a Lesson', { timestamp: new Date().toISOString() });
          throw new Error('Invalid parent for Lesson');
        }
        const parent = parentNode.original as SubTopic | Topic;
        this.data = {
          id: 0,
          nodeId: `lesson_${Date.now()}`,
          courseId: parent.courseId,
          subTopicId: parentNode.nodeType === 'SubTopic' ? (parent as SubTopic).id : undefined,
          topicId: parentNode.nodeType === 'Topic' ? (parent as Topic).id : undefined,
          title: '',
          level: '',
          objective: '',
          materials: '',
          classTime: '',
          methods: '',
          specialNeeds: '',
          assessment: '',
          standards: [],
          attachments: [],
          visibility: 'Private',
          teamId: undefined,
          archived: false
        };
        break;
    }
    this.modeChange.emit(this.mode);
    console.log(`[InfoPanel] Add mode initiated`, { data: this.data, timestamp: new Date().toISOString() });
    this.cdr.detectChanges();
  }

  onSubTopicAdded(subTopic: SubTopic) {
    console.log(`[InfoPanel] SubTopic added`, { title: subTopic.title, timestamp: new Date().toISOString() });
    const newNode: TreeNode = createSubTopicNode(subTopic);
    this.nodeAdded.emit(newNode);
    this.refreshTree.emit();
  }

  onLessonAdded(lesson: LessonDetail) {
    console.log(`[InfoPanel] Lesson added`, { title: lesson.title, timestamp: new Date().toISOString() });
    const newNode: TreeNode = createLessonNode(lesson);
    this.nodeAdded.emit(newNode);
    this.refreshTree.emit();
  }

  onCourseAdded(course: Course) {
    console.log(`[InfoPanel] Course added`, { title: course.title, timestamp: new Date().toISOString() });
    const newNode: TreeNode = {
      id: course.nodeId,
      text: course.title,
      nodeType: 'Course',
      hasChildren: false,
      original: course
    };
    this.nodeAdded.emit(newNode);
    this.refreshTree.emit();
  }
}