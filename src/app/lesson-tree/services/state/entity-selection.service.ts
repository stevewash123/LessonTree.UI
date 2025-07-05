// **COMPLETE FILE** - node-operations/node-selection.service.ts
// RESPONSIBILITY: Tracks selected entities across all components with source tracking and history using Entity architecture
// DOES NOT: Handle entity data or API operations - only selection state management
// CALLED BY: TreeWrapper, Calendar, InfoPanel, PanelStateService

import { computed, Injectable, signal } from '@angular/core';
import { Entity } from '../../../models/entity';
import { EntityType } from '../../../models/entity';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { generateNodeIdFromEntity } from '../../../shared/utils/type-conversion.utils';
import {Lesson, LessonDetail} from '../../../models/lesson';

export type SelectionSource = 'tree' | 'calendar' | 'infopanel' | 'programmatic';

export interface SelectionEvent {
  entity: Entity | null;
  source: SelectionSource;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class EntitySelectionService {

  // ✅ Signal state for reactive UI using Entity architecture
  private readonly _selectedEntity = signal<Entity | null>(null);
  private readonly _selectionSource = signal<SelectionSource>('programmatic');
  private readonly _selectionHistory = signal<SelectionEvent[]>([]);

  // Public readonly signals for reactive UI
  readonly selectedEntity = this._selectedEntity.asReadonly();
  readonly selectionSource = this._selectionSource.asReadonly();
  readonly selectionHistory = this._selectionHistory.asReadonly();

  // Computed signals for derived state
  readonly hasSelection = computed(() => this._selectedEntity() !== null);
  readonly selectedEntityType = computed(() => this._selectedEntity()?.entityType || null);
  readonly selectedEntityId = computed(() => {
    const entity = this._selectedEntity();
    return entity ? generateNodeIdFromEntity(entity) : null;
  });
  readonly isSelectedEntityType = computed(() => (type: EntityType) => this._selectedEntity()?.entityType === type);

  // Course context computed signal - extracts courseId from any selected entity
  readonly activeCourseId = computed(() => {
    const entity = this._selectedEntity();
    if (!entity) return null;

    switch (entity.entityType) {
      case 'Course':
        return entity.id;
      case 'Topic':
        return (entity as Topic).courseId;
      case 'SubTopic':
        return (entity as SubTopic).courseId;
      case 'Lesson':
        return (entity as Lesson).courseId;
      default:
        return null;
    }
  });

  // Individual entity type computed signals for specific type checking
  readonly selectedCourse = computed(() => {
    const entity = this._selectedEntity();
    return entity?.entityType === 'Course' ? entity as Course : null;
  });

  readonly selectedTopic = computed(() => {
    const entity = this._selectedEntity();
    return entity?.entityType === 'Topic' ? entity as Topic : null;
  });

  readonly selectedSubTopic = computed(() => {
    const entity = this._selectedEntity();
    return entity?.entityType === 'SubTopic' ? entity as SubTopic : null;
  });

  readonly selectedLesson = computed(() => {
    const entity = this._selectedEntity();
    return entity?.entityType === 'Lesson' ? entity as Lesson : null;
  });

  // Selection statistics
  readonly selectionStats = computed(() => {
    const history = this._selectionHistory();
    const stats = {
      total: history.length,
      byCourse: history.filter(e => e.entity?.entityType === 'Course').length,
      byTopic: history.filter(e => e.entity?.entityType === 'Topic').length,
      bySubTopic: history.filter(e => e.entity?.entityType === 'SubTopic').length,
      byLesson: history.filter(e => e.entity?.entityType === 'Lesson').length,
      bySource: {
        tree: history.filter(e => e.source === 'tree').length,
        calendar: history.filter(e => e.source === 'calendar').length,
        infopanel: history.filter(e => e.source === 'infopanel').length,
        programmatic: history.filter(e => e.source === 'programmatic').length
      }
    };
    return stats;
  });

  constructor() {
    console.log('[EntitySelectionService] Initialized with Entity-based signal state management');
  }

  // ✅ REQUIRED: Select an entity with clean state management
  selectNode(entity: Entity | null, source: SelectionSource = 'programmatic'): void {
    const previousEntity = this._selectedEntity();
    const previousSource = this._selectionSource();

    // Don't update if selecting the same entity from the same source
    if (previousEntity === entity && previousSource === source) {
      return;
    }

    // Update signal state
    this._selectedEntity.set(entity);
    this._selectionSource.set(source);

    // Add to history
    const selectionEvent: SelectionEvent = {
      entity,
      source,
      timestamp: new Date()
    };

    const currentHistory = this._selectionHistory();
    const updatedHistory = [...currentHistory, selectionEvent];

    // Keep only last 50 selections for performance
    if (updatedHistory.length > 50) {
      updatedHistory.shift();
    }

    this._selectionHistory.set(updatedHistory);

    console.log('[EntitySelectionService] Entity selection updated:', {
      entityType: entity?.entityType,
      nodeId: entity ? generateNodeIdFromEntity(entity) : null,
      entityId: entity?.id,
      source,
      historyLength: updatedHistory.length
    });
  }

  // Clear selection
  clearSelection(source: SelectionSource = 'programmatic'): void {
    const previousEntity = this._selectedEntity();

    if (previousEntity !== null) {
      this.selectNode(null, source);
    }
  }

  // ✅ REQUIRED: Select by raw database ID with entityType (used by Calendar, InfoPanel, etc.)
  selectById(id: number, entityType: EntityType, source: SelectionSource = 'programmatic'): void {
    // Create minimal Entity for selection tracking
    // Note: This creates a lightweight entity for selection purposes only
    // Full entity data should be loaded separately by consumers
    const entity: Entity = this.createSelectionEntity(id, entityType);
    this.selectNode(entity, source);
  }

  // Select by formatted nodeId (used by Tree, etc.)
  selectByNodeId(nodeId: string, source: SelectionSource = 'programmatic'): void {
    const parsed = this.parseNodeId(nodeId);
    if (!parsed) {
      console.error('[EntitySelectionService] Cannot select - invalid nodeId format:', nodeId);
      return;
    }

    const { entityType, id } = parsed;
    const entity = this.createSelectionEntity(id, entityType);
    this.selectNode(entity, source);
  }

  // Check if a specific entity is selected
  isEntitySelected(entity: Entity): boolean {
    const selected = this._selectedEntity();
    const selectedNodeId = selected ? generateNodeIdFromEntity(selected) : null;
    const entityNodeId = generateNodeIdFromEntity(entity);
    return selected !== null &&
      selectedNodeId === entityNodeId &&
      selected.entityType === entity.entityType;
  }

  // Check if an entity with specific raw ID and type is selected
  isSelected(id: number, entityType: EntityType): boolean {
    const selected = this._selectedEntity();
    return selected !== null &&
      selected.id === id &&
      selected.entityType === entityType;
  }

  // Check if an entity with specific formatted nodeId is selected
  isSelectedByNodeId(nodeId: string): boolean {
    const selected = this._selectedEntity();
    const selectedNodeId = selected ? generateNodeIdFromEntity(selected) : null;
    return selected !== null && selectedNodeId === nodeId;
  }

  // Get recent selections of a specific type
  getRecentSelectionsByType(entityType: EntityType, limit: number = 10): SelectionEvent[] {
    return this._selectionHistory()
      .filter(event => event.entity?.entityType === entityType)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Get recent selections from a specific source
  getRecentSelectionsBySource(source: SelectionSource, limit: number = 10): SelectionEvent[] {
    return this._selectionHistory()
      .filter(event => event.source === source)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Clear selection history
  clearHistory(): void {
    this._selectionHistory.set([]);
    console.log('[EntitySelectionService] Selection history cleared');
  }

  // Reset service state
  reset(): void {
    this._selectedEntity.set(null);
    this._selectionSource.set('programmatic');
    this._selectionHistory.set([]);
    console.log('[EntitySelectionService] Service state reset');
  }

  // Utility method to get selection context info
  getSelectionContext() {
    const entity = this._selectedEntity();
    const source = this._selectionSource();
    const stats = this.selectionStats();

    return {
      hasSelection: this.hasSelection(),
      selectedEntity: entity,
      selectedEntityType: entity?.entityType || null,
      selectedNodeId: entity ? generateNodeIdFromEntity(entity) : null,
      selectedEntityId: entity?.id || null,
      activeCourseId: this.activeCourseId(),
      selectionSource: source,
      selectionStats: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a minimal Entity for selection tracking purposes
   * Note: This is for selection state only - full entity data should be loaded separately
   */
  private createSelectionEntity(id: number, entityType: EntityType): Entity {
    // Create the appropriate entity type with minimal data for selection
    const baseData = {
      id,
      title: `${entityType} ${id}`,
      description: '',
      sortOrder: 0,
      visibility: 'Private',
      archived: false,
      userId: 0
    };

    switch (entityType) {
      case 'Course':
        return new Course({
          ...baseData,
          topics: [],      // Initialize empty topics array
          standards: []    // Initialize empty standards array
        });
      case 'Topic':
        return new Topic({
          ...baseData,
          courseId: 0 // Will be filled by consumers if needed
        });
      case 'SubTopic':
        return new SubTopic({
          ...baseData,
          topicId: 0,
          courseId: 0
          // ✅ REMOVED: isDefault property - doesn't exist on SubTopic
        });
      case 'Lesson':
        return new Lesson({
          ...baseData,
          courseId: 0,
          objective: ''
        });
      default:
        throw new Error(`[EntitySelectionService] Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Parse nodeId to extract entityType and raw ID
   */
  private parseNodeId(nodeId: string): { entityType: EntityType; id: number } | null {
    const parts = nodeId.split('_');
    if (parts.length !== 2) {
      console.warn('[EntitySelectionService] Invalid nodeId format:', nodeId);
      return null;
    }

    const [typeStr, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      console.warn('[EntitySelectionService] Invalid ID in nodeId:', nodeId);
      return null;
    }

    let entityType: EntityType;
    switch (typeStr.toLowerCase()) {
      case 'course':
        entityType = 'Course';
        break;
      case 'topic':
        entityType = 'Topic';
        break;
      case 'subtopic':
        entityType = 'SubTopic';
        break;
      case 'lesson':
        entityType = 'Lesson';
        break;
      default:
        console.warn('[EntitySelectionService] Unknown entity type in nodeId:', nodeId);
        return null;
    }

    return { entityType, id };
  }
}
