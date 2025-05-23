// src/app/lessontree/info-panel/info-panel.component.ts - COMPLETE FILE (OPTIMIZED)
import { Component, ChangeDetectorRef, effect, computed, inject } from '@angular/core';
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
import { CourseDataService } from '../../core/services/course-data.service';
import { parseId } from '../../core/utils/type-conversion.utils';

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
  // Injected services - moved to top to fix initialization order
  public readonly nodeSelectionService  = inject(NodeSelectionService);
  private readonly panelStateService = inject(PanelStateService);
  private readonly courseDataService = inject(CourseDataService);
  private readonly apiService = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Local state
  data: Course | Topic | SubTopic | LessonDetail | null = null;

  // Expose signals for template - much cleaner than local properties
  readonly selectedNode = this.nodeSelectionService.selectedNode;
  readonly hasSelection = this.nodeSelectionService.hasSelection;
  readonly selectedNodeType = this.nodeSelectionService.selectedNodeType;
  readonly selectedCourse = this.nodeSelectionService.selectedCourse;
  readonly selectedTopic = this.nodeSelectionService.selectedTopic;
  readonly selectedSubTopic = this.nodeSelectionService.selectedSubTopic;
  readonly selectedLesson = this.nodeSelectionService.selectedLesson;

  // Computed signals for template logic
  readonly showCoursePanel = computed(() => {
    const node = this.selectedNode();
    const mode = this.panelStateService.panelMode();
    const addType = this.panelStateService.addNodeType();
    
    return (node?.nodeType === 'Course' && mode !== 'add') || 
           (mode === 'add' && addType === 'Course');
  });

  readonly showTopicPanel = computed(() => {
    const node = this.selectedNode();
    const mode = this.panelStateService.panelMode();
    const addType = this.panelStateService.addNodeType();
    
    return (node?.nodeType === 'Topic' && mode !== 'add') || 
           (mode === 'add' && addType === 'Topic');
  });

  readonly showSubTopicPanel = computed(() => {
    const node = this.selectedNode();
    const mode = this.panelStateService.panelMode();
    const addType = this.panelStateService.addNodeType();
    
    return (node?.nodeType === 'SubTopic' && mode !== 'add') || 
           (mode === 'add' && addType === 'SubTopic');
  });

  readonly showLessonPanel = computed(() => {
    const node = this.selectedNode();
    const mode = this.panelStateService.panelMode();
    const addType = this.panelStateService.addNodeType();
    
    return (node?.nodeType === 'Lesson' && mode !== 'add') || 
           (mode === 'add' && addType === 'Lesson');
  });

  // Legacy activeNode for backward compatibility (can be removed later)
  activeNode: TreeData | null = null;

  constructor() {
    console.log('[InfoPanel] Component constructed with optimized signals', { 
      timestamp: new Date().toISOString() 
    });
    
    // Effect for node selection changes - much simpler now
    effect(() => {
      const selectedNode = this.selectedNode();
      const mode = this.panelStateService.panelMode();
      
      console.log('[InfoPanel] Selection effect running', {
        selectedNodeId: selectedNode?.id || 'none',
        selectedNodeType: selectedNode?.nodeType || 'none',
        mode,
        timestamp: new Date().toISOString()
      });
      
      // Update legacy activeNode for backward compatibility
      this.activeNode = selectedNode as unknown as TreeData;
      
      // Only load data if there's a selection and we're not in add mode
      if (selectedNode && mode !== 'add') {
        this.loadNodeData();
      }
    });
    
    // Effect for panel mode changes
    effect(() => {
      const mode = this.panelStateService.panelMode();
      console.log(`[InfoPanel] Panel mode effect running, mode: ${mode}`, { 
        timestamp: new Date().toISOString() 
      });
      
      if (mode === 'add') {
        // For add mode, get the template from the service
        const template = this.panelStateService.nodeTemplate();
        const nodeType = this.panelStateService.addNodeType();
        
        console.log(`[InfoPanel] Add mode activated for ${nodeType}`, { 
          templateId: template?.id || 'none',
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
    
    const selectedNode = this.selectedNode();
    if (!selectedNode) {
      console.warn('[InfoPanel] No selected node to load', { 
        timestamp: new Date().toISOString() 
      });
      return;
    }
    
    console.log(`[InfoPanel] Loading data for node:`, {
      nodeId: selectedNode.id,
      nodeType: selectedNode.nodeType,
      timestamp: new Date().toISOString()
    });
    
    switch (selectedNode.nodeType) {
      case 'Course':
        const course = this.courseDataService.getCourseById(parseId(selectedNode.id));
        this.data = course;
        console.log(`[InfoPanel] Loaded Course from service`, { 
          id: parseId(selectedNode.id),
          title: course?.title,
          timestamp: new Date().toISOString() 
        });
        break;
      case 'Topic':
        const topic = this.courseDataService.getTopicById(parseId(selectedNode.id));
        this.data = topic;
        console.log(`[InfoPanel] Loaded Topic from service`, { 
          id: parseId(selectedNode.id),
          title: topic?.title,
          timestamp: new Date().toISOString() 
        });
        break;
      case 'SubTopic':
        const subTopic = this.courseDataService.getSubTopicById(parseId(selectedNode.id));
        this.data = subTopic;
        console.log(`[InfoPanel] Loaded SubTopic from service`, { 
          id: parseId(selectedNode.id),
          title: subTopic?.title,
          timestamp: new Date().toISOString() 
        });
        break;
      case 'Lesson':
        this.fetchLessonDetails(parseId(selectedNode.id)).pipe(take(1)).subscribe({
          next: (detail) => {
            this.data = detail;
            console.log(`[InfoPanel] Loaded LessonDetail`, { 
              title: detail.title, 
              timestamp: new Date().toISOString() 
            });
            this.cdr.detectChanges();
          },
          error: (err) => console.error(`[InfoPanel] Failed to fetch LessonDetail`, { 
            error: err, 
            timestamp: new Date().toISOString() 
          })
        });
        break;
      default:
        console.warn(`[InfoPanel] Unknown node type`, { 
          nodeType: selectedNode.nodeType, 
          timestamp: new Date().toISOString() 
        });
    }
  }

  // Fetch lesson details from API
  fetchLessonDetails(lessonId: number): Observable<LessonDetail> {
    console.log(`[InfoPanel] Fetching LessonDetail`, { 
      id: lessonId, 
      timestamp: new Date().toISOString() 
    });
    return this.apiService.get<LessonDetail>(`lesson/${lessonId}`);
  }

  // Accessor for current panel mode from service
  get mode(): PanelMode {
    return this.panelStateService.panelMode();
  }
  
  // Accessor for the current add panel type from service
  get addPanelType(): NodeType | null {
    return this.panelStateService.addNodeType();
  }
  
  // Helper properties for template binding - using signals now
  get lessonDetail(): LessonDetail | null {
    const showLesson = this.showLessonPanel();
    return showLesson ? (this.data as LessonDetail) : null;
  }

  get topic(): Topic | null {
    const showTopic = this.showTopicPanel();
    return showTopic ? (this.data as Topic) : null;
  }

  get subtopic(): SubTopic | null {
    const showSubTopic = this.showSubTopicPanel();
    return showSubTopic ? (this.data as SubTopic) : null;
  }

  get course(): Course | null {
    const showCourse = this.showCoursePanel();
    return showCourse ? (this.data as Course) : null;
  }
  
  initiateAddMode(parentNode: TreeData | null, nodeType: NodeType, courseId?: number): void {
    console.log(`[InfoPanel] initiateAddMode called (forwarding to service)`, {
      nodeType,
      parentNodeId: parentNode?.id || 'none',
      courseId: courseId || 'none',
      timestamp: new Date().toISOString()
    });
    
    this.panelStateService.initiateAddMode(nodeType, parentNode, courseId);
  }
}