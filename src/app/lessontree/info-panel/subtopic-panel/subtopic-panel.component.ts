import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTopic } from '../../../models/subTopic';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

type PanelMode = 'view' | 'edit' | 'add';

@Component({
  selector: 'subtopic-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtopic-panel.component.html',
  styleUrls: ['./subtopic-panel.component.css']
})
export class SubtopicPanelComponent implements OnChanges, OnInit {
  private _data: SubTopic | null = null;
  private instanceId = Math.random().toString(36).substring(2, 8); // Unique ID for this instance

  @Input()
  set data(value: SubTopic | null) {
    this._data = value;
    this.textData = JSON.stringify(this._data ?? {});
    console.log(`[SubtopicPanel:${this.instanceId}] Data set`, { title: this._data?.title ?? 'New SubTopic', mode: this.mode, timestamp: new Date().toISOString() });
  }
  get data(): SubTopic | null {
    console.log(`[SubtopicPanel:${this.instanceId}] Data get`, { title: this._data?.title, timestamp: new Date().toISOString() });
    return this._data;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  @Output() subTopicAdded = new EventEmitter<SubTopic>();
  @Output() subTopicEdited = new EventEmitter<SubTopic>();

  textData: string = '';
  isEditing: boolean = false;
  originalData: SubTopic | null = null;

  constructor(
    private apiService: ApiService,
    private userService: UserService
  ) {}

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

  ngOnInit(): void {
    console.log(`[SubtopicPanel:${this.instanceId}] ngOnInit`, 
      { mode: this.mode, isEditing: this.isEditing, data: this._data, timestamp: new Date().toISOString() });
    if (this._data) {
      this.textData = JSON.stringify(this._data);
    }
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['mode']) {
      this.updateEditingState();
    }
  }

  private updateEditingState() {
    this.isEditing = this.mode === 'edit' || this.mode === 'add';
    console.log(`[SubtopicPanel:${this.instanceId}] updateEditingState`, { mode: this.mode, isEditing: this.isEditing, timestamp: new Date().toISOString() });
    if (this.mode === 'edit' && this.data && !this.originalData) {
      this.originalData = { ...this.data };
    } else if (this.mode === 'add' && this.data) {
      this.data.archived = false; // Ensure archived is false in add mode
      if (!this.hasDistrictId) {
        this.data.visibility = 'Private'; // Default to private if no district
      }
      this.originalData = null;
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = { ...this.data };
      this.isEditing = true;
      this.modeChange.emit(true);
      console.log(`[SubtopicPanel:${this.instanceId}] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.apiService.createSubTopic(this.data).subscribe({
        next: (createdSubTopic) => {
          this.data = createdSubTopic;
          this.isEditing = false;
          console.log(`[SubtopicPanel:${this.instanceId}] Emitting subTopicAdded`, { 
            title: createdSubTopic.title, 
            nodeId: createdSubTopic.nodeId, 
            timestamp: new Date().toISOString() 
          });
          this.subTopicAdded.emit(createdSubTopic);
          this.modeChange.emit(false);
          console.log(`[SubtopicPanel:${this.instanceId}] SubTopic created`, { 
            title: createdSubTopic.title, 
            nodeId: createdSubTopic.nodeId, 
            timestamp: new Date().toISOString() 
          });
        },
        error: (error) => console.error(`[SubtopicPanel:${this.instanceId}] Error creating subtopic`, { error, timestamp: new Date().toISOString() })
      });
    } else {
      this.apiService.updateSubTopic(this.data).subscribe({
        next: () => {
          this.isEditing = false;
          if (this.originalData && this.originalData.title !== this.data!.title) {
            console.log(`[SubtopicPanel:${this.instanceId}] Emitting subTopicEdited due to title change`, { 
              oldTitle: this.originalData.title, 
              newTitle: this.data!.title, 
              timestamp: new Date().toISOString() 
            });
            this.subTopicEdited.emit(this.data!);
          }
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[SubtopicPanel:${this.instanceId}] SubTopic updated`, { title: this.data!.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[SubtopicPanel:${this.instanceId}] Error updating subtopic`, { error, timestamp: new Date().toISOString() })
      });
    }
  }

  cancel() {
    if (this.data && this.originalData && this.mode === 'edit') {
      Object.assign(this.data, this.originalData);
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalData = null;
    console.log(`[SubtopicPanel:${this.instanceId}] Cancelled ${this.mode} mode`);
  }
}