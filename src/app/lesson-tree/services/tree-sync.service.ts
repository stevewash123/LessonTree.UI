// RESPONSIBILITY: Handles SyncFusion tree component integration, data binding, and UI synchronization.
// DOES NOT: Handle business logic, node operations, or data transformation.
// CALLED BY: TreeWrapper for SyncFusion lifecycle management and data binding operations.

import { Injectable } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { TreeDataService } from './tree-data.service';
import { Course } from '../../models/course';
import { TreeNode } from '../../models/tree-node';

export interface SyncResult {
  success: boolean;
  operation: 'bind' | 'clear' | 'update' | 'sync';
  nodeCount?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeSyncService {

  constructor(private treeDataService: TreeDataService) {
    console.log('[TreeSyncService] Service initialized', { 
      timestamp: new Date().toISOString() 
    });
  }

  /**
   * Build tree data from course and bind to SyncFusion component
   */
  updateTreeData(
    course: Course | null, 
    syncFuncTree: TreeViewComponent | null, 
    courseId: number
  ): Promise<SyncResult> {
    // Enhanced validation
    if (!course) {
      console.warn(`[TreeSyncService] updateTreeData: No course available for courseId ${courseId}`);
      return Promise.resolve({
        success: false,
        operation: 'update',
        error: 'No course provided'
      });
    }

    if (!syncFuncTree) {
      console.warn(`[TreeSyncService] updateTreeData: SyncFusion component not available for course ${courseId}`);
      return Promise.resolve({
        success: false,
        operation: 'update',
        error: 'SyncFusion component not available'
      });
    }

    // Use TreeDataService to build tree structure
    const treeData = this.treeDataService.buildTreeFromCourse(course, courseId);
    
    // Queue the binding operation for next tick to ensure DOM is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Double-check that syncFuncTree is still available
          if (!syncFuncTree) {
            console.error(`[TreeSyncService] SyncFusion component became unavailable during update for course ${courseId}`);
            resolve({
              success: false,
              operation: 'update',
              error: 'SyncFusion component became unavailable'
            });
            return;
          }

          syncFuncTree.fields = { 
            dataSource: treeData, 
            id: 'id', 
            text: 'text', 
            child: 'child', 
            hasChildren: 'hasChildren', 
            iconCss: 'iconCss',
          };
          
          console.log(`[TreeSyncService] Binding tree data for course ${course.id}`, {
            nodeCount: treeData.length,
            courseTitle: course.title,
            timestamp: new Date().toISOString()
          });
          
          syncFuncTree.dataBind();
          
          resolve({
            success: true,
            operation: 'update',
            nodeCount: treeData.length
          });
        } catch (error) {
          console.error(`[TreeSyncService] Error binding tree data for course ${courseId}:`, error);
          resolve({
            success: false,
            operation: 'update',
            error: error instanceof Error ? error.message : 'Binding error'
          });
        }
      }, 10); // Slightly longer delay to ensure view is stable
    });
  }

  /**
   * Sync data without UI rebuild (preserves SyncFusion UI state)
   */
  syncDataOnly(
    course: Course | null,
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): SyncResult {
    if (!courseId || !course) {
      return {
        success: false,
        operation: 'sync',
        error: 'Invalid course data'
      };
    }

    if (!syncFuncTree) {
      console.warn(`[TreeSyncService] syncDataOnly: SyncFusion component not available for course ${courseId}`);
      return {
        success: false,
        operation: 'sync',
        error: 'SyncFusion component not available'
      };
    }
    
    try {
      // Update the underlying data without calling dataBind() - preserves SyncFusion UI state
      const treeData = this.treeDataService.buildTreeFromCourse(course, courseId);
      
      syncFuncTree.fields = { 
        ...syncFuncTree.fields,
        dataSource: treeData
      };
      
      console.log(`[TreeSyncService] Data synced without UI rebuild for course ${courseId}`, {
        nodeCount: treeData.length,
        courseTitle: course.title,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        operation: 'sync',
        nodeCount: treeData.length
      };
    } catch (error) {
      console.error(`[TreeSyncService] Error syncing data for course ${courseId}:`, error);
      return {
        success: false,
        operation: 'sync',
        error: error instanceof Error ? error.message : 'Sync error'
      };
    }
  }

  /**
   * Clear tree data and update UI
   */
  clearTreeData(
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): SyncResult {
    console.log(`[TreeSyncService] Clearing tree data for course ${courseId}`, {
      timestamp: new Date().toISOString()
    });
    
    if (!syncFuncTree) {
      console.warn(`[TreeSyncService] clearTreeData: SyncFusion component not available for course ${courseId}`);
      return {
        success: false,
        operation: 'clear',
        error: 'SyncFusion component not available'
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
      
      console.log(`[TreeSyncService] Tree data cleared successfully for course ${courseId}`, {
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        operation: 'clear',
        nodeCount: 0
      };
    } catch (error) {
      console.error(`[TreeSyncService] Error clearing tree data for course ${courseId}:`, error);
      return {
        success: false,
        operation: 'clear',
        error: error instanceof Error ? error.message : 'Clear error'
      };
    }
  }

  /**
   * Handle SyncFusion onDataBound event
   */
  handleDataBound(treeData: TreeNode[], courseId?: number): void {
    console.log(`[TreeSyncService] Tree data bound completed for course ${courseId}`, {
      nodeCount: treeData?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Use TreeDataService for logging statistics
    if (treeData && treeData.length > 0) {
      this.treeDataService.logTreeStatistics(treeData);
    }
  }

  /**
   * Sort tree data and rebind to SyncFusion
   */
  sortAndRebind(
    treeData: TreeNode[],
    syncFuncTree: TreeViewComponent | null
  ): SyncResult {
    if (!syncFuncTree) {
      return {
        success: false,
        operation: 'bind',
        error: 'SyncFusion component not available for sort and rebind'
      };
    }

    try {
      this.treeDataService.sortTreeData(treeData);
      
      syncFuncTree.dataBind();
      
      console.log('[TreeSyncService] Tree data sorted and rebound', { 
        nodeCount: treeData.length,
        timestamp: new Date().toISOString() 
      });
      
      return {
        success: true,
        operation: 'bind',
        nodeCount: treeData.length
      };
    } catch (error) {
      console.error('[TreeSyncService] Error sorting and rebinding:', error);
      return {
        success: false,
        operation: 'bind',
        error: error instanceof Error ? error.message : 'Sort and bind error'
      };
    }
  }

  /**
   * Validate SyncFusion component state
   */
  validateTreeComponent(syncFuncTree: TreeViewComponent | null): {
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
    
    return {
      isValid: issues.length === 0,
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
             typeof syncFuncTree.dataBind === 'function';
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