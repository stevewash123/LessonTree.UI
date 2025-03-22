import { Attachment } from "./attachment";
import { Standard } from "./standard";
import { TreeNode } from "./tree-node";

export interface Lesson {
    id: number;
    nodeId: string;
    courseId: number;
    subTopicId: number;
    title: string;
    objective: string;
  }

export function createLessonNode(lesson: Lesson): TreeNode {
  return {
    id: lesson.nodeId,
    text: lesson.title,
    nodeType: 'Lesson',
    hasChildren: false,
    original: lesson,
    iconCss: 'material-icons lesson-icon' // 'assignment' icon
  };
}

export interface LessonDetail {
    id: number;
    subTopicId: number;
    courseId: number;
    title: string;
    level: string;
    objective: string;
    materials: string;
    classTime: string;
    methods: string;
    specialNeeds: string;
    assessment: string;
    standards: Standard[];
    attachments: Attachment[];
  }