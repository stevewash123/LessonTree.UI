// **COMPLETE FILE** - Enhanced tree-sync.service.ts with Observable patterns
// RESPONSIBILITY: Handles SyncFusion tree component integration, data binding, and UI synchronization with Observable coordination
// DOES NOT: Handle business logic, node operations, or data transformation
// CALLED BY: TreeWrapper for SyncFusion lifecycle management and data binding operations

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { TreeDataService } from './tree-data.service';
import { Course } from '../../../models/course';
import { TreeNode } from '../../../models/tree-node';

export interface SyncResult {
  success: boolean;
  operation: 'bind' | 'clear' | 'update' | 'sync' | 'add';
  nodeCount?: number;
  error?: string;
}

// ✅ Event interfaces for Observable pattern
export interface TreeSyncOperationEvent {
  operation: 'add' | 'update' | 'sync' | 'clear' | 'sort';
  courseId: number;
  success: boolean;
  nodeCount?: number;
  error?: string;
  preservesState: boolean; // true for addLessonNode, false for syncDataOnly
  syncResult: SyncResult;
  timestamp: Date;
}

export interface SyncFusionComponentEvent {
  courseId: number;
  componentState: 'ready' | 'not-ready' | 'unavailable' | 'validated';
  operation: string;
  issues?: string[];
  validationResult?: any;
  timestamp: Date;
}

export interface TreeDataBoundEvent {
  courseId: number;
  nodeCount: number;
  treeStatistics: any;
  operation: 'data-bound' | 'statistics-logged';
  timestamp: Date;
}

export interface IncrementalUpdateEvent {
  operation: 'add-lesson-node';
  courseId: number;
  parentNodeId: string;
  lessonTitle: string;
  lessonId: number;
  success: boolean;
  preservedTreeState: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TreeSyncService implements OnDestroy {

  // ✅ Observable event emissions
  private readonly _treeSyncOperation = new Subject<TreeSyncOperationEvent>();
  private readonly _syncFusionComponent = new Subject<SyncFusionComponentEvent>();
  private readonly _treeDataBound = new Subject<TreeDataBoundEvent>();
  private readonly _incrementalUpdate = new Subject<IncrementalUpdateEvent>();

  // Public observables
  readonly treeSyncOperation$ = this._treeSyncOperation.asObservable();
  readonly syncFusionComponent$ = this._syncFusionComponent.asObservable();
  readonly treeDataBound$ = this._treeDataBound.asObservable();
  readonly incrementalUpdate$ = this._incrementalUpdate.asObservable();

  // ✅ Subscription management (for potential future Observable consumption)
  private subscriptions = new Subscription();

  constructor(private treeDataService: TreeDataService) {
    console.log('[TreeSyncService] Enhanced with Observable patterns for SyncFusion coordination');
  }

  /**
   * ✅ Enhanced: Add lesson node incrementally with Observable emission
   * BEST PRACTICE: Uses SyncFusion's addNodes() method to preserve tree state
   */
  addLessonNode(
    lesson: any,
    syncFuncTree: TreeViewComponent | null,
    parentNodeId: string,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Adding lesson node with Observable event emission');

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] addLessonNode: ${errorMessage} for course ${courseId}`);

      const result: SyncResult = {
        success: false,
        operation: 'add',
        error: errorMessage
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('add', courseId, result, true);
      this.emitIncrementalUpdateEvent('add-lesson-node', courseId, parentNodeId, lesson, result);
      this.emitComponentEvent(courseId, 'unavailable', 'addLessonNode');

      return result;
    }

    if (!this.isComponentReady(syncFuncTree)) {
      const errorMessage = 'SyncFusion component not ready';
      console.warn(`[TreeSyncService] addLessonNode: ${errorMessage} for course ${courseId}`);

      const result: SyncResult = {
        success: false,
        operation: 'add',
        error: errorMessage
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('add', courseId, result, true);
      this.emitIncrementalUpdateEvent('add-lesson-node', courseId, parentNodeId, lesson, result);
      this.emitComponentEvent(courseId, 'not-ready', 'addLessonNode');

      return result;
    }

    try {
      // Create the new lesson node using TreeDataService
      const newLessonNode = this.treeDataService.createLessonNode(lesson);

      console.log(`[TreeSyncService] Adding lesson node "${lesson.title}" to parent "${parentNodeId}" for course ${courseId}`);

      // Use SyncFusion's addNodes() method - preserves tree state
      syncFuncTree.addNodes([newLessonNode], parentNodeId);

      const result: SyncResult = {
        success: true,
        operation: 'add',
        nodeCount: 1
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('add', courseId, result, true);
      this.emitIncrementalUpdateEvent('add-lesson-node', courseId, parentNodeId, lesson, result);

      console.log('[TreeSyncService] Lesson node added successfully and events emitted', {
        courseId,
        lessonTitle: lesson.title,
        parentNodeId,
        preservedState: true
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Add node error';
      console.error(`[TreeSyncService] Error adding lesson node for course ${courseId}:`, error);

      const result: SyncResult = {
        success: false,
        operation: 'add',
        error: errorMessage
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('add', courseId, result, true);
      this.emitIncrementalUpdateEvent('add-lesson-node', courseId, parentNodeId, lesson, result);

      return result;
    }
  }

  /**
   * ✅ Enhanced: Build tree data and bind with Observable emission
   */
  updateTreeData(
    course: Course | null,
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): Promise<SyncResult> {
    console.log('[TreeSyncService] Updating tree data with Observable event emission');

    // Enhanced validation
    if (!course) {
      const errorMessage = 'No course provided';
      console.warn(`[TreeSyncService] updateTreeData: ${errorMessage} for courseId ${courseId}`);

      const result: SyncResult = {
        success: false,
        operation: 'update',
        error: errorMessage
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('update', courseId, result, false);

      return Promise.resolve(result);
    }

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] updateTreeData: ${errorMessage} for course ${courseId}`);

