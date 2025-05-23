import { Injectable, signal, computed } from '@angular/core';
import { TreeData } from '../../models/tree-node';
import { NodeType } from '../../models/tree-node';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { LessonDetail } from '../../models/lesson';

export type PanelMode = 'view' | 'edit' | 'add';

@Injectable({
  providedIn: 'root'
})
export class PanelStateService {
  // Panel mode signal
  private panelModeSignal = signal<PanelMode>('view');
  public panelMode = computed(() => this.panelModeSignal());
  
  // Add mode specific state
  private addNodeTypeSignal = signal<NodeType | null>(null);
  private parentNodeSignal = signal<TreeData | null>(null);
  private courseIdSignal = signal<number | undefined>(undefined);
  private nodeTemplateSignal = signal<any | null>(null);
  
  // Computed signals for consumers
  public addNodeType = computed(() => this.addNodeTypeSignal());
  public parentNode = computed(() => this.parentNodeSignal());
  public courseId = computed(() => this.courseIdSignal());
  public nodeTemplate = computed(() => this.nodeTemplateSignal());
  
  // Computed for overlay state
  public isOverlayActive = computed(() => 
    this.panelModeSignal() === 'edit' || this.panelModeSignal() === 'add'
  );
  
  constructor() {
    console.log('[PanelStateService] Initialized', { timestamp: new Date().toISOString() });
  }
  
  // Set the panel mode
  setMode(mode: PanelMode): void {
    console.log(`[PanelStateService] Setting mode to ${mode}`, { timestamp: new Date().toISOString() });
    
    if (mode === 'view' && this.panelModeSignal() !== 'view') {
      // Clear add/edit state when returning to view mode
      this.resetAddEditState();
    }
    
    this.panelModeSignal.set(mode);
  }
  
  // Initiate add mode with all needed context
  initiateAddMode(nodeType: NodeType, parentNode: TreeData | null, courseId?: number): void {
    console.log(`[PanelStateService] Initiating add mode for ${nodeType}`, {
      parentNodeId: parentNode?.nodeId || 'none',
      courseId: courseId || 'none',
      timestamp: new Date().toISOString()
    });
    
    // Store add context - use null explicitly rather than undefined
    this.addNodeTypeSignal.set(nodeType);
    this.parentNodeSignal.set(parentNode);
    this.courseIdSignal.set(courseId);
    
    // Create template for the new node
    const template = this.createNodeTemplate(nodeType, parentNode || null, courseId);
    this.nodeTemplateSignal.set(template);
    
    // Set mode to add
    this.panelModeSignal.set('add');
  }
  
  // Reset add/edit specific state
  private resetAddEditState(): void {
    console.log(`[PanelStateService] Resetting add/edit state`, { timestamp: new Date().toISOString() });
    this.addNodeTypeSignal.set(null);
    this.parentNodeSignal.set(null);
    this.courseIdSignal.set(undefined);
    this.nodeTemplateSignal.set(null);
  }
  
  // Create a template for a new node based on type
  private createNodeTemplate(nodeType: NodeType, parentNode: TreeData | null, courseId?: number): any {
    console.log(`[PanelStateService] Creating template for ${nodeType}`, { timestamp: new Date().toISOString() });
    
    switch (nodeType) {
      case 'Course':
        return {
            id: 0,
            nodeId: `course_new_${Date.now()}`,
            title: '',
            description: '',
            hasChildren: false,
            archived: false,
            visibility: 'Private',
            userId: 0,  // ADD THIS LINE
            sortOrder: 0,  // ADD THIS LINE
            nodeType: 'Course'
          } as Course; 
        
      case 'Topic':
        if (!courseId) {
          courseId = parentNode?.courseId || 
                    (parentNode?.nodeType === 'Course' ? parentNode.id : undefined);
        }
        
        if (!courseId) {
          console.error('[PanelStateService] Cannot create Topic template: No course ID provided', { timestamp: new Date().toISOString() });
          throw new Error('Course ID required for creating a Topic');
        }
        
        // Add userId to Topic template (around line 108):
        return {
            id: 0,
            nodeId: `topic_new_${Date.now()}`,
            courseId,
            title: '',
            description: '',
            hasChildren: false,
            archived: false,
            visibility: 'Private',
            userId: 0,  // ADD THIS LINE
            subTopics: [],
            lessons: [],
            nodeType: 'Topic',
            sortOrder: 0
        } as Topic;
                
      case 'SubTopic':
        if (!parentNode || parentNode.nodeType !== 'Topic') {
          console.error('[PanelStateService] Cannot create SubTopic template: Invalid parent', { timestamp: new Date().toISOString() });
          throw new Error('Parent must be a Topic for creating a SubTopic');
        }
        
        const topicParent = parentNode as Topic;
        return {
            id: 0,
            nodeId: `subtopic_new_${Date.now()}`,
            topicId: topicParent.id,
            courseId: topicParent.courseId,
            title: '',
            description: '',
            lessons: [],
            hasChildren: false,
            archived: false,
            visibility: 'Private',
            userId: 0,  // ADD THIS LINE
            nodeType: 'SubTopic',
            sortOrder: 0
          } as SubTopic;
        
      case 'Lesson':
        if (!parentNode || (parentNode.nodeType !== 'Topic' && parentNode.nodeType !== 'SubTopic')) {
          console.error('[PanelStateService] Cannot create Lesson template: Invalid parent', { timestamp: new Date().toISOString() });
          throw new Error('Parent must be a Topic or SubTopic for creating a Lesson');
        }
        
        const parent = parentNode as Topic | SubTopic;
        return {
            id: 0,
            nodeId: `lesson_new_${Date.now()}`,
            courseId: parent.courseId,
            subTopicId: parentNode.nodeType === 'SubTopic' ? (parent as SubTopic).id : undefined,
            topicId: parentNode.nodeType === 'Topic' ? (parent as Topic).id : undefined,
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
            userId: 0,  // ADD THIS LINE
            notes: [],
            nodeType: 'Lesson',
            sortOrder: 0
          } as LessonDetail;
        
      default:
        console.error(`[PanelStateService] Unknown node type: ${nodeType}`, { timestamp: new Date().toISOString() });
        throw new Error(`Cannot create template for unknown node type: ${nodeType}`);
    }
  }
}