import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Course } from '../../../models/course';
import { TreeNode } from '../../../models/tree-node';

@Component({
  selector: 'course-panel',
  templateUrl: './course-panel.component.html',
  styleUrls: ['./course-panel.component.css'],
  standalone: true,
  imports: [MatButtonModule]
})
export class CoursePanelComponent {
  @Input() data: Course | null = null;
  @Output() addNode = new EventEmitter<TreeNode>();

  onAddTopic() {
    if (this.data) {
      const parentNode: TreeNode = {
        id: this.data.nodeId,
        text: this.data.title,
        type: 'Course',
        original: this.data
      };
      console.log('Emitting add node for topic under course:', parentNode);
      this.addNode.emit(parentNode);
    }
  }
}