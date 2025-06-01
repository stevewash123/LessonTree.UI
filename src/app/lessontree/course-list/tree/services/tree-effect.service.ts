// RESPONSIBILITY: Manages reactive effects for tree component, handles signal-based state changes and coordination.
// DOES NOT: Handle UI operations, data transformation, or direct service calls.
// CALLED BY: TreeWrapper for effect setup and coordination during component lifecycle.

import { Injectable, effect, EffectRef, inject, Injector, runInInjectionContext } from '@angular/core';
import { TreeData } from '../../../../models/tree-node';
import { Course } from '../../../../models/course';
import { CourseDataService } from '../../../../core/services/course-data.service';
import { NodeSelectionService } from '../../../../core/services/node-selection.service';

export interface TreeEffectCallbacks {
  onCourseDataUpdated: (course: Course) => void;
  onCourseCleared: () => void;
  onExternalSelection: (node: TreeData) => Promise<void>;
  onInternalTreeChange: () => void;
  onExternalTreeChange: () => void;
}

export interface EffectSetupResult {
  success: boolean;
  effectsCreated: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeEffectsService {
  private activeEffects: Map<string, EffectRef[]> = new Map();
  private readonly injector = inject(Injector); // FIX: Add injector for proper context

  constructor(
    private courseDataService: CourseDataService,
    private nodeSelectionService: NodeSelectionService
  ) {
    console.log('[TreeEffectsService] Service initialized', { 
      timestamp: new Date().toISOString() 
    });
  }

  /**
   * Setup all effects for a tree component
   * FIX: Use runInInjectionContext to ensure proper injection context
   */
  setupEffects(courseId: number, callbacks: TreeEffectCallbacks): EffectSetupResult {
    console.log('[TreeEffectsService] Setting up effects for course', {
      courseId,
      timestamp: new Date().toISOString()
    });

    try {
      const effects: EffectRef[] = [];
      const effectKey = `course_${courseId}`;

      // Clean up any existing effects for this course
      this.destroyEffectsForCourse(courseId);

      // FIX: Wrap effect creation in proper injection context
      runInInjectionContext(this.injector, () => {
        // 1. Course Data Effect
        const courseDataEffect = this.setupCourseDataEffect(courseId, callbacks);
        effects.push(courseDataEffect);

        // 2. External Selection Effect  
        const externalSelectionEffect = this.setupExternalSelectionEffect(courseId, callbacks);
        effects.push(externalSelectionEffect);

        // 3. Node Lifecycle Effect
        const nodeLifecycleEffect = this.setupNodeLifecycleEffect(courseId, callbacks);
        effects.push(nodeLifecycleEffect);
      });

      // Store effects for cleanup
      this.activeEffects.set(effectKey, effects);

      console.log('[TreeEffectsService] Effects setup completed', {
        courseId,
        effectsCreated: effects.length,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        effectsCreated: effects.length
      };

    } catch (error) {
      console.error('[TreeEffectsService] Failed to setup effects:', error, {
        courseId,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        effectsCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown setup error'
      };
    }
  }

  /**
   * Setup course data change effect
   */
  private setupCourseDataEffect(courseId: number, callbacks: TreeEffectCallbacks): EffectRef {
    return effect(() => {
      const activeCourses = this.courseDataService.activeCourses();
      
      console.log('[TreeEffectsService] Course data effect triggered', {
        courseId,
        activeCoursesCount: activeCourses.length,
        timestamp: new Date().toISOString()
      });

      if (activeCourses.length > 0) {
        const updatedCourse = activeCourses.find(c => c.id === courseId);
        
        if (updatedCourse) {
          console.log(`[TreeEffectsService] Course data updated for course ${courseId}`, {
            courseTitle: updatedCourse.title,
            timestamp: new Date().toISOString()
          });
          
          callbacks.onCourseDataUpdated(updatedCourse);
        } else {
          // Course is not in activeCourses (filtered out or archived)
          console.log(`[TreeEffectsService] Course ${courseId} not in active courses`, {
            timestamp: new Date().toISOString()
          });
          callbacks.onCourseCleared();
        }
      } else {
        console.log(`[TreeEffectsService] No active courses available`, {
          courseId,
          timestamp: new Date().toISOString()
        });
        callbacks.onCourseCleared();
      }
    });
  }

  /**
   * Setup external selection effect
   */
  private setupExternalSelectionEffect(courseId: number, callbacks: TreeEffectCallbacks): EffectRef {
    return effect(() => {
      const node = this.nodeSelectionService.selectedNode();
      const source = this.nodeSelectionService.selectionSource();
      
      console.log('[TreeEffectsService] External selection effect triggered', {
        courseId,
        nodeId: node?.nodeId,
        nodeType: node?.nodeType,
        source,
        timestamp: new Date().toISOString()
      });
      
      // Only process selections from sources other than the tree
      if (source !== 'tree' && node) {
        console.log(`[TreeEffectsService] Processing external selection for course ${courseId}`, {
          nodeId: node.nodeId,
          nodeType: node.nodeType,
          nodeCourseId: node.courseId,
          treeCourseId: courseId,
          source,
          timestamp: new Date().toISOString()
        });
        
        callbacks.onExternalSelection(node);
      }
    });
  }

  /**
   * Setup node lifecycle changes effect
   */
  private setupNodeLifecycleEffect(courseId: number, callbacks: TreeEffectCallbacks): EffectRef {
    return effect(() => {
      const addedInfo = this.courseDataService.nodeAdded();
      const editedInfo = this.courseDataService.nodeEdited();
      const movedInfo = this.courseDataService.nodeMoved();
      const deletedInfo = this.courseDataService.nodeDeleted();
      
      console.log('[TreeEffectsService] Node lifecycle effect triggered', {
        courseId,
        hasAdded: !!addedInfo,
        hasEdited: !!editedInfo,
        hasMoved: !!movedInfo,
        hasDeleted: !!deletedInfo,
        timestamp: new Date().toISOString()
      });
      
      // Check if any changes affect this course
      const affectsThisCourse = 
        (addedInfo && this.isNodeInCourse(addedInfo.node, courseId)) ||
        (editedInfo && this.isNodeInCourse(editedInfo.node, courseId)) ||
        (movedInfo && this.isNodeInCourse(movedInfo.node, courseId)) ||
        (deletedInfo && this.isNodeInCourse(deletedInfo.node, courseId));
      
      if (affectsThisCourse) {
        // Check if change came from this tree component
        const isInternalTreeChange = 
          (movedInfo && movedInfo.changeSource === 'tree' && movedInfo.node.courseId === courseId) ||
          (editedInfo && editedInfo.source === 'tree' && editedInfo.node.courseId === courseId);
        
        const changeSource = movedInfo?.changeSource || editedInfo?.source || addedInfo?.source || deletedInfo?.source;
        const nodeType = movedInfo?.node.nodeType || editedInfo?.node.nodeType || addedInfo?.node.nodeType || deletedInfo?.node.nodeType;
        
        if (isInternalTreeChange) {
          console.log(`[TreeEffectsService] Internal tree change detected - syncing data only`, {
            courseId,
            changeSource,
            nodeType,
            timestamp: new Date().toISOString()
          });
          callbacks.onInternalTreeChange();
        } else {
          console.log(`[TreeEffectsService] External change detected - rebuilding tree`, {
            courseId,
            changeSource,
            nodeType,
            timestamp: new Date().toISOString()
          });
          callbacks.onExternalTreeChange();
        }
      }
    });
  }

  /**
   * Check if a node belongs to the specified course
   */
  private isNodeInCourse(node: TreeData, courseId: number): boolean {
    // Handle both the old direct TreeData and new {node, source} structure
    const actualNode = (node as any).node ? (node as any).node : node;
    return actualNode.courseId === courseId;
  }

  /**
   * Destroy effects for a specific course
   */
  destroyEffectsForCourse(courseId: number): void {
    const effectKey = `course_${courseId}`;
    const effects = this.activeEffects.get(effectKey);
    
    if (effects) {
      console.log('[TreeEffectsService] Destroying effects for course', {
        courseId,
        effectCount: effects.length,
        timestamp: new Date().toISOString()
      });
      
      effects.forEach(effectRef => {
        try {
          effectRef.destroy();
        } catch (error) {
          console.warn('[TreeEffectsService] Error destroying effect:', error);
        }
      });
      
      this.activeEffects.delete(effectKey);
    }
  }

  /**
   * Destroy all active effects
   */
  destroyAllEffects(): void {
    console.log('[TreeEffectsService] Destroying all effects', {
      activeCoursesCount: this.activeEffects.size,
      timestamp: new Date().toISOString()
    });
    
    for (const [courseKey, effects] of this.activeEffects.entries()) {
      console.log(`[TreeEffectsService] Destroying effects for ${courseKey}`, {
        effectCount: effects.length,
        timestamp: new Date().toISOString()
      });
      
      effects.forEach(effectRef => {
        try {
          effectRef.destroy();
        } catch (error) {
          console.warn('[TreeEffectsService] Error destroying effect:', error);
        }
      });
    }
    
    this.activeEffects.clear();
  }

  /**
   * Get effect statistics for debugging
   */
  getEffectStats(): {
    totalCourses: number;
    totalEffects: number;
    courseEffects: Record<string, number>;
  } {
    const courseEffects: Record<string, number> = {};
    let totalEffects = 0;
    
    for (const [courseKey, effects] of this.activeEffects.entries()) {
      courseEffects[courseKey] = effects.length;
      totalEffects += effects.length;
    }
    
    return {
      totalCourses: this.activeEffects.size,
      totalEffects,
      courseEffects
    };
  }

  /**
   * Check if effects are active for a course
   */
  hasActiveEffects(courseId: number): boolean {
    const effectKey = `course_${courseId}`;
    return this.activeEffects.has(effectKey);
  }
}