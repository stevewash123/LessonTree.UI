// **COMPLETE FILE** - SplitPanelDragService with Dual Signal/Observable Pattern
// RESPONSIBILITY: Manages split-panel drag and drop operations with proper event handling
// DOES NOT: Handle view mode changes or panel rendering logic
// CALLED BY: SplitPanelHeaderComponent for drag/drop interactions

import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SplitPanelType } from './layout-mode.service';

// ✅ Observable event interfaces
export interface DragOperationStartedEvent {
  draggedPanel: SplitPanelType;
  timestamp: Date;
}

export interface DragOverEvent {
  draggedPanel: SplitPanelType;
  targetPanel: SplitPanelType;
  timestamp: Date;
}

export interface DropCompletedEvent {
  draggedPanel: SplitPanelType;
  targetPanel: SplitPanelType;
  success: boolean;
  timestamp: Date;
}

export interface DragCancelledEvent {
  draggedPanel: SplitPanelType | null;
  reason: 'user-cancelled' | 'invalid-drop' | 'drag-end';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SplitPanelDragService {

  // ✅ Observable events for cross-component coordination
  private readonly _dragOperationStarted$ = new Subject<DragOperationStartedEvent>();
  private readonly _dragOver$ = new Subject<DragOverEvent>();
  private readonly _dropCompleted$ = new Subject<DropCompletedEvent>();
  private readonly _dragCancelled$ = new Subject<DragCancelledEvent>();

  // Public observables for business logic subscriptions
  readonly dragOperationStarted$ = this._dragOperationStarted$.asObservable();
  readonly dragOver$ = this._dragOver$.asObservable();
  readonly dropCompleted$ = this._dropCompleted$.asObservable();
  readonly dragCancelled$ = this._dragCancelled$.asObservable();

  // ✅ Signal state for reactive UI (visual feedback)
  private readonly _isDragging = signal<boolean>(false);
  private readonly _draggedPanel = signal<SplitPanelType | null>(null);
  private readonly _dragOverPanel = signal<SplitPanelType | null>(null);

  readonly isDragging = this._isDragging.asReadonly();
  readonly draggedPanel = this._draggedPanel.asReadonly();
  readonly dragOverPanel = this._dragOverPanel.asReadonly();

  // Debounce timer for drag leave events
  private dragLeaveTimer: number | null = null;
  private readonly DRAG_LEAVE_DELAY = 50; // Short delay to prevent flickering

  constructor() {
    console.log('[SplitPanelDragService] Initialized with dual Signal/Observable pattern', {
      timestamp: new Date().toISOString()
    });
  }

  // ✅ ENHANCED: Start drag with Observable event emission
  startDrag(splitPanelType: SplitPanelType, event: DragEvent): void {
    console.log(`🚀 [SplitPanelDragService] START DRAG: ${splitPanelType}`, {
      timestamp: new Date().toISOString()
    });

    // Clear any pending drag leave timer
    this.clearDragLeaveTimer();

    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', splitPanelType);
      event.dataTransfer.effectAllowed = 'move';
    }

    // ✅ Update signal state for reactive UI
    this._isDragging.set(true);
    this._draggedPanel.set(splitPanelType);
    this._dragOverPanel.set(null);

    // ✅ Emit Observable event for business logic
    this._dragOperationStarted$.next({
      draggedPanel: splitPanelType,
      timestamp: new Date()
    });
  }

  // ✅ ENHANCED: Drag over with Observable event emission
  dragOver(splitPanelType: SplitPanelType, event: DragEvent): void {
    // Only process if we're actually dragging and it's a different panel
    if (!this._isDragging() || this._draggedPanel() === splitPanelType) {
      return;
    }

    const draggedPanel = this._draggedPanel();

    console.log(`🎯 [SplitPanelDragService] DRAG OVER: ${splitPanelType}`, {
      draggedPanel,
      timestamp: new Date().toISOString()
    });

    // Clear any pending drag leave timer
    this.clearDragLeaveTimer();

    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    // ✅ Update signal state for visual feedback
    this._dragOverPanel.set(splitPanelType);

    // ✅ Emit Observable event for business logic
    if (draggedPanel) {
      this._dragOver$.next({
        draggedPanel,
        targetPanel: splitPanelType,
        timestamp: new Date()
      });
    }
  }

