import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../../../models/topic';
import { ApiService } from '../../../core/services/api.service';

type PanelMode = 'view' | 'edit' | 'add';

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
    @Output() nodeAdded = new EventEmitter<Topic>();

    isEditing: boolean = false;
    originalData: Topic | null = null;


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
      console.log(`[TopicPanel] Stored original data for editing: ${this.originalData.title}`);
    } else if (this.mode === 'add') {
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
      this.apiService.createTopic(this.data).subscribe({
        next: (createdTopic) => {
          this.data = createdTopic;
          this.isEditing = false;
          this.modeChange.emit(false);
          this.nodeAdded.emit(createdTopic); // Emit the new topic
          console.log(`[TopicPanel] Topic created`, { title: createdTopic.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[TopicPanel] Error creating topic`, { error, timestamp: new Date().toISOString() })
      });
    } else {
      this.apiService.updateTopic(this.data).subscribe({
        next: (updatedTopic) => {
          this.data = updatedTopic;
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[TopicPanel] Topic updated`, { title: updatedTopic.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[TopicPanel] Error updating topic`, { error, timestamp: new Date().toISOString() })
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