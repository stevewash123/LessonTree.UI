import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTopic } from '../../../models/subTopic';
import { ApiService } from '../../../core/services/api.service';

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
    this.textData = JSON.stringify(this._data); // Update textData whenever data changes
  }
  get data(): SubTopic {
    return this._data!;
  }

  @Output() modeChange = new EventEmitter<boolean>();
  textData: string = '';

  isEditing: boolean = false;
  originalData: SubTopic | null = null;

  constructor(private apiService: ApiService) {}
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.isEditing = false;
      this.originalData = null;
    }
  }

  ngOnInit(): void {
    if (this._data) {
      this.textData = JSON.stringify(this._data);
    }
  }

  enterEditMode() {
    if (this.data) {
      this.originalData = { ...this.data };
      this.isEditing = true;
      this.modeChange.emit(true);
    }
  }

  save() {
    if (!this.data) return; // Safety check, though unlikely to be null here
  
    this.apiService.put<SubTopic>(this.data).subscribe({
      next: (updatedData: SubTopic) => {
        //this.data = updatedData; // Update local data with server response (optional but safer)
        this.isEditing = false;
        this.modeChange.emit(false);
        this.originalData = null;
        // Optional: Add success feedback if desired, e.g., console.log('Subtopic saved');
      },
      error: (error) => {
        console.error('Error saving subtopic:', error);
        // Keep isEditing true to allow retry; ApiService already shows toastr error
      }
    });
  }

  cancel() {
    if (this.data && this.originalData) {
      Object.assign(this.data, this.originalData);
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalData = null;
  }
}