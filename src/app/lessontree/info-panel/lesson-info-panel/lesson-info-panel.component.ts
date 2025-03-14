// app-lesson-detail-editor.component.ts
import { Component, Input } from '@angular/core';
import { LessonDetail } from '../../../models/lesson';

@Component({
  selector: 'lesson-info-panel',
  template: './lesson-info-panel.component.html'
})
export class LessonDetailEditorComponent {
  @Input() lessonDetail: LessonDetail | null = null;

  addDocument() {
    // Implement document addition logic
  }
}