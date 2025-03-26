
// course.ts

import { Topic } from "./topic";

// Models a Course entity with optional topics for lazy loading
export interface Course {
    id: number;
    nodeId: string;
    title: string;
    description: string;
    hasChildren: boolean;
    archived: boolean; // Added
    visibility: string;
    topics?: Topic[];
}