import { Component, Input, OnChanges, SimpleChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../../models/course';
import { UserService } from '../../../core/services/user.service';
import { PanelStateService } from '../../../core/services/panel-state.service';
import { ToastrService } from 'ngx-toastr';
import { CourseCrudService } from '../../../core/services/course-crud.service';

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

  // Remove Input/Output for mode - now consumed from service
  originalData: Course | null = null;

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

  // Access mode from centralized service
  get mode() {
    return this.panelStateService.panelMode();
  }

  get isEditing(): boolean {
    return this.mode === 'edit' || this.mode === 'add';
  }

  constructor(
    private userService: UserService,
    private courseCrudService: CourseCrudService,
    private panelStateService: PanelStateService,
    private toastr: ToastrService
  ) {
    // React to mode changes
    effect(() => {
      const currentMode = this.panelStateService.panelMode();
      console.log(`[CoursePanel] Mode changed to: ${currentMode}`, { timestamp: new Date().toISOString() });
      this.updateEditingState();
    });

    // React to template changes in add mode
    effect(() => {
      const template = this.panelStateService.nodeTemplate();
      const mode = this.panelStateService.panelMode();
      
      if (mode === 'add' && template && template.nodeType === 'Course') {
        this._data = template as Course;
        console.log(`[CoursePanel] Using template for new course`, { timestamp: new Date().toISOString() });
      }
    });
  }

  ngOnInit(): void {
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.updateEditingState();
    }
  }
  
  private updateEditingState() {
    if (this.mode === 'edit' && this.data && !this.originalData) {
      this.originalData = { ...this.data };
      console.log(`[CoursePanel] Stored original data for editing: ${this.originalData.title}`);
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false;
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private';
      }
      this.originalData = null;
      console.log('[CoursePanel] In add mode, cleared original data');
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = { ...this.data };
      this.panelStateService.setMode('edit');
      console.log(`[CoursePanel] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.courseCrudService.createCourse(this.data).subscribe({
        next: (createdCourse) => {
          this.data = createdCourse;
          this.panelStateService.setMode('view');
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
      this.courseCrudService.updateCourse(this.data).subscribe({
        next: (updatedCourse) => {
          this.panelStateService.setMode('view');
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
    this.panelStateService.setMode('view');
    this.originalData = null;
    console.log(`[CoursePanel] Cancelled ${this.mode} mode`);
  }
}