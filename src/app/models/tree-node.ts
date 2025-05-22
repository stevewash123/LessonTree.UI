import { Course } from "./course";
import { Lesson } from "./lesson";
import { SubTopic } from "./subTopic";
import { Topic } from "./topic";

export type NodeType = 'Course' | 'Topic' | 'SubTopic' | 'Lesson';


export interface TreeNode {
    id: string;
    nodeType?: NodeType;
    hasChildren?: boolean;
    text: string;
    expanded?: boolean;
    child?: TreeNode[];
    original?: TreeData; 
    iconCss?: string;
    [key: string]: any;
}

export interface TreeData {
    id: number;
    courseId: number;
    nodeId: string;
    nodeType: 'Course' | 'Topic' | 'SubTopic' | 'Lesson';
  }

  export interface NodeMovedEvent {
    node: TreeData;               // The node being moved
    sourceParentId?: number;      // Source parent ID (optional)
    sourceParentType?: NodeType;  // Source parent type (optional)
    targetParentId?: number;      // Target parent ID (where it's moving to)
    targetParentType?: NodeType;  // Target parent type
    sourceCourseId?: number;      // Only needed for cross-course moves
    targetCourseId?: number;      // Only needed for cross-course moves
  }

export interface NodeSelectedEvent {
    node: TreeData;
}

export interface NodeDeletedEvent {
    node: TreeData;
    nodeType: NodeType;
}

export interface AddNodeEvent {
    parentNode: TreeData | null;
    nodeType: NodeType;
    courseId?: number;
}

// did this in another branch, but haven't needed to here yet. 
// export interface SyncfusionNode {
//     id: string;
//     text: string;
//     child?: SyncfusionNode[];
//     iconCss?: string;
//     hasChildren?: boolean;
//     [key: string]: any;
// }

// export interface TreeNode extends SyncfusionNode {
//     nodeType?: 'Course' | 'Topic' | 'SubTopic' | 'Lesson';
//     expanded?: boolean;
//     original?: Course | Topic | SubTopic | Lesson;
// }