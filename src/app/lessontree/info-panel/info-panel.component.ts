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
import { TreeNode, NodeType } from '../../models/tree-node';

export type PanelMode = 'view' | 'edit' | 'add';
export type PanelType = NodeType | 'Course';

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
  @Input() selectedCourse: Course | null = null;
  @Output() modeChange = new EventEmitter<PanelMode>();
  @Output() refreshTree = new EventEmitter<void>();
  @Output() nodeAdded = new EventEmitter<TreeNode>();
  @Output() courseAdded = new EventEmitter<Course>();
  @Output() nodeEdited = new EventEmitter<TreeNode>(); // New event
  @Output() courseEdited = new EventEmitter<Course>(); // New event

  data: Course | Topic | SubTopic | LessonDetail | null = null;
  mode: PanelMode = 'view';
  parentNode: TreeNode | null = null;
  addPanelType: PanelType | null = null;

  get lessonDetail(): LessonDetail | null {
    const isLesson = this.activeNode?.nodeType === 'Lesson' || (this.mode === 'add' && this.addPanelType === 'Lesson');
    console.log(`[InfoPanel] LessonDetail get`, { isLesson, data: this.data, timestamp: new Date().toISOString() });
    return isLesson ? (this.data as LessonDetail) : null;
  }

  get topic(): Topic | null {
    const isTopic = this.activeNode?.nodeType === 'Topic' || (this.mode === 'add' && this.addPanelType === 'Topic');
    console.log(`[InfoPanel] Topic get`, { isTopic, data: this.data, timestamp: new Date().toISOString() });
    return isTopic ? (this.data as Topic) : null;
  }

  get subtopic(): SubTopic | null {
    const isSubTopic = this.activeNode?.nodeType === 'SubTopic' || (this.mode === 'add' && this.addPanelType === 'SubTopic');
    console.log(`[InfoPanel] Subtopic get`, { isSubTopic, data: this.data, timestamp: new Date().toISOString() });
    return isSubTopic ? (this.data as SubTopic) : null;
  }

  get course(): Course | null {
    const isCourse = this.selectedCourse !== null && (this.mode !== 'add' || this.addPanelType === 'Course');
    console.log(`[InfoPanel] Course get`, { isCourse, data: this.data, selectedCourse: this.selectedCourse, timestamp: new Date().toISOString() });
    return isCourse ? this.selectedCourse : null;
  }

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode'] && this.activeNode && this.activeNode.original && this.mode !== 'add') {
      this.loadNodeData();
    } else if (changes['selectedCourse'] && this.selectedCourse && this.mode !== 'add') {
      this.loadCourseData();
    }
  }

  private loadNodeData() {
    this.mode = 'view';
    this.data = null;
    this.parentNode = null;
    this.addPanelType = null;
    console.log(`[InfoPanel] Active node changed`, { nodeId: this.activeNode?.id ?? 'none', mode: 'view', timestamp: new Date().toISOString() });
    if (!this.activeNode || !this.activeNode.original) {
      console.warn('[InfoPanel] No active node or original data to load', { timestamp: new Date().toISOString() });
      return;
    }
    switch (this.activeNode.nodeType) {
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

  private loadCourseData() {
    this.mode = 'view';
    this.data = this.selectedCourse;
    this.parentNode = null;
    this.addPanelType = null;
    console.log(`[InfoPanel] Loaded Course`, { title: this.selectedCourse?.title, timestamp: new Date().toISOString() });
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

    if (previousMode === 'add' && this.mode === 'view' && (this.activeNode || this.selectedCourse)) {
      console.log(`[InfoPanel] Exiting add mode, reloading data`, { nodeId: this.activeNode?.id, courseId: this.selectedCourse?.id, timestamp: new Date().toISOString() });
      if (this.activeNode) this.loadNodeData();
      else if (this.selectedCourse) this.loadCourseData();
    } else {
      this.cdr.detectChanges();
    }
  }

  initiateAddMode(parentNode: TreeNode | undefined, panelType: PanelType, courseId?: number) {
    this.mode = 'add';
    this.parentNode = parentNode || null;
    this.addPanelType = panelType;
    console.log(`[InfoPanel] Initiating add mode`, { panelType: panelType, parentId: parentNode?.id ?? 'none', courseId, timestamp: new Date().toISOString() });

    switch (panelType) {
      case 'Course':
        this.data = {
          id: 0,
          title: '',
          description: '',
          hasChildren: false,
          archived: false,
          visibility: 'Private'
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
    console.log(`[InfoPanel] Received subTopicAdded event`, { 
      title: subTopic.title, 
      nodeId: subTopic.nodeId, 
      timestamp: new Date().toISOString() 
    });
    const newNode: TreeNode = createSubTopicNode(subTopic);
    console.log(`[InfoPanel] Emitting nodeAdded`, { 
      nodeId: newNode.id, 
      type: newNode.nodeType, 
      timestamp: new Date().toISOString() 
    });
    this.nodeAdded.emit(newNode);
    if (this.mode === 'add') {
      this.handleModeChange(false);
      this.cdr.detectChanges();
    }
  }

  onLessonAdded(lesson: LessonDetail) {
    console.log(`[InfoPanel] Lesson added`, { 
      title: lesson.title, 
      timestamp: new Date().toISOString() 
    });
    const newNode: TreeNode = createLessonNode(lesson);
    console.log(`[InfoPanel] Emitting nodeAdded for Lesson`, { 
      nodeId: newNode.id, 
      type: newNode.nodeType, 
      parentId: (lesson.subTopicId || lesson.topicId) ? (lesson.subTopicId ? `subtopic_${lesson.subTopicId}` : `topic_${lesson.topicId}`) : 'none', 
      timestamp: new Date().toISOString() 
    });
    this.nodeAdded.emit(newNode);
    if (this.mode === 'add') {
      this.handleModeChange(false);
      this.cdr.detectChanges();
    }
  }

  onTopicAdded(topic: Topic) {
    console.log(`[InfoPanel] Topic added`, { 
      title: topic.title, 
      timestamp: new Date().toISOString() 
    });
    const newNode: TreeNode = createTopicNode(topic);
    this.nodeAdded.emit(newNode);
    if (this.mode === 'add') {
      this.handleModeChange(false);
      this.cdr.detectChanges();
    }
  }

  onCourseAdded(course: Course) {
    console.log(`[InfoPanel] Course added`, { title: course.title, timestamp: new Date().toISOString() });
    this.courseAdded.emit(course);
    if (this.mode === 'add') {
      this.handleModeChange(false);
      this.cdr.detectChanges();
    }
  }

  onCourseEdited(course: Course) {
    console.log(`[InfoPanel] Course edited`, { title: course.title, timestamp: new Date().toISOString() });
    this.courseEdited.emit(course);
  }

  onTopicEdited(topic: Topic) {
    console.log(`[InfoPanel] Topic edited`, { title: topic.title, timestamp: new Date().toISOString() });
    const editedNode: TreeNode = createTopicNode(topic);
    this.nodeEdited.emit(editedNode);
  }

  onSubTopicEdited(subTopic: SubTopic) {
    console.log(`[InfoPanel] SubTopic edited`, { title: subTopic.title, timestamp: new Date().toISOString() });
    const editedNode: TreeNode = createSubTopicNode(subTopic);
    this.nodeEdited.emit(editedNode);
  }

  onLessonEdited(lesson: LessonDetail) {
    console.log(`[InfoPanel] Lesson edited`, { title: lesson.title, timestamp: new Date().toISOString() });
    const editedNode: TreeNode = createLessonNode(lesson);
    this.nodeEdited.emit(editedNode);
  }
}