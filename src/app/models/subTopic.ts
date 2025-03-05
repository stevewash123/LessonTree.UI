import { TreeNode } from "../course/tree/tree-node.interface";
import { createLessonNode, Lesson } from "./lesson";

export interface SubTopic {
    id: number;
    nodeId: string;
    title: string;
    description?: string;
    lessons: Lesson[];
  }
  
  export function createSubTopicNode(subTopic: SubTopic): TreeNode {
    return {
      id: subTopic.nodeId,
      text: subTopic.title,
      type: 'SubTopic',
      child: subTopic.lessons.map(lesson => createLessonNode(lesson)),
      original: subTopic,
      iconCss: 'material-icons subtopic-icon' // 'book' icon
    };
  }