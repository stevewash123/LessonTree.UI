import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../../models/course';
import { TreeNode } from '../../../models/tree-node';
import { ApiService } from '../../../core/services/api.service';

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
    console.log(`[CoursePanel] Data set: ${this._data?.title || 'New Course'}`);
  }
  get data(): Course | null {
    return this._data;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  @Output() courseAdded = new EventEmitter<Course>(); // Emit when a new course is added
  @Output() addNode = new EventEmitter<TreeNode>(); // For adding a Topic under the course

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
      this.apiService.post<Course>('course', this.data).subscribe({
        next: (createdCourse) => {
          Object.assign(this.data!, createdCourse);
          this.isEditing = false;
          this.modeChange.emit(false);
          this.courseAdded.emit(createdCourse);
          console.log(`[CoursePanel] Course created: ${createdCourse.title}`);
        },
        error: (error) => console.error(`[CoursePanel] Error creating course: ${error}`)
      });
    } else {
      this.apiService.put<Course>(`course/${this.data.id}`, this.data).subscribe({ // Added endpoint
        next: (updatedCourse) => {
          Object.assign(this.data!, updatedCourse);
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[CoursePanel] Course updated: ${updatedCourse.title}`);
        },
        error: (error) => console.error(`[CoursePanel] Error updating course: ${error}`)
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
    if (this.data) {
      const parentNode: TreeNode = {
        id: this.data.nodeId,
        text: this.data.title,
        nodeType: 'Course',
        original: this.data
      };
      console.log('[CoursePanel] Emitting add node request for Topic under course:', parentNode);
      this.addNode.emit(parentNode);
    }
  }
}