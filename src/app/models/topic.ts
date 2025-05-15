import { Lesson } from "./lesson";
import { createSubTopicNode, SubTopic } from "./subTopic";
import { TreeData, TreeNode } from "./tree-node";

export interface Topic extends TreeData {
    title: string;
    description: string;
    courseId: number;
    hasChildren: boolean;
    subTopics?: SubTopic[];
    lessons?: Lesson[];
    visibility: 'Private' | 'Team' | 'Public';
    archived: boolean;
    sortOrder: number;
    nodeType: 'Topic';
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