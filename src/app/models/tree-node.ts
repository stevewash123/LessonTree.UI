// RESPONSIBILITY: Defines tree structure interfaces tightly bound to SyncFusion TreeView
// DOES NOT: Define CRUD interfaces or detailed entity properties
// CALLED BY: TreeWrapper components, SyncFusion TreeView, node selection services

import { EntityType } from "../info-panel/panel-state.service";
import { Course } from "./course";
import { Lesson } from "./lesson";
import { SubTopic } from "./subTopic";
import { Topic } from "./topic";


// TreeNode: Tightly bound to SyncFusion TreeView - DO NOT CHANGE without SyncFusion compatibility check
export interface TreeNode {
    id: string;
    nodeType?: EntityType;
    hasChildren?: boolean;
    text: string;
    expanded?: boolean;
    child?: TreeNode[];
    original?: TreeData; 
    iconCss?: string;
    [key: string]: any;
}

// TreeData: Base interface for tree operations and selection - LESSON USES BASIC INTERFACE ONLY
export interface TreeData {
    id: number;
    courseId: number;
    nodeId: string;
    entityType: EntityType;
    title: string;
    description?: string;
    archived: boolean;
    visibility: 'Private' | 'Team' | 'Public';
    userId: number;
    sortOrder: number;
    hasChildren?: boolean;
  }

  export interface NodeMovedEvent {
    node: TreeData;               // The node being moved
    sourceParentId?: number;      // Source parent ID (optional)
    sourceParentType?: EntityType;  // Source parent type (optional)
    targetParentId?: number;      // Target parent ID (where it's moving to)
    targetParentType?: EntityType;  // Target parent type
    sourceCourseId?: number;      // Only needed for cross-course moves
    targetCourseId?: number;      // Only needed for cross-course moves
  }

export interface NodeSelectedEvent {
    node: TreeData;
}

export interface NodeDeletedEvent {
    node: TreeData;
    nodeType: EntityType;
}

export interface AddNodeEvent {
    parentNode: TreeData | null;
    nodeType: EntityType;
    courseId?: number;
}