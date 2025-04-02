import { createLessonNode, Lesson } from "./lesson";
import { TreeNode } from "./tree-node";

export interface SubTopic {
    id: number;
    nodeId: string;
    title: string;
    description: string;
    topicId: number;
    courseId: number;
    lessons: Lesson[];
    hasChildren: boolean;
    archived: boolean;
    visibility: 'Private' | 'Team' | 'Public'; 
    sortOrder: number;
}

export function createSubTopicNode(subTopic: SubTopic): TreeNode {
    return {
        id: subTopic.nodeId,
        text: subTopic.title,
        nodeType: 'SubTopic',
        hasChildren: subTopic.hasChildren,
        original: subTopic,
        iconCss: 'material-icons subtopic-icon' // 'book' icon
    };
}