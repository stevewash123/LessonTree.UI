// src/app/lessontree/info-panel/info-panel.component.ts
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
import { NodeType, TreeData } from '../../models/tree-node';

export type PanelMode = 'view' | 'edit' | 'add';
export type PanelType = NodeType;

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
  @Input() activeNode: TreeData | null = null;
  @Output() modeChange = new EventEmitter<PanelMode>();
  @Output() refreshTree = new EventEmitter<void>();
  @Output() nodeAdded = new EventEmitter<TreeData>();
  @Output() courseAdded = new EventEmitter<Course>();
  @Output() nodeEdited = new EventEmitter<TreeData>();
  @Output() courseEdited = new EventEmitter<Course>();

  data: Course | Topic | SubTopic | LessonDetail | null = null;
  mode: PanelMode = 'view';
  parentNode: TreeData | null = null;
  addPanelType: PanelType | null = null;

  get lessonDetail(): LessonDetail | null {
    const isLesson = this.activeNode?.nodeType === 'Lesson' || (this.mode === 'add' && this.addPanelType === 'Lesson');
    return isLesson ? (this.data as LessonDetail) : null;
  }

  get topic(): Topic | null {
    const isTopic = this.activeNode?.nodeType === 'Topic' || (this.mode === 'add' && this.addPanelType === 'Topic');
    return isTopic ? (this.data as Topic) : null;
  }

  get subtopic(): SubTopic | null {
    const isSubTopic = this.activeNode?.nodeType === 'SubTopic' || (this.mode === 'add' && this.addPanelType === 'SubTopic');
    return isSubTopic ? (this.data as SubTopic) : null;
  }

  get course(): Course | null {
    const isCourse = this.activeNode?.nodeType === 'Course' || (this.mode === 'add' && this.addPanelType === 'Course');
    return isCourse ? (this.data as Course) : null;
  }

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode'] && this.activeNode && this.mode !== 'add') {
      this.loadNodeData();
    }
  }

  private loadNodeData() {
    this.mode = 'view';
    this.data = null;
    this.parentNode = null;
    this.addPanelType = null;
    console.log(`[InfoPanel] Active node changed`, { nodeId: this.activeNode?.nodeId ?? 'none', mode: 'view', timestamp: new Date().toISOString() });
    
    if (!this.activeNode) {
      console.warn('[InfoPanel] No active node to load', { timestamp: new Date().toISOString() });
      return;
    }
    
    switch (this.activeNode.nodeType) {
      case 'Course':
        this.data = this.activeNode as Course;
        console.log(`[InfoPanel] Loaded Course`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'Topic':
        this.data = this.activeNode as Topic;
        console.log(`[InfoPanel] Loaded Topic`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'SubTopic':
        this.data = this.activeNode as SubTopic;
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
    const id = (this.activeNode! as Lesson).id;
    console.log(`[InfoPanel] Fetching LessonDetail`, { id, timestamp: new Date().toISOString() });
    return this.apiService.get<LessonDetail>(`lesson/${id}`);
  }

  handleModeChange(isEditing: boolean) {
    const previousMode = this.mode;
    this.mode = isEditing ? (this.mode === 'add' ? 'add' : 'edit') : 'view';
    console.log(`[InfoPanel] Mode changed`, { from: previousMode, to: this.mode, timestamp: new Date().toISOString() });
    this.modeChange.emit(this.mode);

    if (previousMode === 'add' && this.mode === 'view' && this.activeNode) {
      console.log(`[InfoPanel] Exiting add mode, reloading data`, { nodeId: this.activeNode?.nodeId, timestamp: new Date().toISOString() });
      this.loadNodeData();
    } else {
      this.cdr.detectChanges();
    }
  }

  initiateAddMode(parentNode: TreeData | undefined, panelType: PanelType, courseId?: number) {
    this.mode = 'add';
    this.parentNode = parentNode || null;
    this.addPanelType = panelType;
    console.log(`[InfoPanel] Initiating add mode`, { panelType: panelType, parentId: parentNode?.id ?? 'none', courseId, timestamp: new Date().toISOString() });
  
    switch (panelType) {
      case 'Course':
        this.data = {
          id: 0,
          nodeId: `course_${Date.now()}`,
          title: '',
          description: '',
          hasChildren: false,
          archived: false,
          visibility: 'Private',
          nodeType: 'Course'
        } as Course;
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
          subTopics: [],
          lessons: [],
          nodeType: 'Topic',
          sortOrder: 0
        } as Topic;
        break;
      case 'SubTopic':
        if (!parentNode || parentNode.nodeType !== 'Topic') {
          console.error('[InfoPanel] Parent must be a Topic for adding a SubTopic', { timestamp: new Date().toISOString() });
          throw new Error('Invalid parent for SubTopic');
        }
        const topicParent = parentNode as Topic;
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
          nodeType: 'SubTopic',
          sortOrder: 0
        } as SubTopic;
        break;
      case 'Lesson':
        if (!parentNode || (parentNode.nodeType !== 'Topic' && parentNode.nodeType !== 'SubTopic')) {
          console.error('[InfoPanel] Parent must be a Topic or SubTopic for adding a Lesson', { timestamp: new Date().toISOString() });
          throw new Error('Invalid parent for Lesson');
        }
        const parent = parentNode as SubTopic | Topic;
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
          archived: false,
          notes: [],
          nodeType: 'Lesson',
          sortOrder: 0
        } as LessonDetail;
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
    this.nodeAdded.emit(subTopic);
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
    this.nodeAdded.emit(lesson);
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
    this.nodeAdded.emit(topic);
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
    this.nodeEdited.emit(topic);
  }

  onSubTopicEdited(subTopic: SubTopic) {
    console.log(`[InfoPanel] SubTopic edited`, { title: subTopic.title, timestamp: new Date().toISOString() });
    this.nodeEdited.emit(subTopic);
  }

  onLessonEdited(lesson: LessonDetail) {
    console.log(`[InfoPanel] Lesson edited`, { title: lesson.title, timestamp: new Date().toISOString() });
    this.nodeEdited.emit(lesson);
  }
}