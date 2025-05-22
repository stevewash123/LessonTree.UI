import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, AfterViewInit, OnInit, inject, effect } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { Topic } from '../../../models/topic';
import { NodeDeletedEvent, NodeMovedEvent, NodeType, TreeData, TreeNode } from '../../../models/tree-node';
import { ApiService } from '../../../core/services/api.service';
import { createSubTopicNode, SubTopic } from '../../../models/subTopic';
import { createLessonNode, Lesson } from '../../../models/lesson';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { Course } from '../../../models/course';
import { createTopicNode } from '../../../models/topic';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { PanelStateService } from '../../../core/services/panel-state.service';
import { CourseDataService } from '../../../core/services/course-data.service';

interface LessonMovedEvent {
    lesson: Lesson;
    sourceSubTopicId?: number;
    targetSubTopicId?: number;
    targetTopicId?: number;
}

@Component({
    selector: 'app-tree',
    standalone: true,
    imports: [
        CommonModule,
        TreeViewModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
    ],
    templateUrl: './tree-wrapper.component.html',
    styleUrls: ['./tree-wrapper.component.css']
})
export class TreeWrapperComponent implements OnInit, AfterViewInit { 
    @Input() courseId!: number;
    course: Course | null = null;

    @ViewChild('treeview') syncFuncTree!: TreeViewComponent;

    public cssClass: string = "custom";
    public treeData: TreeNode[] = [];
    public treeFields: object = { 
        dataSource: this.treeData, 
        id: 'id', 
        text: 'text', 
        child: 'child', 
        hasChildren: 'hasChildren', 
        iconCss: 'iconCss',
        cssClass: 'nodeType',
    };
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private allowDrag: boolean = false;

    constructor(
        private nodeSelectionService: NodeSelectionService,
        private panelStateService: PanelStateService,
        private courseDataService: CourseDataService
      ) {
        
        effect(() => {
            const courses = this.courseDataService.getCourses();
            if (courses.length > 0 && this.courseId) {
                const updatedCourse = courses.find(c => c.id === this.courseId);
                if (updatedCourse) {
                    console.log(`[Tree] Course data updated for course ${this.courseId}`, {
                        timestamp: new Date().toISOString()
                    });
                    
                    this.course = updatedCourse;
                    this.updateTreeData();
                }
            }
        });

        effect(() => {
            const node = this.nodeSelectionService.selectedNode();
            const source = this.nodeSelectionService.selectionSource();
            
            // Only process selections from sources other than the tree
            if (source !== 'tree' && node) {
              this.handleExternalSelection(node);
            }
          });

        effect(() => {
            const addedNode = this.courseDataService.nodeAdded();
            if (addedNode && this.isNodeInThisCourse(addedNode)) {
                console.log(`[Tree] Node added to course ${this.courseId}:`, {
                    nodeId: addedNode.nodeId,
                    nodeType: addedNode.nodeType,
                    timestamp: new Date().toISOString()
                });
                
                // Option 1: Refresh entire tree data (simpler, more reliable)
                this.updateTreeData();
                
                // Option 2: Add node incrementally (more complex, faster)
                // this.addNodeToTreeFromSignal(addedNode);
            }
        });
        
        effect(() => {
            const editedNode = this.courseDataService.nodeEdited();
            if (editedNode && this.isNodeInThisCourse(editedNode)) {
                console.log(`[Tree] Node edited in course ${this.courseId}:`, {
                    nodeId: editedNode.nodeId,
                    nodeType: editedNode.nodeType,
                    timestamp: new Date().toISOString()
                });
                
                // Refresh tree data to reflect changes
                this.updateTreeData();
            }
        });

        effect(() => {
            const movedInfo = this.courseDataService.nodeMoved();
            if (movedInfo && this.isNodeInThisCourse(movedInfo.node)) {
                console.log(`[Tree] Node moved in course ${this.courseId}:`, {
                    nodeId: movedInfo.node.nodeId,
                    nodeType: movedInfo.node.nodeType,
                    timestamp: new Date().toISOString()
                });
                
                // Refresh tree data to reflect move
                this.updateTreeData();
            }
        });

        effect(() => {
            const deletedNode = this.courseDataService.nodeDeleted();
            if (deletedNode && this.isNodeInThisCourse(deletedNode)) {
                console.log(`[Tree] Node deleted from course ${this.courseId}:`, {
                    nodeId: deletedNode.nodeId,
                    nodeType: deletedNode.nodeType,
                    timestamp: new Date().toISOString()
                });
                
                // Refresh tree data to reflect deletion
                this.updateTreeData();
            }
        });

      }

