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
    console.log(`[TopicPanel] Data set: ${this._data?.title || 'New Topic'}`);
  }
  get data(): Topic | null {
    return this._data;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();

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
      this.apiService.post<Topic>('topic', this.data).subscribe({
        next: (createdTopic) => {
          Object.assign(this.data!, createdTopic); // Added non-null assertion
          this.isEditing = false;
          this.modeChange.emit(false);
          console.log(`[TopicPanel] Topic created: ${createdTopic.title}`);
        },
        error: (error) => console.error(`[TopicPanel] Error creating topic: ${error}`)
      });
    } else {
      this.apiService.put<Topic>(`topic/${this.data.id}`, this.data).subscribe({
        next: (updatedTopic) => {
          Object.assign(this.data!, updatedTopic); // Added non-null assertion
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[TopicPanel] Topic updated: ${updatedTopic.title}`);
        },
        error: (error) => console.error(`[TopicPanel] Error updating topic: ${error}`)
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