// **COMPLETE FILE** - TreeSyncService - Observable Infrastructure REMOVED
// RESPONSIBILITY: Handles SyncFusion tree component integration, data binding, and UI synchronization
// DOES NOT: Handle business logic, node operations, or data transformation
// CALLED BY: TreeWrapper for SyncFusion lifecycle management and data binding operations

import { Injectable } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { Course } from '../../../models/course';
import { TreeNode } from '../../../models/tree-node';
import {TreeNodeBuilderService} from './tree-node-builder.service';

export interface SyncResult {
  success: boolean;
  operation: 'bind' | 'clear' | 'update' | 'sync' | 'add';
  nodeCount?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeSyncService {

  constructor(private treeNodeBuilderService: TreeNodeBuilderService) {
    console.log('[TreeSyncService] Service initialized for SyncFusion component integration');
  }

  /**
   * Add lesson node incrementally - preserves tree state
   * BEST PRACTICE: Uses SyncFusion's addNodes() method to preserve tree state
   */
  addLessonNode(
    lesson: any,
    syncFuncTree: TreeViewComponent | null,
    parentNodeId: string,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Adding lesson node incrementally');

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] addLessonNode: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }

    if (!this.isComponentReady(syncFuncTree)) {
      const errorMessage = 'SyncFusion component not ready';
      console.warn(`[TreeSyncService] addLessonNode: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }

    try {
      // Create the new lesson node using TreeDataService
      const newLessonNode = this.treeNodeBuilderService.createLessonNode(lesson);

      console.log(`[TreeSyncService] Adding lesson node "${lesson.title}" to parent "${parentNodeId}" for course ${courseId}`);

      // Use SyncFusion's addNodes() method - preserves tree state
      syncFuncTree.addNodes([newLessonNode], parentNodeId);

      console.log('[TreeSyncService] Lesson node added successfully', {
        courseId,
        lessonTitle: lesson.title,
        parentNodeId,
        preservedState: true
      });

      return {
        success: true,
        operation: 'add',
        nodeCount: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Add node error';
      console.error(`[TreeSyncService] Error adding lesson node for course ${courseId}:`, error);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }
  }

  addTopicNode(
    topic: any,
    syncFuncTree: TreeViewComponent | null,
    parentNodeId: string,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Adding topic node incrementally');

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] addTopicNode: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }

    if (!this.isComponentReady(syncFuncTree)) {
      const errorMessage = 'SyncFusion component not ready';
      console.warn(`[TreeSyncService] addTopicNode: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }

    try {
      // Create the new topic node using TreeNodeBuilderService
      const newTopicNode = this.treeNodeBuilderService.createTopicNode(topic);

      console.log(`[TreeSyncService] Adding topic node "${topic.title}" to parent "${parentNodeId}" for course ${courseId}`);

      // Use SyncFusion's addNodes() method - preserves tree state
      syncFuncTree.addNodes([newTopicNode], parentNodeId);

      console.log('[TreeSyncService] Topic node added successfully', {
        courseId,
        topicTitle: topic.title,
        parentNodeId,
        preservedState: true
      });

      return {
        success: true,
        operation: 'add',
        nodeCount: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Add topic node error';
      console.error(`[TreeSyncService] Error adding topic node for course ${courseId}:`, error);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }
  }

  /**
   * Add subtopic node incrementally - preserves tree state
   * FOLLOWS PATTERN: Same approach as addLessonNode using SyncFusion's addNodes()
   */
  addSubTopicNode(
    subTopic: any,
    syncFuncTree: TreeViewComponent | null,
    parentNodeId: string,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Adding subtopic node incrementally');

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] addSubTopicNode: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }

    if (!this.isComponentReady(syncFuncTree)) {
      const errorMessage = 'SyncFusion component not ready';
      console.warn(`[TreeSyncService] addSubTopicNode: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }

    try {
      // Create the new subtopic node using TreeNodeBuilderService
      const newSubTopicNode = this.treeNodeBuilderService.createSubTopicNode(subTopic);

      console.log(`[TreeSyncService] Adding subtopic node "${subTopic.title}" to parent "${parentNodeId}" for course ${courseId}`);

      // Use SyncFusion's addNodes() method - preserves tree state
      syncFuncTree.addNodes([newSubTopicNode], parentNodeId);

      console.log('[TreeSyncService] SubTopic node added successfully', {
        courseId,
        subTopicTitle: subTopic.title,
        parentNodeId,
        preservedState: true
      });

      return {
        success: true,
        operation: 'add',
        nodeCount: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Add subtopic node error';
      console.error(`[TreeSyncService] Error adding subtopic node for course ${courseId}:`, error);

      return {
        success: false,
        operation: 'add',
        error: errorMessage
      };
    }
  }

  /**
   * Build tree data and bind to component
   */
  /**
   * Build tree data and bind to component
   */
  updateTreeData(
      course: Course | null,
      syncFuncTree: TreeViewComponent | null,
      courseId: number
  ): Promise<SyncResult> {
    console.log('[TreeSyncService] Updating tree data');

    // Enhanced validation
    if (!course) {
      const errorMessage = 'No course provided';
      console.warn(`[TreeSyncService] updateTreeData: ${errorMessage} for courseId ${courseId}`);

      return Promise.resolve({
        success: false,
        operation: 'update',
        error: errorMessage
      });
    }

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] updateTreeData: ${errorMessage} for course ${courseId}`);

      return Promise.resolve({
        success: false,
        operation: 'update',
        error: errorMessage
      });
    }