    private isNodeInThisCourse(node: TreeData): boolean {
        return node.courseId === this.courseId;
    }

    ngOnInit() {
        // Initialize the tree with course data
        if (this.courseId) {
            this.course = this.courseDataService.getCourseById(this.courseId);
            if (this.course) {
                this.updateTreeData();
            }
        }
    }

    ngAfterViewInit() {
        console.log('TreeWrapper AfterViewInit - syncFuncTree exists:', !!this.syncFuncTree);
        
        if (this.syncFuncTree && this.treeData.length > 0) {
            console.log('Binding tree data in AfterViewInit');
            this.syncFuncTree.dataBind();
        }
    }


      private createTreeNodeFromTreeData(treeData: TreeData): TreeNode {
        // Create a TreeNode from a TreeData object
        const treeNode: TreeNode = {
          id: treeData.nodeId,
          text: this.getNodeText(treeData),
          nodeType: treeData.nodeType,
          hasChildren: this.getHasChildren(treeData),
          original: treeData
        };
        
        return treeNode;
      }

      public onDataBound() {
        console.log('Tree data bound completed for course:', this.course?.id);
        
        if (this.treeData && this.treeData.length > 0) {
          console.log('Root node in tree:', this.treeData[0]);
                    
          // Log node counts for debugging
          let topicCount = 0;
          let subTopicCount = 0;
          let lessonCount = 0;
          
          if (this.treeData[0].child) {
            topicCount = this.treeData[0].child.length;
            
            for (const topic of this.treeData[0].child) {
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
          
          console.log(`Tree statistics: ${topicCount} topics, ${subTopicCount} subtopics, ${lessonCount} lessons`);
        }
      }
      
      // Helper method to get the text property from different node types
      private getNodeText(treeData: TreeData): string {
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
      
      // Helper method to get hasChildren property
      private getHasChildren(treeData: TreeData): boolean {
        switch (treeData.nodeType) {
          case 'Course':
            return (treeData as Course).hasChildren;
          case 'Topic':
            return (treeData as Topic).hasChildren;
          case 'SubTopic':
            return (treeData as SubTopic).hasChildren;
          case 'Lesson':
            return false; // Lessons don't have children
          default:
            return false;
        }
      }

    // Method to return a symbol/icon for each node type
    public getNodeTypeIcon(nodeType: string): string {
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

    private updateTreeData() {
        if (!this.course) {
            console.warn(`updateTreeData: No course available`);
            return;
        }
    
        console.log('Updating tree data with course:', {
            courseId: this.courseId,
            courseTitle: this.course.title,
            topicsCount: this.course.topics?.length ?? 0
        });
    
        // Create the course node
        const courseNode: TreeNode = {
            id: this.course.nodeId || this.courseId.toString(),
            text: this.course.title,
            nodeType: 'Course',
            hasChildren: (this.course.topics?.length ?? 0) > 0,
            original: this.course,
            expanded: false
        };
    
        console.log('Created course node:', courseNode);
    
        // Create child nodes for topics
        if (this.course.topics && this.course.topics.length > 0) {
            courseNode.child = this.course.topics
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(topic => {
                    const topicNode = createTopicNode(topic);
                    const children: TreeNode[] = [];
                    
                    // Add subtopics as children of topic
                    if (topic.subTopics?.length) {
                        children.push(...topic.subTopics
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map(st => {
                                const subTopicNode = createSubTopicNode(st);
                                // Add lessons as children of subtopic
                                subTopicNode.child = st.lessons
                                    ?.sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map(l => createLessonNode(l)) ?? [];
                                subTopicNode.hasChildren = (st.lessons?.length ?? 0) > 0;
                                return subTopicNode;
                            }));
                    }
                    
                    // Add direct lessons as children of topic
                    if (topic.lessons?.length) {
                        children.push(...topic.lessons
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map(l => createLessonNode(l)));
                    }
                    
                    topicNode.child = children;
                    topicNode.hasChildren = children.length > 0;
                    return topicNode;
                });
        } else {
            courseNode.child = [];
        }
    
        console.log('Tree data being set:', [courseNode]);
    
        this.treeData = [courseNode];
        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        
        // Queue the binding operation to execute after Angular has completed initialization
        setTimeout(() => {
            if (this.syncFuncTree) {
                console.log('SyncFusion tree component binding data');
                this.syncFuncTree.dataBind();
                
            } else {
                console.error('SyncFusion tree component still NOT initialized!');
            }
        }, 0);
    }

    private addNodeToTree(newNode: TreeNode) {
        if (!this.syncFuncTree || !this.treeData) {
            console.warn(`addNodeToTree: Tree not initialized`);
            return;
        }

        let parentNodeId: string | undefined;

        if (newNode.nodeType === 'Topic') {
            // For topics, the parent is the course
            parentNodeId = this.treeData[0]?.id; // Course is always the first node
        } else if (newNode.nodeType === 'SubTopic') {
            const subTopic = newNode.original as SubTopic;
            const courseNode = this.treeData[0]; // Course node
            if (courseNode && courseNode.child) {
                const parentTopic = courseNode.child.find(t => 
                    t.nodeType === 'Topic' && (t.original as Topic).id === subTopic.topicId
                );
                parentNodeId = parentTopic?.id;
            }
        } else if (newNode.nodeType === 'Lesson') {
            const lesson = newNode.original as Lesson;
            if (lesson.subTopicId) {
                // Find the subtopic node
                parentNodeId = this.findSubTopicNodeId(lesson.subTopicId);
            } else if (lesson.topicId) {
                // Find the topic node
                parentNodeId = this.findTopicNodeId(lesson.topicId);
            }
        }

        if (!parentNodeId) {
            console.warn(`addNodeToTree: No valid parent nodeId for ${newNode.nodeType}`);
            return;
        }

        const parentNode = this.findNodeById(this.treeData, parentNodeId);
        if (parentNode) {
            if (!parentNode.child) parentNode.child = [];
            parentNode.child.push(newNode);
            parentNode.hasChildren = true;
            this.syncFuncTree.addNodes([newNode], parentNodeId, undefined);
        } else {
            console.warn(`addNodeToTree: Parent node not found in treeData`);
            return;
        }

        this.sortTreeData();
    }

    private sortTreeData() {
        // If we have a course node (which should be the case), sort its children
        if (this.treeData.length > 0 && this.treeData[0].nodeType === 'Course' && this.treeData[0].child) {
            // Sort topics
            this.treeData[0].child.sort((a, b) => (a.original as Topic).sortOrder - (b.original as Topic).sortOrder);
            
            // Sort subtopics and lessons within each topic
            this.treeData[0].child.forEach(topicNode => {
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

        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    public emitNodeSelected(args: any) {
        console.log('[Tree] Node selected in tree:', {
          nodeId: args.nodeData?.id || 'none',
          timestamp: new Date().toISOString()
        });
        
        if (args.nodeData && args.nodeData.id) {
          // Find the node in our tree data using the ID from the event
          const selectedTreeNode = this.findNodeById(this.treeData, args.nodeData.id);
          
          if (selectedTreeNode && selectedTreeNode.original) {
            console.log('[Tree] Found node in tree data:', {
              nodeId: selectedTreeNode.original.nodeId, 
              nodeType: selectedTreeNode.original.nodeType,
              timestamp: new Date().toISOString()
            });
            
            // Update the service
            this.nodeSelectionService.selectNode(selectedTreeNode.original as TreeData, 'tree');
          } else {
            console.warn('[Tree] Node not found in tree data:', {
              nodeId: args.nodeData.id,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      private handleExternalSelection(node: TreeData) {
        if (!this.syncFuncTree || !this.treeData?.length) {
          return;
        }
        
        console.log(`[Tree] Handling external selection for node: ${node.nodeId}`, { timestamp: new Date().toISOString() });
        
        // Find the corresponding node in our tree
        const nodeInTree = this.findNodeById(this.treeData, node.nodeId);
        
        if (nodeInTree) {
          // Use the SyncFusion API to select this node without triggering events
          try {
            this.syncFuncTree.selectedNodes = [nodeInTree.id];
            console.log(`[Tree] Updated tree selection to match external selection`, { timestamp: new Date().toISOString() });
          } catch (err) {
            console.error(`[Tree] Error updating tree selection:`, err, { timestamp: new Date().toISOString() });
          }
        } else {
          console.warn(`[Tree] External node not found in tree`, { nodeId: node.nodeId, timestamp: new Date().toISOString() });
        }
      }

    public onNodeDragStart(args: any) {
        this.dragStartX = args.event.pageX;
        this.dragStartY = args.event.pageY;
        this.allowDrag = false;
    }

    public nodeDragging(args: any) {
        const currentX = args.event.pageX;
        const currentY = args.event.pageY;
        const distance = Math.sqrt(Math.pow(currentX - this.dragStartX, 2) + Math.pow(currentY - this.dragStartY, 2));

        if (distance >= 15 && !this.allowDrag) {
            this.allowDrag = true;
        }
        if (!this.allowDrag) {
            args.cancel = true;
        }
    }

    public onNodeDragStop(args: any) {
        const draggedNodeId = args.draggedNodeData.id;
        const targetNodeId = args.droppedNodeData.id;

        if (!this.allowDrag) {
            args.cancel = true;
            return;
        }

        const draggedNode = this.findNodeById(this.treeData, draggedNodeId);
        if (!draggedNode) {
            return;
        }

        const targetNode = this.findNodeById(this.treeData, targetNodeId);
        if (!targetNode) {
            return;
        }

        if (draggedNode.nodeType === 'Lesson') {
            const lesson = draggedNode.original as Lesson;
            let targetSubTopicId: number | undefined;
            let targetTopicId: number | undefined;
            let targetParentType: 'SubTopic' | 'Topic';

            if (targetNode.nodeType === 'SubTopic') {
                const targetSubTopic = targetNode.original as SubTopic;
                targetSubTopicId = targetSubTopic.id;
                targetParentType = 'SubTopic';
            } else if (targetNode.nodeType === 'Topic') {
                const targetTopic = targetNode.original as Topic;
                targetTopicId = targetTopic.id;
                targetParentType = 'Topic';
            } else {
                return;
            }

            const event: NodeMovedEvent = {
                node: lesson,
                sourceParentId: lesson.subTopicId || lesson.topicId,
                sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
                targetParentId: targetSubTopicId || targetTopicId,
                targetParentType: targetParentType
            };

            // Call service directly instead of emitting event
            this.courseDataService.moveNode(event).subscribe();

        } else if (draggedNode.nodeType === 'SubTopic') {
            if (targetNode.nodeType !== 'Topic') {
                return;
            }

            const subTopic = draggedNode.original as SubTopic;
            const targetTopic = targetNode.original as Topic;

            const event: NodeMovedEvent = {
                node: subTopic,
                sourceParentId: subTopic.topicId,
                sourceParentType: 'Topic',
                targetParentId: targetTopic.id,
                targetParentType: 'Topic'
            };

            // Call service directly instead of emitting event
            this.courseDataService.moveNode(event).subscribe();

        } else if (draggedNode.nodeType === 'Topic') {
            const topic = draggedNode.original as Topic;
            const sourceCourseId = this.courseId;
            let targetCourseId: number | null = null;
            
            // If target is a course node
            if (targetNode.nodeType === 'Course') {
                targetCourseId = parseInt(targetNode.id);
            } else {
                return;
            }

            if (sourceCourseId === targetCourseId) {
                // Same course move - just update sort order
                const event: NodeMovedEvent = {
                    node: topic,
                    sourceParentId: sourceCourseId,
                    sourceParentType: 'Course',
                    targetParentId: targetCourseId,
                    targetParentType: 'Course',
                    sourceCourseId,
                    targetCourseId
                };
                this.courseDataService.moveNode(event).subscribe();
                return;
            }

            const event: NodeMovedEvent = { 
                node: topic,
                sourceCourseId, 
                targetCourseId, 
                targetParentType: 'Course',
                targetParentId: targetCourseId
            };
            this.courseDataService.moveNode(event).subscribe();
        }

        this.allowDrag = false;
    }

    private findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.child) {
                const found = this.findNodeById(node.child, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    private findTopicNodeId(topicId?: number): string | undefined {
        if (!topicId) return undefined;
        
        // Look for topic in the course's child nodes
        if (this.treeData.length > 0 && this.treeData[0].child) {
            const topicNode = this.treeData[0].child.find(
                node => node.nodeType === 'Topic' && (node.original as Topic).id === topicId
            );
            return topicNode?.id;
        }
        return undefined;
    }

    private findSubTopicNodeId(subTopicId?: number): string | undefined {
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
        
        return findSubTopicInNodes(this.treeData);
    }

    public initiateAddChildNode(data: any) {
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        
        if (!node || !node.original) {
          console.warn('[Tree] Could not find node data for add child action:', { nodeId, timestamp: new Date().toISOString() });
          return;
        }
        
        const treeData = node.original as TreeData;
        console.log(`[Tree] initiateAddChildNode requested for: ${treeData.nodeId}`, { nodeType: treeData.nodeType, timestamp: new Date().toISOString() });
        
        if (treeData.nodeType === 'Course') {
          // For courses, add a Topic
          this.panelStateService.initiateAddMode('Topic', treeData, treeData.id);
        } else if (treeData.nodeType === 'Topic') {
          const topic = treeData as Topic;
          const hasSubTopics = (topic.subTopics?.length ?? 0) > 0;
          // For topics, add either a SubTopic (if already has subtopics) or Lesson
          const childType = hasSubTopics ? 'SubTopic' : 'Lesson';
          this.panelStateService.initiateAddMode(childType, treeData);
        } else if (treeData.nodeType === 'SubTopic') {
          // For subtopics, add a Lesson
          this.panelStateService.initiateAddMode('Lesson', treeData);
        }
      }
    
    public deleteNode(data: any) {
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            return;
        }

        // Call service directly instead of emitting event
        switch (node.nodeType) {
            case 'Course':
                this.courseDataService.deleteCourse((node.original as Course).id).subscribe();
                break;
            case 'Topic':
                this.courseDataService.deleteTopic((node.original as Topic).id).subscribe();
                break;
            case 'SubTopic':
                this.courseDataService.deleteSubTopic((node.original as SubTopic).id).subscribe();
                break;
            case 'Lesson':
                this.courseDataService.deleteLesson((node.original as Lesson).id).subscribe();
                break;
        }
    }

    private updateTreeDataWithChildren(parentId: string, childNodes: TreeNode[]) {
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
        this.treeData = updateChildren(this.treeData);
        this.sortTreeData();
        
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }
}

export default TreeWrapperComponent;
