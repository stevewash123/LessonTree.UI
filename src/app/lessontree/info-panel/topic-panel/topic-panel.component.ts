import { Component, Input } from '@angular/core';
import { Topic } from '../../../models/topic';

@Component({
  selector: 'topic-panel',
  imports: [],
  templateUrl: './topic-panel.component.html',
  styleUrl: './topic-panel.component.css'
})
export class TopicPanelComponent {

    @Input() data: Topic | null = null;
}
