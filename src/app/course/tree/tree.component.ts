import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { Topic, createTopicNode } from '../../models/topic';
import { TreeNode } from './tree-node.interface';

@Component({
  selector: 'app-tree',
  standalone: true,
  imports: [TreeViewModule],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss']
})
export class TreeComponent implements OnChanges {
  @Input() topics: Topic[] = [];

  // Use TreeNode[] instead of any[]
  public treeData: TreeNode[] = [];

  // Define treeFields as a public property, updated in ngOnChanges
  public treeFields: object = {
    dataSource: this.treeData,
    id: 'id',
    text: 'text',
    child: 'child'
  };

  constructor() {
    // Initial setup if needed
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['topics']) {
      console.log('Topics changed:', this.topics);
      this.updateTreeData();
    }
  }

  private updateTreeData() {
    this.treeData = this.mapTopicsToTreeNodes(this.topics);
    this.treeFields = {
      dataSource: this.treeData,
      id: 'id',
      text: 'text',
      child: 'child'
    };
    console.log('Updated Tree Data:', JSON.stringify(this.treeData));
  }

  private mapTopicsToTreeNodes(topics: Topic[]): TreeNode[] {
    if (!topics || topics.length === 0) {
      return [];
    }
    return topics.map(topic => createTopicNode(topic));
  }

  public getAsString(obj: any): string {
    return JSON.stringify(obj);
  }
}