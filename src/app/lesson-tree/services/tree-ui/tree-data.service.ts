// RESPONSIBILITY: Transforms course data into tree structures and provides tree manipulation utilities.
// DOES NOT: Manage state, handle API calls, or track selections - pure data transformation only.
// CALLED BY: TreeWrapper, TreeDragDropService for building and manipulating tree structures.
import { Injectable } from '@angular/core';
import { Course } from '../../../models/course';
import { createLessonNode, Lesson } from '../../../models/lesson';
import { SubTopic, createSubTopicNode } from '../../../models/subTopic';
import { Topic, createTopicNode } from '../../../models/topic';
import { TreeNode, TreeData } from '../../../models/tree-node';

@Injectable({
  providedIn: 'root'
})
export class TreeDataService {

  constructor() {
    console.log('[TreeDataService] Service initialized');
  }

  // Build complete tree structure from course data
  buildTreeFromCourse(course: Course, courseId: number): TreeNode[] {
    // Create the course node
    const courseNode: TreeNode = {
      id: course.nodeId || courseId.toString(),
      text: course.title,
      nodeType: 'Course',
      hasChildren: (course.topics?.length ?? 0) > 0,
      original: course,
      expanded: false
    };

    // Create child nodes for topics
    if (course.topics && course.topics.length > 0) {
      courseNode.child = course.topics
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(topic => this.buildTopicNode(topic));
    } else {
      courseNode.child = [];
    }

    return [courseNode];
  }

  // Build topic node with children
  private buildTopicNode(topic: Topic): TreeNode {
    const topicNode = createTopicNode(topic);
    
    // Create unified array of all children (subtopics + direct lessons)
    const allChildren: Array<{node: TreeNode, sortOrder: number, type: string}> = [];
    
    // Add subtopics with their sort orders
    if (topic.subTopics?.length) {
      topic.subTopics.forEach(subTopic => {
        allChildren.push({
          node: this.buildSubTopicNode(subTopic),
          sortOrder: subTopic.sortOrder,
          type: 'SubTopic'
        });
      });
    }
    
    // Add direct lessons with their sort orders
    if (topic.lessons?.length) {
      topic.lessons.forEach(lesson => {
        allChildren.push({
          node: createLessonNode(lesson),
          sortOrder: lesson.sortOrder,
          type: 'Lesson'
        });
      });
    }
    
    // Sort by unified sortOrder and extract nodes
    topicNode.child = allChildren
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(item => item.node);
      
    topicNode.hasChildren = topicNode.child.length > 0;
    
    console.log(`[TreeDataService] Built topic "${topic.title}" with ${allChildren.length} children in unified sort order:`, 
      allChildren.map(c => `${c.type}(${c.sortOrder})`).join(', '));
    
    return topicNode;
  }

  // Build subtopic node with lesson children
  private buildSubTopicNode(subTopic: SubTopic): TreeNode {
    const subTopicNode = createSubTopicNode(subTopic);
    
    // Add lessons as children of subtopic
    subTopicNode.child = subTopic.lessons
      ?.sort((a, b) => a.sortOrder - b.sortOrder)
      .map(l => createLessonNode(l)) ?? [];
    subTopicNode.hasChildren = (subTopic.lessons?.length ?? 0) > 0;
    
    return subTopicNode;
  }

