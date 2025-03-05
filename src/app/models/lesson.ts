import { TreeNode } from "../course/tree/tree-node.interface";

export interface Lesson {
    id: number;
    nodeId: string;
    title: string;
    content: string;
    subTopicId: number; 
    documents: Document[];
}

 // Remove LessonNode class and use a function to create plain objects
export function createLessonNode(lesson: Lesson): TreeNode {
    return {
      id: lesson.nodeId,
      text: lesson.title
    };
  }