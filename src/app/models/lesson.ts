import { Attachment } from "./attachment";
import { Note } from "./note";
import { Standard } from "./standard";
import { TreeData, TreeNode } from "./tree-node";

export interface Lesson extends TreeData {
    courseId: number;
    subTopicId?: number;
    topicId?: number;
    title: string;
    objective: string;
    description?: string;
    visibility: 'Private' | 'Team' | 'Public';
    teamId?: number;
    archived: boolean;
    sortOrder: number;
    nodeType: 'Lesson';
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

export interface LessonDetail extends Lesson {
    level?: string;
    materials?: string;
    classTime?: string;
    methods?: string;
    specialNeeds?: string;
    assessment?: string;
    standards: Standard[];
    attachments: Attachment[];
    notes: Note[];
}