  // Find node by ID in tree structure
  findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.child) {
        const found = this.findNodeById(node.child, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Find topic node ID by topic ID
  findTopicNodeId(treeData: TreeNode[], topicId?: number): string | undefined {
    if (!topicId) return undefined;
    
    // Look for topic in the course's child nodes
    if (treeData.length > 0 && treeData[0].child) {
      const topicNode = treeData[0].child.find(
        node => node.nodeType === 'Topic' && (node.original as Topic).id === topicId
      );
      return topicNode?.id;
    }
    return undefined;
  }

  // Find subtopic node ID by subtopic ID
  findSubTopicNodeId(treeData: TreeNode[], subTopicId?: number): string | undefined {
    if (!subTopicId) return undefined;
    
    // Search through the entire tree for the subtopic
    const findSubTopicInNodes = (nodes: TreeNode[]): string | undefined => {
      for (const node of nodes) {
        if (node.nodeType === 'SubTopic' && (node.original as SubTopic).id === subTopicId) {
          return node.id;
        }
        if (node.child) {
          const found = findSubTopicInNodes(node.child);
          if (found) return found;
        }
      }
      return undefined;
    };
    
    return findSubTopicInNodes(treeData);
  }

  // Sort tree data by sort order
  sortTreeData(treeData: TreeNode[]): void {
    // If we have a course node (which should be the case), sort its children
    if (treeData.length > 0 && treeData[0].nodeType === 'Course' && treeData[0].child) {
      // Sort topics
      treeData[0].child.sort((a, b) => (a.original as Topic).sortOrder - (b.original as Topic).sortOrder);
      
      // Sort subtopics and lessons within each topic
      treeData[0].child.forEach(topicNode => {
        if (topicNode.child) {
          topicNode.child.sort((a, b) => {
            const aOriginal = a.original as SubTopic | Lesson;
            const bOriginal = b.original as SubTopic | Lesson;
            return aOriginal.sortOrder - bOriginal.sortOrder;
          });
          
          // Sort lessons within each subtopic
          topicNode.child.forEach(child => {
            if (child.nodeType === 'SubTopic' && child.child) {
              child.child.sort((a, b) => (a.original as Lesson).sortOrder - (b.original as Lesson).sortOrder);
            }
          });
        }
      });
    }
  }

  // Add node to tree structure
  addNodeToTreeWithParentFinding(treeData: TreeNode[], newNode: TreeNode): { success: boolean; parentNodeId?: string } {
    let parentNodeId: string | undefined;
  
    if (newNode.nodeType === 'Topic') {
      // For topics, the parent is the course (always the first node)
      parentNodeId = treeData[0]?.id;
    } else if (newNode.nodeType === 'SubTopic') {
      const subTopic = newNode.original as SubTopic;
      parentNodeId = this.findTopicNodeId(treeData, subTopic.topicId);
    } else if (newNode.nodeType === 'Lesson') {
      const lesson = newNode.original as Lesson;
      if (lesson.subTopicId) {
        // Lesson belongs to a subtopic
        parentNodeId = this.findSubTopicNodeId(treeData, lesson.subTopicId);
      } else if (lesson.topicId) {
        // Lesson belongs directly to a topic
        parentNodeId = this.findTopicNodeId(treeData, lesson.topicId);
      }
    }
  
    if (!parentNodeId) {
      console.warn(`[TreeDataService] No valid parent nodeId found for ${newNode.nodeType}`);
      return { success: false };
    }
  
    const parentNode = this.findNodeById(treeData, parentNodeId);
    if (parentNode) {
      if (!parentNode.child) parentNode.child = [];
      parentNode.child.push(newNode);
      parentNode.hasChildren = true;
      
      return { success: true, parentNodeId };
    } else {
      console.warn(`[TreeDataService] Parent node not found in treeData`);
      return { success: false };
    }
  }

  addNodeToTreeAndSort(treeData: TreeNode[], newNode: TreeNode): { success: boolean; sortedData: TreeNode[]; parentNodeId?: string } {
    const result = this.addNodeToTreeWithParentFinding(treeData, newNode);
    
    if (result.success) {
      // Sort the tree data after adding
      this.sortTreeData(treeData);
    }
    
    return {
      success: result.success,
      sortedData: [...treeData], // Return copy of sorted data
      parentNodeId: result.parentNodeId
    };
  }
  
  // Update tree data with children for a specific parent
  updateTreeDataWithChildren(treeData: TreeNode[], parentId: string, childNodes: TreeNode[]): TreeNode[] {
    const updateChildren = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, child: childNodes || [], hasChildren: childNodes.length > 0 };
        } else if (node.child) {
          return { ...node, child: updateChildren(node.child) };
        }
        return node;
      });
    };
    
    const updatedTreeData = updateChildren(treeData);
    return updatedTreeData;
  }

  /**
 * Create a single lesson node for incremental tree updates
 * Used by TreeSyncService.addLessonNode() for SyncFusion addNodes() method
 */
createLessonNode(lesson: any): TreeNode {
    const nodeId = `lesson_${lesson.id}`;
    
    return {
      id: nodeId,
      text: lesson.title || 'Untitled Lesson',
      nodeType: 'Lesson',
      iconCss: 'e-file-icon', // SyncFusion icon class
      hasChildren: false,
      child: [], // Required by SyncFusion, empty for lessons
      
      // Lesson-specific properties
      lessonId: lesson.id,
      courseId: lesson.courseId,
      topicId: lesson.topicId,
      subTopicId: lesson.subTopicId,
      sortOrder: lesson.sortOrder || 0,
      
      // Optional lesson properties
      archived: lesson.archived || false,
      visibility: lesson.visibility || 0,
      userId: lesson.userId,
      
      // Additional properties that might be useful
      level: lesson.level,
      objective: lesson.objective,
      materials: lesson.materials,
      methods: lesson.methods,
      classTime: lesson.classTime,
      assessment: lesson.assessment,
      specialNeeds: lesson.specialNeeds
    };
  }

  // Get text property from tree data based on node type
  getNodeText(treeData: TreeData): string {
    switch (treeData.nodeType) {
      case 'Course':
        return (treeData as Course).title;
      case 'Topic':
        return (treeData as Topic).title;
      case 'SubTopic':
        return (treeData as SubTopic).title;
      case 'Lesson':
        return (treeData as Lesson).title;
      default:
        return 'Unknown';
    }
  }

  // Get hasChildren property based on node type
  getHasChildren(treeData: TreeData): boolean {
    switch (treeData.nodeType) {
      case 'Course':
        return (treeData as Course).hasChildren ?? false;
      case 'Topic':
        return (treeData as Topic).hasChildren ?? false;
      case 'SubTopic':
        return (treeData as SubTopic).hasChildren ?? false;
      case 'Lesson':
        return false; // Lessons don't have children
      default:
        return false;
    }
  }

  // Get icon for node type
  getNodeTypeIcon(nodeType: string): string {
    switch (nodeType) {
      case 'Course':
        return '🏫'; // School building icon for Courses
      case 'Topic':
        return '📁'; // Folder icon for Topics
      case 'SubTopic':
        return '📂'; // Open folder icon for SubTopics
      case 'Lesson':
        return '📄'; // Page icon for Lessons
      default:
        return '❓'; // Question mark for unknown types
    }
  }

  // Count total nodes in tree (for debugging)
  private countNodes(nodes: TreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count++;
      if (node.child) {
        count += this.countNodes(node.child);
      }
    }
    return count;
  }

  // Log tree statistics (for debugging)
  logTreeStatistics(treeData: TreeNode[]): void {
    if (treeData && treeData.length > 0) {
      let topicCount = 0;
      let subTopicCount = 0;
      let lessonCount = 0;
      
      if (treeData[0].child) {
        topicCount = treeData[0].child.length;
        
        for (const topic of treeData[0].child) {
          if (topic.child) {
            for (const child of topic.child) {
              if (child.nodeType === 'SubTopic') {
                subTopicCount++;
                if (child.child) {
                  lessonCount += child.child.length;
                }
              } else if (child.nodeType === 'Lesson') {
                lessonCount++;
              }
            }
          }
        }
      }
    }
  }
}