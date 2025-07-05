// **COMPLETE FILE** - shared/utils/type-conversion.utils.ts - Fixed TreeNode/TreeData confusion

import { Entity } from '../../models/entity';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { TreeNode, TreeData, createTreeData, treeDataToTreeNode } from '../../models/tree-node';

/**
 * Convert string ID to number (for API calls)
 */
export function parseId(id: string | number): number {
  if (typeof id === 'string') {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return id;
}

/**
 * Convert number ID to string (for TreeNode)
 */
export function stringifyId(id: string | number): string {
  return typeof id === 'number' ? id.toString() : id;
}

/**
 * Convert Entity to TreeNode (for SyncFusion tree)
 * ✅ FIXED: Use createTreeData then convert to TreeNode
 */
export function entityToTreeNode(entity: Entity): TreeNode {
  const treeData = createTreeData(entity);
  return treeDataToTreeNode(treeData);
}

/**
 * Convert TreeData to TreeNode (for tree operations)
 * ✅ FIXED: Use proper conversion function
 */
export function treeDataToTreeNode_util(treeData: TreeData): TreeNode {
  return treeDataToTreeNode(treeData);
}

/**
 * Convert Course to TreeNode (for selection operations)
 * ✅ FIXED: Use createTreeData then convert to TreeNode
 */
export function courseToTreeNode(course: Course): TreeNode {
  const treeData = createTreeData(course);
  return treeDataToTreeNode(treeData);
}

/**
 * Extract Entity from TreeNode (for operations)
 */
export function treeNodeToEntity(treeNode: TreeNode): Entity {
  if (!treeNode.original) {
    throw new Error('TreeNode missing original entity reference');
  }
  return treeNode.original;
}

/**
 * Extract Entity from TreeData (for operations)
 */
export function treeDataToEntity(treeData: TreeData): Entity {
  return treeData.entity;
}

/**
 * Parse node ID to extract entity type and ID
 */
export function parseNodeId(nodeId: string): { entityType: string; id: number } {
  const parts = nodeId.split('_');
  if (parts.length !== 2) {
    throw new Error(`Invalid node ID format: ${nodeId}. Expected format: entitytype_id`);
  }

  const entityType = parts[0];
  const id = parseId(parts[1]);

  if (id === 0) {
    throw new Error(`Invalid ID in node ID: ${nodeId}`);
  }

  return { entityType, id };
}

/**
 * Create node ID from entity type and ID (Tree UI utility)
 */
export function createNodeId(entityType: string, id: number): string {
  if (!entityType || id <= 0) {
    throw new Error(`Invalid parameters for node ID: entityType=${entityType}, id=${id}`);
  }
  return `${entityType.toLowerCase()}_${id}`;
}

/**
 * Generate node ID from entity (Tree UI utility)
 */
export function generateNodeIdFromEntity(entity: Entity): string {
  return createNodeId(entity.entityType, entity.id);
}

/**
 * Get display title from entity (null-safe)
 */
export function getEntityDisplayTitle(entity: Entity | null | undefined): string {
  if (!entity) return 'Unknown';
  return entity.displayName;
}

/**
 * Get display description from entity (handles Lesson.objective vs Entity.description)
 */
export function getEntityDisplayDescription(entity: Entity): string {
  // Lessons use objective instead of description
  if (entity.entityType === 'Lesson') {
    return (entity as Lesson).objective || '';
  }

  return entity.description || '';
}

/**
 * Convert visibility string to number (for legacy compatibility)
 */
export function getVisibilityNumber(visibility: string): number {
  switch (visibility?.toLowerCase()) {
    case 'public':
      return 0;
    case 'private':
      return 1;
    case 'team':
      return 2;
    default:
      return 1; // Default to private
  }
}

/**
 * Convert visibility number to string
 */
export function getVisibilityString(visibility: number): string {
  switch (visibility) {
    case 0:
      return 'Public';
    case 1:
      return 'Private';
    case 2:
      return 'Team';
    default:
      return 'Private';
  }
}

/**
 * Type guard: Check if entity is Course
 */
export function isCourse(entity: Entity): entity is Course {
  return entity.entityType === 'Course';
}

/**
 * Type guard: Check if entity is Topic
 */
export function isTopic(entity: Entity): entity is Topic {
  return entity.entityType === 'Topic';
}

/**
 * Type guard: Check if entity is SubTopic
 */
export function isSubTopic(entity: Entity): entity is SubTopic {
  return entity.entityType === 'SubTopic';
}

/**
 * Type guard: Check if entity is Lesson
 */
export function isLesson(entity: Entity): entity is Lesson {
  return entity.entityType === 'Lesson';
}

/**
 * Safely cast entity to specific type (with runtime check)
 */
export function castToEntityType<T extends Entity>(entity: Entity, expectedType: string): T {
  if (entity.entityType !== expectedType) {
    throw new Error(`Expected ${expectedType} but got ${entity.entityType}`);
  }
  return entity as T;
}
