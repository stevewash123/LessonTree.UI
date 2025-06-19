// RESPONSIBILITY: Manages InfoPanel mode state and provides templates for new nodes with proper Lesson/LessonDetail separation.
// DOES NOT: Handle actual CRUD operations or node data persistence.
// CALLED BY: InfoPanel components, TreeWrapper (for add operations)

import { Injectable, signal, computed } from '@angular/core';
import { TreeData } from '../models/tree-node';
import { NodeType } from '../models/tree-node';
import { Course } from '../models/course';
import { Topic } from '../models/topic';
import { SubTopic } from '../models/subTopic';
import { Lesson, LessonDetail } from '../models/lesson';

export type PanelMode = 'view' | 'edit' | 'add';

export interface AddModeContext {
  nodeType: NodeType;
  parentNode: TreeData | null;
  courseId: number | undefined;
  template: any;
}

@Injectable({
  providedIn: 'root'
})
export class PanelStateService {
  // Private signals for internal state
  private readonly _panelMode = signal<PanelMode>('view');
  private readonly _addNodeType = signal<NodeType | null>(null);
  private readonly _parentNode = signal<TreeData | null>(null);
  private readonly _courseId = signal<number | undefined>(undefined);
  private readonly _nodeTemplate = signal<any | null>(null);
  
  // Public readonly signals
  readonly panelMode = this._panelMode.asReadonly();
  readonly addNodeType = this._addNodeType.asReadonly();
  readonly parentNode = this._parentNode.asReadonly();
  readonly courseId = this._courseId.asReadonly();
  readonly nodeTemplate = this._nodeTemplate.asReadonly();
  
  // Computed signals for derived state
  readonly isOverlayActive = computed(() => {
    const mode = this._panelMode();
    return mode === 'edit' || mode === 'add';
  });

  readonly isViewMode = computed(() => this._panelMode() === 'view');
  readonly isEditMode = computed(() => this._panelMode() === 'edit');
  readonly isAddMode = computed(() => this._panelMode() === 'add');

  readonly addModeContext = computed((): AddModeContext | null => {
    if (this._panelMode() !== 'add') return null;
    
    const nodeType = this._addNodeType();
    if (!nodeType) return null;

    return {
      nodeType,
      parentNode: this._parentNode(),
      courseId: this._courseId(),
      template: this._nodeTemplate()
    };
  });

  readonly hasValidAddContext = computed(() => {
    const context = this.addModeContext();
    return context !== null && context.template !== null;
  });
  
  constructor() {
    console.log('[PanelStateService] Initialized with proper Lesson/LessonDetail separation', { 
      timestamp: new Date().toISOString() 
    });
  }
  
  // Set the panel mode
  setMode(mode: PanelMode): void {
    console.log(`[PanelStateService] Setting mode to ${mode}`, { 
      previousMode: this._panelMode(),
      timestamp: new Date().toISOString() 
    });
    
    if (mode === 'view' && this._panelMode() !== 'view') {
      // Clear add/edit state when returning to view mode
      this.resetAddEditState();
    }
    
    this._panelMode.set(mode);
  }
  
