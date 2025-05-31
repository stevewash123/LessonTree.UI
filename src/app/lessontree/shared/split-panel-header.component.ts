// RESPONSIBILITY: Provides draggable header for split-panels with visual feedback
// DOES NOT: Handle split-panel swapping logic or view mode management
// CALLED BY: Split-panel components that need drag reordering functionality

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SplitPanelDragService } from '../../core/services/split-panel-drag.service';
import { SplitPanelType } from '../lesson-tree-container/container-view-mode.service';

@Component({
  selector: 'split-panel-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './split-panel-header.component.html',
  styleUrls: ['./split-panel-header.component.css']
})
export class SplitPanelHeaderComponent {
  @Input({ required: true }) splitPanelType!: SplitPanelType;
  @Input({ required: true }) title!: string;
  @Input() showActions = false;
  
  @Output() splitPanelSwap = new EventEmitter<void>();

  constructor(public splitPanelDragService: SplitPanelDragService) {}

  onDragStart(event: DragEvent): void {
    console.log(`📤 [SplitPanelHeader] DRAG START: ${this.splitPanelType}`, { 
      title: this.title,
      timestamp: new Date().toISOString(),
      eventTarget: event.target?.constructor?.name
    });
    this.splitPanelDragService.startDrag(this.splitPanelType, event);
  }

  onDragOver(event: DragEvent): void {
    console.log(`📥 [SplitPanelHeader] DRAG OVER: ${this.splitPanelType}`, { 
      title: this.title,
      timestamp: new Date().toISOString(),
      eventTarget: event.target?.constructor?.name,
      relatedTarget: event.relatedTarget?.constructor?.name
    });
    this.splitPanelDragService.dragOver(this.splitPanelType, event);
  }

  onDragLeave(event: DragEvent): void {
    console.log(`📤 [SplitPanelHeader] DRAG LEAVE: ${this.splitPanelType}`, { 
      title: this.title,
      timestamp: new Date().toISOString(),
      eventTarget: event.target?.constructor?.name,
      relatedTarget: event.relatedTarget?.constructor?.name
    });
    this.splitPanelDragService.dragLeave(this.splitPanelType, event);
  }

  onDrop(event: DragEvent): void {
    console.log(`🎯 [SplitPanelHeader] DROP: ${this.splitPanelType}`, { 
      title: this.title,
      timestamp: new Date().toISOString(),
      eventTarget: event.target?.constructor?.name
    });
    
    const shouldSwap = this.splitPanelDragService.drop(this.splitPanelType, event);
    if (shouldSwap) {
      console.log(`✅ [SplitPanelHeader] EMITTING SWAP EVENT: ${this.splitPanelType}`, { 
        timestamp: new Date().toISOString() 
      });
      this.splitPanelSwap.emit();
    } else {
      console.log(`❌ [SplitPanelHeader] NO SWAP EVENT: ${this.splitPanelType}`, { 
        timestamp: new Date().toISOString() 
      });
    }
  }

  onDragEnd(event: DragEvent): void {
    console.log(`🏁 [SplitPanelHeader] DRAG END: ${this.splitPanelType}`, { 
      title: this.title,
      timestamp: new Date().toISOString(),
      eventTarget: event.target?.constructor?.name
    });
    this.splitPanelDragService.endDrag();
  }
}