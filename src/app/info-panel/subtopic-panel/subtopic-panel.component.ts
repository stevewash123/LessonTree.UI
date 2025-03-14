import { Component, Input } from '@angular/core';
import { SubTopic } from '../../models/subTopic';

@Component({
  selector: 'subtopic-panel',
  imports: [],
  templateUrl: './subtopic-panel.component.html',
  styleUrl: './subtopic-panel.component.css'
})
export class SubtopicPanelComponent {
    @Input() data: SubTopic | null = null;
}
