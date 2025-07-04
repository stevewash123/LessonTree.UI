// RESPONSIBILITY: Handles tree node expansion, path finding, and external selection coordination.
// DOES NOT: Manage tree data or handle SyncFusion lifecycle - only expansion operations.
// CALLED BY: TreeWrapper for external selection handling and expansion operations.

import { Injectable } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { TreeDataService } from './tree-data.service';
import { TreeData, TreeNode } from '../../../models/tree-node';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';

export interface ExpansionResult {
  success: boolean;
  expandedNodes: string[];
  targetNodeId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeExpansionService {

  constructor(private treeDataService: TreeDataService) {
    console.log('[TreeExpansionService] Service initialized');
  }

  /**
   * Find the parent hierarchy path for a given node
   * Returns array of SyncFusion node IDs from root to parent (excluding the target node itself)
   * NodeIds are formatted as "lowercase_type_entityId" (e.g., "course_123", "topic_45", "lesson_67")
   */
  findNodePath(targetNode: TreeData, courseId: number): string[] {
    const path: string[] = [];
    
    // For any node, we need to find its parent chain
    if (targetNode.entityType === 'Lesson') {
      const lesson = targetNode as Lesson;
      
      // Path: Course -> Topic -> [SubTopic] -> Lesson
      path.push(`course_${courseId}`); // Course nodeId
      
      if (lesson.topicId) {
        path.push(`topic_${lesson.topicId}`); // Topic nodeId
      }
      
      if (lesson.subTopicId) {
        path.push(`subtopic_${lesson.subTopicId}`); // SubTopic nodeId
      }
    } else if (targetNode.entityType === 'SubTopic') {
      const subTopic = targetNode as SubTopic;
      
      // Path: Course -> Topic -> SubTopic
      path.push(`course_${courseId}`); // Course nodeId
      path.push(`topic_${subTopic.topicId}`); // Topic nodeId
    } else if (targetNode.entityType === 'Topic') {
      // Path: Course -> Topic
      path.push(`course_${courseId}`); // Course nodeId
    }
    // Course nodes don't need expansion path
    
    return path;
  }

  /**
   * Expand all parent nodes in the path to make target node visible
   */
  async expandNodePath(
    pathNodeIds: string[], 
    syncFuncTree: TreeViewComponent, 
    treeData: TreeNode[],
    courseId: number
  ): Promise<ExpansionResult> {
    if (!syncFuncTree || pathNodeIds.length === 0) {
      return {
        success: false,
        expandedNodes: [],
        error: 'Invalid parameters - no tree component or empty path'
      };
    }
    
    const expandedNodes: string[] = [];

    try {
      // Expand nodes in sequence with small delays
      for (const nodeId of pathNodeIds) {
        const nodeInTree = this.treeDataService.findNodeById(treeData, nodeId);
        
        if (nodeInTree && nodeInTree.hasChildren) {
          // Use SyncFusion's expandAll method for specific node
          syncFuncTree.expandAll([nodeId]);
          expandedNodes.push(nodeId);
          
          // Small delay to allow SyncFusion to process the expansion
          await new Promise(resolve => setTimeout(resolve, 50));
        } else if (!nodeInTree) {
          console.warn('[TreeExpansionService] Node not found for expansion:', nodeId);
        }
      }
      
      return {
        success: true,
        expandedNodes
      };
    } catch (error) {
      console.error('[TreeExpansionService] Error expanding node path:', error);
      
      return {
        success: false,
        expandedNodes,
        error: error instanceof Error ? error.message : 'Unknown expansion error'
      };
    }
  }

  /**
   * Handle external selection with expansion and visual selection
   * This is the main entry point for Calendar -> Tree selection
   */
  async handleExternalSelection(
    node: TreeData,
    syncFuncTree: TreeViewComponent,
    treeData: TreeNode[],
    courseId: number
  ): Promise<ExpansionResult> {
    if (!syncFuncTree || !treeData?.length) {
      return {
        success: false,
        expandedNodes: [],
        error: 'Invalid tree state - no component or data'
      };
    }
    
    // Step 1: Find the target node in the tree
    const nodeInTree = this.treeDataService.findNodeById(treeData, node.nodeId);
    
    if (!nodeInTree) {
      console.warn(`[TreeExpansionService] External node not found in tree:`, node.nodeId);
      
      return {
        success: false,
        expandedNodes: [],
        error: `Node ${node.nodeId} not found in tree data`
      };
    }
    
    // Step 2: Find the path to expand (parent nodes)
    const expansionPath = this.findNodePath(node, courseId);
    
    // Step 3: Expand parent nodes to make target visible
    let expansionResult: ExpansionResult = {
      success: true,
      expandedNodes: []
    };

    if (expansionPath.length > 0) {
      expansionResult = await this.expandNodePath(expansionPath, syncFuncTree, treeData, courseId);
      
      if (!expansionResult.success) {
        console.warn(`[TreeExpansionService] Failed to expand path for external selection:`, expansionResult.error);
        // Continue anyway - maybe the node is already visible
      }
    }
    
    // Step 4: Select the target node (with delay to ensure expansion is complete)
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          syncFuncTree.selectedNodes = [nodeInTree.id];
          
          // Step 5: Ensure the selected node is visible in viewport
          syncFuncTree.ensureVisible(nodeInTree.id);

          resolve({
            success: true,
            expandedNodes: expansionResult.expandedNodes,
            targetNodeId: nodeInTree.id
          });
        } catch (err) {
          console.error(`[TreeExpansionService] Error completing external selection:`, err);

          resolve({
            success: false,
            expandedNodes: expansionResult.expandedNodes,
            targetNodeId: nodeInTree.id,
            error: err instanceof Error ? err.message : 'Selection completion error'
          });
        }
      }, 150); // Wait for expansions to complete
    });
  }

  /**
   * Validate if a node can be expanded (has children)
   */
  canExpandNode(node: TreeNode): boolean {
    return node.hasChildren === true && (node.child?.length ?? 0) > 0;
  }

  /**
   * Get expansion statistics for debugging
   */
  getExpansionStats(treeData: TreeNode[]): {
    totalNodes: number;
    expandableNodes: number;
    expandedNodes: number;
  } {
    let totalNodes = 0;
    let expandableNodes = 0;
    let expandedNodes = 0;

    const countNodes = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        totalNodes++;
        
        if (this.canExpandNode(node)) {
          expandableNodes++;
          if (node.expanded) {
            expandedNodes++;
          }
        }

        if (node.child) {
          countNodes(node.child);
        }
      }
    };

    countNodes(treeData);

    return {
      totalNodes,
      expandableNodes,
      expandedNodes
    };
  }
}