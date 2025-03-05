// src/app/course/tree/tree.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { Topic, createTopicNode } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { DragAndDropEventArgs } from '@syncfusion/ej2-navigations';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  public treeData: TreeNode[] = [];

  public treeFields: object = {
    dataSource: this.treeData,
    id: 'id',
    text: 'text',
    child: 'child',
    iconCss: 'iconCss'
  };

  constructor(private apiService: ApiService, private toastr: ToastrService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['topics']) {
      console.log('Topics changed:', this.topics);
      this.updateTreeData();
    }
  }

  private updateTreeData() {
    this.treeData = this.topics.map(topic => createTopicNode(topic));
    this.treeFields = {
      dataSource: this.treeData,
      id: 'id',
      text: 'text',
      child: 'child',
      iconCss: 'iconCss'
    };
    console.log('Updated Tree Data:', JSON.stringify(this.treeData));
  }

  public getAsString(obj: any): string {
    return JSON.stringify(obj);
  }

  public onNodeDragStop(args: DragAndDropEventArgs) {
    const draggedNodeData = args.draggedNodeData as { id?: unknown; text?: unknown; [key: string]: any };
    if (!this.isTreeNode(draggedNodeData)) {
      args.cancel = true;
      console.log('Drag rejected: Invalid dragged node data');
      return;
    }

    const draggedNode: TreeNode = {
      ...draggedNodeData,
      type: this.determineNodeType(draggedNodeData.id as string) || 'Lesson',
      original: this.findOriginalById(draggedNodeData.id as string)
    };

    const dropTargetId = args.dropTarget?.getAttribute('data-uid') || '';
    const targetNode = this.findNodeById(this.treeData, dropTargetId);

    if (!draggedNode || !targetNode || !draggedNode.type || !targetNode.type) {
      args.cancel = true;
      console.log('Drag rejected: Invalid node data');
      return;
    }

    if (
      (draggedNode.type === 'SubTopic' && targetNode.type !== 'Topic') ||
      (draggedNode.type === 'Lesson' && targetNode.type !== 'SubTopic') ||
      (draggedNode.type === 'Topic')
    ) {
      args.cancel = true;
      console.log(`Drag rejected: ${draggedNode.type} cannot drop onto ${targetNode.type}`);
      return;
    }

    if (draggedNode.type === 'SubTopic') {
      const subTopic = draggedNode.original as SubTopic;
      const sourceTopic = this.findParentTopic(this.treeData, subTopic.nodeId);
      const targetTopic = targetNode.original as Topic;

      if (!sourceTopic || sourceTopic === targetTopic) {
        args.cancel = true;
        return;
      }

      sourceTopic.subTopics = sourceTopic.subTopics.filter(st => st.nodeId !== subTopic.nodeId);
      targetTopic.subTopics.push(subTopic);

      this.saveEntities([sourceTopic, targetTopic], args, `Moved SubTopic ${subTopic.title} to Topic ${targetTopic.title}`);
    } else if (draggedNode.type === 'Lesson') {
      const lesson = draggedNode.original as Lesson;
      const sourceSubTopic = this.findParentSubTopic(this.treeData, lesson.nodeId);
      const targetSubTopic = targetNode.original as SubTopic;

      if (!sourceSubTopic || sourceSubTopic === targetSubTopic) {
        args.cancel = true;
        return;
      }

      sourceSubTopic.lessons = sourceSubTopic.lessons.filter(l => l.nodeId !== lesson.nodeId);
      targetSubTopic.lessons.push(lesson);
      lesson.subTopicId = targetSubTopic.id;

      this.saveEntities([sourceSubTopic, targetSubTopic, lesson], args, `Moved Lesson ${lesson.title} to SubTopic ${targetSubTopic.title}`);
    }
  }

  private saveEntities<T>(entities: T[], args: DragAndDropEventArgs, successMessage: string) {
    const requests: Observable<T>[] = entities.map(entity => this.apiService.put(entity));
    forkJoin(requests).subscribe({
      next: () => {
        this.updateTreeData();
        this.toastr.success(successMessage);
      },
      error: () => this.rollbackMove(entities, args)
    });
  }

  private rollbackMove<T>(entities: T[], args: DragAndDropEventArgs) {
    if (entities.length === 2 && this.isTopic(entities[0]) && this.isTopic(entities[1])) {
      const sourceTopic = entities[0] as Topic;
      const targetTopic = entities[1] as Topic;
      const subTopic = targetTopic.subTopics.pop()!;
      sourceTopic.subTopics.push(subTopic);
    } else if (entities.length === 3 && this.isSubTopic(entities[0]) && this.isSubTopic(entities[1]) && this.isLesson(entities[2])) {
      const sourceSubTopic = entities[0] as SubTopic;
      const targetSubTopic = entities[1] as SubTopic;
      const lesson = targetSubTopic.lessons.pop()!;
      sourceSubTopic.lessons.push(lesson);
      lesson.subTopicId = sourceSubTopic.id;
    }
    this.updateTreeData();
    args.cancel = true;
    console.log('Rollback: Failed to save move');
  }

  private isTreeNode(data: any): data is TreeNode {
    return typeof data.id === 'string' && typeof data.text === 'string';
  }

  private determineNodeType(nodeId: string): 'Topic' | 'SubTopic' | 'Lesson' | undefined {
    if (nodeId.startsWith('topic-')) return 'Topic';
    if (nodeId.startsWith('subtopic-')) return 'SubTopic';
    if (nodeId.startsWith('lesson-')) return 'Lesson';
    return undefined;
  }

  private findOriginalById(nodeId: string): Topic | SubTopic | Lesson | undefined {
    for (const node of this.treeData) {
      if (node.id === nodeId) return node.original;
      if (node.child) {
        const found = this.findChildOriginal(node.child, nodeId);
        if (found) return found;
      }
    }
    return undefined;
  }

  private findChildOriginal(nodes: TreeNode[], nodeId: string): Topic | SubTopic | Lesson | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) return node.original;
      if (node.child) {
        const found = this.findChildOriginal(node.child, nodeId);
        if (found) return found;
      }
    }
    return undefined;
  }

  private findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.child) {
        const found = this.findNodeById(node.child, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  private findParentTopic(nodes: TreeNode[], subTopicNodeId: string): Topic | undefined {
    return nodes
      .filter(node => node.type === 'Topic')
      .find(node => node.child?.some((st: TreeNode) => st.id === subTopicNodeId))
      ?.original as Topic;
  }

  private findParentSubTopic(nodes: TreeNode[], lessonNodeId: string): SubTopic | undefined {
    for (const topic of nodes) {
      if (topic.child) {
        const subTopic = topic.child
          .filter((st: TreeNode) => st.type === 'SubTopic')
          .find((st: TreeNode) => st.child?.some((l: TreeNode) => l.id === lessonNodeId));
        if (subTopic) return subTopic.original as SubTopic;
      }
    }
    return undefined;
  }

  // Type guards for TreeComponent
  private isTopic(entity: any): entity is Topic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && typeof entity.description === 'string' && 
           Array.isArray(entity.subTopics);
  }

  private isSubTopic(entity: any): entity is SubTopic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && (entity.description === undefined || typeof entity.description === 'string') && 
           Array.isArray(entity.lessons);
  }

  private isLesson(entity: any): entity is Lesson {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && typeof entity.content === 'string' && 
           typeof entity.subTopicId === 'number' && Array.isArray(entity.documents);
  }
}