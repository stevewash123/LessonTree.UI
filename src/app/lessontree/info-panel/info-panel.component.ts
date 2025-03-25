import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Lesson, LessonDetail } from '../../models/lesson';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Observable, take } from 'rxjs';
import { LessonInfoPanelComponent } from './lesson-info-panel/lesson-info-panel.component';
import { SubtopicPanelComponent } from './subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from './topic-panel/topic-panel.component';
import { CommonModule } from '@angular/common';
import { TreeNode } from '../../models/tree-node';

type PanelMode = 'view' | 'edit' | 'add';

@Component({
  selector: 'info-panel',
  standalone: true,
  imports: [CommonModule, LessonInfoPanelComponent, SubtopicPanelComponent, TopicPanelComponent],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})
export class InfoPanelComponent implements OnChanges {
  @Input() activeNode: TreeNode | null = null;
  @Output() modeChange = new EventEmitter<PanelMode>();
  @Output() refreshTree = new EventEmitter<void>();
  data: Topic | SubTopic | LessonDetail | null = null;
  mode: PanelMode = 'view';
  parentNode: TreeNode | null = null;
  addNodeType: 'Topic' | 'SubTopic' | 'Lesson' | null = null; // Made public

  get lessonDetail(): LessonDetail | null {
    return this.data as LessonDetail;
  }

  get topic(): Topic | null {
    return this.data as Topic;
  }

  get subtopic(): SubTopic | null {
    return this.data as SubTopic;
  }

  constructor(private _apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode'] && this.activeNode && this.activeNode.original && this.mode !== 'add') {
      this.mode = 'view';
      this.data = null;
      this.parentNode = null;
      this.addNodeType = null;
      console.log(`[InfoPanel] Active node changed to ${this.activeNode.id}, resetting to view mode`);
      switch (this.activeNode.nodeType) {
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
            },
            error: (err) => console.error(`[InfoPanel] Failed to fetch LessonDetail: ${err}`)
          });
          break;
      }
      this.modeChange.emit(this.mode);
      this.cdr.detectChanges();
    }
  }

  fetchLessonDetails(): Observable<LessonDetail> {
    const id = (this.activeNode!.original as Lesson).id;
    console.log(`[InfoPanel] Fetching LessonDetail for ID: ${id}`);
    return this._apiService.get<LessonDetail>('lesson/' + id);
  }

  handleModeChange(isEditing: boolean) {
    this.mode = isEditing ? (this.mode === 'add' ? 'add' : 'edit') : 'view';
    console.log(`[InfoPanel] Mode changed to ${this.mode}`);
    this.modeChange.emit(this.mode);
    this.cdr.detectChanges();
  }

  initiateAddMode(parentNode: TreeNode | undefined, nodeType: 'Topic' | 'SubTopic' | 'Lesson', courseId?: number) {
    this.mode = 'add';
    this.parentNode = parentNode || null;
    this.activeNode = null;
    this.addNodeType = nodeType;
    console.log(`[InfoPanel] Initiating add mode for ${nodeType}, parent: ${parentNode?.id || 'none'}, courseId: ${courseId}`);

    switch (nodeType) {
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
    this.refreshTree.emit();
  }
}