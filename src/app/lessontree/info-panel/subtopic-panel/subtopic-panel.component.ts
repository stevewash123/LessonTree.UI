import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTopic } from '../../../models/subTopic';
import { ApiService } from '../../../core/services/api.service';

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

  @Input()
  set data(value: SubTopic) {
    this._data = value;
    this.textData = JSON.stringify(this._data);
    console.log(`[SubtopicPanel] Data set: ${this._data.title || 'New SubTopic'}`);
  }
  get data(): SubTopic {
    return this._data!;
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  @Output() subTopicAdded = new EventEmitter<SubTopic>();

  textData: string = '';
  isEditing: boolean = false;
  originalData: SubTopic | null = null;

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
      console.log(`[SubtopicPanel] Entered edit mode for ${this.data.title}`);
    }
  }

  save() {
    if (!this.data) return;

    if (this.mode === 'add') {
      this.apiService.post<SubTopic>('subtopic', this.data).subscribe({
        next: (createdSubTopic) => {
          Object.assign(this.data, createdSubTopic);
          this.isEditing = false;
          this.modeChange.emit(false);
          this.subTopicAdded.emit(createdSubTopic);
          console.log(`[SubtopicPanel] SubTopic created: ${createdSubTopic.title}`);
        },
        error: (error) => console.error(`[SubtopicPanel] Error creating subtopic: ${error}`)
      });
    } else {
      this.apiService.put<SubTopic>(`subtopic/${this.data.id}`, this.data).subscribe({
        next: (updatedSubTopic) => {
          Object.assign(this.data, updatedSubTopic);
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[SubtopicPanel] SubTopic updated: ${updatedSubTopic.title}`);
        },
        error: (error) => console.error(`[SubtopicPanel] Error updating subtopic: ${error}`)
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
    console.log(`[SubtopicPanel] Cancelled ${this.mode} mode`);
  }
}