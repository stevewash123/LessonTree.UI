import { TreeNode } from "../course/tree/tree-node.interface";
import { createSubTopicNode, SubTopic } from "./subTopic";

export interface Topic {
  id: number;
  nodeId: string;
  title: string;
  description: string;
  subTopics: SubTopic[];
}

// Remove TopicNode class and use a function to create plain objects
export function createTopicNode(topic: Topic): TreeNode {
    return {
      id: topic.nodeId,
      text: topic.title,
      child: topic.subTopics.map(subTopic => createSubTopicNode(subTopic))
    };
  }