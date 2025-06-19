// src/app/lessontree/info-panel/lesson-info-panel/lesson-info-panel.component.ts - COMPLETE FILE (Signals Optimized)
import { Component, Input, OnChanges, SimpleChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { LessonAttachmentsComponent } from './lesson-attachments/lesson-attachments.component';
import { LessonNotesComponent } from './lesson-notes/lesson-notes.component';
import { LessonDetail } from '../../models/lesson';
import { Note } from '../../models/note';
import { Attachment } from '../../models/attachment';
import { UserService } from '../../user-config/user.service';
import { Standard } from '../../models/standard';
import { LessonStandardsComponent } from './lesson-standard/lesson-standards.component';
import { PanelStateService } from '../panel-state.service';
import { ToastrService } from 'ngx-toastr';
import { CourseCrudService } from '../../lesson-tree/services/course-crud.service';

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
  set lessonDetail(value: LessonDetail | null) {
    this._lessonDetail = value;
    console.log(`[LessonInfoPanel] LessonDetail set`, { 
      title: this._lessonDetail?.title ?? 'New Lesson', 
      timestamp: new Date().toISOString() 
    });
  }
  get lessonDetail(): LessonDetail | null {
    return this._lessonDetail;
  }

  originalLessonDetail: LessonDetail | null = null;
  isStandardsEditing: boolean = false;

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId(); 
  }

  // Access mode from centralized service
  get mode() {
    return this.panelStateService.panelMode();
  }
  
  get isEditing(): boolean {
    return this.mode === 'edit' || this.mode === 'add';
  }

  constructor(
    private userService: UserService,
    private panelStateService: PanelStateService,
    private courseCrudService: CourseCrudService,
    private toastr: ToastrService
  ) {
    console.log('[LessonInfoPanel] Component initialized with signals optimization', { 
      timestamp: new Date().toISOString() 
    });

    // React to mode changes
    effect(() => {
      const currentMode = this.panelStateService.panelMode();
      console.log(`[LessonInfoPanel] Mode changed to: ${currentMode}`, { 
        timestamp: new Date().toISOString() 
      });
      this.updateEditingState();
    });

    // React to template changes in add mode
    effect(() => {
      const template = this.panelStateService.nodeTemplate();
      const mode = this.panelStateService.panelMode();
      
      if (mode === 'add' && template && template.nodeType === 'Lesson') {
        this._lessonDetail = template as LessonDetail;
        console.log(`[LessonInfoPanel] Using template for new lesson`, { 
          timestamp: new Date().toISOString() 
        });
      }
    });
  }

  ngOnInit(): void {
    this.updateEditingState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonDetail']) {
      this.updateEditingState();
    }
  }

  private updateEditingState() {
    if (this.mode === 'edit' && this.lessonDetail && !this.originalLessonDetail) {
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
      console.log(`[LessonInfoPanel] Stored original data for editing: ${this.originalLessonDetail!.title}`);
    } else if (this.mode === 'add' && this.lessonDetail) {
      this.lessonDetail.archived = false;
      if (!this.hasDistrictId) {
        this.lessonDetail.visibility = 'Private';
      }
      this.originalLessonDetail = null;
      console.log('[LessonInfoPanel] In add mode, cleared original data');
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    console.log(`[LessonInfoPanel] Switched to tab: ${tab}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  enterEditMode() {
    if (this.lessonDetail) {
      this.originalLessonDetail = JSON.parse(JSON.stringify(this.lessonDetail));
      this.panelStateService.setMode('edit');
      console.log(`[LessonInfoPanel] Entered edit mode for ${this.lessonDetail.title}`);
    }
  }

  save() {
    if (!this.lessonDetail) return;

    if (this.mode === 'add') {
      this.courseCrudService.createLesson(this.lessonDetail).subscribe({
        next: (createdLesson) => {
          this.lessonDetail = createdLesson;
          this.panelStateService.setMode('view');
          console.log(`[LessonInfoPanel] Lesson created`, { 
            title: createdLesson.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Lesson "${createdLesson.title}" created successfully`);
        },
        error: (error) => {
          console.error(`[LessonInfoPanel] Error creating lesson`, { 
            error, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to create lesson: ' + error.message, 'Error');
        }
      });
    } else {
      this.courseCrudService.updateLesson(this.lessonDetail).subscribe({
        next: (updatedLesson) => {
          this.panelStateService.setMode('view');
          this.originalLessonDetail = null;
          console.log(`[LessonInfoPanel] Lesson updated`, { 
            title: updatedLesson.title, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success(`Lesson "${updatedLesson.title}" updated successfully`);
        },
        error: (error) => {
          console.error(`[LessonInfoPanel] Error updating lesson`, { 
            error, 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to update lesson: ' + error.message, 'Error');
        }
      });
    }
  }

  cancel() {
    if (this.lessonDetail && this.originalLessonDetail && this.mode === 'edit') {
      Object.assign(this.lessonDetail, this.originalLessonDetail);
      console.log(`[LessonInfoPanel] Reverted changes to ${this.lessonDetail.title}`);
    }
    this.panelStateService.setMode('view');
    this.originalLessonDetail = null;
    console.log(`[LessonInfoPanel] Cancelled ${this.mode} mode`);
  }

  onNotesChanged(updatedNotes: Note[]) {
    if (this.lessonDetail) {
      this.lessonDetail.notes = updatedNotes;
      console.log(`[LessonInfoPanel] Notes updated`, {
        count: updatedNotes.length,
        timestamp: new Date().toISOString()
      });
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
      console.log(`[LessonInfoPanel] Standards updated`, {
        count: updatedStandards.length,
        timestamp: new Date().toISOString()
      });
    }
  }
}