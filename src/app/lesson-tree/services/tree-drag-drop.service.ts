// RESPONSIBILITY: Handles tree drag & drop operations, validation, and coordinates with NodeOperationsService.
// DOES NOT: Manage tree UI state, store drag state, or handle data persistence.
// CALLED BY: TreeWrapper drag event handlers.
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from '../../models/course';
import { Lesson } from '../../models/lesson';
import { SubTopic } from '../../models/subTopic';
import { Topic } from '../../models/topic';
import { TreeNode, NodeMovedEvent } from '../../models/tree-node';
import { NodeOperationsService } from './node-operations.service';
import { TreeDataService } from './tree-data.service';

export interface DragState {
  dragStartX: number;
  dragStartY: number;
  allowDrag: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TreeDragDropService {

  constructor(
    private nodeOperationsService: NodeOperationsService,
    private treeDataService: TreeDataService
  ) {
    console.log('[TreeDragDropService] Service initialized');
  }

  // Initialize drag state
  initializeDragState(): DragState {
    return {
      dragStartX: 0,
      dragStartY: 0,
      allowDrag: false
    };
  }

  // Handle drag start
  handleDragStart(args: any, dragState: DragState): void {
    dragState.dragStartX = args.event.pageX;
    dragState.dragStartY = args.event.pageY;
    dragState.allowDrag = false;
  }

  // Handle dragging motion
  handleDragging(args: any, dragState: DragState): void {
    const currentX = args.event.pageX;
    const currentY = args.event.pageY;
    const distance = Math.sqrt(
      Math.pow(currentX - dragState.dragStartX, 2) + 
      Math.pow(currentY - dragState.dragStartY, 2)
    );

    if (distance >= 25 && !dragState.allowDrag) {
      dragState.allowDrag = true;
    }
    
    if (!dragState.allowDrag) {
      args.cancel = true;
    }
  }

  // Handle drag stop and perform node operations
  handleDragStop(
    args: any, 
    dragState: DragState, 
    treeData: TreeNode[], 
    courseId: number
  ): Observable<any> | null {
    const draggedNodeId = args.draggedNodeData.id;
    const targetNodeId = args.droppedNodeData.id;
    const dropPosition = args.position; // "Before", "After", "Inside"
    const dropIndex = args.dropIndex;
  
    console.log(`[TreeDragDropService] Drop details:`, {
      draggedNodeId,
      targetNodeId,
      dropPosition,
      dropIndex,
      dropIndicator: args.dropIndicator
    });
  
    if (!dragState.allowDrag) {
      args.cancel = true;
      return null;
    }
  
    const draggedNode = this.treeDataService.findNodeById(treeData, draggedNodeId);
    if (!draggedNode) {
      console.warn('[TreeDragDropService] Dragged node not found:', draggedNodeId);
      return null;
    }
  
    const targetNode = this.treeDataService.findNodeById(treeData, targetNodeId);
    if (!targetNode) {
      console.warn('[TreeDragDropService] Target node not found:', targetNodeId);
      return null;
    }
  
    // Reset drag state
    dragState.allowDrag = false;
  
    // Route to appropriate handler based on dragged node type
    switch (draggedNode.nodeType) {
      case 'Lesson':
        return this.handleLessonDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
      case 'SubTopic':
        return this.handleSubTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
      case 'Topic':
        return this.handleTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex, courseId);
      default:
        console.warn('[TreeDragDropService] Unsupported node type for drag operation:', draggedNode.nodeType);
        return null;
    }
  }
  
  // Handle lesson drag operations with position awareness
  private handleLessonDragWithPosition(
    draggedNode: TreeNode, 
    targetNode: TreeNode, 
    dropPosition: string,
    dropIndex: number
  ): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    
    // Handle container drops (INTO a subtopic)
    if (dropPosition === 'Inside' && targetNode.nodeType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      return this.performSimpleLessonMove(lesson, targetSubTopic.id, undefined);
    }
    
