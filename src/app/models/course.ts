
// course.ts

import { Standard } from "./standard";
import { Topic } from "./topic";

// Models a Course entity with optional topics for lazy loading
export interface Course {
    id: number;
    title: string;
    description: string;
    hasChildren: boolean;
    archived: boolean;
    visibility: 'Private' | 'Team' | 'Public'; // Restricted to specific values
    topics?: Topic[];
    //standards?: Standard[];
}