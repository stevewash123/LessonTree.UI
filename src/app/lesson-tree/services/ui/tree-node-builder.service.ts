// **COMPLETE FILE** - tree-ui/tree-node-builder.service.ts
// RESPONSIBILITY: Builds SyncFusion TreeNode structures and provides tree manipulation utilities.
// DOES NOT: Manage state, handle API calls, or track selections - pure TreeNode building and manipulation.
// CALLED BY: TreeWrapper, TreeDragDropService for building and manipulating SyncFusion tree structures.

import { Injectable } from '@angular/core';
import { Course } from '../../../models/course';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { TreeNode, TreeData, unwrapEntityFromTree } from '../../../models/tree-node';
import {EntityType} from "../../../models/entity";

@Injectable({
  providedIn: 'root'
})
export class TreeNodeBuilderService {

  constructor() {
    console.log('[TreeNodeBuilderService] SyncFusion TreeNode building service initialized');
  }

  // Build complete tree structure from course data
  buildTreeFromCourse(course: Course, courseId: number): TreeNode[] {
    // Create the course node
    const courseNode: TreeNode = {
      id: `course_${course.id}`,  // ✅ Generate nodeId consistently
      text: course.title,
      entityType: 'Course',
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
    const topicNode = this.createTopicNode(topic);

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
          node: this.createLessonNode(lesson),
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

    console.log(`[TreeNodeBuilderService] Built topic "${topic.title}" with ${allChildren.length} children in unified sort order:`,
      allChildren.map(c => `${c.type}(${c.sortOrder})`).join(', '));

    return topicNode;
  }

  // Build subtopic node with lesson children
  private buildSubTopicNode(subTopic: SubTopic): TreeNode {
    const subTopicNode = this.createSubTopicNode(subTopic);

    // Add lessons as children of subtopic
    subTopicNode.child = subTopic.lessons
      ?.sort((a, b) => a.sortOrder - b.sortOrder)
      .map(l => this.createLessonNode(l)) ?? [];
    subTopicNode.hasChildren = (subTopic.lessons?.length ?? 0) > 0;

    return subTopicNode;
  }

  // ✅ FIXED: Create TreeNode factory methods (no more missing exports)

  /**
   * Create TreeNode from Topic entity
   */
  createTopicNode(topic: Topic): TreeNode {
    const treeNode: TreeNode = {
      id: `topic_${topic.id}`,
      text: topic.title,
      entityType: 'Topic' as EntityType,
      hasChildren: false, // Will be updated based on children
      original: topic,  // ✅ This should be set
      expanded: false,
      iconCss: 'topic-icon'
    };

    // 🔍 DEBUG: Verify original is set
    console.log('🔍 [TreeNodeBuilder] createTopicNode - Created TreeNode:', {
      id: treeNode.id,
      text: treeNode.text,
      hasOriginal: !!treeNode.original,
      originalType: typeof treeNode.original,
      originalKeys: Object.keys(treeNode.original || {}),
      fullTreeNode: treeNode
    });

    return treeNode;
  }


  /**
   * Create TreeNode from SubTopic entity
   */
  createSubTopicNode(subTopic: SubTopic): TreeNode {
    const treeNode: TreeNode = {
      id: `subtopic_${subTopic.id}`,
      text: subTopic.title,
      entityType: 'SubTopic' as EntityType,
      hasChildren: false, // Will be updated based on children
      original: subTopic,  // ✅ This should be set
      expanded: false,
      iconCss: 'subtopic-icon'
    };

    // 🔍 DEBUG: Verify original is set
    console.log('🔍 [TreeNodeBuilder] createSubTopicNode - Created TreeNode:', {
      id: treeNode.id,
      text: treeNode.text,
      hasOriginal: !!treeNode.original,
      originalType: typeof treeNode.original,
      originalKeys: Object.keys(treeNode.original || {}),
      fullTreeNode: treeNode
    });

    return treeNode;
  }

  /**
   * Create TreeNode from Lesson entity
   */
  createLessonNode(lesson: Lesson): TreeNode {
    const treeNode: TreeNode = {
      id: `lesson_${lesson.id}`,
      text: lesson.title || 'Untitled Lesson',
      entityType: 'Lesson' as EntityType,
      hasChildren: false, // Lessons never have children
      original: lesson,  // ✅ This should be set
      expanded: false,
      iconCss: 'lesson-icon'
    };

    // 🔍 DEBUG: Verify original is set
    console.log('🔍 [TreeNodeBuilder] createLessonNode - Created TreeNode:', {
      id: treeNode.id,
      text: treeNode.text,
      hasOriginal: !!treeNode.original,
      originalType: typeof treeNode.original,
      originalKeys: Object.keys(treeNode.original || {}),
      fullTreeNode: treeNode
    });

    return treeNode;
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
        node => node.entityType === 'Topic' && (node.original as Topic).id === topicId
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
        if (node.entityType === 'SubTopic' && (node.original as SubTopic).id === subTopicId) {
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
    if (treeData.length > 0 && treeData[0].entityType === 'Course' && treeData[0].child) {
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
            if (child.entityType === 'SubTopic' && child.child) {
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

    if (newNode.entityType === 'Topic') {
      // For topics, the parent is the course (always the first node)
      parentNodeId = treeData[0]?.id;
    } else if (newNode.entityType === 'SubTopic') {
      const subTopic = newNode.original as SubTopic;
      parentNodeId = this.findTopicNodeId(treeData, subTopic.topicId);
    } else if (newNode.entityType === 'Lesson') {
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
      console.warn(`[TreeNodeBuilderService] No valid parent nodeId found for ${newNode.entityType}`);
      return { success: false };
    }

    const parentNode = this.findNodeById(treeData, parentNodeId);
    if (parentNode) {
      if (!parentNode.child) parentNode.child = [];
      parentNode.child.push(newNode);
      parentNode.hasChildren = true;

      return { success: true, parentNodeId };
    } else {
      console.warn(`[TreeNodeBuilderService] Parent node not found in treeData`);
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

  // Get text property from tree data based on node type
  getNodeText(treeData: TreeData): string {
    // TreeData has computed title property
    return treeData.title;
  }


  // Get hasChildren property based on node type
  getHasChildren(treeData: TreeData): boolean {
    const entity = unwrapEntityFromTree(treeData);
    return entity.hasChildren;
  }

  // ✅ FIXED: Method name spacing
  getEntityTypeIcon(entityType: string): string {
    switch (entityType) {
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
              if (child.entityType === 'SubTopic') {
                subTopicCount++;
                if (child.child) {
                  lessonCount += child.child.length;
                }
              } else if (child.entityType === 'Lesson') {
                lessonCount++;
              }
            }
          }
        }
      }
    }
  }
}
