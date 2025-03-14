import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

import { Lesson, LessonDetail } from '../../models/lesson';
import { TreeNode } from '../tree/tree-node.interface';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Observable, take } from 'rxjs';
import { LessonDetailEditorComponent } from '../../lesson/lesson-info-panel/lesson-info-panel.component';
import { SubtopicPanelComponent } from '../../info-panel/subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from '../../info-panel/topic-panel/topic-panel.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-panel',
  templateUrl: './info-panel.component.html',
  imports: [ CommonModule, LessonDetailEditorComponent, SubtopicPanelComponent, TopicPanelComponent ]
})
export class InfoPanelComponent implements OnChanges {
    @Input() activeNode: TreeNode | null = null;
    data: Topic | SubTopic | LessonDetail | null = null;

    get lessonDetail(): LessonDetail | null {
        return this.activeNode?.type === 'Lesson' ? (this.data as LessonDetail) : null;
      }

    get topic(): Topic | null {
        return this.activeNode?.type === 'Lesson' ? (this.data as Topic) : null;
      }

    get subtopic(): SubTopic | null {
        return this.activeNode?.type === 'Lesson' ? (this.data as SubTopic) : null;
      }
  
    constructor(private _apiService: ApiService) {}
  
    ngOnChanges(changes: SimpleChanges) {
      if (changes['activeNode'] && this.activeNode && this.activeNode.original) {
        switch(this.activeNode.type) {
            case 'Topic': this.data = this.activeNode.original as Topic;
            break;

            case 'SubTopic': this.data = this.activeNode.original as SubTopic;
            break;

            case 'Lesson': this.fetchLessonDetails().pipe(take(1)).subscribe(detail => {
                this.data = detail;
            })
            break;

        }
        this.updateDisplay();
      }
    }
  
    updateDisplay() {
      if (this.activeNode!.type === 'Lesson') {
        this.fetchLessonDetails();
      } else {
        this.data = null; // Reset for Topic/SubTopic
      }
    }
  
    fetchLessonDetails(): Observable<LessonDetail> {
        const id = (this.activeNode!.original as Lesson).id;
        return this._apiService.getLessonDetail(id);
    }
  }