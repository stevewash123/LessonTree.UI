import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../../models/course';
import { ApiService } from '../../../core/services/api.service';
import { PanelType } from '../info-panel.component'; // Import PanelType

type PanelMode = 'view' | 'edit' | 'add';

@Component({
  selector: 'course-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './course-panel.component.html',
  styleUrls: ['./course-panel.component.css']
})
export class CoursePanelComponent implements OnChanges, OnInit {
  private _data: Course | null = null;

  @Input()
  set data(value: Course | null) {
    this._data = value;
    console.log(`[CoursePanel] Data set`, { title: this._data?.title ?? 'New Course', timestamp: new Date().toISOString() });
  }
  get data(): Course | null {
    return this._data;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  @Output() courseAdded = new EventEmitter<Course>();
  @Output() addNode = new EventEmitter<{ courseId: number; nodeType: PanelType }>(); // Use PanelType

  isEditing: boolean = false;
  originalData: Course | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['mode']) {
      this.updateEditingState();
    }
  }

  private updateEditingState() {
    this.isEditing = this.mode === 'edit' || this.mode === 'add';
    if (this.mode === 'edit' && this.data && !this.originalData) {
      this.originalData = { ...this.data };
      console.log(`[CoursePanel] Stored original data for editing: ${this.originalData.title}`);
    } else if (this.mode === 'add') {
      this.originalData = null;
      console.log('[CoursePanel] In add mode, cleared original data');
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = { ...this.data };
      this.isEditing = true;
      this.modeChange.emit(true);
      console.log(`[CoursePanel] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.apiService.createCourse(this.data).subscribe({
        next: (createdCourse) => {
          this.data = createdCourse;
          this.isEditing = false;
          this.modeChange.emit(false);
          this.courseAdded.emit(createdCourse);
          console.log(`[CoursePanel] Course created`, { title: createdCourse.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[CoursePanel] Error creating course`, { error, timestamp: new Date().toISOString() })
      });
    } else {
      this.apiService.updateCourse(this.data).subscribe({
        next: (updatedCourse) => {
          this.data = updatedCourse;
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[CoursePanel] Course updated`, { title: updatedCourse.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[CoursePanel] Error updating course`, { error, timestamp: new Date().toISOString() })
      });
    }
  }

  cancel() {
    if (this.data && this.originalData && this.mode === 'edit') {
      Object.assign(this.data, this.originalData);
      console.log(`[CoursePanel] Reverted changes to ${this.data.title}`);
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalData = null;
    console.log(`[CoursePanel] Cancelled ${this.mode} mode`);
  }

  onAddTopic() {
    if (this.data && this.data.id) {
      console.log('[CoursePanel] Emitting add node request for Topic under course:', { courseId: this.data.id });
      this.addNode.emit({ courseId: this.data.id, nodeType: 'Topic' });
    } else {
      console.warn('[CoursePanel] Cannot add topic: Course ID is missing');
    }
  }
}