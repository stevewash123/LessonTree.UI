import { TreeNode } from "../course/tree/tree-node.interface";
import { createSubTopicNode, SubTopic } from "./subTopic";

export interface Topic {
    id: number;
    nodeId: string;
    title: string;
    description: string;
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