    // Use TreeNodeBuilderService to build tree structure
    const treeData = this.treeNodeBuilderService.buildTreeFromCourse(course, courseId);

    // 🔍 DEBUG: Check treeData before SyncFusion binding
    console.log('🔍 [TreeSyncService] updateTreeData - TreeData BEFORE SyncFusion binding:', {
      courseId,
      treeDataLength: treeData.length,
      firstNodeSample: treeData[0] ? {
        id: treeData[0].id,
        text: treeData[0].text,
        hasOriginal: !!treeData[0].original,
        originalType: typeof treeData[0].original,
        originalKeys: Object.keys(treeData[0].original || {}),
        allKeys: Object.keys(treeData[0])
      } : 'No nodes',
      // Check a sample child node if it exists
      firstChildSample: treeData[0]?.child?.[0] ? {
        id: treeData[0].child[0].id,
        text: treeData[0].child[0].text,
        hasOriginal: !!treeData[0].child[0].original,
        originalType: typeof treeData[0].child[0].original,
        originalKeys: Object.keys(treeData[0].child[0].original || {}),
        allKeys: Object.keys(treeData[0].child[0])
      } : 'No child nodes'
    });

    // Queue the binding operation for next tick to ensure DOM is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Double-check that syncFuncTree is still available
          if (!syncFuncTree) {
            const errorMessage = 'SyncFusion component became unavailable';
            console.error(`[TreeSyncService] ${errorMessage} during update for course ${courseId}`);

            resolve({
              success: false,
              operation: 'update',
              error: errorMessage
            });
            return;
          }

          syncFuncTree.fields = {
            dataSource: treeData,
            id: 'id',
            text: 'text',
            child: 'child',
            hasChildren: 'hasChildren',
            iconCss: 'iconCss'
          };

          syncFuncTree.dataBind();

          // 🔍 DEBUG: Check what SyncFusion actually bound
          setTimeout(() => {
            const boundData = (syncFuncTree.fields as any)?.dataSource;
            console.log('🔍 [TreeSyncService] updateTreeData - Data AFTER SyncFusion binding:', {
              courseId,
              boundDataLength: boundData?.length || 0,
              firstBoundNodeSample: boundData?.[0] ? {
                id: boundData[0].id,
                text: boundData[0].text,
                hasOriginal: !!boundData[0].original,
                originalType: typeof boundData[0].original,
                originalKeys: Object.keys(boundData[0].original || {}),
                allKeys: Object.keys(boundData[0])
              } : 'No bound nodes'
            });
          }, 50); // Small delay to let SyncFusion finish processing

          console.log('[TreeSyncService] Tree data updated successfully', {
            courseId,
            nodeCount: treeData.length,
            preservedState: false
          });

