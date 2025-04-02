import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, Observable } from 'rxjs';
import { LessonDetail } from '../../../../models/lesson';
import { Standard } from '../../../../models/standard';
import { ApiService } from '../../../../core/services/api.service';

type StandardMode = 'viewStandards' | 'editStandards';

@Component({
  selector: 'lesson-standards',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './lesson-standards.component.html',
  styleUrls: ['./lesson-standards.component.css']
})
export class LessonStandardsComponent implements OnInit, OnChanges {
  @Input() lessonDetail!: LessonDetail;
  @Input() isEditing: boolean = false;
  @Output() standardsChanged = new EventEmitter<Standard[]>();
  @Output() isStandardsEditingChange = new EventEmitter<boolean>();

  standardMode: StandardMode = 'viewStandards';
  isStandardsEditing: boolean = false;
  allStandards: Standard[] = [];
  selectedStandards: Set<number> = new Set();
  standardTopicIds: Map<number, number | undefined> = new Map(); // Precomputed topic IDs

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStandards();
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lessonDetail'] || changes['isEditing']) {
      this.updateEditingState();
      if (changes['lessonDetail'] && this.lessonDetail) {
        this.loadStandards();
      }
    }
  }

  private loadStandards(): void {
    if (!this.lessonDetail.courseId) return;

    this.apiService.getStandardsByCourse(this.lessonDetail.courseId).subscribe({
      next: (standards) => {
        this.allStandards = standards;
        this.selectedStandards = new Set(this.lessonDetail.standards.map(s => s.id));
        this.standardTopicIds = new Map(standards.map(s => [s.id, s.topicId]));
        console.log(`[LessonStandards] Loaded ${standards.length} standards for course ${this.lessonDetail.courseId}`, {
          timestamp: new Date().toISOString()
        });
      },
      error: (error) => console.error(`[LessonStandards] Error loading standards`, { error, timestamp: new Date().toISOString() })
    });
  }

  private updateEditingState(): void {
    this.isStandardsEditing = this.standardMode === 'editStandards';
    this.isStandardsEditingChange.emit(this.isStandardsEditing);
    console.log(`[LessonStandards] Updated editing state, isStandardsEditing: ${this.isStandardsEditing}, mode: ${this.standardMode}`, {
      timestamp: new Date().toISOString()
    });
  }

  enterEditStandardsMode(): void {
    this.standardMode = 'editStandards';
    this.updateEditingState();
    console.log(`[LessonStandards] Entered edit standards mode`, { timestamp: new Date().toISOString() });
  }

  saveStandards(): void {
    const updatedStandards = this.allStandards.filter(s => this.selectedStandards.has(s.id));
    const requests: Observable<any>[] = [];

    const currentStandardIds = new Set(this.lessonDetail.standards.map(s => s.id));
    updatedStandards.forEach(standard => {
      if (!currentStandardIds.has(standard.id)) {
        requests.push(this.apiService.post(`lesson/${this.lessonDetail.id}/standards`, { standardId: standard.id }));
      }
    });

    this.lessonDetail.standards.forEach(standard => {
      if (!this.selectedStandards.has(standard.id)) {
        requests.push(this.apiService.delete(`lesson/${this.lessonDetail.id}/standards/${standard.id}`));
      }
    });

    if (requests.length > 0) {
      forkJoin(requests).subscribe({
        next: () => {
          this.lessonDetail.standards = updatedStandards;
          this.standardsChanged.emit(this.lessonDetail.standards);
          this.exitEditMode();
          console.log(`[LessonStandards] Standards saved, count: ${updatedStandards.length}`, { timestamp: new Date().toISOString() });
        },
        error: (error) => console.error(`[LessonStandards] Error saving standards`, { error, timestamp: new Date().toISOString() })
      });
    } else {
      this.exitEditMode();
    }
  }

  cancelStandards(): void {
    this.selectedStandards = new Set(this.lessonDetail.standards.map(s => s.id));
    this.exitEditMode();
    console.log(`[LessonStandards] Cancelled standards edit`, { timestamp: new Date().toISOString() });
  }

  private exitEditMode(): void {
    this.standardMode = 'viewStandards';
    this.updateEditingState();
  }

  toggleStandard(standardId: number): void {
    if (this.selectedStandards.has(standardId)) {
      this.selectedStandards.delete(standardId);
    } else {
      this.selectedStandards.add(standardId);
    }
    console.log(`[LessonStandards] Toggled standard ${standardId}, selected count: ${this.selectedStandards.size}`, {
      timestamp: new Date().toISOString()
    });
  }
}