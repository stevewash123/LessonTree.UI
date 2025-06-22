// RESPONSIBILITY: Pure drag mode state management with signals
// DOES NOT: Perform operations, API calls, or business logic
// CALLED BY: TreeWrapper for mode toggles, NodeOperationsService for mode checks

import { Injectable, signal } from '@angular/core';

export enum DragMode {
  Move = 'move',
  Copy = 'copy'
}

@Injectable({
  providedIn: 'root'
})
export class NodeDragModeService {
  // Drag mode state
  private readonly _dragMode = signal<DragMode>(DragMode.Move);
  readonly dragMode = this._dragMode.asReadonly();

  constructor() {
    console.log('[NodeDragModeService] Service initialized');
  }

  // Drag mode methods
  toggleDragMode(): void {
    const currentMode = this._dragMode();
    this._dragMode.set(currentMode === DragMode.Move ? DragMode.Copy : DragMode.Move);
    console.log('[NodeDragModeService] Toggled drag mode to:', this._dragMode());
  }

  setDragMode(mode: DragMode): void {
    this._dragMode.set(mode);
    console.log('[NodeDragModeService] Set drag mode to:', mode);
  }

  // Convenience getters for checking current mode
  get isDragModeMove(): boolean {
    return this._dragMode() === DragMode.Move;
  }

  get isDragModeCopy(): boolean {
    return this._dragMode() === DragMode.Copy;
  }

  // Get current mode value
  get currentMode(): DragMode {
    return this._dragMode();
  }
}