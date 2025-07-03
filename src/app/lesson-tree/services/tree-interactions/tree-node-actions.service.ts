// RESPONSIBILITY: Handles tree node actions (add, delete, select) and coordinates with business services.
// DOES NOT: Handle tree UI state, data transformation, or SyncFusion integration.
// CALLED BY: TreeWrapper for user-initiated node actions and selections.

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { PanelStateService } from '../../../info-panel/panel-state.service';
import { Course } from '../../../models/course';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { NodeSelectionService, NodeType } from '../node-operations/node-selection.service';
import { TreeNode, TreeData } from '../../../models/tree-node';
import { OperationMetadata } from '../course-data/course-data.service';
import { CourseCrudService } from '../course-operations/course-crud.service';
import { TreeDataService } from '../tree-ui/tree-data.service';
import {
  NodeActionResult,
  NodeActionEvent,
  SelectionCoordinationEvent,
  NodeActionInitiationEvent
} from './tree-node-actions.interfaces';

@Injectable({
  providedIn: 'root'
})
export class TreeNodeActionsService {

  // ✅ Observable Events for Action Coordination
  private readonly _actionCompleted = new Subject<NodeActionEvent>();
  private readonly _selectionCoordinated = new Subject<SelectionCoordinationEvent>();
  private readonly _nodeActionInitiated = new Subject<NodeActionInitiationEvent>();

  readonly actionCompleted$ = this._actionCompleted.asObservable();
  readonly selectionCoordinated$ = this._selectionCoordinated.asObservable();
  readonly nodeActionInitiated$ = this._nodeActionInitiated.asObservable();

  // ✅ Action statistics for debugging
  private actionStats = {
    totalActionsHandled: 0,
    actionsByType: {
      'select': 0,
      'add': 0,
      'delete': 0,
      'auto-select': 0
    }
  };

  constructor(
    private nodeSelectionService: NodeSelectionService,
    private panelStateService: PanelStateService,
    private courseCrudService: CourseCrudService,
    private treeDataService: TreeDataService
  ) {
    console.log('[TreeNodeActionsService] Service initialized with Observable events');
  }

  // ✅ Enhanced with action tracking and Observable events
  private emitActionCompleted(result: NodeActionResult, metadata?: any): void {
    // Update statistics
    this.actionStats.totalActionsHandled++;
    this.actionStats.actionsByType[result.action]++;

    // Emit event
    this._actionCompleted.next({
      action: result.action,
      nodeId: result.nodeId || 'unknown',
      nodeType: result.nodeType || 'Course',
      success: result.success,
      metadata,
      error: result.error,
      timestamp: new Date()
    });
  }

  // ✅ Enhanced with Observable events
  private emitSelectionCoordinated(selectedNodeId: string, selectedNodeType: NodeType, selectionSource: 'tree' | 'external', previousSelection?: { nodeId: string; nodeType: NodeType }): void {
    this._selectionCoordinated.next({
      selectedNodeId,
      selectedNodeType,
      selectionSource,
      previousSelection,
      timestamp: new Date()
    });
  }

