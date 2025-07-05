// **COMPLETE FILE** - tree-interactions/tree-node-actions.service.ts
// RESPONSIBILITY: Handles tree node actions (add, delete, select) and coordinates with business services using Entity architecture
// DOES NOT: Handle tree UI state, data transformation, or SyncFusion integration directly
// CALLED BY: TreeWrapper for user-initiated node actions and selections

import { Injectable } from '@angular/core';
import { PanelStateService } from '../../../info-panel/panel-state.service';
import { Course } from '../../../models/course';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { Entity, EntityType } from '../../../models/entity';
import { TreeNode } from '../../../models/tree-node';
import { OperationMetadata } from '../course-data/course-data.service';
import { CourseCrudService } from '../course-operations/course-crud.service';
import { treeNodeToEntity, isCourse, isTopic, isSubTopic, isLesson, castToEntityType, generateNodeIdFromEntity } from '../../../shared/utils/type-conversion.utils';
import {EntitySelectionService} from '../state/entity-selection.service';
import {TreeNodeBuilderService} from '../ui/tree-node-builder.service';

export interface NodeActionResult {
  success: boolean;
  action: 'select' | 'add' | 'delete' | 'auto-select';
  nodeId?: string;
  entityType?: EntityType;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeNodeActionsService {

  // Action statistics for debugging
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
    private nodeSelectionService: EntitySelectionService,
    private panelStateService: PanelStateService,
    private courseCrudService: CourseCrudService,
    private treeNodeBuilderService: TreeNodeBuilderService
  ) {
    console.log('[TreeNodeActionsService] Service initialized for node action coordination with Entity architecture');
  }

  // Update action statistics
  private updateActionStats(action: 'select' | 'add' | 'delete' | 'auto-select'): void {
    this.actionStats.totalActionsHandled++;
    this.actionStats.actionsByType[action]++;
  }

  /**
   * Handle node selection in tree
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
    const selectedTreeNode = this.treeNodeBuilderService.findNodeById(treeData, args.nodeData.id);

    if (selectedTreeNode && selectedTreeNode.original) {
      const entity = this.extractEntityFromTreeNode(selectedTreeNode);

      if (!entity) {
        return {
          success: false,
          action: 'select',
          nodeId: args.nodeData.id,
          error: 'Could not extract entity from tree node'
        };
      }

      // Update the selection service with Entity
      this.nodeSelectionService.selectNode(entity, 'tree');

      const result: NodeActionResult = {
        success: true,
        action: 'select',
        nodeId: generateNodeIdFromEntity(entity),
        entityType: entity.entityType as EntityType
      };

      this.updateActionStats('select');

      console.log('[TreeNodeActionsService] Node selected:', {
        nodeId: result.nodeId,
        entityType: result.entityType,
        action: 'select'
      });

      return result;
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
   * Handle auto-selection on node expand
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
    const expandedTreeNode = this.treeNodeBuilderService.findNodeById(treeData, args.nodeData.id);

    if (expandedTreeNode && expandedTreeNode.original) {
      const entity = this.extractEntityFromTreeNode(expandedTreeNode);

      if (!entity) {
        return {
          success: false,
          action: 'auto-select',
          nodeId: args.nodeData.id,
          error: 'Could not extract entity from expanded node'
        };
      }

      // Select with 'tree' source so TreeWrapper doesn't react to its own selection
      this.nodeSelectionService.selectNode(entity, 'tree');

      const result: NodeActionResult = {
        success: true,
        action: 'auto-select',
        nodeId: generateNodeIdFromEntity(entity),
        entityType: entity.entityType as EntityType
      };

      this.updateActionStats('auto-select');

      console.log('[TreeNodeActionsService] Auto-selected on expand:', {
        nodeId: result.nodeId,
        entityType: result.entityType,
        action: 'auto-select'
      });

      return result;
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
   * Initiate adding a child node
   */
  initiateAddChildNode(
    data: any,
    childType: EntityType,
    treeData: TreeNode[],
    courseId: number
  ): NodeActionResult {
    const nodeId = data.id;
    const node = this.treeNodeBuilderService.findNodeById(treeData, nodeId);

    if (!node || !node.original) {
      console.warn('[TreeNodeActionsService] Could not find node data for add child action:', nodeId);

      return {
        success: false,
        action: 'add',
        nodeId,
        error: 'Parent node not found'
      };
    }

    const entity = this.extractEntityFromTreeNode(node);
    if (!entity) {
      return {
        success: false,
        action: 'add',
        nodeId,
        error: 'Could not extract entity from parent node'
      };
    }

    // Cast to specific entity type for panel state service
    const parentEntity = this.castToSpecificEntityType(entity);
    if (!parentEntity) {
      return {
        success: false,
        action: 'add',
        nodeId: generateNodeIdFromEntity(entity),
        error: 'Cannot cast to specific entity type'
      };
    }

    // Extract business entity ID
    const businessEntityId = entity.id;
    if (!businessEntityId || businessEntityId <= 0) {
      return {
        success: false,
        action: 'add',
        nodeId: generateNodeIdFromEntity(entity),
        error: 'Invalid business entity ID'
      };
    }

    this.panelStateService.initiateAddMode(childType, parentEntity, businessEntityId);

    const result: NodeActionResult = {
      success: true,
      action: 'add',
      nodeId: generateNodeIdFromEntity(entity),
      entityType: childType
    };

    this.updateActionStats('add');

    console.log('[TreeNodeActionsService] Add child node initiated:', {
      parentNodeId: generateNodeIdFromEntity(entity),
      parentEntityType: entity.entityType,
      childType,
      action: 'add'
    });

    return result;
  }

