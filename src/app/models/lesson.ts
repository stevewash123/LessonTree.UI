import { Attachment } from "./attachment";
import { Standard } from "./standard";
import { TreeNode } from "./tree-node";

export interface Lesson {
    id: number;
    nodeId: string;
    courseId: number;
    subTopicId?: number; // Nullable per API
    topicId?: number;    // Added: Nullable per API, for direct Topic parenting
    title: string;
    objective: string;   // Required per your intent
    visibility: string;
    teamId?: number;
    archived: boolean;
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
}