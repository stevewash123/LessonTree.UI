// **COMPLETE FILE** - lesson-tree/models/tree-data.ts - Tree domain internal types only
// RESPONSIBILITY: Tree UI representation wrapper - NEVER exported outside tree domain
// DOES NOT: Define domain entities or business logic
// CALLED BY: Tree services and components ONLY - never external domains

import { EntityType } from "../info-panel/panel-state.service";
import { Entity } from "./entity";



/**
 * TreeData - UI wrapper for domain entities (Tree domain internal use only)
 * This type should NEVER be exported outside the tree domain
 */
export interface TreeData<T = Entity> {
  entity: T;                    // The actual domain entity
  expanded?: boolean;           // Internal UI state
  selected?: boolean;           // Internal selection state
  level?: number;              // Tree hierarchy depth
  parentNodeId?: string;       // Internal tree relationships

  // ✅ COMPUTED: Convenience accessors (readonly properties)
  readonly entityType: EntityType;
  readonly id: number;
  readonly title: string;
}

/**
 * TreeNode - SyncFusion interface contract
 */
export interface TreeNode {
  id: string;                   // SyncFusion requirement (nodeId format)
  text: string;                 // SyncFusion requirement (display text)
  entityType: EntityType;       // SyncFusion requirement
  hasChildren: boolean;         // SyncFusion requirement
  child?: TreeNode[];           // SyncFusion tree structure
  expanded?: boolean;           // SyncFusion state
  iconCss?: string;             // SyncFusion icon
  original: Entity;             // Reference back to domain entity
  [key: string]: any;
}

/**
 * Tree event interfaces (Tree domain internal use only)
 */
export interface NodeMovedEvent {
  node: TreeData;               // ✅ Internal tree operations use TreeData
  sourceParentId?: number;
  sourceParentType?: string;
  targetParentId?: number;
  targetParentType?: string;
  sourceCourseId?: number;
  targetCourseId?: number;
}

export interface NodeSelectedEvent {
  entity: Entity;
}

export interface NodeDeletedEvent {
  entity: Entity;
  entityType: EntityType;
}

export interface AddNodeEvent {
  parentEntity: Entity | null;
  entityType: EntityType;
  courseId?: number;
}

/**
 * Convert Entity to TreeData for internal tree operations
 */
export function createTreeData<T extends Entity>(entity: T): TreeData<T> {
  return {
    entity,
    expanded: false,
    selected: false,
    level: 0,
    parentNodeId: undefined,

    // ✅ Computed properties implemented here
    entityType: entity.entityType,
    id: entity.id,
    title: entity.title || 'Unknown'
  };
}

export function createTreeNode<T extends Entity>(entity: T): TreeData<T> {
  return createTreeData(entity);
}

/**
 * Convert TreeData to TreeNode for SyncFusion
 */
export function treeDataToTreeNode<T extends Entity>(treeData: TreeData<T>): TreeNode {
  const entity = treeData.entity;
  const nodeId = `${entity.entityType.toLowerCase()}_${entity.id}`;

  console.log('🔍 [DEBUG] treeDataToTreeNode - Creating TreeNode:', {
    entityType: entity.entityType,
    entityId: entity.id,
    nodeId,
    originalEntity: entity
  });

  return {
    id: nodeId,
    text: entity.title || 'Unknown',
    entityType: entity.entityType,
    hasChildren: entity.hasChildren,
    child: [],
    expanded: treeData.expanded || false,
    iconCss: getIconForEntityType(entity.entityType),
    original: entity
  };
}

/**
 * Convert TreeNode to TreeData for internal operations
 */
export function treeNodeToTreeData(treeNode: TreeNode): TreeData {
  console.log('🔍 [DEBUG] treeNodeToTreeData input:', {
    treeNode,
    keys: Object.keys(treeNode || {}),
    original: treeNode?.original,
    originalType: typeof treeNode?.original,
    originalKeys: Object.keys(treeNode?.original || {})
  });

  const entity = treeNode.original;
  console.log('🔍 [DEBUG] extracted entity:', {
    entity,
    entityType: typeof entity,
    entityKeys: Object.keys(entity || {}),
    hasEntityType: entity?.entityType,
    entityTypeValue: entity?.entityType
  });

  // Line 126 area - this is where it fails
  if (!entity) {
    console.error('🚨 [DEBUG] Entity is undefined/null in treeNodeToTreeData!');
    throw new Error('Entity is undefined in treeNode.original');
  }

  if (!entity.entityType) {
    console.error('🚨 [DEBUG] Entity exists but entityType is undefined!', {
      entity,
      entityKeys: Object.keys(entity)
    });
    throw new Error('Entity.entityType is undefined');
  }

  return {
    entity,
    expanded: treeNode.expanded || false,
    selected: false,
    level: 0,
    parentNodeId: undefined,
    entityType: entity.entityType,  // This is line 126
    id: entity.id,
    title: entity.title || 'Unknown'
  };
}

/**
 * Get icon CSS class for entity type (Tree domain internal use only)
 */
function getIconForEntityType(entityType: EntityType): string {
  switch (entityType) {
    case 'Course': return 'material-icons course-icon';
    case 'Topic': return 'material-icons topic-icon';
    case 'SubTopic': return 'material-icons subtopic-icon';
    case 'Lesson': return 'material-icons lesson-icon';
    default: return 'material-icons default-icon';
  }
}

/**
 * Extract Entity from TreeData wrapper (Tree domain internal use only)
 */
export function unwrapEntityFromTree<T extends Entity>(treeData: TreeData<T>): T {
  return treeData.entity;
}
