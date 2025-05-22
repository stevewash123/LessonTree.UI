// src/app/lessontree/info-panel/lesson-info-panel/lesson-info-panel.component.ts (partial)
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { LessonAttachmentsComponent } from './lesson-attachments/lesson-attachments.component';
import { LessonNotesComponent } from './lesson-notes/lesson-notes.component';
import { LessonDetail } from '../../../models/lesson';
import { Note } from '../../../models/note';
import { Attachment } from '../../../models/attachment';
import { UserService } from '../../../core/services/user.service';
import { Standard } from '../../../models/standard';
import { LessonStandardsComponent } from './lesson-standard/lesson-standards.component';
import { PanelMode } from '../../../core/services/panel-state.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'lesson-info-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    LessonAttachmentsComponent,
    LessonNotesComponent,
    LessonStandardsComponent
  ],
  templateUrl: './lesson-info-panel.component.html',
  styleUrls: ['./lesson-info-panel.component.css']
})
export class LessonInfoPanelComponent implements OnChanges, OnInit {
  private _lessonDetail: LessonDetail | null = null;
  activeTab: string = 'main'; // Default tab

  @Input()
  set lessonDetail(value: LessonDetail) {
    this._lessonDetail = value;
    console.log(`[LessonInfoPanel] LessonDetail set: ${this._lessonDetail?.title || 'New Lesson'}, timestamp: ${new Date().toISOString()}`);
  }
  get lessonDetail(): LessonDetail {
    return this._lessonDetail!;
  }

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId(); 
  }

  @Input() mode: PanelMode = 'view';
  @Output() modeChange = new EventEmitter<boolean>();
  
  // Remove backward compatibility outputs
  // @Output() lessonAdded = new EventEmitter<LessonDetail>();
  // @Output() lessonEdited = new EventEmitter<LessonDetail>();

  isEditing: boolean = false;
  isStandardsEditing: boolean = false;
  originalLessonDetail: LessonDetail | null = null;

  constructor(
    private userService: UserService,
    private courseDataService: CourseDataService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonDetail'] || changes['mode']) {
      this.updateEditingState();
    }
  }

  private updateEditingState() {
    this.isEditing = this.mode === 'edit' || this.mode === 'add';
    if (this.mode === 'edit' && this.lessonDetail && !this.originalLessonDetail) {
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
    } else if (this.mode === 'add' && this.lessonDetail) {
      this.lessonDetail.archived = false; // Ensure archived is false in add mode
      if (!this.hasDistrictId) {
        this.lessonDetail.visibility = 'Private'; // Default to private if no district
      }
      this.originalLessonDetail = null;
    }
    console.log(`[LessonInfoPanel] Updated editing state, isEditing: ${this.isEditing}, mode: ${this.mode}, timestamp: ${new Date().toISOString()}`);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    console.log(`[LessonInfoPanel] Switched to tab: ${tab}, timestamp: ${new Date().toISOString()}`);
  }

  enterEditMode() {
    if (this.lessonDetail) {
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
      this.isEditing = true;
      this.modeChange.emit(true);
      console.log(`[LessonInfoPanel] Entered edit mode for ${this.lessonDetail.title}, timestamp: ${new Date().toISOString()}`);
    }
  }

  save() {
    if (!this.lessonDetail) return;

    if (this.mode === 'add') {
      this.courseDataService.createLesson(this.lessonDetail).subscribe({
        next: (createdLesson) => {
          // The full lesson details are retrieved in the service
          this.isEditing = false;
          this.modeChange.emit(false);
          console.log(`[LessonInfoPanel] Lesson created`, { 
            title: createdLesson.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Lesson "${createdLesson.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[LessonInfoPanel] Error creating lesson`, { error, timestamp: new Date().toISOString() });
          this.toastr.error('Failed to create lesson: ' + error.message, 'Error');
        }
      });
    } else {
      this.courseDataService.updateLesson(this.lessonDetail).subscribe({
        next: (updatedLesson) => {
          this.isEditing = false;
          this.modeChange.emit(false);
          this.originalLessonDetail = null;
          console.log(`[LessonInfoPanel] Lesson updated`, { 
            title: updatedLesson.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Lesson "${updatedLesson.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[LessonInfoPanel] Error updating lesson`, { error, timestamp: new Date().toISOString() });
          this.toastr.error('Failed to update lesson: ' + error.message, 'Error');
        }
      });
    }
  }

  cancel() {
    if (this.lessonDetail && this.originalLessonDetail && this.mode === 'edit') {
      Object.assign(this.lessonDetail, this.originalLessonDetail);
    }
    this.isEditing = false;
    this.modeChange.emit(false);
    this.originalLessonDetail = null;
    console.log(`[LessonInfoPanel] Cancelled ${this.mode} mode, timestamp: ${new Date().toISOString()}`);
  }

  onNotesChanged(updatedNotes: Note[]) {
    if (this.lessonDetail) {
      this.lessonDetail.notes = updatedNotes;
      console.log(`[LessonInfoPanel] Notes updated, count: ${updatedNotes.length}, timestamp: ${new Date().toISOString()}`);
    }
  }

  onAttachmentsChanged(updatedAttachments: Attachment[]) {
    if (this.lessonDetail) {
      this.lessonDetail.attachments = updatedAttachments;
      console.log(`[LessonInfoPanel] Attachments updated`, {
        count: updatedAttachments.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  onStandardsEditingChange(isEditing: boolean) {
    this.isStandardsEditing = isEditing;
    console.log(`[LessonInfoPanel] Standards editing state changed: ${isEditing}`, {
      timestamp: new Date().toISOString()
    });
  }

  onStandardsChanged(updatedStandards: Standard[]) {
    if (this.lessonDetail) {
      this.lessonDetail.standards = updatedStandards;
      console.log(`[LessonInfoPanel] Standards updated, count: ${updatedStandards.length}`, {
        timestamp: new Date().toISOString()
      });
    }
  }
}