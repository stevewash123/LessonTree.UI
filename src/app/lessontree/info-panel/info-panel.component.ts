import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

import { Lesson, LessonDetail } from '../../models/lesson';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Observable, take } from 'rxjs';
import { LessonInfoPanelComponent } from './lesson-info-panel/lesson-info-panel.component';
import { SubtopicPanelComponent } from './subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from './topic-panel/topic-panel.component';
import { CommonModule } from '@angular/common';
import { TreeNode } from '../course-list-panel/tree/tree-node.interface';

@Component({
  selector: 'info-panel',
  templateUrl: './info-panel.component.html',
  imports: [ CommonModule, LessonInfoPanelComponent, SubtopicPanelComponent, TopicPanelComponent ]
})
export class InfoPanelComponent implements OnChanges {
    @Input() activeNode: TreeNode | null = null;
    data: Topic | SubTopic | LessonDetail | null = null;

    get lessonDetail(): LessonDetail | null {
        return this.data as LessonDetail;
      }

    get topic(): Topic {
        return this.data as Topic;
      }

    get subtopic(): SubTopic {
        return this.data as SubTopic;
      }
  
    constructor(private _apiService: ApiService) {}
  
    ngOnChanges(changes: SimpleChanges) {
      if (changes['activeNode'] && this.activeNode && this.activeNode.original) {
        this.data = null;
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
      }
    }
  
    fetchLessonDetails(): Observable<LessonDetail> {
        const id = (this.activeNode!.original as Lesson).id;
        return this._apiService.get<LessonDetail>('lesson/' + id);
    }

    handleModeChange(isEditing: boolean) {
        console.log('Subtopic panel editing mode:', isEditing);
    }
  }