import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../../../models/topic';
import { UserService } from '../../../core/services/user.service';
import { PanelMode } from '../../../core/services/panel-state.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { ToastrService } from 'ngx-toastr';

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
    console.log(`[TopicPanel] Data set`, { title: this._data?.title ?? 'New Topic', timestamp: new Date().toISOString() });
  }
  get data(): Topic | null {
    return this._data;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  @Output() topicAdded = new EventEmitter<Topic>();
  @Output() topicEdited = new EventEmitter<Topic>();

  isEditing: boolean = false;
  originalData: Topic | null = null;

  constructor(
    private userService: UserService,
    private courseDataService: CourseDataService,
    private toastr: ToastrService
  ) {}

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

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
      console.log(`[TopicPanel] Stored original data for editing: ${this.originalData.title}`);
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false; // Ensure archived is false in add mode
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private'; // Default to private if no district
      }
      this.originalData = null;
      console.log('[TopicPanel] In add mode, cleared original data');
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = { ...this.data };
      this.isEditing = true;
      this.modeChange.emit(true);
      console.log(`[TopicPanel] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.courseDataService.createTopic(this.data).subscribe({
        next: (createdTopic) => {
          this.data = createdTopic;
          this.isEditing = false;
          this.modeChange.emit(false);
                    
          console.log(`[TopicPanel] Topic created`, { 
            title: createdTopic.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Topic "${createdTopic.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[TopicPanel] Error creating topic`, { error, timestamp: new Date().toISOString() });
          this.toastr.error('Failed to create topic: ' + error.message, 'Error');
        }
      });
    } else {
      this.courseDataService.updateTopic(this.data).subscribe({
        next: (updatedTopic) => {
          this.isEditing = false;
          
          // Emit for backward compatibility - will be removed once migration is complete
          console.log(`[TopicPanel] Emitting topicEdited for backward compatibility`, { 
            title: updatedTopic.title, 
            timestamp: new Date().toISOString() 
          });
          this.topicEdited.emit(updatedTopic);
          
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[TopicPanel] Topic updated`, { 
            title: updatedTopic.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Topic "${updatedTopic.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[TopicPanel] Error updating topic`, { error, timestamp: new Date().toISOString() });
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
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalData = null;
    console.log(`[TopicPanel] Cancelled ${this.mode} mode`);
  }
}