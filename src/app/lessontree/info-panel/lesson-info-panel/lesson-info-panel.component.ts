import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LessonDetail } from '../../../models/lesson';
import { ApiService } from '../../../core/services/api.service';
import { LessonAttachmentTableComponent } from './lesson-attachment-table/lesson-attachment-table.component';
import { StandardTableComponent } from './standard-table/standard-table.component';

type PanelMode = 'view' | 'edit' | 'add';

@Component({
  selector: 'lesson-info-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './lesson-info-panel.component.html',
  styleUrls: ['./lesson-info-panel.component.css']
})
export class LessonInfoPanelComponent implements OnChanges, OnInit {
  private _lessonDetail: LessonDetail | null = null;

  @Input()
  set lessonDetail(value: LessonDetail) {
    this._lessonDetail = value;
    console.log(`[LessonInfoPanel] LessonDetail set: ${this._lessonDetail.title || 'New Lesson'}`);
  }
  get lessonDetail(): LessonDetail {
    return this._lessonDetail!;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  @Output() lessonAdded = new EventEmitter<LessonDetail>(); // New output for when a Lesson is added
  isEditing: boolean = false;
  originalLessonDetail: LessonDetail | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonDetail'] || changes['mode']) {
      this.updateEditingState();
    }
  }

  private updateEditingState() {
    this.isEditing = this.mode === 'edit' || this.mode === 'add';
    if (this.mode === 'edit' && this.lessonDetail && !this.originalLessonDetail) {
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
    } else if (this.mode === 'add') {
      this.originalLessonDetail = null;
    }
  }

  enterEditMode() {
    if (this.lessonDetail) {
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
      this.isEditing = true;
      this.modeChange.emit(true);
      console.log(`[LessonInfoPanel] Entered edit mode for ${this.lessonDetail.title}`);
    }
  }

  save() {
    if (!this.lessonDetail) return;

    if (this.mode === 'add') {
      this.apiService.createLesson(this.lessonDetail).subscribe({
        next: (createdLesson) => {
          // Fetch full LessonDetail after creation to ensure all fields are present
          this.apiService.get<LessonDetail>(`lesson/${createdLesson.id}`).subscribe({
            next: (fullLesson) => {
              Object.assign(this.lessonDetail, fullLesson);
              this.isEditing = false;
              this.modeChange.emit(false);
              this.lessonAdded.emit(this.lessonDetail);
              console.log(`[LessonInfoPanel] Lesson created`, { title: fullLesson.title, timestamp: new Date().toISOString() });
            },
            error: (error) => console.error(`[LessonInfoPanel] Error fetching lesson details`, { error, timestamp: new Date().toISOString() })
          });
        },
        error: (error) => console.error(`[LessonInfoPanel] Error creating lesson`, { error, timestamp: new Date().toISOString() })
      });
    } else {
      this.apiService.updateLesson(this.lessonDetail).subscribe({
        next: (updatedLesson) => {
          Object.assign(this.lessonDetail, updatedLesson);
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalLessonDetail = null;
          console.log(`[LessonInfoPanel] Lesson updated`, { title: updatedLesson.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[LessonInfoPanel] Error updating lesson`, { error, timestamp: new Date().toISOString() })
      });
    }
  }

  cancel() {
    if (this.lessonDetail && this.originalLessonDetail && this.mode === 'edit') {
      Object.assign(this.lessonDetail, this.originalLessonDetail);
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalLessonDetail = null;
    console.log(`[LessonInfoPanel] Cancelled ${this.mode} mode`);
  }
}