  // ✅ Enhanced with Observable events
  private emitNodeActionInitiated(action: 'add' | 'delete', targetNodeId: string, targetNodeType: NodeType, childType?: NodeType, userTrigger: 'context-menu' | 'button' | 'keyboard' = 'context-menu'): void {
    this._nodeActionInitiated.next({
      action,
      targetNodeId,
      targetNodeType,
      childType,
      userTrigger,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced handle node selection with Observable events
   */
  handleNodeSelected(
    args: any,
    treeData: TreeNode[],
    courseId: number
  ): NodeActionResult {
    if (!args.nodeData || !args.nodeData.id) {
      const result: NodeActionResult = {
        success: false,
        action: 'select',
        error: 'No node data provided'
      };

      this.emitActionCompleted(result);
      return result;
    }

    // Use TreeDataService to find the node
    const selectedTreeNode = this.treeDataService.findNodeById(treeData, args.nodeData.id);

    if (selectedTreeNode && selectedTreeNode.original) {
      // Get previous selection for comparison
      const currentSelection = this.nodeSelectionService.selectedNode();
      const previousSelection = currentSelection ? {
        nodeId: currentSelection.nodeId,
        nodeType: currentSelection.nodeType as NodeType
      } : undefined;

      // Update the selection service
      this.nodeSelectionService.selectNode(selectedTreeNode.original as TreeData, 'tree');

      // ✅ Emit selection coordination event
      this.emitSelectionCoordinated(
        selectedTreeNode.original.nodeId,
        selectedTreeNode.original.nodeType as NodeType,
        'tree',
        previousSelection
      );

      const result: NodeActionResult = {
        success: true,
        action: 'select',
        nodeId: selectedTreeNode.original.nodeId,
        nodeType: selectedTreeNode.original.nodeType as NodeType
      };

      // ✅ Emit action completed event
      this.emitActionCompleted(result, {
        selectionSource: 'tree',
        previousSelection
      });

      return result;
    } else {
      console.warn('[TreeNodeActionsService] Node not found in tree data:', args.nodeData.id);

      const result: NodeActionResult = {
        success: false,
        action: 'select',
        nodeId: args.nodeData.id,
        error: 'Node not found in tree data'
      };

      this.emitActionCompleted(result);
      return result;
    }
  }

  /**
   * ✅ Enhanced handle auto-selection with Observable events
   */
  handleAutoSelectOnExpand(
    args: any,
    treeData: TreeNode[],
    courseId: number,
    hasCurrentSelection: boolean
  ): NodeActionResult {
    // Only auto-select if no node is currently selected
    if (hasCurrentSelection) {
      const result: NodeActionResult = {
        success: false,
        action: 'auto-select',
        error: 'Selection already exists'
      };

      this.emitActionCompleted(result);
      return result;
    }

    if (!args.nodeData || !args.nodeData.id) {
      const result: NodeActionResult = {
        success: false,
        action: 'auto-select',
        error: 'No expanded node data'
      };

      this.emitActionCompleted(result);
      return result;
    }

    // Use TreeDataService to find the expanded node
    const expandedTreeNode = this.treeDataService.findNodeById(treeData, args.nodeData.id);

    if (expandedTreeNode && expandedTreeNode.original) {
      // Get previous selection (should be null, but check for consistency)
      const currentSelection = this.nodeSelectionService.selectedNode();
      const previousSelection = currentSelection ? {
        nodeId: currentSelection.nodeId,
        nodeType: currentSelection.nodeType as NodeType
      } : undefined;

      // Select with 'tree' source so TreeWrapper doesn't react to its own selection
      this.nodeSelectionService.selectNode(expandedTreeNode.original as TreeData, 'tree');

      // ✅ Emit selection coordination event
      this.emitSelectionCoordinated(
        expandedTreeNode.original.nodeId,
        expandedTreeNode.original.nodeType as NodeType,
        'tree',
        previousSelection
      );

      const result: NodeActionResult = {
        success: true,
        action: 'auto-select',
        nodeId: expandedTreeNode.original.nodeId,
        nodeType: expandedTreeNode.original.nodeType as NodeType
      };

      // ✅ Emit action completed event
      this.emitActionCompleted(result, {
        selectionSource: 'tree-expand',
        previousSelection
      });

      return result;
    } else {
      console.warn('[TreeNodeActionsService] Expanded node not found in tree data:', args.nodeData.id);

      const result: NodeActionResult = {
        success: false,
        action: 'auto-select',
        nodeId: args.nodeData.id,
        error: 'Expanded node not found in tree data'
      };

      this.emitActionCompleted(result);
      return result;
    }
  }

  /**
   * ✅ Enhanced initiate adding a child node with Observable events
   */
  initiateAddChildNode(
    data: any,
    childType: NodeType,
    treeData: TreeNode[],
    courseId: number
  ): NodeActionResult {
    const nodeId = data.id;
    const node = this.treeDataService.findNodeById(treeData, nodeId);

    if (!node || !node.original) {
      console.warn('[TreeNodeActionsService] Could not find node data for add child action:', nodeId);

      const result: NodeActionResult = {
        success: false,
        action: 'add',
        nodeId,
        error: 'Parent node not found'
      };

      this.emitActionCompleted(result);
      return result;
    }

    const treeData_ = node.original as TreeData;

    // ✅ Emit action initiation event
    this.emitNodeActionInitiated('add', treeData_.nodeId, treeData_.nodeType as NodeType, childType);

    // ✅ ASSERT: Cast to specific entity type - we know this is valid
    const parentEntity = this.castToSpecificEntityType(treeData_)!;

    // ✅ ASSERT: Business entity must have valid ID - tree data came from API
    const businessEntityId = this.extractBusinessEntityId(treeData_)!;

    this.panelStateService.initiateAddMode(childType, parentEntity, businessEntityId);

    const result: NodeActionResult = {
      success: true,
      action: 'add',
      nodeId: treeData_.nodeId,
      nodeType: childType
    };

    // ✅ Emit action completed event
    this.emitActionCompleted(result, {
      parentId: treeData_.nodeId,
      childType,
      userAction: 'ADD_CHILD'
    });

    return result;
  }

  /**
   * Cast TreeData to specific entity type for PanelStateService
   */
  private castToSpecificEntityType(treeData: TreeData): Course | Topic | SubTopic | null {
    switch (treeData.nodeType) {
      case 'Course':
        return treeData as Course;
      case 'Topic':
        return treeData as Topic;
      case 'SubTopic':
        return treeData as SubTopic;
      case 'Lesson':
        // Lessons can't have children, but handle gracefully
        console.warn('[TreeNodeActionsService] Lessons cannot be parent entities');
        return null;
      default:
        console.warn('[TreeNodeActionsService] Unknown entity type for casting:', treeData.nodeType);
        return null;
    }
  }

  /**
   * ✅ Enhanced delete a node with Observable events
   */
  deleteNode(
    data: any,
    treeData: TreeNode[],
    courseId: number
  ): NodeActionResult {
    const nodeId = data.id;
    const node = this.treeDataService.findNodeById(treeData, nodeId);

    if (!node) {
      console.warn(`[TreeNodeActionsService] Node not found for deletion:`, nodeId);

      const result: NodeActionResult = {
        success: false,
        action: 'delete',
        nodeId,
        error: 'Node not found for deletion'
      };

      this.emitActionCompleted(result);
      return result;
    }

    // ✅ FIXED: Extract business entity ID, not TreeData.id
    const businessEntity = node.original as TreeData;
    const entityId = this.extractBusinessEntityId(businessEntity);

    if (!entityId) {
      const result: NodeActionResult = {
        success: false,
        action: 'delete',
        nodeId: node.id,
        error: 'Could not extract business entity ID'
      };

      this.emitActionCompleted(result);
      return result;
    }

    // ✅ Emit action initiation event
    this.emitNodeActionInitiated('delete', businessEntity.nodeId, businessEntity.nodeType as NodeType);

    // ✅ ENHANCED: Create operation metadata for deletion
    const operationMetadata: OperationMetadata = {
      userAction: 'CONTEXT_MENU', // or 'DELETE_BUTTON' depending on UI trigger
      parentNodeId: node['parentId'] || 'unknown' // Fix: access via bracket notation
    };

    // ✅ FIXED: Call business services with business entity ID only
    try {
      switch (node.nodeType) {
        case 'Course':
          this.courseCrudService.deleteCourse(entityId).subscribe();
          break;
        case 'Topic':
          this.courseCrudService.deleteTopic(entityId).subscribe();
          break;
        case 'SubTopic':
          this.courseCrudService.deleteSubTopic(entityId).subscribe();
          break;
        case 'Lesson':
          this.courseCrudService.deleteLesson(entityId).subscribe();
          break;
        default:
          throw new Error(`Unsupported node type for deletion: ${node.nodeType}`);
      }

      const result: NodeActionResult = {
        success: true,
        action: 'delete',
        nodeId: node.id,
        nodeType: node.nodeType as NodeType
      };

      // ✅ Emit action completed event
      this.emitActionCompleted(result, {
        parentId: node['parentId'],
        userAction: 'DELETE_NODE',
        entityId
      });

      return result;
    } catch (error) {
      console.error(`[TreeNodeActionsService] Error initiating deletion:`, error);

      const result: NodeActionResult = {
        success: false,
        action: 'delete',
        nodeId: node.id,
        nodeType: node.nodeType as NodeType,
        error: error instanceof Error ? error.message : 'Deletion initiation error'
      };

      this.emitActionCompleted(result, {
        parentId: node['parentId'],
        userAction: 'DELETE_NODE',
        entityId
      });

      return result;
    }
  }

  /**
   * Extract business entity ID while isolating from TreeData properties
   * This enables future refactoring to TreeData<Entity> pattern
   */
  private extractBusinessEntityId(entity: TreeData): number {
    // ✅ ASSERT: Business entities from tree data must have valid IDs
    switch (entity.nodeType) {
      case 'Course':
        return (entity as Course).id;
      case 'Topic':
        return (entity as Topic).id;
      case 'SubTopic':
        return (entity as SubTopic).id;
      case 'Lesson':
        return (entity as Lesson).id;
      default:
        throw new Error(`Unknown entity type for ID extraction: ${entity.nodeType}`);
    }
  }

  /**
   * Get node type icon (delegated to TreeDataService)
   */
  getNodeTypeIcon(nodeType: string): string {
    return this.treeDataService.getNodeTypeIcon(nodeType);
  }

  /**
   * Validate if a node action is allowed
   */
  validateNodeAction(
    action: 'add' | 'delete' | 'select',
    nodeType: NodeType,
    childType?: NodeType
  ): { isValid: boolean; reason?: string } {
    switch (action) {
      case 'add':
        if (!childType) {
          return { isValid: false, reason: 'Child type required for add action' };
        }
        return this.validateAddChild(nodeType, childType);

      case 'delete':
        return { isValid: true }; // All node types can be deleted

      case 'select':
        return { isValid: true }; // All node types can be selected

      default:
        return { isValid: false, reason: 'Unknown action type' };
    }
  }

  /**
   * Validate if a parent can have a specific child type
   */
  private validateAddChild(
    parentType: NodeType,
    childType: NodeType
  ): { isValid: boolean; reason?: string } {
    const validRelationships: Record<NodeType, NodeType[]> = {
      'Course': ['Topic'],
      'Topic': ['SubTopic', 'Lesson'],
      'SubTopic': ['Lesson'],
      'Lesson': [] // Lessons cannot have children
    };

    const allowedChildren = validRelationships[parentType] || [];

    if (allowedChildren.includes(childType)) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        reason: `${parentType} cannot have ${childType} children. Allowed: ${allowedChildren.join(', ')}`
      };
    }
  }

  /**
   * ✅ Enhanced get action statistics with real tracking
   */
  getActionStats(): {
    totalActionsHandled: number;
    actionsByType: Record<string, number>;
  } {
    return {
      totalActionsHandled: this.actionStats.totalActionsHandled,
      actionsByType: { ...this.actionStats.actionsByType }
    };
  }

  /**
   * ✅ Get recent action events for debugging
   */
  getRecentActionEvents(): Observable<NodeActionEvent> {
    return this.actionCompleted$;
  }

  /**
   * ✅ Get selection coordination events for debugging
   */
  getSelectionCoordinationEvents(): Observable<SelectionCoordinationEvent> {
    return this.selectionCoordinated$;
  }

  /**
   * ✅ Get action initiation events for debugging
   */
  getActionInitiationEvents(): Observable<NodeActionInitiationEvent> {
    return this.nodeActionInitiated$;
  }
}
