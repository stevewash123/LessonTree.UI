import { Component, Input } from '@angular/core';
import { Attachment } from '../../../../models/attachment';
import { ApiService } from '../../../../core/services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lesson-attachment-table',
  templateUrl: './lesson-attachment-table.component.html',
  styleUrls: ['./lesson-attachment-table.component.css'],
  imports: [CommonModule]
})
export class LessonAttachmentTableComponent {
  @Input() attachments: Attachment[] = []; // Array of attachments bound to the table
  @Input() isEditing: boolean = false;     // Toggle for edit mode
  @Input() lessonId!: number;             // Required lesson ID for API calls

  constructor(private apiService: ApiService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.lessonId) {
      const file = input.files[0];
      this.apiService.uploadAttachment(this.lessonId, file).subscribe({
        next: (attachment: Attachment) => {
          this.attachments.push(attachment); // Add the new attachment to the array
          input.value = '';                  // Reset the file input
        },
        error: (error) => {
          console.error('File upload failed:', error);
          // Optionally, display an error message to the user (e.g., via a toast service)
        }
      });
    } else {
      console.warn('No file selected or lessonId is missing.');
    }
  }

  removeAttachment(id: number){}
}