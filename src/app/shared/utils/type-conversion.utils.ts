// src/app/shared/utils/type-conversion.utils.ts - COMPLETE FILE
import { TreeNode, TreeData } from '../../models/tree-node';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';

// Convert string ID to number (for API calls)
export function parseId(id: string | number): number {
  return typeof id === 'string' ? parseInt(id, 10) : id;
}

// Convert number ID to string (for TreeNode)
export function stringifyId(id: string | number): string {
  return typeof id === 'number' ? id.toString() : id;
}

// Convert TreeData to TreeNode (for NodeSelection)
export function treeDataToTreeNode(data: TreeData): TreeNode {
  return {
    id: stringifyId(data.id),
    text: getDisplayTitle(data),
    nodeType: data.nodeType,
    title: getDisplayTitle(data),
    description: getDisplayDescription(data),
    archived: (data as any).archived || false,
    visibility: (data as any).visibility || 1,
    userId: (data as any).userId || 0,
    sortOrder: (data as any).sortOrder || 0,
    original: data
  };
}

// Convert Course to TreeNode (for selection)
export function courseToTreeNode(course: Course): TreeNode {
  return {
    id: stringifyId(course.id),
    text: course.title,
    nodeType: 'Course',
    title: course.title,
    description: course.description || '',
    archived: course.archived,
    visibility: getVisibilityNumber(course.visibility),
    userId: (course as any).userId || 0,
    sortOrder: (course as any).sortOrder || 0,
    original: course
  };
}

// Get display title from any tree data
function getDisplayTitle(data: TreeData): string {
  switch (data.nodeType) {
    case 'Course':
      return (data as Course).title;
    case 'Topic':
      return (data as Topic).title;
    case 'SubTopic':
      return (data as SubTopic).title;
    case 'Lesson':
      return (data as Lesson).title;
    default:
      return 'Unknown';
  }
}

// Get display description from any tree data
function getDisplayDescription(data: TreeData): string {
  switch (data.nodeType) {
    case 'Course':
      return (data as Course).description || '';
    case 'Topic':
      return (data as Topic).description || '';
    case 'SubTopic':
      return (data as SubTopic).description || '';
    case 'Lesson':
      return (data as Lesson).objective || '';
    default:
      return '';
  }
}

// Convert visibility string to number
function getVisibilityNumber(visibility: string): number {
  switch (visibility?.toLowerCase()) {
    case 'public':
      return 0;
    case 'private':
      return 1;
    case 'team':
      return 2;
    default:
      return 1; // Default to private
  }
}