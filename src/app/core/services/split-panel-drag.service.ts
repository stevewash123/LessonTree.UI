// RESPONSIBILITY: Manages split-panel drag and drop operations with proper event handling
// DOES NOT: Handle view mode changes or panel rendering logic
// CALLED BY: SplitPanelHeaderComponent for drag/drop interactions

import { Injectable, signal } from '@angular/core';
import { SplitPanelType } from './layout-mode.service';

@Injectable({
  providedIn: 'root'
})
export class SplitPanelDragService {
  // Drag state signals
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
    console.log('[SplitPanelDragService] Initialized', { timestamp: new Date().toISOString() });
  }

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
    
    this._isDragging.set(true);
    this._draggedPanel.set(splitPanelType);
    this._dragOverPanel.set(null);
  }

  dragOver(splitPanelType: SplitPanelType, event: DragEvent): void {
    // Only process if we're actually dragging and it's a different panel
    if (!this._isDragging() || this._draggedPanel() === splitPanelType) {
      return;
    }
    
    console.log(`🎯 [SplitPanelDragService] DRAG OVER: ${splitPanelType}`, { 
      draggedPanel: this._draggedPanel(),
      timestamp: new Date().toISOString() 
    });
    
    // Clear any pending drag leave timer
    this.clearDragLeaveTimer();
    
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    this._dragOverPanel.set(splitPanelType);
  }

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
        this._dragOverPanel.set(null);
      }
      this.dragLeaveTimer = null;
    }, this.DRAG_LEAVE_DELAY);
  }

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
      console.log(`❌ [SplitPanelDragService] DROP REJECTED - not dragging`, { timestamp: new Date().toISOString() });
      return false;
    }
    
    const draggedPanel = this._draggedPanel();
    if (!draggedPanel || draggedPanel === splitPanelType) {
      console.log(`❌ [SplitPanelDragService] DROP REJECTED - same panel or no dragged panel`, { 
        draggedPanel,
        dropTarget: splitPanelType,
        timestamp: new Date().toISOString() 
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
    
    // Reset drag state
    this.resetDragState();
    
    return true;
  }

  endDrag(): void {
    console.log(`🏁 [SplitPanelDragService] END DRAG`, { 
      isDragging: this._isDragging(),
      draggedPanel: this._draggedPanel(),
      timestamp: new Date().toISOString() 
    });
    
    // Clear any pending drag leave timer
    this.clearDragLeaveTimer();
    
    this.resetDragState();
  }

  // Check if a specific split-panel is being dragged
  isSplitPanelBeingDragged(splitPanelType: SplitPanelType): boolean {
    const result = this._isDragging() && this._draggedPanel() === splitPanelType;
    
    // Only log occasionally to reduce noise
    if (Math.random() < 0.01) { // 1% of calls
      console.log(`🔍 [SplitPanelDragService] IS BEING DRAGGED: ${splitPanelType} = ${result}`, { 
        timestamp: new Date().toISOString() 
      });
    }
    
    return result;
  }

  // Check if a specific split-panel is a valid drop target
  isSplitPanelDropTarget(splitPanelType: SplitPanelType): boolean {
    const result = this._isDragging() && 
                   this._draggedPanel() !== null && 
                   this._draggedPanel() !== splitPanelType && 
                   this._dragOverPanel() === splitPanelType;    
    
    return result;
  }

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
}