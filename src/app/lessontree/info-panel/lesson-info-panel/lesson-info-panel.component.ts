import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LessonDetail } from '../../../models/lesson';
import { LessonAttachmentTableComponent } from './lesson-attachment-table/lesson-attachment-table.component';
import { StandardTableComponent } from './standard-table/standard-table.component';

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
export class LessonInfoPanelComponent implements OnChanges {
  @Input() lessonDetail: LessonDetail | null = null;
  @Output() modeChange = new EventEmitter<boolean>();

  isEditing: boolean = false;
  originalLessonDetail: LessonDetail | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonDetail'] && this.lessonDetail) {
      this.isEditing = false;
      this.originalLessonDetail = null;
    }
  }

  enterEditMode() {
    if (this.lessonDetail) {
      // Deep copy to preserve arrays and nested objects
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
      this.isEditing = true;
      this.modeChange.emit(true);
    }
  }

  save() {
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalLessonDetail = null;
  }

  cancel() {
    if (this.lessonDetail && this.originalLessonDetail) {
      // Restore original data
      Object.assign(this.lessonDetail, this.originalLessonDetail);
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalLessonDetail = null;
  }
}