  // Drag leave handling (keep as simple signal update for visual feedback)
  dragLeave(splitPanelType: SplitPanelType, event: DragEvent): void {
    // Only process if we're dragging and this is the current drag over panel
    if (!this._isDragging() || this._dragOverPanel() !== splitPanelType) {
      return;
    }

    console.log(`📤 [SplitPanelDragService] DRAG LEAVE: ${splitPanelType}`, {
      relatedTarget: event.relatedTarget?.constructor?.name,
      timestamp: new Date().toISOString()
    });

    // Clear any existing timer
    this.clearDragLeaveTimer();

    // Use debounced drag leave to prevent flickering when moving between child elements
    this.dragLeaveTimer = window.setTimeout(() => {
      // Double-check we're still in the right state
      if (this._isDragging() && this._dragOverPanel() === splitPanelType) {
        console.log(`⏰ [SplitPanelDragService] DELAYED DRAG LEAVE EXECUTED: ${splitPanelType}`, {
          timestamp: new Date().toISOString()
        });
        // ✅ Update signal state for visual feedback only
        this._dragOverPanel.set(null);
      }
      this.dragLeaveTimer = null;
    }, this.DRAG_LEAVE_DELAY);
  }

  // ✅ ENHANCED: Drop handling with Observable event emission
  drop(splitPanelType: SplitPanelType, event: DragEvent): boolean {
    console.log(`🎯 [SplitPanelDragService] DROP: ${splitPanelType}`, {
      isDragging: this._isDragging(),
      draggedPanel: this._draggedPanel(),
      dragOverPanel: this._dragOverPanel(),
      timestamp: new Date().toISOString()
    });

    // Clear any pending drag leave timer
    this.clearDragLeaveTimer();

    if (!this._isDragging()) {
      console.log(`❌ [SplitPanelDragService] DROP REJECTED - not dragging`, {
        timestamp: new Date().toISOString()
      });

      // ✅ Emit cancelled event
      this._dragCancelled$.next({
        draggedPanel: this._draggedPanel(),
        reason: 'invalid-drop',
        timestamp: new Date()
      });

      return false;
    }

    const draggedPanel = this._draggedPanel();
    if (!draggedPanel || draggedPanel === splitPanelType) {
      console.log(`❌ [SplitPanelDragService] DROP REJECTED - same panel or no dragged panel`, {
        draggedPanel,
        dropTarget: splitPanelType,
        timestamp: new Date().toISOString()
      });

      // ✅ Emit cancelled event
      this._dragCancelled$.next({
        draggedPanel,
        reason: 'invalid-drop',
        timestamp: new Date()
      });

      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    console.log(`✅ [SplitPanelDragService] DROP ACCEPTED - swapping panels`, {
      from: draggedPanel,
      to: splitPanelType,
      timestamp: new Date().toISOString()
    });

    // ✅ Emit success event before resetting state
    this._dropCompleted$.next({
      draggedPanel,
      targetPanel: splitPanelType,
      success: true,
      timestamp: new Date()
    });

    // Reset drag state
    this.resetDragState();

    return true;
  }

  // ✅ ENHANCED: End drag with Observable event emission
  endDrag(): void {
    const draggedPanel = this._draggedPanel();

    console.log(`🏁 [SplitPanelDragService] END DRAG`, {
      isDragging: this._isDragging(),
      draggedPanel,
      timestamp: new Date().toISOString()
    });

    // Clear any pending drag leave timer
    this.clearDragLeaveTimer();

    // ✅ Emit cancelled event if drag was in progress
    if (this._isDragging() && draggedPanel) {
      this._dragCancelled$.next({
        draggedPanel,
        reason: 'drag-end',
        timestamp: new Date()
      });
    }

    // Reset drag state
    this.resetDragState();
  }

  // ✅ Private helper: Reset drag state (signals only)
  private resetDragState(): void {
    this._isDragging.set(false);
    this._draggedPanel.set(null);
    this._dragOverPanel.set(null);
  }

  private clearDragLeaveTimer(): void {
    if (this.dragLeaveTimer) {
      clearTimeout(this.dragLeaveTimer);
      this.dragLeaveTimer = null;
    }
  }

  // === CLEANUP ===
  ngOnDestroy(): void {
    this.clearDragLeaveTimer();
    this._dragOperationStarted$.complete();
    this._dragOver$.complete();
    this._dropCompleted$.complete();
    this._dragCancelled$.complete();
    console.log('[SplitPanelDragService] All Observable subjects completed');
  }
}
