import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../../models/course';
import { ApiService } from '../../../core/services/api.service';
import { PanelType } from '../info-panel.component'; // Import PanelType
import { UserService } from '../../../core/services/user.service';

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
  @Output() courseEdited = new EventEmitter<Course>();
  @Output() addNode = new EventEmitter<{ courseId: number; nodeType: PanelType }>(); // Use PanelType

  isEditing: boolean = false;
  originalData: Course | null = null;

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

  constructor(
    private apiService: ApiService,
    private userService: UserService
  ) {}

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
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false; // Ensure archived is false in add mode
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private'; // Default to private if no district
      }
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
          console.log(`[CoursePanel] Emitting courseAdded`, { title: createdCourse.title, timestamp: new Date().toISOString() });
          this.courseAdded.emit(createdCourse); // Emit before modeChange
          this.modeChange.emit(false);
          console.log(`[CoursePanel] Course created`, { title: createdCourse.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[CoursePanel] Error creating course`, { error, timestamp: new Date().toISOString() })
      });
    } else {
        this.apiService.updateCourse(this.data).subscribe({
          next: () => {
            this.isEditing = false;
            if (this.originalData && this.originalData.title !== this.data!.title) {
              console.log(`[CoursePanel] Emitting courseEdited due to title change`, { 
                oldTitle: this.originalData.title, 
                newTitle: this.data!.title, 
                timestamp: new Date().toISOString() 
              });
              this.courseEdited.emit(this.data!);
            }
            this.modeChange.emit(false);
            this.originalData = null;
            console.log(`[CoursePanel] Course updated`, { title: this.data!.title, timestamp: new Date().toISOString() });
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
}