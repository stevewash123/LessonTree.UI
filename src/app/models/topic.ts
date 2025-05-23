import { Lesson } from "./lesson";
import { createSubTopicNode, SubTopic } from "./subTopic";
import { TreeData, TreeNode } from "./tree-node";

export interface Topic extends TreeData {
    courseId: number;
    subTopics?: SubTopic[];
    lessons?: Lesson[];
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