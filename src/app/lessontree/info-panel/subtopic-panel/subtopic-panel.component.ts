// src/app/lessontree/info-panel/subtopic-panel/subtopic-panel.component.ts
import { Component, Input, OnChanges, SimpleChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTopic } from '../../../models/subTopic';
import { UserService } from '../../../core/services/user.service';
import { PanelStateService } from '../../../core/services/panel-state.service';
import { ToastrService } from 'ngx-toastr';
import { CourseCrudService } from '../../../core/services/course-crud.service';

@Component({
  selector: 'subtopic-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtopic-panel.component.html',
  styleUrls: ['./subtopic-panel.component.css']
})
export class SubtopicPanelComponent implements OnChanges, OnInit {
  private _data: SubTopic | null = null;
  private instanceId = Math.random().toString(36).substring(2, 8);

  @Input()
  set data(value: SubTopic | null) {
    this._data = value;
    this.textData = JSON.stringify(this._data ?? {});
    console.log(`[SubtopicPanel:${this.instanceId}] Data set`, { 
      title: this._data?.title ?? 'New SubTopic', 
      mode: this.mode, 
      timestamp: new Date().toISOString() 
    });
  }
  get data(): SubTopic | null {
    return this._data;
  }
  
  textData: string = '';
  originalData: SubTopic | null = null;

  // Computed properties from centralized service
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
    private toastr: ToastrService
  ) {
    // React to mode changes
    effect(() => {
      const currentMode = this.panelStateService.panelMode();
      console.log(`[SubtopicPanel:${this.instanceId}] Mode changed to: ${currentMode}`, { 
        timestamp: new Date().toISOString() 
      });
      this.updateEditingState();
    });

    // React to template changes in add mode
    effect(() => {
      const template = this.panelStateService.nodeTemplate();
      const mode = this.panelStateService.panelMode();
      
      if (mode === 'add' && template && template.nodeType === 'SubTopic') {
        this._data = template as SubTopic;
        this.textData = JSON.stringify(this._data);
        console.log(`[SubtopicPanel:${this.instanceId}] Using template for new subtopic`, { 
          timestamp: new Date().toISOString() 
        });
      }
    });
  }

  ngOnInit(): void {
    console.log(`[SubtopicPanel:${this.instanceId}] ngOnInit`, { 
      mode: this.mode, 
      isEditing: this.isEditing, 
      data: this._data, 
      timestamp: new Date().toISOString() 
    });
    if (this._data) {
      this.textData = JSON.stringify(this._data);
    }
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.updateEditingState();
    }
  }

  private updateEditingState() {
    console.log(`[SubtopicPanel:${this.instanceId}] updateEditingState`, { 
      mode: this.mode, 
      isEditing: this.isEditing, 
      timestamp: new Date().toISOString() 
    });
    
    if (this.mode === 'edit' && this.data && !this.originalData) {
      this.originalData = { ...this.data };
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false;
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private';
      }
      this.originalData = null;
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = { ...this.data };
      this.panelStateService.setMode('edit'); // Fixed: was incorrectly 'view'
      console.log(`[SubtopicPanel:${this.instanceId}] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.courseCrudService.createSubTopic(this.data).subscribe({
        next: (createdSubTopic) => {
          this.data = createdSubTopic;
          this.panelStateService.setMode('view');
          console.log(`[SubtopicPanel:${this.instanceId}] SubTopic created`, { 
            title: createdSubTopic.title, 
            nodeId: createdSubTopic.nodeId, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`SubTopic "${createdSubTopic.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[SubtopicPanel:${this.instanceId}] Error creating subtopic`, { 
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
          console.log(`[SubtopicPanel:${this.instanceId}] SubTopic updated`, { 
            title: updatedSubTopic.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`SubTopic "${updatedSubTopic.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[SubtopicPanel:${this.instanceId}] Error updating subtopic`, { 
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
    }
    this.panelStateService.setMode('view');
    this.originalData = null;
    console.log(`[SubtopicPanel:${this.instanceId}] Cancelled ${this.mode} mode`);
  }
}