    // Handle positional drops (BEFORE/AFTER another node)
    if (dropPosition === 'Before' || dropPosition === 'After') {
      
      if (targetNode.nodeType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;
        
        // Determine the parent container
        if (targetLesson.subTopicId) {
          return this.performPositionalLessonMove(
            lesson, 
            targetLesson.subTopicId, 
            'SubTopic', 
            targetLesson.id, 
            dropPosition === 'Before' ? 'before' : 'after',
            'Lesson'
          );
        } else if (targetLesson.topicId) {
          return this.performPositionalLessonMove(
            lesson, 
            targetLesson.topicId, 
            'Topic', 
            targetLesson.id, 
            dropPosition === 'Before' ? 'before' : 'after',
            'Lesson'
          );
        }
      }
      
      if (targetNode.nodeType === 'SubTopic') {
        // Dropping before/after a SubTopic means going into the Topic
        const targetSubTopic = targetNode.original as SubTopic;
        return this.performPositionalLessonMove(
          lesson,
          targetSubTopic.topicId,
          'Topic',
          targetSubTopic.id,
          dropPosition === 'Before' ? 'before' : 'after',
          'SubTopic'
        );
      }

      if (targetNode.nodeType === 'Topic') {
        const targetTopic = targetNode.original as Topic;
        
        if (dropPosition === 'After') {
          // Dropping "after" a topic means becoming first child within that topic
          console.log(`[TreeDragDropService] Moving lesson to be first child of topic ${targetTopic.id}`);
          return this.performSimpleLessonMove(lesson, undefined, targetTopic.id);
        }
        
        // dropPosition === 'Before' a topic would be unusual but we could handle it
        // For now, we'll just fall through to the unsupported case
      }
    }

