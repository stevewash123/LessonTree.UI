import { Lesson } from "./lesson";
import { createSubTopicNode, SubTopic } from "./subTopic";
import { TreeNode } from "./tree-node";

export interface Topic {
    id: number;
    nodeId: string;
    title: string;
    description: string;
    courseId: number;
    hasChildren: boolean;
    subTopics?: SubTopic[];
    lessons?: Lesson[];
    visibility: 'Private' | 'Team' | 'Public'; // Restricted to specific values
    archived: boolean;
}

export function createTopicNode(topic: Topic): TreeNode {
    return {
        id: topic.nodeId,
        text: topic.title,
        nodeType: 'Topic',
        hasChildren: topic.hasChildren,
        original: topic,
        iconCss: 'material-icons topic-icon' // 'school' icon
    };
}