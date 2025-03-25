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
  set data(value: Topic) {
    this._data = value;
    this.textData = JSON.stringify(this._data);
    console.log(`[TopicPanel] Data set: ${this._data.title || 'New Topic'}`);
  }
  get data(): Topic {
    return this._data!;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  textData: string = '';
  isEditing: boolean = false;
  originalData: Topic | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
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
    if (this.mode === 'edit' && this.data && !this.originalData) {
      this.originalData = { ...this.data };
    } else if (this.mode === 'add') {
      this.originalData = null;
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
          Object.assign(this.data, createdTopic);
          this.isEditing = false;
          this.modeChange.emit(false);
          console.log(`[TopicPanel] Topic created: ${createdTopic.title}, ID: ${createdTopic.id}`);
        },
        error: (error) => console.error(`[TopicPanel] Error creating topic: ${error}`)
      });
    } else {
      this.apiService.put<Topic>(this.data).subscribe({
        next: (updatedTopic) => {
          Object.assign(this.data, updatedTopic);
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
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalData = null;
    console.log(`[TopicPanel] Cancelled ${this.mode} mode`);
  }
}