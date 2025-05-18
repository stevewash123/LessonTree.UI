import { Component, ChangeDetectorRef, effect, Output, EventEmitter } from '@angular/core';
import { NodeSelectionService } from '../../core/services/node-selection.service';
import { PanelMode, PanelStateService } from '../../core/services/panel-state.service';
import { ApiService } from '../../core/services/api.service';
import { TreeData, NodeType } from '../../models/tree-node';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { LessonInfoPanelComponent } from './lesson-info-panel/lesson-info-panel.component';
import { SubtopicPanelComponent } from './subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from './topic-panel/topic-panel.component';
import { CoursePanelComponent } from './course-panel/course-panel.component';



@Component({
  selector: 'info-panel',
  standalone: true,
  imports: [
    CommonModule,
    LessonInfoPanelComponent,
    SubtopicPanelComponent,
    TopicPanelComponent,
    CoursePanelComponent
  ],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})
export class InfoPanelComponent {
  // Outputs for events to parent component
  @Output() refreshTree = new EventEmitter<void>();
  @Output() nodeAdded = new EventEmitter<TreeData>();
  @Output() nodeEdited = new EventEmitter<TreeData>();

  // Local state - make activeNode public so it can be accessed in template
  data: Course | Topic | SubTopic | LessonDetail | null = null;
  activeNode: TreeData | null = null; // Changed from private to public

  constructor(
    private apiService: ApiService, 
    private cdr: ChangeDetectorRef,
    private nodeSelectionService: NodeSelectionService,
    private panelStateService: PanelStateService
  ) {
    console.log('[InfoPanel] Component constructed', { timestamp: new Date().toISOString() });
    
    // Effect for node selection changes
    effect(() => {
      const selectedNode = this.nodeSelectionService.selectedNode();
      const source = this.nodeSelectionService.selectionSource();
      
      console.log('[InfoPanel] Node selection effect running', {
        selectedNodeId: selectedNode?.nodeId || 'none',
        selectedNodeType: selectedNode?.nodeType || 'none',
        source,
        mode: this.panelStateService.panelMode(),
        timestamp: new Date().toISOString()
      });
      
      // Only handle if there is a selected node and we're not in add mode
      if (selectedNode && this.panelStateService.panelMode() !== 'add') {
        console.log('[InfoPanel] Updating activeNode and loading data', {
          nodeId: selectedNode.nodeId,
          timestamp: new Date().toISOString()
        });
        
        // Update our local copy
        this.activeNode = selectedNode;
        
        // Load the node data
        this.loadNodeData();
      }
    });
    
    // Effect for panel mode changes
    effect(() => {
      const mode = this.panelStateService.panelMode();
      console.log(`[InfoPanel] Panel mode effect running, mode: ${mode}`, { timestamp: new Date().toISOString() });
      
      if (mode === 'add') {
        // For add mode, get the template from the service
        const template = this.panelStateService.nodeTemplate();
        const nodeType = this.panelStateService.addNodeType();
        
        console.log(`[InfoPanel] Add mode activated for ${nodeType}`, { 
          templateId: template?.nodeId || 'none',
          timestamp: new Date().toISOString()
        });
        
        // Set the data to the template
        this.data = template;
        
        // Clear active node while in add mode
        this.activeNode = null;
        
      }
    });
  }