    console.warn('[TreeDragDropService] Unsupported lesson drop scenario:', { 
      dropPosition, 
      targetType: targetNode.nodeType 
    });
    return null;
  }
  
  // Perform simple lesson move (append to end)
  private performSimpleLessonMove(
    lesson: Lesson, 
    targetSubTopicId?: number, 
    targetTopicId?: number
  ): Observable<any> {
    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetSubTopicId ? 'SubTopic' : 'Topic'
    };
  
    return this.nodeOperationsService.performDragOperation(event);
  }
  
  // Positional lesson move (delegates to NodeOperationsService with position info)
  private performPositionalLessonMove(
    lesson: Lesson,
    targetParentId: number,
    targetParentType: 'SubTopic' | 'Topic',
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Lesson' | 'SubTopic'
  ): Observable<any> {
    console.log(`[TreeDragDropService] Positional drop detected:`, {
      lessonId: lesson.id,
      targetParentId,
      targetParentType,
      relativeToId,
      relativePosition,
      relativeToType
    });
  
    // Create enhanced move event with position information
    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetParentId,
      targetParentType: targetParentType
    };
  
    // Delegate to NodeOperationsService with position details
    return this.nodeOperationsService.performPositionalMove(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    );
  }
  
  // Placeholder handlers for SubTopic and Topic (maintain existing logic for now)
  private handleSubTopicDragWithPosition(
    draggedNode: TreeNode, 
    targetNode: TreeNode, 
    dropPosition: string,
    dropIndex: number
  ): Observable<any> | null {
    // For now, delegate to existing logic
    return this.handleSubTopicDrag(draggedNode, targetNode);
  }
  
  private handleTopicDragWithPosition(
    draggedNode: TreeNode, 
    targetNode: TreeNode, 
    dropPosition: string,
    dropIndex: number,
    courseId: number
  ): Observable<any> | null {
    // For now, delegate to existing logic  
    return this.handleTopicDrag(draggedNode, targetNode, courseId);
  }

  // Handle lesson drag operations
  private handleLessonDrag(draggedNode: TreeNode, targetNode: TreeNode): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    let targetSubTopicId: number | undefined;
    let targetTopicId: number | undefined;
    let targetParentType: 'SubTopic' | 'Topic';

    if (targetNode.nodeType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      targetSubTopicId = targetSubTopic.id;
      targetParentType = 'SubTopic';
    } else if (targetNode.nodeType === 'Topic') {
      const targetTopic = targetNode.original as Topic;
      targetTopicId = targetTopic.id;
      targetParentType = 'Topic';
    } else if (targetNode.nodeType === 'Lesson') {
      // Lesson-to-lesson drop: use the target lesson's parent
      const targetLesson = targetNode.original as Lesson;
      if (targetLesson.subTopicId) {
        targetSubTopicId = targetLesson.subTopicId;
        targetParentType = 'SubTopic';
      } else if (targetLesson.topicId) {
        targetTopicId = targetLesson.topicId;
        targetParentType = 'Topic';
      } else {
        console.warn('[TreeDragDropService] Target lesson has no valid parent:', targetLesson.id);
        return null;
      }
    } else {
      console.warn('[TreeDragDropService] Invalid target for lesson drag:', targetNode.nodeType);
      return null;
    }

    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetParentType
    };

    return this.nodeOperationsService.performDragOperation(event);
  }

  // Handle subtopic drag operations
  private handleSubTopicDrag(draggedNode: TreeNode, targetNode: TreeNode): Observable<any> | null {
    if (targetNode.nodeType !== 'Topic') {
      console.warn('[TreeDragDropService] SubTopic can only be dropped on Topic:', targetNode.nodeType);
      return null;
    }

    const subTopic = draggedNode.original as SubTopic;
    const targetTopic = targetNode.original as Topic;

    const event: NodeMovedEvent = {
      node: subTopic,
      sourceParentId: subTopic.topicId,
      sourceParentType: 'Topic',
      targetParentId: targetTopic.id,
      targetParentType: 'Topic'
    };

    return this.nodeOperationsService.performDragOperation(event);
  }

  // Handle topic drag operations
  private handleTopicDrag(
    draggedNode: TreeNode, 
    targetNode: TreeNode, 
    courseId: number
  ): Observable<any> | null {
    if (targetNode.nodeType !== 'Course') {
      console.warn('[TreeDragDropService] Topic can only be dropped on Course:', targetNode.nodeType);
      return null;
    }

    const topic = draggedNode.original as Topic;
    const sourceCourseId = courseId;
    const targetCourseId = parseInt(targetNode.id);

    if (sourceCourseId === targetCourseId) {
      // Same course move - just update sort order
      const event: NodeMovedEvent = {
        node: topic,
        sourceParentId: sourceCourseId,
        sourceParentType: 'Course',
        targetParentId: targetCourseId,
        targetParentType: 'Course',
        sourceCourseId,
        targetCourseId
      };

      return this.nodeOperationsService.performDragOperation(event);
    } else {
      // Cross-course move
      const event: NodeMovedEvent = { 
        node: topic,
        sourceCourseId, 
        targetCourseId, 
        targetParentType: 'Course',
        targetParentId: targetCourseId
      };

      return this.nodeOperationsService.performDragOperation(event);
    }
  }

  // Validate if a drag operation is allowed
  canDragNode(nodeType: string): boolean {
    const allowedTypes = ['Lesson', 'SubTopic', 'Topic'];
    return allowedTypes.includes(nodeType);
  }

  // Validate if a drop operation is allowed
  canDropOnTarget(draggedNodeType: string, targetNodeType: string): boolean {
    const validDropTargets: Record<string, string[]> = {
      'Lesson': ['SubTopic', 'Topic', 'Lesson'], // ✅ Added 'Lesson' for reordering
      'SubTopic': ['Topic'],
      'Topic': ['Course']
    };

    const allowedTargets = validDropTargets[draggedNodeType] || [];
    return allowedTargets.includes(targetNodeType);
  }

  // Get drag operation description for logging/UI
  getDragOperationDescription(
    draggedNode: TreeNode, 
    targetNode: TreeNode
  ): string {
    const draggedTitle = this.getNodeTitle(draggedNode);
    const targetTitle = this.getNodeTitle(targetNode);
    
    return `Moving ${draggedNode.nodeType} "${draggedTitle}" to ${targetNode.nodeType} "${targetTitle}"`;
  }

  // Helper method to get node title
  private getNodeTitle(node: TreeNode): string {
    switch (node.nodeType) {
      case 'Course':
        return (node.original as Course).title;
      case 'Topic':
        return (node.original as Topic).title;
      case 'SubTopic':
        return (node.original as SubTopic).title;
      case 'Lesson':
        return (node.original as Lesson).title;
      default:
        return 'Unknown';
    }
  }
}