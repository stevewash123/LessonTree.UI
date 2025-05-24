// src/app/lessontree/info-panel/lesson-info-panel/lesson-attachments/lesson-attachments.component.ts - COMPLETE FILE (Cleanup)
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Attachment } from '../../../../models/attachment';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'lesson-attachments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './lesson-attachments.component.html',
  styleUrls: ['./lesson-attachments.component.css']
})
export class LessonAttachmentsComponent {
  @Input() attachments: Attachment[] = [];
  @Input() isEditing: boolean = false;
  @Input() lessonId: number = 0;
  @Output() attachmentsChanged = new EventEmitter<Attachment[]>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  editingAttachmentId: number | null = null;
  originalAttachment: Attachment | null = null;

  constructor(private apiService: ApiService) {}

  editAttachment(attachment: Attachment) {
    if (!this.isEditing) return;
    this.editingAttachmentId = attachment.id;
    this.originalAttachment = { ...attachment };
    console.log(`[LessonAttachments] Editing attachment`, {
      id: attachment.id,
      fileName: attachment.fileName,
      timestamp: new Date().toISOString()
    });
  }

  saveAttachment(attachment: Attachment) {
    // TODO: Implement attachment update API call
    console.log(`[LessonAttachments] Save attachment not yet implemented`, {
      id: attachment.id,
      fileName: attachment.fileName,
      timestamp: new Date().toISOString()
    });
  }

  cancelAttachmentEdit(attachment: Attachment) {
    if (this.originalAttachment) {
      const index = this.attachments.findIndex(a => a.id === attachment.id);
      if (index !== -1) {
        this.attachments[index] = { ...this.originalAttachment };
        this.attachmentsChanged.emit([...this.attachments]);
      }
    }
    this.editingAttachmentId = null;
    this.originalAttachment = null;
    console.log(`[LessonAttachments] Cancelled attachment edit`, {
      id: attachment.id,
      fileName: attachment.fileName,
      timestamp: new Date().toISOString()
    });
  }

  deleteAttachment(attachment: Attachment) {
    // TODO: Implement attachment delete API call
    console.log(`[LessonAttachments] Delete attachment not yet implemented`, {
      id: attachment.id,
      fileName: attachment.fileName,
      timestamp: new Date().toISOString()
    });
  }

  triggerFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
      console.log(`[LessonAttachments] Triggered file input`, {
        lessonId: this.lessonId,
        timestamp: new Date().toISOString()
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadFile(file);
    }
  }

  uploadFile(file: File) {
    if (!this.lessonId) {
      console.error(`[LessonAttachments] Cannot upload file: lessonId is missing`, {
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    this.apiService.uploadAttachment(this.lessonId, file).subscribe({
      next: (newAttachment) => {
        this.attachments = [...this.attachments, newAttachment];
        this.attachmentsChanged.emit([...this.attachments]);
        console.log(`[LessonAttachments] Uploaded attachment`, {
          fileName: newAttachment.fileName,
          lessonId: this.lessonId,
          timestamp: new Date().toISOString()
        });
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      },
      error: (error) => console.error(`[LessonAttachments] Error uploading attachment`, {
        fileName: file.name,
        lessonId: this.lessonId,
        error,
        timestamp: new Date().toISOString()
      })
    });
  }
}