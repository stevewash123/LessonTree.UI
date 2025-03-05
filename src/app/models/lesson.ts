import { TreeNode } from "../course/tree/tree-node.interface";

export interface Lesson {
  id: number;
  nodeId: string;
  title: string;
  content: string;
  subTopicId: number;
  documents: Document[];
}

export function createLessonNode(lesson: Lesson): TreeNode {
  return {
    id: lesson.nodeId,
    text: lesson.title,
    type: 'Lesson',
    original: lesson,
    iconCss: 'material-icons lesson-icon' // 'assignment' icon
  };
}