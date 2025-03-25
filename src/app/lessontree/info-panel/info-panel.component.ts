import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Lesson, LessonDetail, createLessonNode } from '../../models/lesson';
import { Topic } from '../../models/topic';
import { createSubTopicNode, SubTopic } from '../../models/subTopic';
import { Course } from '../../models/course'; // Added Course import
import { Observable, take } from 'rxjs';
import { LessonInfoPanelComponent } from './lesson-info-panel/lesson-info-panel.component';
import { SubtopicPanelComponent } from './subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from './topic-panel/topic-panel.component';
import { CoursePanelComponent } from './course-panel/course-panel.component'; // Added CoursePanelComponent import
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
    CoursePanelComponent // Added CoursePanelComponent
  ],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})
export class InfoPanelComponent implements OnChanges {
  @Input() activeNode: TreeNode | null = null;
  @Output() modeChange = new EventEmitter<PanelMode>();
  @Output() refreshTree = new EventEmitter<void>();
  @Output() nodeAdded = new EventEmitter<TreeNode>();

  data: Course | Topic | SubTopic | LessonDetail | null = null; // Added Course to union type
  mode: PanelMode = 'view';
  parentNode: TreeNode | null = null;
  addNodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson' | null = null; // Added 'Course'

  get lessonDetail(): LessonDetail | null {
    return this.data as LessonDetail;
  }

  get topic(): Topic | null {
    return this.data as Topic;
  }

  get subtopic(): SubTopic | null {
    return this.data as SubTopic;
  }

  get course(): Course | null {
    return this.data as Course;
  }

  constructor(private _apiService: ApiService, private cdr: ChangeDetectorRef) {}

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
    console.log(`[InfoPanel] Active node changed to ${this.activeNode?.id ?? 'none'}, resetting to view mode`);
    if (!this.activeNode || !this.activeNode.original) {
      console.warn('[InfoPanel] No active node or original data to load');
      return;
    }
    switch (this.activeNode.nodeType) {
      case 'Course':
        this.data = this.activeNode.original as Course;
        console.log(`[InfoPanel] Loaded Course: ${this.data.title}`);
        break;
      case 'Topic':
        this.data = this.activeNode.original as Topic;
        console.log(`[InfoPanel] Loaded Topic: ${this.data.title}`);
        break;
      case 'SubTopic':
        this.data = this.activeNode.original as SubTopic;
        console.log(`[InfoPanel] Loaded SubTopic: ${this.data.title}`);
        break;
      case 'Lesson':
        this.fetchLessonDetails().pipe(take(1)).subscribe({
          next: (detail) => {
            this.data = detail;
            console.log(`[InfoPanel] Loaded LessonDetail: ${detail.title}`);
            this.cdr.detectChanges();
          },
          error: (err) => console.error(`[InfoPanel] Failed to fetch LessonDetail: ${err}`)
        });
        break;
      default:
        console.warn(`[InfoPanel] Unknown node type: ${this.activeNode.nodeType}`);
    }
    this.modeChange.emit(this.mode);
    this.cdr.detectChanges();
  }

  fetchLessonDetails(): Observable<LessonDetail> {
    const id = (this.activeNode!.original as Lesson).id;
    console.log(`[InfoPanel] Fetching LessonDetail for ID: ${id}`);
    return this._apiService.get<LessonDetail>('lesson/' + id);
  }

  handleModeChange(isEditing: boolean) {
    const previousMode = this.mode;
    this.mode = isEditing ? (this.mode === 'add' ? 'add' : 'edit') : 'view';
    console.log(`[InfoPanel] Mode changed from ${previousMode} to ${this.mode}`);
    this.modeChange.emit(this.mode);

    // If we're exiting 'add' mode and going back to 'view', reload the active node's data
    if (previousMode === 'add' && this.mode === 'view' && this.activeNode) {
      console.log(`[InfoPanel] Exiting add mode, reloading active node: ${this.activeNode.id}`);
      this.loadNodeData();
    } else {
      this.cdr.detectChanges();
    }
  }

  initiateAddMode(parentNode: TreeNode | undefined, nodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson', courseId?: number) {
    this.mode = 'add';
    this.parentNode = parentNode || null;
    this.addNodeType = nodeType;
    console.log(`[InfoPanel] Initiating add mode for ${nodeType}, parent: ${parentNode?.id || 'none'}, courseId: ${courseId}, activeNode: ${this.activeNode?.id ?? 'none'}`);

    switch (nodeType) {
      case 'Course':
        this.data = {
          id: 0,
          nodeId: `course_${Date.now()}`,
          title: '',
          description: '',
          hasChildren: false
        } as Course;
        break;
      case 'Topic':
        if (!courseId) {
          console.error('[InfoPanel] Course ID required for adding a Topic');
          throw new Error('Course ID must be provided when adding a Topic');
        }
        this.data = {
          id: 0,
          nodeId: `topic_${Date.now()}`,
          courseId,
          title: '',
          description: '',
          hasSubTopics: false,
          hasChildren: false
        } as Topic;
        break;
      case 'SubTopic':
        if (!parentNode || parentNode.nodeType !== 'Topic') {
          console.error('[InfoPanel] Parent must be a Topic for adding a SubTopic');
          throw new Error('Invalid parent for SubTopic');
        }
        this.data = {
          id: 0,
          nodeId: `subtopic_${Date.now()}`,
          topicId: (parentNode.original as Topic).id,
          courseId: (parentNode.original as Topic).courseId,
          title: '',
          description: '',
          isDefault: false,
          lessons: [],
          hasChildren: false
        } as SubTopic;
        break;
      case 'Lesson':
        if (!parentNode || (parentNode.nodeType !== 'Topic' && parentNode.nodeType !== 'SubTopic')) {
          console.error('[InfoPanel] Parent must be a Topic or SubTopic for adding a Lesson');
          throw new Error('Invalid parent for Lesson');
        }
        const parent = parentNode.original as SubTopic | Topic;
        this.data = {
          id: 0,
          nodeId: `lesson_${Date.now()}`,
          courseId: parent.courseId,
          subTopicId: parentNode.nodeType === 'SubTopic' ? (parent as SubTopic).id : 0,
          title: '',
          level: '',
          objective: '',
          materials: '',
          classTime: '',
          methods: '',
          specialNeeds: '',
          assessment: '',
          standards: [],
          attachments: []
        } as LessonDetail;
        break;
    }
    this.modeChange.emit(this.mode);
    console.log(`[InfoPanel] Add mode initiated, data:`, this.data);
    this.cdr.detectChanges();
  }

  onSubTopicAdded(subTopic: SubTopic) {
    console.log(`[InfoPanel] SubTopic added: ${subTopic.title}, refreshing tree`);
    const newNode: TreeNode = createSubTopicNode(subTopic);
    this.nodeAdded.emit(newNode);
    this.refreshTree.emit();
  }

  onLessonAdded(lesson: LessonDetail) {
    console.log(`[InfoPanel] Lesson added: ${lesson.title}, refreshing tree`);
    const newNode: TreeNode = createLessonNode(lesson);
    this.nodeAdded.emit(newNode);
    this.refreshTree.emit();
  }

  onCourseAdded(course: Course) {
    console.log(`[InfoPanel] Course added: ${course.title}, refreshing tree`);
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