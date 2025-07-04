// **COMPLETE FILE** - PanelStateService with Dual Signal/Observable Pattern
// RESPONSIBILITY: Centralized panel state management with cross-component event coordination
// DOES NOT: Create complex templates - pure state management with event emission
// CALLED BY: InfoPanel components for mode coordination

import { computed, Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Course } from '../models/course';
import { Topic } from '../models/topic';
import { SubTopic } from '../models/subTopic';
import { Lesson } from '../models/lesson';

export type PanelMode = 'view' | 'edit' | 'add';
export type EntityType = 'Course' | 'Topic' | 'SubTopic' | 'Lesson';

// ✅ Observable event interfaces
export interface PanelModeChangeEvent {
  previousMode: PanelMode;
  newMode: PanelMode;
  trigger: 'user-action' | 'programmatic' | 'reset';
  entityType?: EntityType;
  entityId?: number;
  timestamp: Date;
}

export interface AddModeInitiatedEvent {
  entityType: EntityType;
  parentEntity: Course | Topic | SubTopic | null;
  courseId: number | null;
  template: any;
  timestamp: Date;
}

export interface EditModeInitiatedEvent {
  entity: Course | Topic | SubTopic | Lesson;
  entityType: EntityType;
  entityId: number;
  courseId: number | null;
  timestamp: Date;
}

export interface PanelStateResetEvent {
  previousMode: PanelMode;
  resetType: 'to-view' | 'clear-all';
  timestamp: Date;
}

