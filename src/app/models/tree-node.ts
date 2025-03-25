import { Course } from "./course";
import { Lesson } from "./lesson";
import { SubTopic } from "./subTopic";
import { Topic } from "./topic";

export interface TreeNode {
    id: string;
    nodeType?: 'Course' | 'Topic' | 'SubTopic' | 'Lesson'; // Added 'Course'
    hasChildren?: boolean;
    text: string;
    expanded?: boolean;
    child?: TreeNode[];
    original?: Course | Topic | SubTopic | Lesson; // Added Course
    iconCss?: string;
    [key: string]: any;
}

export interface TopicMovedEvent {
    topic: Topic;
    sourceCourseId: number;
    targetCourseId: number | null; // Changed to allow null
    targetNodeId?: string; // Already optional, no change needed
}

export interface NodeSelectedEvent {
    node: TreeNode;
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