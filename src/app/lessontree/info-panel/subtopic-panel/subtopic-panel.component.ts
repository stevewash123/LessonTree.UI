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
    set data(value: SubTopic | null) {
      this._data = value;
      this.textData = JSON.stringify(this._data ?? {});
      console.log(`[SubtopicPanel] Data set`, { title: this._data?.title ?? 'New SubTopic', timestamp: new Date().toISOString() });
    }
    get data(): SubTopic | null {
      return this._data;
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
      this.apiService.createSubTopic(this.data).subscribe({
        next: (createdSubTopic) => {
          this.data = createdSubTopic;
          this.isEditing = false;
          this.modeChange.emit(false);
          this.subTopicAdded.emit(createdSubTopic);
          console.log(`[SubtopicPanel] SubTopic created`, { title: createdSubTopic.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[SubtopicPanel] Error creating subtopic`, { error, timestamp: new Date().toISOString() })
      });
    } else {
      this.apiService.updateSubTopic(this.data).subscribe({
        next: (updatedSubTopic) => {
          this.data = updatedSubTopic;
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalData = null;
          console.log(`[SubtopicPanel] SubTopic updated`, { title: updatedSubTopic.title, timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[SubtopicPanel] Error updating subtopic`, { error, timestamp: new Date().toISOString() })
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