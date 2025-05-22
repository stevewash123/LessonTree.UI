import { Component, ViewChild, effect } from '@angular/core';
import { InfoPanelComponent } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { CommonModule } from '@angular/common';
import { PanelStateService } from '../../core/services/panel-state.service';

@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
    CommonModule,
    CourseListComponent,
    InfoPanelComponent,
    SplitComponent,
    SplitAreaComponent
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent {
    sizes: number[] = [50, 50];

  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;

  constructor(
    private panelStateService: PanelStateService,
  ) {
    console.log(`[LessonTreeContainer] Component initialized`, { timestamp: new Date().toISOString() });
        
  }

  // Computed property for overlay state
  get isOverlayActive(): boolean {
    return this.panelStateService.isOverlayActive();
  }
  
  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event, { timestamp: new Date().toISOString() });
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`, { timestamp: new Date().toISOString() });
    }
  }


}