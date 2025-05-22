import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../../models/course';
import { UserService } from '../../../core/services/user.service';
import { PanelMode } from '../../../core/services/panel-state.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { ToastrService } from 'ngx-toastr';

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

  isEditing: boolean = false;
  originalData: Course | null = null;

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

  constructor(
    private userService: UserService,
    private courseDataService: CourseDataService,
    private toastr: ToastrService
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
      this.courseDataService.createCourse(this.data).subscribe({
        next: (createdCourse) => {
          this.data = createdCourse;
          this.isEditing = false;
          
          // No longer emitting courseAdded event
          
          this.modeChange.emit(false);
          console.log(`[CoursePanel] Course created`, { 
            title: createdCourse.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Course "${createdCourse.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[CoursePanel] Error creating course`, { error, timestamp: new Date().toISOString() });
          this.toastr.error('Failed to create course: ' + error.message, 'Error');
        }
      });
    } else {
      this.courseDataService.updateCourse(this.data).subscribe({
        next: (updatedCourse) => {
          this.isEditing = false;
          
          // No longer emitting courseEdited event
          
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[CoursePanel] Course updated`, { 
            title: updatedCourse.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Course "${updatedCourse.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[CoursePanel] Error updating course`, { error, timestamp: new Date().toISOString() });
          this.toastr.error('Failed to update course: ' + error.message, 'Error');
        }
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