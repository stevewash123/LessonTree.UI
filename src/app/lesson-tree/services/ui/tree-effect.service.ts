// **COMPLETE FILE** - TreeEffectsService with Observable pattern migration
// RESPONSIBILITY: Manages reactive effects for tree component, handles signal-based state changes and Observable event coordination.
// DOES NOT: Handle UI operations, data transformation, or direct service calls.
// CALLED BY: TreeWrapper for effect setup and coordination during component lifecycle.

import { Injectable, effect, EffectRef, inject, Injector, runInInjectionContext } from '@angular/core';
import { Subscription } from 'rxjs';
import { Course } from '../../../models/course';
import { CourseDataService } from '../course-data/course-data.service';
import { CourseSignalService } from '../course-data/course-signal.service';
import {TreeData} from '../../../models/tree-node';
import {EntitySelectionService} from '../state/entity-selection.service';
import { EntitySignalPayload, EntityMoveSignalPayload } from '../course-data/course-signal.service';

export interface TreeEffectCallbacks {
  onCourseDataUpdated: (course: Course) => void;
  onCourseCleared: () => void;
  onExternalSelection: (node: TreeData) => Promise<void>;
  onInternalTreeChange: () => void;
}

export interface EffectSetupResult {
  success: boolean;
  effectsCreated: number;
  subscriptionsCreated: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeEffectsService {
  private activeEffects: Map<string, EffectRef[]> = new Map();
  private activeSubscriptions: Map<string, Subscription[]> = new Map();
  private readonly injector = inject(Injector);

  constructor(
    private courseDataService: CourseDataService,
    private entitySelectionService: EntitySelectionService,
    private courseSignalService: CourseSignalService
  ) {
    console.log('[TreeEffectsService] Service initialized with Observable event handling');
  }

  /**
   * Setup all effects for a tree component
   */
  setupEffects(courseId: number, callbacks: TreeEffectCallbacks): EffectSetupResult {
    try {
      const effects: EffectRef[] = [];
      const subscriptions: Subscription[] = [];
      const effectKey = `course_${courseId}`;

      // Clean up any existing effects and subscriptions for this course
      this.destroyEffectsForCourse(courseId);

      // Wrap effect creation in proper injection context
      runInInjectionContext(this.injector, () => {
        // 1. Course Data Effect (Signal - state monitoring)
        const courseDataEffect = this.setupCourseDataEffect(courseId, callbacks);
        effects.push(courseDataEffect);

        // 2. External Selection Effect (Signal - state monitoring)
        const externalSelectionEffect = this.setupExternalSelectionEffect(courseId, callbacks);
        effects.push(externalSelectionEffect);
      });

      // 3. Node Lifecycle Subscriptions (Observable - event handling)
      const nodeSubscriptions = this.setupNodeLifecycleSubscriptions(courseId, callbacks);
      subscriptions.push(...nodeSubscriptions);

      // Store effects and subscriptions for cleanup
      this.activeEffects.set(effectKey, effects);
      this.activeSubscriptions.set(effectKey, subscriptions);

      return {
        success: true,
        effectsCreated: effects.length,
        subscriptionsCreated: subscriptions.length
      };

    } catch (error) {
      console.error('[TreeEffectsService] Failed to setup effects:', error);

      return {
        success: false,
        effectsCreated: 0,
        subscriptionsCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown setup error'
      };
    }
  }

  /**
   * Setup course data change effect - Signal pattern for state monitoring
   */
  private setupCourseDataEffect(courseId: number, callbacks: TreeEffectCallbacks): EffectRef {
    return effect(() => {
      const activeCourses = this.courseDataService.activeCourses();

      if (activeCourses.length > 0) {
        const updatedCourse = activeCourses.find((c: Course) => c.id === courseId);

        if (updatedCourse) {
          callbacks.onCourseDataUpdated(updatedCourse);
        } else {
          callbacks.onCourseCleared();
        }
      } else {
        callbacks.onCourseCleared();
      }
    });
  }

  /**
   * Setup external selection effect - Signal pattern for state monitoring
   */
  private setupExternalSelectionEffect(courseId: number, callbacks: TreeEffectCallbacks): EffectRef {
    return effect(() => {
      const entity = this.entitySelectionService.selectedEntity();
      const source = this.entitySelectionService.selectionSource();

      if (source !== 'tree' && entity) {
        callbacks.onExternalSelection(entity);
      }
    });
  }

  /**
   * Setup node lifecycle subscriptions using Observable pattern for events
   */
  private setupNodeLifecycleSubscriptions(courseId: number, callbacks: TreeEffectCallbacks): Subscription[] {
    const subscriptions: Subscription[] = [];

    // Observable subscription for nodeAdded events
    const nodeAddedSub = this.courseSignalService.entityAdded$.subscribe((addedEvent: EntitySignalPayload) => {
      console.log('🌳 [TreeEffectsService] RECEIVED nodeAdded EVENT (Observable)', {
        courseId: courseId,
        nodeType: addedEvent.entity.nodeType,
        nodeId: addedEvent.entity.nodeId,
        nodeTitle: addedEvent.entity.title,
        source: addedEvent.source,
        operationType: addedEvent.operationType,
        timestamp: addedEvent.timestamp.toISOString(),
        affectsThisCourse: this.isNodeInCourse(addedEvent.entity, courseId),
        pattern: 'Observable - emit once, consume once'
      });

      if (this.isNodeInCourse(addedEvent.entity, courseId)) {
        console.log('🌳 [TreeEffectsService] Node addition affects course - coordination only', {
          courseId: courseId,
          nodeTitle: addedEvent.entity.title,
          reason: 'TreeWrapper handles tree operations directly',
          action: 'effect coordination only'
        });
      }
    });
    subscriptions.push(nodeAddedSub);

    // Observable subscription for nodeEdited events
    const nodeEditedSub = this.courseSignalService.entityEdited$.subscribe((editedEvent: EntitySignalPayload) => {
      console.log('🌳 [TreeEffectsService] RECEIVED nodeEdited EVENT (Observable)', {
        courseId: courseId,
        nodeType: editedEvent.entity.nodeType,
        nodeId: editedEvent.entity.nodeId,
        nodeTitle: editedEvent.entity.title,
        source: editedEvent.source,
        operationType: editedEvent.operationType,
        affectsThisCourse: this.isNodeInCourse(editedEvent.entity, courseId)
      });

      if (this.isNodeInCourse(editedEvent.entity, courseId)) {
        console.log('🌳 [TreeEffectsService] Node edit affects course - coordination only');
      }
    });
    subscriptions.push(nodeEditedSub);

    // Observable subscription for nodeDeleted events
    const nodeDeletedSub = this.courseSignalService.entityDeleted$.subscribe((deletedEvent: EntitySignalPayload) => {
      console.log('🌳 [TreeEffectsService] RECEIVED nodeDeleted EVENT (Observable)', {
        courseId: courseId,
        nodeType: deletedEvent.entity.nodeType,
        nodeId: deletedEvent.entity.nodeId,
        nodeTitle: deletedEvent.entity.title,
        source: deletedEvent.source,
        operationType: deletedEvent.operationType,
        affectsThisCourse: this.isNodeInCourse(deletedEvent.entity, courseId)
      });

      if (this.isNodeInCourse(deletedEvent.entity, courseId)) {
        console.log('🌳 [TreeEffectsService] Node deletion affects course - coordination only');
      }
    });
    subscriptions.push(nodeDeletedSub);

    // Observable subscription for nodeMoved events
    const nodeMovedSub = this.courseSignalService.entityMoved$.subscribe((movedEvent: EntityMoveSignalPayload) => {
      console.log('🌳 [TreeEffectsService] RECEIVED nodeMoved EVENT (Observable)', {
        courseId: courseId,
        nodeType: movedEvent.entity.nodeType,
        nodeId: movedEvent.entity.nodeId,
        nodeTitle: movedEvent.entity.title,
        source: movedEvent.source,
        affectsThisCourse: this.isNodeInCourse(movedEvent.entity, courseId)
      });

      if (this.isNodeInCourse(movedEvent.entity, courseId)) {
        console.log('🌳 [TreeEffectsService] Node move affects course - coordination only');
      }
    });
    subscriptions.push(nodeMovedSub);

    return subscriptions;
  }

  /**
   * Check if a node belongs to the specified course
   */
  private isNodeInCourse(node: TreeData, courseId: number): boolean {
    const actualNode = (node as any).node ? (node as any).node : node;
    return actualNode.courseId === courseId;
  }

  /**
   * Destroy effects and subscriptions for a specific course
   */
  destroyEffectsForCourse(courseId: number): void {
    const effectKey = `course_${courseId}`;

    // Clean up Signal effects
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

    // Clean up Observable subscriptions
    const subscriptions = this.activeSubscriptions.get(effectKey);
    if (subscriptions) {
      subscriptions.forEach(subscription => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn('[TreeEffectsService] Error unsubscribing:', error);
        }
      });
      this.activeSubscriptions.delete(effectKey);
    }
  }

  /**
   * Destroy all active effects and subscriptions
   */
  destroyAllEffects(): void {
    // Clean up Signal effects
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

    // Clean up Observable subscriptions
    for (const [courseKey, subscriptions] of this.activeSubscriptions.entries()) {
      subscriptions.forEach(subscription => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn('[TreeEffectsService] Error unsubscribing:', error);
        }
      });
    }
    this.activeSubscriptions.clear();
  }

  /**
   * Get effect statistics for debugging
   */
  getEffectStats(): {
    totalCourses: number;
    totalEffects: number;
    totalSubscriptions: number;
    courseEffects: Record<string, number>;
    courseSubscriptions: Record<string, number>;
  } {
    const courseEffects: Record<string, number> = {};
    const courseSubscriptions: Record<string, number> = {};
    let totalEffects = 0;
    let totalSubscriptions = 0;

    for (const [courseKey, effects] of this.activeEffects.entries()) {
      courseEffects[courseKey] = effects.length;
      totalEffects += effects.length;
    }

    for (const [courseKey, subscriptions] of this.activeSubscriptions.entries()) {
      courseSubscriptions[courseKey] = subscriptions.length;
      totalSubscriptions += subscriptions.length;
    }

    return {
      totalCourses: this.activeEffects.size,
      totalEffects,
      totalSubscriptions,
      courseEffects,
      courseSubscriptions
    };
  }

  /**
   * Check if effects are active for a course
   */
  hasActiveEffects(courseId: number): boolean {
    const effectKey = `course_${courseId}`;
    return this.activeEffects.has(effectKey) || this.activeSubscriptions.has(effectKey);
  }
}
