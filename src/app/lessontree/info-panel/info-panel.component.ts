// RESPONSIBILITY: Lean presentation coordinator with proper Lesson/LessonDetail separation
// DOES NOT: Handle data mutations or API calls directly
// CALLED BY: Container components, manages panel content based on selection

import { Component, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeSelectionService } from '../../core/services/node-selection.service';
import { PanelStateService } from '../../core/services/panel-state.service';
import { TreeData, NodeType } from '../../models/tree-node';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';
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
    FormsModule,
    LessonInfoPanelComponent,
    SubtopicPanelComponent,
    TopicPanelComponent,
    CoursePanelComponent
  ],
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})
export class InfoPanelComponent {
  // Expose selection signals directly to template - initialized in constructor
  readonly selectedNode: any;
  readonly hasSelection: any;

  constructor(
    private nodeSelectionService: NodeSelectionService,
    private panelStateService: PanelStateService,
    private courseDataService: CourseDataService
  ) {
    console.log('[InfoPanel] Lean presentation coordinator initialized with Lesson/LessonDetail separation', { 
      timestamp: new Date().toISOString() 
    });

    // Initialize readonly properties after service injection
    this.selectedNode = this.nodeSelectionService.selectedNode;
    this.hasSelection = this.nodeSelectionService.hasSelection;

    // Single effect for state change monitoring and logging
    effect(() => {
      const selectedNode = this.selectedNode();
      const mode = this.mode;
      const hasSelection = this.hasSelection();
      
      console.log('[InfoPanel] Presentation state changed', {
        selectedNodeId: selectedNode?.id || 'none',
        selectedNodeType: selectedNode?.nodeType || 'none',
        mode,
        hasSelection,
        showCourse: this.showCoursePanel(),
        showTopic: this.showTopicPanel(),
        showSubTopic: this.showSubTopicPanel(),
        showLesson: this.showLessonPanel(),
        timestamp: new Date().toISOString()
      });
    });
  }

  // Mode access consistent with child panels
  get mode() {
    return this.panelStateService.panelMode();
  }

  // Data computed signals - get current data for each entity type
  readonly currentCourse = computed(() => {
    const node = this.selectedNode();
    const mode = this.mode;
    
    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.nodeType === 'Course' ? (template as Course) : null;
    }
    
    if (node?.nodeType === 'Course') {
      return this.courseDataService.getCourseById(parseId(node.id));
    }
    
    return null;
  });

  readonly currentTopic = computed(() => {
    const node = this.selectedNode();
    const mode = this.mode;
    
    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.nodeType === 'Topic' ? (template as Topic) : null;
    }
    
    if (node?.nodeType === 'Topic') {
      return this.courseDataService.getTopicById(parseId(node.id));
    }
    
    return null;
  });

  readonly currentSubTopic = computed(() => {
    const node = this.selectedNode();
    const mode = this.mode;
    
    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.nodeType === 'SubTopic' ? (template as SubTopic) : null;
    }
    
    if (node?.nodeType === 'SubTopic') {
      return this.courseDataService.getSubTopicById(parseId(node.id));
    }
    
    return null;
  });

  // FIXED: Proper Lesson/LessonDetail handling
  readonly currentLesson = computed(() => {
    const node = this.selectedNode();
    const mode = this.mode;
    
    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      // Template should be LessonDetail for InfoPanel editing
      return template?.nodeType === 'Lesson' ? (template as LessonDetail) : null;
    }
    
    if (node?.nodeType === 'Lesson') {
      // FIXED: Get basic Lesson from CourseDataService and convert to LessonDetail
      const basicLesson = this.courseDataService.getLessonById(parseId(node.id));
      if (!basicLesson) return null;
      
      // Convert basic Lesson to LessonDetail for InfoPanel editing
      return this.toLessonDetail(basicLesson);
    }
    
    return null;
  });

  // NEW: Convert basic Lesson to LessonDetail for InfoPanel components
  private toLessonDetail(lesson: Lesson): LessonDetail {
    // In a real implementation, this might fetch additional details from API
    // For now, create a LessonDetail with default values for missing properties
    return {
      ...lesson,
      level: '',
      materials: '',
      classTime: '',
      methods: '',
      specialNeeds: '',
      assessment: '',
      standards: [],
      attachments: [],
      notes: []
    } as LessonDetail;
  }

  // Panel visibility computed signals - simple data availability check
  readonly showCoursePanel = computed(() => {
    return this.currentCourse() !== null;
  });

  readonly showTopicPanel = computed(() => {
    return this.currentTopic() !== null;
  });

  readonly showSubTopicPanel = computed(() => {
    return this.currentSubTopic() !== null;
  });

  readonly showLessonPanel = computed(() => {
    return this.currentLesson() !== null;
  });

  // Template accessor properties - consistent with child panel expectations
  get course(): Course | null {
    return this.currentCourse();
  }

  get topic(): Topic | null {
    return this.currentTopic();
  }

  get subtopic(): SubTopic | null {
    return this.currentSubTopic();
  }

  get lessonDetail(): LessonDetail | null {
    return this.currentLesson();
  }

  // Utility method for child components that might need to initiate add mode
  initiateAddMode(parentNode: TreeData | null, nodeType: NodeType, courseId?: number): void {
    console.log(`[InfoPanel] Coordinating add mode initiation`, {
      nodeType,
      parentNodeId: parentNode?.id || 'none',
      courseId: courseId || 'none',
      timestamp: new Date().toISOString()
    });
    
    this.panelStateService.initiateAddMode(nodeType, parentNode, courseId);
  }
}