  /**
   * Cast Entity to specific entity type for PanelStateService
   */
  private castToSpecificEntityType(entity: Entity): Course | Topic | SubTopic | null {
    try {
      switch (entity.entityType) {
        case 'Course':
          return castToEntityType<Course>(entity, 'Course');
        case 'Topic':
          return castToEntityType<Topic>(entity, 'Topic');
        case 'SubTopic':
          return castToEntityType<SubTopic>(entity, 'SubTopic');
        case 'Lesson':
          // Lessons can't have children, but handle gracefully
          console.warn('[TreeNodeActionsService] Lessons cannot be parent entities');
          return null;
        default:
          console.warn('[TreeNodeActionsService] Unknown entity type for casting:', entity.entityType);
          return null;
      }
    } catch (error) {
      console.error('[TreeNodeActionsService] Error casting entity to specific type:', error);
      return null;
    }
  }

  /**
   * Delete a node
   */
  deleteNode(
    data: any,
    treeData: TreeNode[],
    courseId: number
  ): NodeActionResult {
    const nodeId = data.id;
    const node = this.treeNodeBuilderService.findNodeById(treeData, nodeId);

    if (!node) {
      console.warn(`[TreeNodeActionsService] Node not found for deletion:`, nodeId);

      return {
        success: false,
        action: 'delete',
        nodeId,
        error: 'Node not found for deletion'
      };
    }

    const entity = this.extractEntityFromTreeNode(node);
    if (!entity) {
      return {
        success: false,
        action: 'delete',
        nodeId: node.id,
        error: 'Could not extract entity from node'
      };
    }

    const entityId = entity.id;
    if (!entityId || entityId <= 0) {
      return {
        success: false,
        action: 'delete',
        nodeId: node.id,
        error: 'Invalid entity ID for deletion'
      };
    }

    // Create operation metadata for deletion
    const operationMetadata: OperationMetadata = {
      userAction: 'CONTEXT_MENU',
      parentNodeId: (node as any)['parentId'] || 'unknown'
    };

    // Call appropriate business service for deletion
    try {
      switch (entity.entityType) {
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
          throw new Error(`Unsupported node type for deletion: ${entity.entityType}`);
      }

      const result: NodeActionResult = {
        success: true,
        action: 'delete',
        nodeId: node.id,
        entityType: entity.entityType as EntityType
      };

      this.updateActionStats('delete');

      console.log('[TreeNodeActionsService] Node deletion initiated:', {
        nodeId: node.id,
        entityType: entity.entityType,
        entityId,
        action: 'delete'
      });

      return result;
    } catch (error) {
      console.error(`[TreeNodeActionsService] Error initiating deletion:`, error);

      return {
        success: false,
        action: 'delete',
        nodeId: node.id,
        entityType: entity.entityType as EntityType,
        error: error instanceof Error ? error.message : 'Deletion initiation error'
      };
    }
  }

  /**
   * Extract Entity from TreeNode (safe operation)
   */
  private extractEntityFromTreeNode(treeNode: TreeNode): Entity | null {
    try {
      if (!treeNode?.original) {
        console.warn('[TreeNodeActionsService] TreeNode missing original entity reference');
        return null;
      }

      return treeNodeToEntity(treeNode);
    } catch (error) {
      console.error('[TreeNodeActionsService] Failed to extract entity from TreeNode:', error);
      return null;
    }
  }

  /**
   * Get node type icon (delegated to TreeDataService)
   */
  getEntityTypeIcon(entityType: string): string {
    return this.treeNodeBuilderService.getEntityTypeIcon(entityType);
  }

  /**
   * Validate if a node action is allowed
   */
  validateNodeAction(
    action: 'add' | 'delete' | 'select',
    entityType: EntityType,
    childType?: EntityType
  ): { isValid: boolean; reason?: string } {
    switch (action) {
      case 'add':
        if (!childType) {
          return { isValid: false, reason: 'Child type required for add action' };
        }
        return this.validateAddChild(entityType, childType);

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
    parentType: EntityType,
    childType: EntityType
  ): { isValid: boolean; reason?: string } {
    const validRelationships: Record<EntityType, EntityType[]> = {
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
    return {
      totalActionsHandled: this.actionStats.totalActionsHandled,
      actionsByType: { ...this.actionStats.actionsByType }
    };
  }

  /**
   * Get debug information about service state
   */
  getDebugInfo(): any {
    return {
      actionStats: this.getActionStats(),
      serviceArchitecture: {
        delegates: ['EntitySelectionService', 'PanelStateService', 'CourseCrudService', 'TreeNodeBuilderService'],
        responsibilities: ['Node selection coordination', 'Add/delete actions', 'Business service delegation'],
        hasObservableEvents: false,
        entityArchitecture: true
      },
      supportedActions: ['select', 'add', 'delete', 'auto-select'],
      validParentChildRelationships: {
        'Course': ['Topic'],
        'Topic': ['SubTopic', 'Lesson'],
        'SubTopic': ['Lesson'],
        'Lesson': []
      }
    };
  }
}
