// src/app/lessontree/info-panel/subtopic-panel/subtopic-panel.component.ts - COMPLETE FILE (Signals Optimized)
import { Component, Input, OnChanges, SimpleChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from '../../shared/services/notification.service';
import { SubTopic } from '../../models/subTopic';
import { CourseCrudService } from '../../lesson-tree/services/course-operations/course-crud.service';
import { PanelStateService } from '../panel-state.service';
import { UserService } from '../../user-config/user.service';

@Component({
  selector: 'subtopic-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtopic-panel.component.html',
  styleUrls: ['./subtopic-panel.component.css']
})
export class SubtopicPanelComponent implements OnChanges, OnInit {
  private _data: SubTopic | null = null;

  @Input()
  set data(value: SubTopic | null) {
    this._data = value;
    console.log(`[SubtopicPanel] Data set`, {
      title: this._data?.title ?? 'New SubTopic',
      timestamp: new Date().toISOString()
    });
  }
  get data(): SubTopic | null {
    return this._data;
  }

  originalData: SubTopic | null = null;

  // Access mode from centralized service
  get mode() {
    return this.panelStateService.panelMode();
  }

  get isEditing(): boolean {
    return this.mode === 'edit' || this.mode === 'add';
  }

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

  constructor(
    private userService: UserService,
    private courseCrudService: CourseCrudService,
    private panelStateService: PanelStateService,
    private toastr: ToastrService,
    private notificationService: NotificationService
  ) {
    console.log('[SubtopicPanel] Component initialized with signals optimization', {
      timestamp: new Date().toISOString()
    });

    // React to mode changes
    effect(() => {
      const currentMode = this.panelStateService.panelMode();
      console.log(`[SubtopicPanel] Mode changed to: ${currentMode}`, {
        timestamp: new Date().toISOString()
      });
      this.updateEditingState();
    });

    // React to template changes in add mode
    effect(() => {
      const template = this.panelStateService.nodeTemplate();
      const mode = this.panelStateService.panelMode();

      if (mode === 'add' && template && template.entityType  === 'SubTopic') {
        this._data = template as SubTopic;
        console.log(`[SubtopicPanel] Using template for new subtopic`, {
          timestamp: new Date().toISOString()
        });
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
      this.originalData = this.data.clone();
      console.log(`[SubtopicPanel] Stored original data for editing: ${this.originalData.title}`);
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false;
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private';
      }
      this.originalData = null;
      console.log('[SubtopicPanel] In add mode, cleared original data');
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = this.data.clone();
      this.panelStateService.setMode('edit');
      console.log(`[SubtopicPanel] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.courseCrudService.createSubTopic(this.data).subscribe({
        next: (createdSubTopic) => {
          this.data = createdSubTopic;
          this.panelStateService.setMode('view');
          console.log(`[SubtopicPanel] SubTopic created`, {
            title: createdSubTopic.title,
            timestamp: new Date().toISOString()
          });
          this.notificationService.showSuccess(`SubTopic "${createdSubTopic.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[SubtopicPanel] Error creating subtopic`, {
            error,
            timestamp: new Date().toISOString()
          });
          this.toastr.error('Failed to create subtopic: ' + error.message, 'Error');
        }
      });
    } else {
      this.courseCrudService.updateSubTopic(this.data).subscribe({
        next: (updatedSubTopic) => {
          this.panelStateService.setMode('view');
          this.originalData = null;
          console.log(`[SubtopicPanel] SubTopic updated`, {
            title: updatedSubTopic.title,
            timestamp: new Date().toISOString()
          });
          this.notificationService.showSuccess(`SubTopic "${updatedSubTopic.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[SubtopicPanel] Error updating subtopic`, {
            error,
            timestamp: new Date().toISOString()
          });
          this.toastr.error('Failed to update subtopic: ' + error.message, 'Error');
        }
      });
    }
  }

  cancel() {
    if (this.data && this.originalData && this.mode === 'edit') {
      Object.assign(this.data, this.originalData);
      console.log(`[SubtopicPanel] Reverted changes to ${this.data.title}`);
    }
    this.panelStateService.setMode('view');
    this.originalData = null;
    console.log(`[SubtopicPanel] Cancelled ${this.mode} mode`);
  }
}
