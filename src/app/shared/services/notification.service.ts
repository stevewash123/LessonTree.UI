// notification.service.ts
// RESPONSIBILITY: Centralized notification system using Material Snackbar for success and Toastr for errors
// DOES: Provides consistent, less intrusive notifications across the application
// REPLACES: All green success toasts with Material Snackbar, keeps red error toasts for API failures

import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

export interface NotificationConfig {
  duration?: number;
  action?: string;
  verticalPosition?: 'top' | 'bottom';
  horizontalPosition?: 'start' | 'center' | 'end' | 'left' | 'right';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private snackBar = inject(MatSnackBar);
  private toastr = inject(ToastrService);

  constructor() {
    console.log('[NotificationService] Centralized notification system initialized');
  }

  // ===== SUCCESS NOTIFICATIONS (Material Snackbar) =====

  /**
   * ✅ SUCCESS: Show success notification using Material Snackbar
   * Less intrusive than toasts, appears at bottom of screen
   */
  showSuccess(message: string, config?: NotificationConfig): void {
    const defaultConfig = {
      duration: 3000,
      verticalPosition: 'bottom' as const,
      horizontalPosition: 'center' as const,
      ...config
    };

    console.log('[NotificationService] 🟢 Success:', message);

    this.snackBar.open(message, config?.action || 'Dismiss', {
      duration: defaultConfig.duration,
      verticalPosition: defaultConfig.verticalPosition,
      horizontalPosition: defaultConfig.horizontalPosition,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * ✅ INFO: Show informational notification using Material Snackbar
   * For neutral information that doesn't require error styling
   */
  showInfo(message: string, config?: NotificationConfig): void {
    const defaultConfig = {
      duration: 3000,
      verticalPosition: 'bottom' as const,
      horizontalPosition: 'center' as const,
      ...config
    };

    console.log('[NotificationService] 🔵 Info:', message);

    this.snackBar.open(message, config?.action || 'Dismiss', {
      duration: defaultConfig.duration,
      verticalPosition: defaultConfig.verticalPosition,
      horizontalPosition: defaultConfig.horizontalPosition,
      panelClass: ['info-snackbar']
    });
  }

  // ===== ERROR NOTIFICATIONS (Red Toastr) =====

  /**
   * ❌ ERROR: Show error notification using red Toastr
   * Keeps existing red error toasts for API failures and critical errors
   */
  showError(message: string, title?: string): void {
    console.log('[NotificationService] 🔴 Error:', message);

    // Use existing toastr for errors to maintain visibility and urgency
    this.toastr.error(message, title || 'Error', {
      timeOut: 5000,
      closeButton: true,
      progressBar: true
    });
  }

  /**
   * ❌ API ERROR: Standardized API error handling with proper formatting
   * Extracts meaningful error messages from HTTP responses
   */
  showApiError(error: any, operation?: string): void {
    console.error('[NotificationService] 🔴 API Error:', error);

    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'API Error';

    // Extract meaningful error message from different error formats
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.status) {
      errorMessage = `HTTP ${error.status}: ${error.statusText || 'Unknown error'}`;
    }

    // Add operation context if provided
    if (operation) {
      errorTitle = `${operation} Failed`;
      if (!errorMessage.toLowerCase().includes(operation.toLowerCase())) {
        errorMessage = `Failed to ${operation.toLowerCase()}: ${errorMessage}`;
      }
    }

    this.showError(errorMessage, errorTitle);
  }

  /**
   * ⚠️ WARNING: Show warning notification using orange Toastr
   * For important warnings that need more attention than snackbars
   */
  showWarning(message: string, title?: string): void {
    console.log('[NotificationService] 🟡 Warning:', message);

    this.toastr.warning(message, title || 'Warning', {
      timeOut: 4000,
      closeButton: true,
      progressBar: true
    });
  }

  // ===== RETRY PATTERNS =====

  /**
   * 🔄 RETRY: Show retry confirmation with action button
   * For critical operations that should offer retry capability
   */
  showRetryError(message: string, retryCallback: () => void, operation?: string): void {
    console.log('[NotificationService] 🔄 Retry Error:', message);

    const title = operation ? `${operation} Failed` : 'Operation Failed';

    // Show error with retry option using Material Snackbar
    const snackBarRef = this.snackBar.open(
      `${message} Click to retry.`,
      'Retry',
      {
        duration: 10000, // Longer duration for retry
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
        panelClass: ['error-snackbar-retry']
      }
    );

    // Handle retry action
    snackBarRef.onAction().subscribe(() => {
      console.log('[NotificationService] 🔄 Retry attempted');
      retryCallback();
    });

    // Also show in console for debugging
    console.error(`[NotificationService] Retry available for: ${operation || 'operation'}`);
  }

  /**
   * 🔄 RETRY HELPER: Execute operation with automatic retry logic
   * Provides consistent retry pattern for critical operations
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 2
  ): Promise<T> {
    let attempt = 0;

    const executeWithRetry = async (): Promise<T> => {
      try {
        attempt++;
        console.log(`[NotificationService] 🔄 ${operationName} attempt ${attempt}`);

        const result = await operation();

        if (attempt > 1) {
          this.showSuccess(`${operationName} succeeded after ${attempt} attempts`);
        }

        return result;
      } catch (error) {
        console.error(`[NotificationService] ❌ ${operationName} attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          console.log(`[NotificationService] 🔄 Retrying ${operationName} (${attempt}/${maxRetries})`);
          return executeWithRetry();
        } else {
          this.showApiError(error, operationName);
          throw error;
        }
      }
    };

    return executeWithRetry();
  }

  // ===== UTILITY METHODS =====

  /**
   * Clear all active notifications
   */
  clearAll(): void {
    console.log('[NotificationService] 🧹 Clearing all notifications');
    this.snackBar.dismiss();
    this.toastr.clear();
  }

  /**
   * Show loading notification with indefinite duration
   * Returns reference for manual dismissal
   */
  showLoading(message: string = 'Loading...'): any {
    console.log('[NotificationService] ⏳ Loading:', message);

    return this.snackBar.open(message, '', {
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
      panelClass: ['loading-snackbar']
      // No duration = stays until manually dismissed
    });
  }

  /**
   * Dismiss specific snackbar reference
   */
  dismiss(snackBarRef?: any): void {
    if (snackBarRef) {
      snackBarRef.dismiss();
    } else {
      this.snackBar.dismiss();
    }
  }

  // ===== MIGRATION HELPERS =====

  /**
   * 🔄 MIGRATION: Replace toastr.success calls with this method
   * Provides same interface but uses Material Snackbar
   */
  success(message: string, title?: string): void {
    // Ignore title parameter for snackbars (less cluttered)
    this.showSuccess(message);
  }

  /**
   * 🔄 MIGRATION: Replace toastr.error calls with this method
   * Maintains red toastr for errors
   */
  error(message: string, title?: string): void {
    this.showError(message, title);
  }

  /**
   * 🔄 MIGRATION: Replace toastr.info calls with this method
   * Uses Material Snackbar for less intrusive info
   */
  info(message: string, title?: string): void {
    this.showInfo(message);
  }

  /**
   * 🔄 MIGRATION: Replace toastr.warning calls with this method
   * Maintains toastr for warnings that need attention
   */
  warning(message: string, title?: string): void {
    this.showWarning(message, title);
  }
}