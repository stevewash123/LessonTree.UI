// src/app/lessontree/info-panel/topic-panel/topic-panel.component.ts - COMPLETE FILE (Signals Optimized)
import { Component, Input, OnChanges, SimpleChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from '../../shared/services/notification.service';
import { Topic } from '../../models/topic';
import { CourseCrudService } from '../../lesson-tree/services/course-operations/course-crud.service';
import { PanelStateService } from '../panel-state.service';
import { UserService } from '../../user-config/user.service';

@Component({
  selector: 'topic-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topic-panel.component.html',
  styleUrls: ['./topic-panel.component.css']
})
export class TopicPanelComponent implements OnChanges, OnInit {
  private _data: Topic | null = null;

  @Input()
  set data(value: Topic | null) {
    this._data = value;
    console.log(`[TopicPanel] Data set`, {
      title: this._data?.title ?? 'New Topic',
      timestamp: new Date().toISOString()
    });
  }
  get data(): Topic | null {
    return this._data;
  }

  originalData: Topic | null = null;

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
    private toastr: ToastrService,
    private notificationService: NotificationService
  ) {
    console.log('[TopicPanel] Component initialized with signals optimization', {
      timestamp: new Date().toISOString()
    });

    // React to mode changes
    effect(() => {
      const currentMode = this.panelStateService.panelMode();
      console.log(`[TopicPanel] Mode changed to: ${currentMode}`, {
        timestamp: new Date().toISOString()
      });
      this.updateEditingState();
    });

    // React to template changes in add mode
    effect(() => {
      const template = this.panelStateService.nodeTemplate();
      const mode = this.panelStateService.panelMode();

      if (mode === 'add' && template && template.entityType  === 'Topic') {
        this._data = template as Topic;
        console.log(`[TopicPanel] Using template for new topic`, {
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
      console.log(`[TopicPanel] Stored original data for editing: ${this.originalData.title}`);
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false;
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private';
      }
      this.originalData = null;
      console.log('[TopicPanel] In add mode, cleared original data');
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = this.data.clone();
      this.panelStateService.setMode('edit');
      console.log(`[TopicPanel] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.courseCrudService.createTopic(this.data).subscribe({
        next: (createdTopic) => {
          this.data = createdTopic;
          this.panelStateService.setMode('view');
          console.log(`[TopicPanel] Topic created`, {
            title: createdTopic.title,
            timestamp: new Date().toISOString()
          });
          this.notificationService.showSuccess(`Topic "${createdTopic.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[TopicPanel] Error creating topic`, {
            error,
            timestamp: new Date().toISOString()
          });
          this.toastr.error('Failed to create topic: ' + error.message, 'Error');
        }
      });
    } else {
      this.courseCrudService.updateTopic(this.data).subscribe({
        next: (updatedTopic) => {
          this.panelStateService.setMode('view');
          this.originalData = null;
          console.log(`[TopicPanel] Topic updated`, {
            title: updatedTopic.title,
            timestamp: new Date().toISOString()
          });
          this.notificationService.showSuccess(`Topic "${updatedTopic.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[TopicPanel] Error updating topic`, {
            error,
            timestamp: new Date().toISOString()
          });
          this.toastr.error('Failed to update topic: ' + error.message, 'Error');
        }
      });
    }
  }

  cancel() {
    if (this.data && this.originalData && this.mode === 'edit') {
      Object.assign(this.data, this.originalData);
      console.log(`[TopicPanel] Reverted changes to ${this.data.title}`);
    }
    this.panelStateService.setMode('view');
    this.originalData = null;
    console.log(`[TopicPanel] Cancelled ${this.mode} mode`);
  }
}
