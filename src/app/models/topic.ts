import { TreeNode } from "../lessontree/course-list-panel/tree/tree-node.interface";
import { Course } from "./course";
import { createSubTopicNode, SubTopic } from "./subTopic";

export interface Topic {
    id: number;
    nodeId: string;
    title: string;
    description: string;
    courseId: number;
    course?: Course; // Optional to avoid mandatory deep nesting
    hasSubTopics: boolean;
    subTopics: SubTopic[];
  }
  
  export function createTopicNode(topic: Topic): TreeNode {
    return {
      id: topic.nodeId,
      text: topic.title,
      type: 'Topic',
      child: topic.subTopics.map(subTopic => createSubTopicNode(subTopic)),
      original: topic,
      iconCss: 'material-icons topic-icon' // 'school' icon
    };
  }