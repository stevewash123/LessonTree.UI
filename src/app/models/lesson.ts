import { TreeNode } from "../lessontree/course-list-panel/tree/tree-node.interface";
import { Standard } from "./standard";
import { SubTopic } from "./subTopic";

export interface Lesson {
    id: number;
    nodeId: string;
    title: string;
    content: string;
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

export interface LessonDetail {
    id: number;
    title: string;
    content: string;
    subTopic: SubTopic;
    documents: Document[];
    lastDateTaught: Date;
    level: string;
    objective: string;
    materials: string;
    classTime: string;
    methods: string;
    specialNeeds: string;
    assessment: string;
    standards: Standard[];
    subTopicId: number;
  }