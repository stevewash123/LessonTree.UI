// RESPONSIBILITY: Handles tree node expansion, path finding, and external selection coordination.
// DOES NOT: Manage tree data or handle SyncFusion lifecycle - only expansion operations.
// CALLED BY: TreeWrapper for external selection handling and expansion operations.

import { Injectable } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { TreeData, TreeNode } from '../../../../models/tree-node';
import { Lesson } from '../../../../models/lesson';
import { SubTopic } from '../../../../models/subTopic';
import { TreeDataService } from './tree-data.service';

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
    console.log('[TreeExpansionService] Service initialized', { 
      timestamp: new Date().toISOString() 
    });
  }

  /**
   * Find the parent hierarchy path for a given node
   * Returns array of SyncFusion node IDs from root to parent (excluding the target node itself)
   * NodeIds are formatted as "lowercase_type_entityId" (e.g., "course_123", "topic_45", "lesson_67")
   */
  findNodePath(targetNode: TreeData, courseId: number): string[] {
    const path: string[] = [];
    
    // For any node, we need to find its parent chain
    if (targetNode.nodeType === 'Lesson') {
      const lesson = targetNode as Lesson;
      
      // Path: Course -> Topic -> [SubTopic] -> Lesson
      path.push(`course_${courseId}`); // Course nodeId
      
      if (lesson.topicId) {
        path.push(`topic_${lesson.topicId}`); // Topic nodeId
      }
      
      if (lesson.subTopicId) {
        path.push(`subtopic_${lesson.subTopicId}`); // SubTopic nodeId
      }
    } else if (targetNode.nodeType === 'SubTopic') {
      const subTopic = targetNode as SubTopic;
      
      // Path: Course -> Topic -> SubTopic
      path.push(`course_${courseId}`); // Course nodeId
      path.push(`topic_${subTopic.topicId}`); // Topic nodeId
    } else if (targetNode.nodeType === 'Topic') {
      // Path: Course -> Topic
      path.push(`course_${courseId}`); // Course nodeId
    }
    // Course nodes don't need expansion path
    
    console.log('[TreeExpansionService] Found node path with proper nodeIds:', {
      nodeType: targetNode.nodeType,
      nodeId: targetNode.nodeId,
      path,
      courseId,
      timestamp: new Date().toISOString()
    });
    
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
    
    console.log('[TreeExpansionService] Expanding node path:', {
      pathNodeIds,
      courseId,
      timestamp: new Date().toISOString()
    });
    
    const expandedNodes: string[] = [];

    try {
      // Expand nodes in sequence with small delays
      for (const nodeId of pathNodeIds) {
        const nodeInTree = this.treeDataService.findNodeById(treeData, nodeId);
        
        if (nodeInTree && nodeInTree.hasChildren) {
          console.log('[TreeExpansionService] Expanding node:', {
            nodeId: nodeInTree.id,
            nodeType: nodeInTree.nodeType,
            hasChildren: nodeInTree.hasChildren,
            timestamp: new Date().toISOString()
          });
          
          // Use SyncFusion's expandAll method for specific node
          syncFuncTree.expandAll([nodeId]);
          expandedNodes.push(nodeId);
          
          // Small delay to allow SyncFusion to process the expansion
          await new Promise(resolve => setTimeout(resolve, 50));
        } else if (nodeInTree && !nodeInTree.hasChildren) {
          console.log('[TreeExpansionService] Skipping expansion for leaf node:', {
            nodeId: nodeInTree.id,
            nodeType: nodeInTree.nodeType,
            timestamp: new Date().toISOString()
          });
        } else {
          console.warn('[TreeExpansionService] Node not found for expansion:', {
            nodeId,
            courseId,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.log('[TreeExpansionService] Node path expansion completed', {
        expandedCount: expandedNodes.length,
        expandedNodes,
        courseId,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        expandedNodes
      };
    } catch (error) {
      console.error('[TreeExpansionService] Error expanding node path:', error, {
        pathNodeIds,
        expandedNodes,
        courseId,
        timestamp: new Date().toISOString()
      });
      
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
    
    console.log(`[TreeExpansionService] Handling external selection for node: ${node.nodeId}`, { 
      nodeType: node.nodeType,
      courseId,
      timestamp: new Date().toISOString() 
    });
    
    // Step 1: Find the target node in the tree
    const nodeInTree = this.treeDataService.findNodeById(treeData, node.nodeId);
    
    if (!nodeInTree) {
      console.warn(`[TreeExpansionService] External node not found in tree`, { 
        nodeId: node.nodeId, 
        nodeType: node.nodeType,
        courseId,
        timestamp: new Date().toISOString() 
      });
      
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
      console.log(`[TreeExpansionService] Expanding path to make node visible`, {
        nodeId: node.nodeId,
        expansionPath,
        courseId,
        timestamp: new Date().toISOString()
      });
      
      expansionResult = await this.expandNodePath(expansionPath, syncFuncTree, treeData, courseId);
      
      if (!expansionResult.success) {
        console.warn(`[TreeExpansionService] Failed to expand path for external selection`, {
          nodeId: node.nodeId,
          expansionPath,
          error: expansionResult.error,
          courseId,
          timestamp: new Date().toISOString()
        });
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
          
          console.log(`[TreeExpansionService] External selection completed successfully`, { 
            nodeId: node.nodeId,
            treeNodeId: nodeInTree.id,
            expandedNodes: expansionResult.expandedNodes,
            courseId,
            timestamp: new Date().toISOString() 
          });

          resolve({
            success: true,
            expandedNodes: expansionResult.expandedNodes,
            targetNodeId: nodeInTree.id
          });
        } catch (err) {
          console.error(`[TreeExpansionService] Error completing external selection:`, err, { 
            nodeId: node.nodeId,
            courseId,
            timestamp: new Date().toISOString() 
          });

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