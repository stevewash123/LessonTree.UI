// src/app/lesson-tree-container/lesson-tree-container.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { CourseManagementComponent } from '../../course/course-management/course-management.component';
import { InfoPanelComponent } from '../../course/info-panel/info-panel.component';

@Component({
  selector: 'app-lesson-tree-container',
  standalone: true,
  imports: [
    CourseManagementComponent,
    InfoPanelComponent,
    MatDividerModule
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.scss']
})
export class LessonTreeContainerComponent {
  @ViewChild('splitter') splitter!: ElementRef;

  ngAfterViewInit() {
    const splitter = this.splitter.nativeElement;
    const leftPanel = splitter.previousElementSibling;
    let isDragging = false;

    splitter.addEventListener('mousedown', () => {
      isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const container = splitter.parentElement;
      const rect = container.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const minWidth = 300; // Minimum width for left panel
      const maxWidth = rect.width * 0.5; // Max 50% of container

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        leftPanel.style.width = `${newWidth}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
}