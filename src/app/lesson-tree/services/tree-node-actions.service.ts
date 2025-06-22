// RESPONSIBILITY: Handles tree node actions (add, delete, select) and coordinates with business services.
// DOES NOT: Handle tree UI state, data transformation, or SyncFusion integration.
// CALLED BY: TreeWrapper for user-initiated node actions and selections.

import { Injectable } from '@angular/core';
import { PanelStateService } from '../../info-panel/panel-state.service';
import { Course } from '../../models/course';
import { Lesson } from '../../models/lesson';
import { SubTopic } from '../../models/subTopic';
import { Topic } from '../../models/topic';
import { TreeNode, TreeData } from '../../models/tree-node';
import { CourseCrudService } from './course-crud.service';
import { NodeType, NodeSelectionService } from './node-selection.service';
import { TreeDataService } from './tree-data.service';

export interface NodeActionResult {
  success: boolean;
  action: 'select' | 'add' | 'delete' | 'auto-select';
  nodeId?: string;
  nodeType?: NodeType;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeNodeActionsService {

  constructor(
    private nodeSelectionService: NodeSelectionService,
    private panelStateService: PanelStateService,
    private courseCrudService: CourseCrudService,
    private treeDataService: TreeDataService
  ) {
    console.log('[TreeNodeActionsService] Service initialized');
  }

  /**
   * Handle node selection from SyncFusion tree click
   */
  handleNodeSelected(
    args: any,
    treeData: TreeNode[],
    courseId: number
  ): NodeActionResult {
    if (!args.nodeData || !args.nodeData.id) {
      return {
        success: false,
        action: 'select',
        error: 'No node data provided'
      };
    }

    // Use TreeDataService to find the node
    const selectedTreeNode = this.treeDataService.findNodeById(treeData, args.nodeData.id);
    
    if (selectedTreeNode && selectedTreeNode.original) {
      // Update the selection service
      this.nodeSelectionService.selectNode(selectedTreeNode.original as TreeData, 'tree');
      
      return {
        success: true,
        action: 'select',
        nodeId: selectedTreeNode.original.nodeId,
        nodeType: selectedTreeNode.original.nodeType as NodeType
      };
    } else {
      console.warn('[TreeNodeActionsService] Node not found in tree data:', args.nodeData.id);
      
      return {
        success: false,
        action: 'select',
        nodeId: args.nodeData.id,
        error: 'Node not found in tree data'
      };
    }
  }

  /**
   * Handle auto-selection when node is expanded (no current selection)
   */
  handleAutoSelectOnExpand(
    args: any,
    treeData: TreeNode[],
    courseId: number,
    hasCurrentSelection: boolean
  ): NodeActionResult {
    // Only auto-select if no node is currently selected
    if (hasCurrentSelection) {
      return {
        success: false,
        action: 'auto-select',
        error: 'Selection already exists'
      };
    }

    if (!args.nodeData || !args.nodeData.id) {
      return {
        success: false,
        action: 'auto-select',
        error: 'No expanded node data'
      };
    }

    // Use TreeDataService to find the expanded node
    const expandedTreeNode = this.treeDataService.findNodeById(treeData, args.nodeData.id);
    
    if (expandedTreeNode && expandedTreeNode.original) {
      // Select with 'tree' source so TreeWrapper doesn't react to its own selection
      this.nodeSelectionService.selectNode(expandedTreeNode.original as TreeData, 'tree');
      
      return {
        success: true,
        action: 'auto-select',
        nodeId: expandedTreeNode.original.nodeId,
        nodeType: expandedTreeNode.original.nodeType as NodeType
      };
    } else {
      console.warn('[TreeNodeActionsService] Expanded node not found in tree data:', args.nodeData.id);
      
      return {
        success: false,
        action: 'auto-select',
        nodeId: args.nodeData.id,
        error: 'Expanded node not found in tree data'
      };
    }
  }

  /**
   * Initiate adding a child node to the selected parent
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
      
      return {
        success: false,
        action: 'add',
        nodeId,
        error: 'Parent node not found'
      };
    }
    
    const treeData_ = node.original as TreeData;
    
    // Delegate to panel state service for add mode
    this.panelStateService.initiateAddMode(childType, treeData_, treeData_.id);
    
    return {
      success: true,
      action: 'add',
      nodeId: treeData_.nodeId,
      nodeType: childType
    };
  }

  /**
   * Delete a node using the appropriate CRUD service
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
      
      return {
        success: false,
        action: 'delete',
        nodeId,
        error: 'Node not found for deletion'
      };
    }

    // Call appropriate CRUD service method
    try {
      switch (node.nodeType) {
        case 'Course':
          this.courseCrudService.deleteCourse((node.original as Course).id).subscribe();
          break;
        case 'Topic':
          this.courseCrudService.deleteTopic((node.original as Topic).id).subscribe();
          break;
        case 'SubTopic':
          this.courseCrudService.deleteSubTopic((node.original as SubTopic).id).subscribe();
          break;
        case 'Lesson':
          this.courseCrudService.deleteLesson((node.original as Lesson).id).subscribe();
          break;
        default:
          throw new Error(`Unsupported node type for deletion: ${node.nodeType}`);
      }
      
      return {
        success: true,
        action: 'delete',
        nodeId: node.id,
        nodeType: node.nodeType as NodeType
      };
    } catch (error) {
      console.error(`[TreeNodeActionsService] Error initiating deletion:`, error);
      return {
        success: false,
        action: 'delete',
        nodeId: node.id,
        nodeType: node.nodeType as NodeType,
        error: error instanceof Error ? error.message : 'Deletion initiation error'
      };
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
   * Get action statistics for debugging
   */
  getActionStats(): {
    totalActionsHandled: number;
    actionsByType: Record<string, number>;
  } {
    // This could be enhanced with actual tracking if needed
    return {
      totalActionsHandled: 0,
      actionsByType: {
        'select': 0,
        'add': 0,
        'delete': 0,
        'auto-select': 0
      }
    };
  }
}