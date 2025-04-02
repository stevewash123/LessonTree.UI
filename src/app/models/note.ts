export interface Note {
    id: number;
    content: string;
    author: string; // Read Only, User's display name
    visibility: 'Private' | 'Team' | 'Public'; // Restricted to specific values
    createdDate: string; // ISO string for DateTime
    teamId?: number;
    courseId?: number;
    topicId?: number;
    subTopicId?: number;
    lessonId?: number;
}