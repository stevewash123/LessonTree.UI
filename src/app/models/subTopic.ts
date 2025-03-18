import { TreeNode } from "../lessontree/course-list-panel/tree/tree-node.interface";
import { createLessonNode, Lesson } from "./lesson";
import { Topic } from "./topic";

export interface SubTopic {
    id: number;
    nodeId: string;
    title: string;
    description: string;
    topicId: number;
    courseId: number;
    isDefault: Boolean;
    lessons: Lesson[]; // Using LessonResource for simplicity
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