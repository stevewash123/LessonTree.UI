import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../../../models/topic';
import { ApiService } from '../../../core/services/api.service';

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
        this.textData = JSON.stringify(this._data); // Update textData whenever data changes
    }    
    get data(): Topic {
        return this._data!;
    }

    @Output() modeChange = new EventEmitter<boolean>();
    textData: string = '';

    isEditing: boolean = false;
    originalData: Topic | null = null;
    
    constructor(private apiService: ApiService) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['data']) {
            this.isEditing = false;
            this.originalData = null;
        }
    }

    ngOnInit(): void {
        // Optional: Ensure textData is set if data is already available
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

  this.apiService.put<Topic>(this.data).subscribe({
        next: (updatedData: Topic) => {
                //this.data = updatedData; // Update local data with server response (optional but safer)
                this.isEditing = false;
                this.modeChange.emit(false);
                this.originalData = null;
                // Optional: Add success feedback if desired, e.g., console.log('Topic saved');
            },
            error: (error) => {
            console.error('Error saving topic:', error);
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