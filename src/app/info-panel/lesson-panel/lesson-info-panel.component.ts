// **COMPLETE FILE** - LessonInfoPanel simplified with Observable events (no 'saving' mode)
// RESPONSIBILITY: Lesson editing UI with Observable event subscriptions
// DOES NOT: Handle complex state modes - keeps existing simple approach
// CALLED BY: InfoPanel component for lesson-specific operations

import { Component, Input, OnChanges, SimpleChanges, OnInit, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

import { LessonAttachmentsComponent } from './lesson-attachments/lesson-attachments.component';
import { LessonNotesComponent } from './lesson-notes/lesson-notes.component';
import { LessonStandardsComponent } from './lesson-standard/lesson-standards.component';
import { LessonDetail } from '../../models/lesson';
import { Note } from '../../models/note';
import { Attachment } from '../../models/attachment';
import { Standard } from '../../models/standard';
import { UserService } from '../../user-config/user.service';
import { PanelStateService } from '../panel-state.service';
import { ToastrService } from 'ngx-toastr';
import { CourseCrudService, LessonSaveCompletedEvent, LessonSaveErrorEvent } from '../../lesson-tree/services/course-operations/course-crud.service';

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
export class LessonInfoPanelComponent implements OnChanges, OnInit, OnDestroy {
  private _lessonDetail: LessonDetail | null = null;
  private subscriptions: Subscription[] = [];

  activeTab: string = 'main';
  originalLessonDetail: LessonDetail | null = null;
  isStandardsEditing: boolean = false;

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

  get hasDistrictId(): boolean {
    return !!this.userService.getDistrictId();
  }

  get mode() {
    return this.panelStateService.panelMode();
  }

  get isEditing(): boolean {
    const currentMode = this.mode;
    return currentMode === 'edit' || currentMode === 'add';
  }

  constructor(
    private userService: UserService,
    private panelStateService: PanelStateService,
    private courseCrudService: CourseCrudService,
    private toastr: ToastrService
  ) {
    console.log('[LessonInfoPanel] Component initialized with Observable event subscriptions');

    // ✅ SIGNAL EFFECTS - Reactive state monitoring (KEEP - these are correct)
    effect(() => {
      const currentMode = this.panelStateService.panelMode();
      console.log(`[LessonInfoPanel] Mode changed to: ${currentMode}`, {
        timestamp: new Date().toISOString()
      });
      this.updateEditingState();
    });

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

    // ✅ OBSERVABLE SUBSCRIPTIONS - One-time event processing
    this.setupEventSubscriptions();
  }

  ngOnInit(): void {
    this.updateEditingState();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    console.log('[LessonInfoPanel] Subscriptions cleaned up');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonDetail']) {
      this.updateEditingState();
    }
  }

  /**
   * ✅ Observable subscriptions for one-time event processing
   */
  private setupEventSubscriptions(): void {
    console.log('[LessonInfoPanel] Setting up Observable event subscriptions');

    // Subscribe to lesson save completion events
    const saveCompletedSub = this.courseCrudService.lessonSaveCompleted$.subscribe(saveEvent => {
      console.log('[LessonInfoPanel] RECEIVED lesson save completion EVENT (Observable)', {
        operation: saveEvent.operation,
        lessonId: saveEvent.lesson.id,
        lessonTitle: saveEvent.lesson.title,
        timestamp: saveEvent.timestamp.toISOString(),
        pattern: 'Observable - one-time event processing'
      });

      this.handleSaveCompletion(saveEvent);
    });

    // Subscribe to lesson save error events
    const saveErrorSub = this.courseCrudService.lessonSaveError$.subscribe(errorEvent => {
      console.log('[LessonInfoPanel] RECEIVED lesson save error EVENT (Observable)', {
        operation: errorEvent.operation,
        error: errorEvent.error.message,
        timestamp: errorEvent.timestamp.toISOString(),
        pattern: 'Observable - one-time event processing'
      });

      this.handleSaveError(errorEvent);
    });

    this.subscriptions.push(saveCompletedSub, saveErrorSub);
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

  /**
   * ✅ SIMPLIFIED: Use Observable events without 'saving' mode
   */
  save() {
    if (!this.lessonDetail) return;

    console.log('[LessonInfoPanel] Starting save operation with Observable events', {
      operation: this.mode,
      lessonTitle: this.lessonDetail.title,
      pattern: 'Observable events only'
    });

    // ✅ USE OBSERVABLE EVENTS - No complex state transitions
    if (this.mode === 'add') {
      this.courseCrudService.createLessonWithEvents(this.lessonDetail);
    } else {
      this.courseCrudService.updateLessonWithEvents(this.lessonDetail);
    }
  }

  /**
   * ✅ Handle save completion event (one-time processing)
   */
  private handleSaveCompletion(saveEvent: LessonSaveCompletedEvent): void {
    // Update local lesson data with API response
    this.lessonDetail = saveEvent.lesson;

    // Return to view mode
    this.panelStateService.setMode('view');
    this.originalLessonDetail = null;

    // Show success notification
    this.toastr.success(`Lesson "${saveEvent.lesson.title}" ${saveEvent.operation}d successfully`);

    console.log('[LessonInfoPanel] Save completion processed', {
      operation: saveEvent.operation,
      lessonTitle: saveEvent.lesson.title,
      pattern: 'Observable - one-time completion processing'
    });
  }

  /**
   * ✅ Handle save error event (one-time processing)
   */
  private handleSaveError(errorEvent: LessonSaveErrorEvent): void {
    // Stay in current mode for retry
    // Show error notification
    this.toastr.error(`Failed to ${errorEvent.operation} lesson: ${errorEvent.error.message}`, 'Error');

    console.log('[LessonInfoPanel] Save error processed', {
      operation: errorEvent.operation,
      error: errorEvent.error.message,
      pattern: 'Observable - one-time error processing'
    });
  }

  cancel() {
    if (this.lessonDetail && this.originalLessonDetail && this.mode === 'edit') {
      Object.assign(this.lessonDetail, this.originalLessonDetail);
      console.log(`[LessonInfoPanel] Reverted changes to ${this.lessonDetail.title}`);
    }

    this.panelStateService.setMode('view');
    this.originalLessonDetail = null;

    console.log(`[LessonInfoPanel] Cancelled operation`);
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
