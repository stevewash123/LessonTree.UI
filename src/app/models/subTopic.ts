import { TreeNode } from "../course/tree/tree-node.interface";
import { createLessonNode, Lesson } from "./lesson";


export interface SubTopic {
  id: number;
  nodeId: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

// Remove SubTopicNode class and use a function to create plain objects
export function createSubTopicNode(subTopic: SubTopic): TreeNode {
    return {
      id: subTopic.nodeId,
      text: subTopic.title,
      child: subTopic.lessons.map(lesson => createLessonNode(lesson))
    };
  }