          resolve({
            success: true,
            operation: 'update',
            nodeCount: treeData.length
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Binding error';
          console.error(`[TreeSyncService] Error binding tree data for course ${courseId}:`, error);

          resolve({
            success: false,
            operation: 'update',
            error: errorMessage
          });
        }
      }, 10); // Slightly longer delay to ensure view is stable
    });
  }

  /**
   * Full data sync - causes tree collapse
   * LEGACY: Causes tree collapse - use incremental methods when possible
   */
  syncDataOnly(
    course: Course | null,
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Performing full data sync');
    console.warn(`[TreeSyncService] syncDataOnly called - this WILL cause tree collapse. Consider using incremental methods instead.`);

    if (!courseId || !course) {
      return {
        success: false,
        operation: 'sync',
        error: 'Invalid course data'
      };
    }

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] syncDataOnly: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'sync',
        error: errorMessage
      };
    }

    try {
      // WARNING: This WILL trigger dataBind() and cause tree collapse
      const treeData = this.treeNodeBuilderService.buildTreeFromCourse(course, courseId);

      syncFuncTree.fields = {
        ...syncFuncTree.fields,
        dataSource: treeData
      };

      console.log('[TreeSyncService] Data sync completed', {
        courseId,
        nodeCount: treeData.length,
        preservedState: false,
        causesCollapse: true
      });

      return {
        success: true,
        operation: 'sync',
        nodeCount: treeData.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync error';
      console.error(`[TreeSyncService] Error syncing data for course ${courseId}:`, error);

      return {
        success: false,
        operation: 'sync',
        error: errorMessage
      };
    }
  }

  /**
   * Clear tree data
   */
  clearTreeData(
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Clearing tree data');

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] clearTreeData: ${errorMessage} for course ${courseId}`);

      return {
        success: false,
        operation: 'clear',
        error: errorMessage
      };
    }

    try {
      syncFuncTree.fields = {
        dataSource: [],
        id: 'id',
        text: 'text',
        child: 'child',
        hasChildren: 'hasChildren',
        iconCss: 'iconCss',
      };

      syncFuncTree.dataBind();

      console.log('[TreeSyncService] Tree data cleared', {
        courseId,
        nodeCount: 0
      });

      return {
        success: true,
        operation: 'clear',
        nodeCount: 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Clear error';
      console.error(`[TreeSyncService] Error clearing tree data for course ${courseId}:`, error);

      return {
        success: false,
        operation: 'clear',
        error: errorMessage
      };
    }
  }

  /**
   * Handle SyncFusion onDataBound event
   */
  handleDataBound(treeData: TreeNode[], courseId?: number): void {
    console.log('[TreeSyncService] Handling data bound event');

    // Use TreeDataService for logging statistics
    if (treeData && treeData.length > 0) {
      this.treeNodeBuilderService.logTreeStatistics(treeData);

      console.log('[TreeSyncService] Data bound handled', {
        courseId,
        nodeCount: treeData.length,
        statisticsLogged: true
      });
    }
  }

  /**
   * Sort and rebind tree data
   */
  sortAndRebind(
    treeData: TreeNode[],
    syncFuncTree: TreeViewComponent | null,
    courseId: number = 0
  ): SyncResult {
    console.log('[TreeSyncService] Sorting and rebinding');

    if (!syncFuncTree) {
      return {
        success: false,
        operation: 'bind',
        error: 'SyncFusion component not available for sort and rebind'
      };
    }

    try {
      this.treeNodeBuilderService.sortTreeData(treeData);

      syncFuncTree.dataBind();

      console.log('[TreeSyncService] Sort and rebind completed', {
        courseId,
        nodeCount: treeData.length
      });

      return {
        success: true,
        operation: 'bind',
        nodeCount: treeData.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sort and bind error';
      console.error('[TreeSyncService] Error sorting and rebinding:', error);

      return {
        success: false,
        operation: 'bind',
        error: errorMessage
      };
    }
  }

  /**
   * Validate tree component state
   */
  validateTreeComponent(syncFuncTree: TreeViewComponent | null, courseId: number = 0): {
    isValid: boolean;
    hasData: boolean;
    nodeCount: number;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!syncFuncTree) {
      issues.push('SyncFusion component is null');

      return {
        isValid: false,
        hasData: false,
        nodeCount: 0,
        issues
      };
    }

    const dataSource = (syncFuncTree.fields as any)?.dataSource;
    const hasData = Array.isArray(dataSource) && dataSource.length > 0;
    const nodeCount = hasData ? dataSource.length : 0;

    if (!hasData) {
      issues.push('No data source configured');
    }

    if (!syncFuncTree.fields) {
      issues.push('Fields not configured');
    }

    const isValid = issues.length === 0;

    console.log('[TreeSyncService] Tree component validation:', {
      courseId,
      isValid,
      hasData,
      nodeCount,
      issues
    });

    return {
      isValid,
      hasData,
      nodeCount,
      issues
    };
  }

  /**
   * Check if SyncFusion component is ready for operations
   */
  isComponentReady(syncFuncTree: TreeViewComponent | null): boolean {
    if (!syncFuncTree) {
      return false;
    }

    try {
      // Check if component has been initialized properly
      return syncFuncTree.fields !== undefined &&
        typeof syncFuncTree.dataBind === 'function' &&
        typeof syncFuncTree.addNodes === 'function';
    } catch (error) {
      console.warn('[TreeSyncService] Error checking component readiness:', error);
      return false;
    }
  }

  /**
   * Safely execute operations on SyncFusion component
   */
  safeExecute<T>(
    syncFuncTree: TreeViewComponent | null,
    operation: (tree: TreeViewComponent) => T,
    fallbackValue: T,
    operationName: string = 'unknown'
  ): T {
    if (!this.isComponentReady(syncFuncTree)) {
      console.warn(`[TreeSyncService] Cannot execute ${operationName} - component not ready`);
      return fallbackValue;
    }

    try {
      return operation(syncFuncTree!);
    } catch (error) {
      console.error(`[TreeSyncService] Error executing ${operationName}:`, error);
      return fallbackValue;
    }
  }
}
