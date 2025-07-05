// RESPONSIBILITY: Lean presentation coordinator with proper Lesson/LessonDetail separation
// DOES NOT: Handle data mutations or API calls directly
// CALLED BY: Container components, manages panel content based on selection

import {Component, effect, computed, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { parseId } from '../shared/utils/type-conversion.utils';
import { Course } from '../models/course';
import { CourseDataService } from '../lesson-tree/services/course-data/course-data.service';
import { LessonDetail, Lesson } from '../models/lesson';
import { SubTopic } from '../models/subTopic';
import { Topic } from '../models/topic';
import { CoursePanelComponent } from './course-panel/course-panel.component';
import { LessonInfoPanelComponent } from './lesson-panel/lesson-info-panel.component';
import { EntityType, PanelStateService } from './panel-state.service';
import { SubtopicPanelComponent } from './subtopic-panel/subtopic-panel.component';
import { TopicPanelComponent } from './topic-panel/topic-panel.component';
import { CalendarInteractionService } from '../calendar/services/ui/calendar-interaction.service';
import {EntitySelectionService} from '../lesson-tree/services/state/entity-selection.service';
import {ApiService} from '../shared/services/api.service';
import {take} from 'rxjs';

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
  readonly selectedEntity: any;
  readonly hasSelection: any;


// ✅ CORRECT: Signal for reactive state
  private _currentLessonDetail = signal<LessonDetail | null>(null);

  constructor(
    private entitySelectionService: EntitySelectionService,
    private panelStateService: PanelStateService,
    private courseDataService: CourseDataService,
    private calendarInteractionService: CalendarInteractionService,
    private apiService: ApiService,
  ) {
    console.log('[InfoPanel] Lean presentation coordinator initialized with Lesson/LessonDetail separation', {
      timestamp: new Date().toISOString()
    });

    this.setupCalendarLessonSelectionSubscription();

    // Initialize readonly properties after service injection
    this.selectedEntity = this.entitySelectionService.selectedEntity;
    this.hasSelection = this.entitySelectionService.hasSelection;

    // Single effect for state change monitoring and logging
    effect(() => {
      const selectedEntity = this.selectedEntity();
      const mode = this.mode;
      const hasSelection = this.hasSelection();

      console.log('[InfoPanel] Presentation state changed', {
        selectedNodeId: selectedEntity?.id || 'none',
        selectedentityType : selectedEntity?.entityType  || 'none',
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

  private setupCalendarLessonSelectionSubscription(): void {
    this.calendarInteractionService.lessonSelected$.subscribe(event => {
      console.log('📋 [InfoPanelComponent] RECEIVED lessonSelected event from calendar (Observable)', {
        lessonId: event.lessonId,
        lessonTitle: event.lessonTitle,
        courseId: event.courseId,
        date: event.date.toISOString().split('T')[0],
        period: event.period,
        source: event.source
      });

      // Select the lesson in the node selection service to sync InfoPanel
      if (event.lessonId && event.courseId) {
        console.log('📋 [InfoPanelComponent] Selecting lesson from calendar click', {
          lessonId: event.lessonId, // ✅ Use raw number
          lessonTitle: event.lessonTitle
        });

        // ✅ FIXED: Use lessonId as number directly
        this.entitySelectionService.selectById(event.lessonId, 'Lesson', 'calendar');
      }
    });
  }

  // Mode access consistent with child panels
  get mode() {
    return this.panelStateService.panelMode();
  }

  // Data computed signals - get current data for each entity type
  readonly currentCourse = computed(() => {
    const node = this.selectedEntity();
    const mode = this.mode;

    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.entityType  === 'Course' ? (template as Course) : null;
    }

    if (node?.entityType  === 'Course') {
      return this.courseDataService.getCourseById(parseId(node.id));
    }

    return null;
  });

  readonly currentTopic = computed(() => {
    const node = this.selectedEntity();
    const mode = this.mode;

    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.entityType  === 'Topic' ? (template as Topic) : null;
    }

    if (node?.entityType  === 'Topic') {
      return this.courseDataService.getTopicById(parseId(node.id));
    }

    return null;
  });

  readonly currentSubTopic = computed(() => {
    const node = this.selectedEntity();
    const mode = this.mode;

    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.entityType  === 'SubTopic' ? (template as SubTopic) : null;
    }

    if (node?.entityType  === 'SubTopic') {
      return this.courseDataService.getSubTopicById(parseId(node.id));
    }

    return null;
  });

  // FIXED: Proper Lesson/LessonDetail handling
  readonly currentLesson = computed(() => {
    const node = this.selectedEntity();
    const mode = this.mode;

    if (mode === 'add') {
      const template = this.panelStateService.nodeTemplate();
      return template?.entityType  === 'Lesson' ? (template as LessonDetail) : null;
    }

    if (node?.entityType  === 'Lesson') {
      // Get basic Lesson from CourseDataService first to verify it exists
      const basicLesson = this.courseDataService.getLessonById(parseId(node.id));
      if (!basicLesson) return null;

      // Make API call to get full LessonDetail - this will be async
      // For now, return null and handle the API call in the component lifecycle
      this.loadLessonDetail(basicLesson.id);
      return null; // Will be updated via API call
    }

    return null;
  });

  // NEW: Convert basic Lesson to LessonDetail for InfoPanel components
  private loadLessonDetail(lessonId: number): void {
    this.apiService.get<LessonDetail>(`lesson/${lessonId}`)
      .pipe(take(1))
      .subscribe({
        next: (detail) => {
          this._currentLessonDetail.set(detail); // ← Signal stores result
        },
        error: (err) => console.error('Failed to fetch LessonDetail', err)
      });
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
  initiateAddMode(entityType : EntityType, parentNode: any, courseId?: number) {
    console.log('[InfoPanel] Initiating add mode', {
      entityType ,
      parententityType : parentNode?.entityType ,
      parentNodeId: parentNode?.id,
      courseId
    });

    // ✅ Convert TreeData to business entity
    const parentEntity = this.convertTreeDataToEntity(parentNode);

    this.panelStateService.initiateAddMode(entityType , parentEntity, courseId);
  }

  /**
   * ✅ NEW: Convert TreeData to appropriate business entity
   */
  private convertTreeDataToEntity(treeData: any): Course | Topic | SubTopic | null {
    if (!treeData) return null;

    console.log('[InfoPanel] Converting TreeData to business entity', {
      entityType : treeData.entityType ,
      nodeId: treeData.id
    });

    switch (treeData.entityType ) {
      case 'Course':
        return this.courseDataService.getCourseById(treeData.id);

      case 'Topic':
        return this.courseDataService.getTopicById(treeData.id);

      case 'SubTopic':
        return this.courseDataService.getSubTopicById(treeData.id);

      default:
        console.warn('[InfoPanel] Unknown entityType  for conversion:', treeData.entityType );
        return null;
    }
  }
}