export interface TemplateCreatedEvent {
  nodeType: EntityType;
  template: any;
  courseId: number | null;
  parentEntity: Course | Topic | SubTopic | null;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PanelStateService {

  // ✅ Observable events for cross-component coordination
  private readonly _panelModeChanged$ = new Subject<PanelModeChangeEvent>();
  private readonly _addModeInitiated$ = new Subject<AddModeInitiatedEvent>();
  private readonly _editModeInitiated$ = new Subject<EditModeInitiatedEvent>();
  private readonly _panelStateReset$ = new Subject<PanelStateResetEvent>();
  private readonly _templateCreated$ = new Subject<TemplateCreatedEvent>();

  // Public observables for business logic subscriptions
  readonly panelModeChanged$ = this._panelModeChanged$.asObservable();
  readonly addModeInitiated$ = this._addModeInitiated$.asObservable();
  readonly editModeInitiated$ = this._editModeInitiated$.asObservable();
  readonly panelStateReset$ = this._panelStateReset$.asObservable();
  readonly templateCreated$ = this._templateCreated$.asObservable();

  // ✅ Signal state for reactive UI
  private readonly _panelMode = signal<PanelMode>('view');
  private readonly _addNodeType = signal<EntityType | null>(null);
  private readonly _parentNode = signal<Course | Topic | SubTopic | null>(null);
  private readonly _courseId = signal<number | null>(null);
  private readonly _nodeTemplate = signal<any | null>(null);

  // Public readonly signals for reactive UI
  readonly panelMode = this._panelMode.asReadonly();
  readonly addEntityType = this._addNodeType.asReadonly();
  readonly parentEntity = this._parentNode.asReadonly();
  readonly courseId = this._courseId.asReadonly();
  readonly nodeTemplate = this._nodeTemplate.asReadonly();

  // Computed signals for derived state (keep as signals for reactive UI)
  readonly isOverlayActive = computed(() => {
    const mode = this._panelMode();
    return mode === 'edit' || mode === 'add';
  });

  readonly isViewMode = computed(() => this._panelMode() === 'view');
  readonly isEditMode = computed(() => this._panelMode() === 'edit');
  readonly isAddMode = computed(() => this._panelMode() === 'add');

  readonly addModeContext = computed((): {
    nodeType: EntityType | null;
    parentNode: Course | Topic | SubTopic | null;
    courseId: number | null;
    template: any | null;
  } | null => {
    if (this._panelMode() !== 'add') return null;

    return {
      nodeType: this._addNodeType(),
      parentNode: this._parentNode(),
      courseId: this._courseId(),
      template: this._nodeTemplate()
    };
  });

  readonly hasValidAddContext = computed(() => {
    const context = this.addModeContext();
    return context !== null &&
      context.nodeType !== null &&
      context.courseId !== null;
  });

  constructor() {
    console.log('[PanelStateService] Initialized with dual Signal/Observable pattern');
  }

  // ✅ ENHANCED: Set panel mode with Observable event emission
  setMode(mode: PanelMode): void {
    const previousMode = this._panelMode();

    console.log(`[PanelStateService] Setting mode to ${mode}`, {
      previousMode,
      timestamp: new Date().toISOString()
    });

    // ✅ Update signal state
    this._panelMode.set(mode);

    // ✅ Emit Observable event for cross-component coordination
    this._panelModeChanged$.next({
      previousMode,
      newMode: mode,
      trigger: 'user-action',
      timestamp: new Date()
    });
  }

  // ✅ ENHANCED: Initiate add mode with Observable event emission
  initiateAddMode(nodeType: EntityType, parentNode: Course | Topic | SubTopic | null = null, courseId?: number): void {
    const previousMode = this._panelMode();

    console.log(`[PanelStateService] Initiating add mode for ${nodeType}`, {
      previousMode,
      hasParentNode: !!parentNode,
      providedCourseId: courseId,
      timestamp: new Date().toISOString()
    });

    const resolvedCourseId = courseId || this.extractCourseId(parentNode);

    if (!resolvedCourseId) {
      console.error('[PanelStateService] Cannot determine course ID for add operation');
      return;
    }

    // Create basic template
    const template = this.createBasicTemplate(nodeType, resolvedCourseId, parentNode);

    // ✅ Update signal state
    this._addNodeType.set(nodeType);
    this._parentNode.set(parentNode);
    this._courseId.set(resolvedCourseId);
    this._nodeTemplate.set(template);
    this._panelMode.set('add');

    // ✅ Emit Observable events for cross-component coordination

    // 1. Panel mode changed event
    this._panelModeChanged$.next({
      previousMode,
      newMode: 'add',
      trigger: 'programmatic',
      entityType: nodeType,
      timestamp: new Date()
    });

    // 2. Add mode initiated event
    this._addModeInitiated$.next({
      entityType: nodeType,
      parentEntity: parentNode,
      courseId: resolvedCourseId,
      template,
      timestamp: new Date()
    });

    // 3. Template created event
    this._templateCreated$.next({
      nodeType,
      template,
      courseId: resolvedCourseId,
      parentEntity: parentNode,
      timestamp: new Date()
    });

    console.log(`[PanelStateService] Add mode initiated successfully`, {
      nodeType,
      courseId: resolvedCourseId,
      templateCreated: !!template,
      timestamp: new Date().toISOString()
    });
  }

  private extractCourseId(parentNode: Course | Topic | SubTopic | null): number | null {
    if (!parentNode) return null;

    if ('courseId' in parentNode && typeof parentNode.courseId === 'number') {
      return parentNode.courseId;
    } else if ('id' in parentNode && typeof parentNode.id === 'number') {
      // If parentNode is Course itself
      return parentNode.id;
    }

    return null;
  }

  // ✅ ENHANCED: Create basic template with improved debugging
  private createBasicTemplate(nodeType: EntityType, courseId: number, parentNode: Course | Topic | SubTopic | null): any {
    console.log(`[PanelStateService] Creating template for ${nodeType}`, {
      courseId,
      hasParentNode: !!parentNode,
      parentNodeType: parentNode?.entityType,
      timestamp: new Date().toISOString()
    });

    const baseTemplate = {
      id: 0,
      title: '',
      description: '',
      archived: false,
      visibility: 'Private',
      courseId,
      nodeType
    };

    switch (nodeType) {
      case 'Course':
        return baseTemplate;

      case 'Topic':
        return {
          ...baseTemplate,
          courseId
        };

      case 'SubTopic':
        return {
          ...baseTemplate,
          courseId,
          topicId: parentNode?.id,
          isDefault: false
        };

      case 'Lesson':
        return {
          ...baseTemplate,
          courseId,
          topicId: parentNode?.entityType === 'Topic' ? parentNode.id : undefined,
          subTopicId: parentNode?.entityType === 'SubTopic' ? parentNode.id : undefined,
          objective: '',
          methods: '',
          assessment: '',
          notes: [],
          attachments: [],
          standards: []
        };

      default:
        return baseTemplate;
    }
  }

  // ✅ ENHANCED: Set add mode with Observable event emission (legacy method)
  setAddMode(nodeType: EntityType, parentNode: Course | Topic | SubTopic | null = null): void {
    console.log(`[PanelStateService] setAddMode called (legacy method)`, {
      nodeType,
      hasParentNode: !!parentNode,
      parentNodeType: parentNode?.entityType
    });

    // Debug parentNode properties
    if (parentNode) {
      console.log(`[PanelStateService] parentNode properties:`, Object.keys(parentNode));
      console.log(`[PanelStateService] parentNode courseId:`, (parentNode as any).courseId);
      console.log(`[PanelStateService] parentNode id:`, (parentNode as any).id);
    }

    const resolvedCourseId = this.extractCourseId(parentNode);

    // Use the enhanced initiateAddMode method
    this.initiateAddMode(nodeType, parentNode, resolvedCourseId || undefined);
  }

  // ✅ ENHANCED: Set edit mode with Observable event emission
  setEditMode(entity: Course | Topic | SubTopic | Lesson): void {
    const previousMode = this._panelMode();
    const entityType = entity.entityType as EntityType;

    console.log(`[PanelStateService] Setting edit mode`, {
      previousMode,
      entityType,
      entityId: entity.id,
      timestamp: new Date().toISOString()
    });

    // Debug entity properties
    console.log(`[PanelStateService] entity properties:`, Object.keys(entity));

    const resolvedCourseId = this.extractCourseId(entity as any);

    // ✅ Update signal state
    this._panelMode.set('edit');
    this._addNodeType.set(null);
    this._parentNode.set(null);
    this._courseId.set(resolvedCourseId);

    // ✅ Emit Observable events for cross-component coordination

    // 1. Panel mode changed event
    this._panelModeChanged$.next({
      previousMode,
      newMode: 'edit',
      trigger: 'user-action',
      entityType: entityType,
      entityId: entity.id,
      timestamp: new Date()
    });

    // 2. Edit mode initiated event
    this._editModeInitiated$.next({
      entity,
      entityType,
      entityId: entity.id,
      courseId: resolvedCourseId,
      timestamp: new Date()
    });

    console.log(`[PanelStateService] Edit mode initiated successfully`, {
      entityType,
      entityId: entity.id,
      courseId: resolvedCourseId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ ENHANCED: Reset to view mode with Observable event emission
  resetToView(): void {
    const previousMode = this._panelMode();

    console.log(`[PanelStateService] Resetting to view mode`, {
      previousMode,
      timestamp: new Date().toISOString()
    });

    // ✅ Update signal state
    this._panelMode.set('view');
    this._addNodeType.set(null);
    this._parentNode.set(null);

    // ✅ Emit Observable events
    this._panelModeChanged$.next({
      previousMode,
      newMode: 'view',
      trigger: 'reset',
      timestamp: new Date()
    });

    this._panelStateReset$.next({
      previousMode,
      resetType: 'to-view',
      timestamp: new Date()
    });
  }

  // ✅ ENHANCED: Clear all state with Observable event emission
  clearState(): void {
    const previousMode = this._panelMode();

    console.log(`[PanelStateService] Clearing all state`, {
      previousMode,
      timestamp: new Date().toISOString()
    });

    // ✅ Update signal state
    this._panelMode.set('view');
    this._addNodeType.set(null);
    this._parentNode.set(null);
    this._courseId.set(null);
    this._nodeTemplate.set(null);

    // ✅ Emit Observable events
    if (previousMode !== 'view') {
      this._panelModeChanged$.next({
        previousMode,
        newMode: 'view',
        trigger: 'reset',
        timestamp: new Date()
      });
    }

    this._panelStateReset$.next({
      previousMode,
      resetType: 'clear-all',
      timestamp: new Date()
    });
  }

  // === CLEANUP ===
  ngOnDestroy(): void {
    this._panelModeChanged$.complete();
    this._addModeInitiated$.complete();
    this._editModeInitiated$.complete();
    this._panelStateReset$.complete();
    this._templateCreated$.complete();
    console.log('[PanelStateService] All Observable subjects completed');
  }
}
