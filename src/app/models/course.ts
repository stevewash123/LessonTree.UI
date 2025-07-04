
// course.ts

import { Standard } from "./standard";
import { createTopicNode, Topic } from "./topic";
import { TreeData, TreeNode } from "./tree-node";

// Models a Course entity with optional topics for lazy loading
export interface Course extends TreeData {
    topics?: Topic[];
    entityType: 'Course'; // Override to specify the concrete type
  }

  export function createCourseNode(course: Course): TreeNode {
    return {
      id: course.nodeId,
      text: course.title,
      nodeType: 'Course',
      hasChildren: course.hasChildren,
      original: course,
      iconCss: 'material-icons course-icon'
    };
  }