  // Load data for the selected node
  private loadNodeData() {
    // Set panel mode to view
    this.panelStateService.setMode('view');
    
    // Reset data
    this.data = null;
    
    console.log(`[InfoPanel] loadNodeData called`, { timestamp: new Date().toISOString() });
    
    if (!this.activeNode) {
      console.warn('[InfoPanel] No active node to load', { timestamp: new Date().toISOString() });
      return;
    }
    
    console.log(`[InfoPanel] Loading data for node:`, {
      nodeId: this.activeNode.nodeId,
      nodeType: this.activeNode.nodeType,
      timestamp: new Date().toISOString()
    });
    
    switch (this.activeNode.nodeType) {
      case 'Course':
        this.data = this.activeNode as Course;
        console.log(`[InfoPanel] Loaded Course`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'Topic':
        this.data = this.activeNode as Topic;
        console.log(`[InfoPanel] Loaded Topic`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'SubTopic':
        this.data = this.activeNode as SubTopic;
        console.log(`[InfoPanel] Loaded SubTopic`, { title: this.data.title, timestamp: new Date().toISOString() });
        break;
      case 'Lesson':
        this.fetchLessonDetails(this.activeNode.id).pipe(take(1)).subscribe({
          next: (detail) => {
            this.data = detail;
            console.log(`[InfoPanel] Loaded LessonDetail`, { title: detail.title, timestamp: new Date().toISOString() });
            this.cdr.detectChanges();
          },
          error: (err) => console.error(`[InfoPanel] Failed to fetch LessonDetail`, { error: err, timestamp: new Date().toISOString() })
        });
        break;
      default:
        console.warn(`[InfoPanel] Unknown node type`, { nodeType: this.activeNode.nodeType, timestamp: new Date().toISOString() });
    }
  }

  // Fetch lesson details from API
  fetchLessonDetails(lessonId: number): Observable<LessonDetail> {
    console.log(`[InfoPanel] Fetching LessonDetail`, { id: lessonId, timestamp: new Date().toISOString() });
    return this.apiService.get<LessonDetail>(`lesson/${lessonId}`);
  }

  // Handle mode changes from child components - Update type
  handleModeChange(isEditing: boolean | any): void {
    // If the event is an object (like an Event), convert it to boolean
    const editing = typeof isEditing === 'boolean' ? isEditing : false;
    this.panelStateService.setMode(editing ? 'edit' : 'add');
  }

  // Event handlers for child components - Update types
  handleNodeAdded(node: Course | Topic | SubTopic | LessonDetail): void {
    // Ensure we have a valid TreeData object
    if (node && node.nodeType) {
      const nodeTypeDisplay = node.nodeType.charAt(0).toUpperCase() + node.nodeType.slice(1);
      console.log(`[InfoPanel] ${nodeTypeDisplay} added`, { 
        nodeType: node.nodeType,
        title: node.title, 
        timestamp: new Date().toISOString() 
      });
      
      this.nodeAdded.emit(node as TreeData);
      this.panelStateService.setMode('view');
    } 
  }

  handleNodeEdited(node: Course | Topic | SubTopic | LessonDetail ): void {
    // Ensure we have a valid TreeData object
    if (node && node.nodeType) {
      const nodeTypeDisplay = node.nodeType.charAt(0).toUpperCase() + node.nodeType.slice(1);
      console.log(`[InfoPanel] ${nodeTypeDisplay} edited`, { 
        nodeType: node.nodeType,
        title: node.title, 
        timestamp: new Date().toISOString() 
      });
      
      this.nodeEdited.emit(node as TreeData);
      this.panelStateService.setMode('view');
    } 
  }

  // Accessor for current panel mode from service
  get mode(): PanelMode {
    return this.panelStateService.panelMode();
  }
  
  // Accessor for the current add panel type from service
  get addPanelType(): NodeType | null {
    return this.panelStateService.addNodeType();
  }
  
  // Helper properties for template binding
  get lessonDetail(): LessonDetail | null {
    const activeNodeType = this.activeNode?.nodeType;
    const isLesson = activeNodeType === 'Lesson' || 
                    (this.mode === 'add' && this.addPanelType === 'Lesson');
    return isLesson ? (this.data as LessonDetail) : null;
  }

  get topic(): Topic | null {
    const activeNodeType = this.activeNode?.nodeType;
    const isTopic = activeNodeType === 'Topic' || 
                   (this.mode === 'add' && this.addPanelType === 'Topic');
    return isTopic ? (this.data as Topic) : null;
  }

  get subtopic(): SubTopic | null {
    const activeNodeType = this.activeNode?.nodeType;
    const isSubTopic = activeNodeType === 'SubTopic' || 
                      (this.mode === 'add' && this.addPanelType === 'SubTopic');
    return isSubTopic ? (this.data as SubTopic) : null;
  }

  get course(): Course | null {
    const activeNodeType = this.activeNode?.nodeType;
    const isCourse = activeNodeType === 'Course' || 
                    (this.mode === 'add' && this.addPanelType === 'Course');
    return isCourse ? (this.data as Course) : null;
  }
  
  initiateAddMode(parentNode: TreeData | null, nodeType: NodeType, courseId?: number): void {
    console.log(`[InfoPanel] initiateAddMode called (forwarding to service)`, {
      nodeType,
      parentNodeId: parentNode?.nodeId || 'none',
      courseId: courseId || 'none',
      timestamp: new Date().toISOString()
    });
    
    this.panelStateService.initiateAddMode(nodeType, parentNode, courseId);
  }
}