  // Initiate add mode with all needed context
  initiateAddMode(nodeType: NodeType, parentNode: TreeData | null, courseId?: number): void {
    console.log(`[PanelStateService] Initiating add mode for ${nodeType}`, {
      parentNodeId: parentNode?.nodeId || 'none',
      parentNodeType: parentNode?.nodeType || 'none',
      courseId: courseId || 'derived',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Validate and derive courseId if needed
      const resolvedCourseId = this.resolveCourseId(nodeType, parentNode, courseId);
      
      // Validate parent node for the requested node type
      this.validateParentNode(nodeType, parentNode);
      
      // Create template for the new node
      const template = this.createNodeTemplate(nodeType, parentNode, resolvedCourseId);
      
      // Set all state atomically
      this._addNodeType.set(nodeType);
      this._parentNode.set(parentNode);
      this._courseId.set(resolvedCourseId);
      this._nodeTemplate.set(template);
      this._panelMode.set('add');
      
      console.log(`[PanelStateService] Add mode initiated successfully`, {
        nodeType,
        resolvedCourseId,
        templateType: template?.nodeType || 'unknown',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[PanelStateService] Failed to initiate add mode:', error, {
        nodeType,
        parentNodeId: parentNode?.nodeId,
        courseId,
        timestamp: new Date().toISOString()
      });
      
      // Reset to view mode on error
      this.setMode('view');
      throw error;
    }
  }
  
  // Reset add/edit specific state
  private resetAddEditState(): void {
    console.log(`[PanelStateService] Resetting add/edit state`, { 
      timestamp: new Date().toISOString() 
    });
    
    this._addNodeType.set(null);
    this._parentNode.set(null);
    this._courseId.set(undefined);
    this._nodeTemplate.set(null);
  }

  // Resolve courseId based on context
  private resolveCourseId(nodeType: NodeType, parentNode: TreeData | null, explicitCourseId?: number): number | undefined {
    // For Course nodes, no courseId needed
    if (nodeType === 'Course') {
      return undefined;
    }

    // Use explicit courseId if provided
    if (explicitCourseId !== undefined) {
      return explicitCourseId;
    }

    // Derive from parent node
    if (parentNode) {
      if (parentNode.nodeType === 'Course') {
        return parentNode.id;
      }
      return parentNode.courseId;
    }

    // No courseId could be resolved for non-Course node
    throw new Error(`Course ID required for creating ${nodeType} but none provided or derivable`);
  }

  // Validate parent node for the requested node type
  private validateParentNode(nodeType: NodeType, parentNode: TreeData | null): void {
    switch (nodeType) {
      case 'Course':
        // Courses don't need a parent
        break;
        
      case 'Topic':
        // Topics can be created without a parent (will be added to course)
        break;
        
      case 'SubTopic':
        if (!parentNode || parentNode.nodeType !== 'Topic') {
          throw new Error('SubTopic requires a Topic parent');
        }
        break;
        
      case 'Lesson':
        if (!parentNode || (parentNode.nodeType !== 'Topic' && parentNode.nodeType !== 'SubTopic')) {
          throw new Error('Lesson requires a Topic or SubTopic parent');
        }
        break;
        
      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }
  
  // Create a template for a new node based on type - FIXED: Proper Lesson/LessonDetail separation
  private createNodeTemplate(nodeType: NodeType, parentNode: TreeData | null, courseId?: number): any {
    console.log(`[PanelStateService] Creating template for ${nodeType}`, { 
      courseId,
      parentNodeType: parentNode?.nodeType,
      timestamp: new Date().toISOString() 
    });
    
    const timestamp = Date.now();
    
    switch (nodeType) {
      case 'Course':
        return this.createCourseTemplate(timestamp);
        
      case 'Topic':
        return this.createTopicTemplate(timestamp, courseId!);
                
      case 'SubTopic':
        return this.createSubTopicTemplate(timestamp, parentNode as Topic);
        
      case 'Lesson':
        // FIXED: Create LessonDetail for InfoPanel editing, not basic Lesson
        return this.createLessonDetailTemplate(timestamp, parentNode as Topic | SubTopic);
        
      default:
        throw new Error(`Cannot create template for unknown node type: ${nodeType}`);
    }
  }

  private createCourseTemplate(timestamp: number): Course {
    return {
      id: 0,
      nodeId: `course_new_${timestamp}`,
      courseId: 0, // Will be set after creation
      title: '',
      description: '',
      hasChildren: false,
      archived: false,
      visibility: 'Private',
      userId: 0,
      sortOrder: 0,
      nodeType: 'Course',
      topics: []
    } as Course;
  }

  private createTopicTemplate(timestamp: number, courseId: number): Topic {
    return {
      id: 0,
      nodeId: `topic_new_${timestamp}`,
      courseId,
      title: '',
      description: '',
      hasChildren: false,
      archived: false,
      visibility: 'Private',
      userId: 0,
      subTopics: [],
      lessons: [],
      nodeType: 'Topic',
      sortOrder: 0
    } as Topic;
  }

  private createSubTopicTemplate(timestamp: number, parentTopic: Topic): SubTopic {
    return {
      id: 0,
      nodeId: `subtopic_new_${timestamp}`,
      topicId: parentTopic.id,
      courseId: parentTopic.courseId,
      title: '',
      description: '',
      lessons: [],
      hasChildren: false,
      archived: false,
      visibility: 'Private',
      userId: 0,
      nodeType: 'SubTopic',
      sortOrder: 0
    } as SubTopic;
  }

  // FIXED: Create LessonDetail template for InfoPanel components
  private createLessonDetailTemplate(timestamp: number, parent: Topic | SubTopic): LessonDetail {
    return {
      id: 0,
      nodeId: `lesson_new_${timestamp}`,
      courseId: parent.courseId,
      subTopicId: parent.nodeType === 'SubTopic' ? (parent as SubTopic).id : undefined,
      topicId: parent.nodeType === 'Topic' ? (parent as Topic).id : undefined,
      title: '',
      level: '',
      objective: '',
      materials: '',
      classTime: '',
      methods: '',
      specialNeeds: '',
      assessment: '',
      standards: [],
      attachments: [],
      visibility: 'Private',
      archived: false,
      userId: 0,
      notes: [],
      nodeType: 'Lesson',
      sortOrder: 0,
      description: '',
      hasChildren: false
    } as LessonDetail;
  }

  // Utility methods for external consumers
  clearState(): void {
    console.log('[PanelStateService] Clearing all state', { 
      timestamp: new Date().toISOString() 
    });
    
    this._panelMode.set('view');
    this.resetAddEditState();
  }

  // Get current state for debugging
  getStateSnapshot() {
    return {
      panelMode: this._panelMode(),
      addNodeType: this._addNodeType(),
      parentNode: this._parentNode(),
      courseId: this._courseId(),
      hasTemplate: this._nodeTemplate() !== null,
      templateType: this._nodeTemplate()?.nodeType || 'none',
      isOverlayActive: this.isOverlayActive(),
      hasValidAddContext: this.hasValidAddContext(),
      timestamp: new Date().toISOString()
    };
  }
}