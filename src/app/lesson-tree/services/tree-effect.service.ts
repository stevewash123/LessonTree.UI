// RESPONSIBILITY: Manages reactive effects for tree component, handles signal-based state changes and coordination.
// DOES NOT: Handle UI operations, data transformation, or direct service calls.
// CALLED BY: TreeWrapper for effect setup and coordination during component lifecycle.

import { Injectable, effect, EffectRef, inject, Injector, runInInjectionContext } from '@angular/core';
import { Course } from '../../models/course';
import { TreeData } from '../../models/tree-node';
import { CourseDataService } from '../../shared/services/course-data.service';
import { NodeSelectionService } from './node-selection.service';

export interface TreeEffectCallbacks {
  onCourseDataUpdated: (course: Course) => void;
  onCourseCleared: () => void;
  onExternalSelection: (node: TreeData) => Promise<void>;
  onInternalTreeChange: () => void;
  // REMOVED: onExternalTreeChange - was redundant with onInternalTreeChange
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
  private readonly injector = inject(Injector);

  constructor(
    private courseDataService: CourseDataService,
    private nodeSelectionService: NodeSelectionService
  ) {
    console.log('[TreeEffectsService] Service initialized');
  }

  /**
   * Setup all effects for a tree component
   */
  setupEffects(courseId: number, callbacks: TreeEffectCallbacks): EffectSetupResult {
    try {
      const effects: EffectRef[] = [];
      const effectKey = `course_${courseId}`;

      // Clean up any existing effects for this course
      this.destroyEffectsForCourse(courseId);

      // Wrap effect creation in proper injection context
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

      return {
        success: true,
        effectsCreated: effects.length
      };

    } catch (error) {
      console.error('[TreeEffectsService] Failed to setup effects:', error);

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

      if (activeCourses.length > 0) {
        const updatedCourse = activeCourses.find(c => c.id === courseId);
        
        if (updatedCourse) {
          callbacks.onCourseDataUpdated(updatedCourse);
        } else {
          // Course is not in activeCourses (filtered out or archived)
          callbacks.onCourseCleared();
        }
      } else {
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
      
      // Only process selections from sources other than the tree
      if (source !== 'tree' && node) {
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
      
      // Check if any changes affect this course
      const affectsThisCourse = 
        (addedInfo && this.isNodeInCourse(addedInfo.node, courseId)) ||
        (editedInfo && this.isNodeInCourse(editedInfo.node, courseId)) ||
        (movedInfo && this.isNodeInCourse(movedInfo.node, courseId)) ||
        (deletedInfo && this.isNodeInCourse(deletedInfo.node, courseId));
      
      if (affectsThisCourse) {
        // FIXED: All tree changes (internal or external) are handled the same way
        // Whether change came from tree drag/drop or from LessonPanel, the tree needs to sync data
        callbacks.onInternalTreeChange();
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
    for (const [courseKey, effects] of this.activeEffects.entries()) {
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