      const result: SyncResult = {
        success: false,
        operation: 'update',
        error: errorMessage
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('update', courseId, result, false);
      this.emitComponentEvent(courseId, 'unavailable', 'updateTreeData');

      return Promise.resolve(result);
    }

    // Use TreeDataService to build tree structure
    const treeData = this.treeDataService.buildTreeFromCourse(course, courseId);

    // Queue the binding operation for next tick to ensure DOM is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Double-check that syncFuncTree is still available
          if (!syncFuncTree) {
            const errorMessage = 'SyncFusion component became unavailable';
            console.error(`[TreeSyncService] ${errorMessage} during update for course ${courseId}`);

            const result: SyncResult = {
              success: false,
              operation: 'update',
              error: errorMessage
            };

            // ✅ Emit Observable events
            this.emitSyncOperationEvent('update', courseId, result, false);
            this.emitComponentEvent(courseId, 'unavailable', 'updateTreeData-delayed');

            resolve(result);
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

          syncFuncTree.dataBind();

          const result: SyncResult = {
            success: true,
            operation: 'update',
            nodeCount: treeData.length
          };

          // ✅ Emit Observable events
          this.emitSyncOperationEvent('update', courseId, result, false);
          this.emitComponentEvent(courseId, 'ready', 'updateTreeData-completed');

          console.log('[TreeSyncService] Tree data updated successfully and events emitted', {
            courseId,
            nodeCount: treeData.length,
            preservedState: false
          });

          resolve(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Binding error';
          console.error(`[TreeSyncService] Error binding tree data for course ${courseId}:`, error);

          const result: SyncResult = {
            success: false,
            operation: 'update',
            error: errorMessage
          };

          // ✅ Emit Observable event
          this.emitSyncOperationEvent('update', courseId, result, false);

          resolve(result);
        }
      }, 10); // Slightly longer delay to ensure view is stable
    });
  }

  /**
   * ✅ Enhanced: Full data sync with Observable emission
   * LEGACY: Causes tree collapse - use incremental methods when possible
   */
  syncDataOnly(
    course: Course | null,
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Performing full data sync with Observable event emission');
    console.warn(`[TreeSyncService] syncDataOnly called - this WILL cause tree collapse. Consider using incremental methods instead.`);

    if (!courseId || !course) {
      const result: SyncResult = {
        success: false,
        operation: 'sync',
        error: 'Invalid course data'
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('sync', courseId, result, false);

      return result;
    }

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] syncDataOnly: ${errorMessage} for course ${courseId}`);

      const result: SyncResult = {
        success: false,
        operation: 'sync',
        error: errorMessage
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('sync', courseId, result, false);
      this.emitComponentEvent(courseId, 'unavailable', 'syncDataOnly');

      return result;
    }

    try {
      // WARNING: This WILL trigger dataBind() and cause tree collapse
      const treeData = this.treeDataService.buildTreeFromCourse(course, courseId);

      syncFuncTree.fields = {
        ...syncFuncTree.fields,
        dataSource: treeData
      };

      const result: SyncResult = {
        success: true,
        operation: 'sync',
        nodeCount: treeData.length
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('sync', courseId, result, false);

      console.log('[TreeSyncService] Data sync completed and event emitted', {
        courseId,
        nodeCount: treeData.length,
        preservedState: false,
        causesCollapse: true
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync error';
      console.error(`[TreeSyncService] Error syncing data for course ${courseId}:`, error);

      const result: SyncResult = {
        success: false,
        operation: 'sync',
        error: errorMessage
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('sync', courseId, result, false);

      return result;
    }
  }

  /**
   * ✅ Enhanced: Clear tree data with Observable emission
   */
  clearTreeData(
    syncFuncTree: TreeViewComponent | null,
    courseId: number
  ): SyncResult {
    console.log('[TreeSyncService] Clearing tree data with Observable event emission');

    if (!syncFuncTree) {
      const errorMessage = 'SyncFusion component not available';
      console.warn(`[TreeSyncService] clearTreeData: ${errorMessage} for course ${courseId}`);

      const result: SyncResult = {
        success: false,
        operation: 'clear',
        error: errorMessage
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('clear', courseId, result, false);
      this.emitComponentEvent(courseId, 'unavailable', 'clearTreeData');

      return result;
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

      const result: SyncResult = {
        success: true,
        operation: 'clear',
        nodeCount: 0
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('clear', courseId, result, false);

      console.log('[TreeSyncService] Tree data cleared and event emitted', {
        courseId,
        nodeCount: 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Clear error';
      console.error(`[TreeSyncService] Error clearing tree data for course ${courseId}:`, error);

      const result: SyncResult = {
        success: false,
        operation: 'clear',
        error: errorMessage
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('clear', courseId, result, false);

      return result;
    }
  }

  /**
   * ✅ Enhanced: Handle SyncFusion onDataBound event with Observable emission
   */
  handleDataBound(treeData: TreeNode[], courseId?: number): void {
    console.log('[TreeSyncService] Handling data bound event with Observable emission');

    // Use TreeDataService for logging statistics
    if (treeData && treeData.length > 0) {
      this.treeDataService.logTreeStatistics(treeData);

      // ✅ Emit Observable event - statistics were logged, but method returns void
      this._treeDataBound.next({
        courseId: courseId || 0,
        nodeCount: treeData.length,
        treeStatistics: { logged: true, nodeCount: treeData.length }, // Simple statistics object
        operation: 'data-bound',
        timestamp: new Date()
      });

      console.log('[TreeSyncService] Data bound handled and event emitted', {
        courseId,
        nodeCount: treeData.length,
        statisticsLogged: true
      });
    }
  }

  /**
   * ✅ Enhanced: Sort and rebind with Observable emission
   */
  sortAndRebind(
    treeData: TreeNode[],
    syncFuncTree: TreeViewComponent | null,
    courseId: number = 0
  ): SyncResult {
    console.log('[TreeSyncService] Sorting and rebinding with Observable event emission');

    if (!syncFuncTree) {
      const result: SyncResult = {
        success: false,
        operation: 'bind',
        error: 'SyncFusion component not available for sort and rebind'
      };

      // ✅ Emit Observable events
      this.emitSyncOperationEvent('sort', courseId, result, false);
      this.emitComponentEvent(courseId, 'unavailable', 'sortAndRebind');

      return result;
    }

    try {
      this.treeDataService.sortTreeData(treeData);

      syncFuncTree.dataBind();

      const result: SyncResult = {
        success: true,
        operation: 'bind',
        nodeCount: treeData.length
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('sort', courseId, result, false);

      console.log('[TreeSyncService] Sort and rebind completed and event emitted', {
        courseId,
        nodeCount: treeData.length
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sort and bind error';
      console.error('[TreeSyncService] Error sorting and rebinding:', error);

      const result: SyncResult = {
        success: false,
        operation: 'bind',
        error: errorMessage
      };

      // ✅ Emit Observable event
      this.emitSyncOperationEvent('sort', courseId, result, false);

      return result;
    }
  }

  /**
   * ✅ Enhanced: Validate tree component with Observable emission
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

      // ✅ Emit Observable event
      this.emitComponentEvent(courseId, 'unavailable', 'validateTreeComponent', issues);

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
    const componentState = isValid ? 'ready' : 'not-ready';

    // ✅ Emit Observable event
    this.emitComponentEvent(courseId, componentState, 'validateTreeComponent', issues, {
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

  // === OBSERVABLE EVENT EMISSION HELPERS ===

  /**
   * ✅ Emit tree sync operation event
   */
  private emitSyncOperationEvent(
    operation: 'add' | 'update' | 'sync' | 'clear' | 'sort',
    courseId: number,
    syncResult: SyncResult,
    preservesState: boolean
  ): void {
    this._treeSyncOperation.next({
      operation,
      courseId,
      success: syncResult.success,
      nodeCount: syncResult.nodeCount,
      error: syncResult.error,
      preservesState,
      syncResult,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Emit SyncFusion component event
   */
  private emitComponentEvent(
    courseId: number,
    componentState: 'ready' | 'not-ready' | 'unavailable' | 'validated',
    operation: string,
    issues?: string[],
    validationResult?: any
  ): void {
    this._syncFusionComponent.next({
      courseId,
      componentState,
      operation,
      issues,
      validationResult,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Emit incremental update event
   */
  private emitIncrementalUpdateEvent(
    operation: 'add-lesson-node',
    courseId: number,
    parentNodeId: string,
    lesson: any,
    syncResult: SyncResult
  ): void {
    this._incrementalUpdate.next({
      operation,
      courseId,
      parentNodeId,
      lessonTitle: lesson.title || 'Unknown Lesson',
      lessonId: lesson.id || 0,
      success: syncResult.success,
      preservedTreeState: true, // addLessonNode always preserves state
      timestamp: new Date()
    });
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[TreeSyncService] Cleaning up Observable subscriptions and subjects');

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // ✅ Complete subjects
    this._treeSyncOperation.complete();
    this._syncFusionComponent.complete();
    this._treeDataBound.complete();
    this._incrementalUpdate.complete();

    console.log('[TreeSyncService] All Observable subjects and subscriptions completed');
  }
}
