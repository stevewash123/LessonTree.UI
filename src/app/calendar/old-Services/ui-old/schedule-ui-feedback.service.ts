// **COMPLETE FILE** - ScheduleUIFeedbackService - Pure UI Feedback Coordination
// RESPONSIBILITY: UI feedback coordination for schedule operations only
// DOES NOT: Handle business logic, event emission, or Observable patterns
// CALLED BY: ScheduleWorkflowCoordinationService for user feedback

import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from '../../../shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleUIFeedbackService {

  constructor(
    private snackBar: MatSnackBar,
    private toastr: ToastrService,
    private notificationService: NotificationService
  ) {
    console.log('[ScheduleUIFeedbackService] Pure UI feedback service initialized');
  }

  // === SUCCESS FEEDBACK ===

  showGenerationSuccess(): void {
    this.snackBar.open('Schedule generated successfully', 'Close', { duration: 3000 });
  }

  showSaveSuccess(): void {
    this.snackBar.open('Schedule saved successfully', 'Close', { duration: 3000 });
  }

  showRegenerationSuccess(): void {
    this.snackBar.open('Schedule regenerated successfully', 'Close', { duration: 3000 });
  }

  showLoadSuccess(message?: string): void {
    if (message) {
      this.snackBar.open(message, 'Close', { duration: 3000 });
    }
  }

  showWorkflowSuccess(): void {
    this.notificationService.showSuccess('Configuration workflow completed successfully');
  }

  showLessonIntegrationSuccess(): void {
    this.notificationService.showSuccess('Schedule updated with new lesson');
  }

  // === ERROR FEEDBACK ===

  showGenerationError(message?: string): void {
    this.toastr.error(
      message || 'Schedule generation failed',
      'Generation Error'
    );
  }

  showSaveError(): void {
    this.toastr.error('Failed to save schedule', 'Save Error');
  }

  showRegenerationError(): void {
    this.toastr.error('Failed to regenerate schedule', 'Error');
  }

  showLoadError(): void {
    this.toastr.error('Failed to load schedule', 'Loading Error');
  }

  showWorkflowError(): void {
    this.toastr.error('Configuration workflow failed', 'Error');
  }

  showLessonIntegrationWarning(): void {
    this.toastr.warning(
      'New lesson created but schedule update failed',
      'Schedule Integration Warning'
    );
  }

  // === GENERIC FEEDBACK METHODS ===

  showSuccess(message: string, title?: string): void {
    this.notificationService.showSuccess(message);
  }

  showError(message: string, title?: string): void {
    this.toastr.error(message, title || 'Error');
  }

  showWarning(message: string, title?: string): void {
    this.toastr.warning(message, title || 'Warning');
  }

  showInfo(message: string, title?: string): void {
    this.toastr.info(message, title || 'Info');
  }
}
