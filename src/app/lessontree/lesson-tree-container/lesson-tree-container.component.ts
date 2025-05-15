import { Component, ViewChild } from '@angular/core';
import { InfoPanelComponent, PanelMode, PanelType } from '../info-panel/info-panel.component';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import { CourseListComponent } from '../course-list/course-list.component';
import { NodeType, TopicMovedEvent, TreeData } from '../../models/tree-node';
import { Course } from '../../models/course';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';

@Component({
  selector: 'lesson-tree-container',
  standalone: true,
  imports: [
    CommonModule,
    CourseListComponent,
    InfoPanelComponent,
    SplitComponent,
    SplitAreaComponent
  ],
  templateUrl: './lesson-tree-container.component.html',
  styleUrls: ['./lesson-tree-container.component.css']
})
export class LessonTreeContainerComponent {
  sizes: number[] = [50, 50];
  currentActiveNode: TreeData | null = null;
  selectedCourse: Course | null = null; // Keep this for now to avoid breaking other parts
  refreshTrigger: boolean = false;panelMode: PanelMode = 'view';
  newNode: TreeData | null = null;
  nodeEdited: TreeData | null = null;
  courses: Course[] = [];
  courseFilter: 'active' | 'archived' | 'both' = 'active';
  visibilityFilter: 'private' | 'team' = 'private';

  @ViewChild('infoPanel') infoPanel!: InfoPanelComponent;

  constructor(
    private apiService: ApiService,
    private toastr: ToastrService
  ) {
    console.log(`[LessonTreeContainer] Component initialized with panelMode: ${this.panelMode}`, { timestamp: new Date().toISOString() });
    this.loadCourses(); // Fetch courses on initialization
  }

  get isOverlayActive(): boolean {
    const active = this.panelMode === 'add' || this.panelMode === 'edit';
    return active;
  }

  // Moved from CourseListComponent
  loadCourses(): void {
    console.log('[LessonTreeContainer] Loading courses from API', { 
      courseFilter: this.courseFilter, 
      visibilityFilter: this.visibilityFilter, 
      timestamp: new Date().toISOString() 
    });

    this.apiService.getCourses(this.courseFilter, this.visibilityFilter).subscribe({
      next: (courses) => {
        this.courses = courses;
        console.log('[LessonTreeContainer] Courses loaded successfully:', this.courses.map(c => ({ id: c.id, title: c.title, archived: c.archived, visibility: c.visibility })), { timestamp: new Date().toISOString() });
      },
      error: (err) => {
        console.error('[LessonTreeContainer] Failed to load courses:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to load courses: ' + err.message, 'Error', { timeOut: 0 });
      }
    });
  }

  onActiveNodeChange(node: TreeData): void {
    this.currentActiveNode = node;
  }

  onDragEnd(event: any): void {
    console.log('[LessonTreeContainer] Drag end event:', event, { timestamp: new Date().toISOString() });
    if (event.sizes) {
      this.sizes = event.sizes;
      console.log(`[LessonTreeContainer] Updated sizes: ${this.sizes}`, { timestamp: new Date().toISOString() });
    }
  }

  onAddNodeRequested(event: { parentNode?: TreeData; nodeType: NodeType; courseId?: number }): void {
    console.log(`[LessonTreeContainer] Handling add node request: ${event.nodeType}`, { timestamp: new Date().toISOString() });
    this.infoPanel.initiateAddMode(event.parentNode, event.nodeType, event.courseId);
  }


  onRefreshTree(): void {
    console.log(`[LessonTreeContainer] Handling refreshTree event`, { timestamp: new Date().toISOString() });
    this.refreshTrigger = !this.refreshTrigger;
    this.loadCourses(); // Reload courses to ensure fresh data
    console.log(`[LessonTreeContainer] Toggled refreshTrigger for tree refresh`, { newValue: this.refreshTrigger, timestamp: new Date().toISOString() });
  }

  onNodeAdded(node: TreeData): void {
    console.log(`[LessonTreeContainer] Received nodeAdded event`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Set active node`, { nodeId: node.id, timestamp: new Date().toISOString() });
    this.newNode = node;
    console.log(`[LessonTreeContainer] Set newNode for propagation`, { nodeId: node.id, timestamp: new Date().toISOString() });
    this.updateCoursesWithNewNode(node);
  }

  onNodeEdited(node: TreeData): void {
    console.log(`[LessonTreeContainer] Received nodeEdited event`, { nodeId: node.id, type: node.nodeType, timestamp: new Date().toISOString() });
    this.currentActiveNode = node;
    console.log(`[LessonTreeContainer] Set active node`, { nodeId: node.id, timestamp: new Date().toISOString() });
    this.nodeEdited = node;
    console.log(`[LessonTreeContainer] Set nodeEdited for propagation`, { nodeId: node.id, timestamp: new Date().toISOString() });
    this.updateCoursesWithEditedNode(node);
  }

  onPanelModeChange(mode: PanelMode): void {
    this.panelMode = mode;
    console.log(`[LessonTreeContainer] Panel mode changed to ${mode}`, { timestamp: new Date().toISOString() });
  }

  // Handle node drag-and-drop updates
  onTopicMoved(event: TopicMovedEvent): void {
    console.log('[LessonTreeContainer] onTopicMoved: Topic moved event received:', event, { timestamp: new Date().toISOString() });
    const { topic, sourceCourseId, targetCourseId: initialTargetCourseId, targetNodeId } = event;
    const sourceCourse = this.courses.find(c => c.id === sourceCourseId);

    if (!sourceCourse) {
      console.error('[LessonTreeContainer] onTopicMoved: Source course not found for ID:', sourceCourseId, { timestamp: new Date().toISOString() });
      this.toastr.error('Source course not found', 'Error');
      this.loadCourses();
      return;
    }

    let targetCourseId = initialTargetCourseId;
    let targetCourse: Course | undefined;

    if (targetCourseId === null && targetNodeId) {
      console.log('[LessonTreeContainer] onTopicMoved: Resolving targetCourseId using targetNodeId:', targetNodeId, { timestamp: new Date().toISOString() });
      for (const course of this.courses) {
        if (course.topics) {
          const foundTopic = course.topics.find(t => t.nodeId === targetNodeId);
          if (foundTopic) {
            targetCourseId = course.id;
            targetCourse = course;
            console.log('[LessonTreeContainer] onTopicMoved: Target course resolved:', targetCourseId, 'Title:', course.title, { timestamp: new Date().toISOString() });
            break;
          }
        }
      }
      if (!targetCourseId) {
        console.error('[LessonTreeContainer] onTopicMoved: Could not resolve target course for targetNodeId:', targetNodeId, { timestamp: new Date().toISOString() });
        this.toastr.error('Target course not found for the dropped node', 'Error');
        return;
      }
    } else if (targetCourseId !== null) {
      targetCourse = this.courses.find(c => c.id === targetCourseId);
      console.log('[LessonTreeContainer] onTopicMoved: Target course provided:', targetCourseId, 'Title:', targetCourse?.title, { timestamp: new Date().toISOString() });
    } else {
      console.error('[LessonTreeContainer] onTopicMoved: Both targetCourseId and targetNodeId are null or undefined', { timestamp: new Date().toISOString() });
      this.toastr.error('Invalid target for topic move', 'Error');
      return;
    }

    if (!targetCourse) {
      console.error('[LessonTreeContainer] onTopicMoved: Target course not found for ID:', targetCourseId, { timestamp: new Date().toISOString() });
      this.toastr.error('Target course not found', 'Error');
      this.loadCourses();
      return;
    }

    console.log(`[LessonTreeContainer] onTopicMoved: Moving topic ${topic.title} (ID: ${topic.id}) from course ${sourceCourse.title} (ID: ${sourceCourseId}) to course ${targetCourse.title} (ID: ${targetCourseId})`, { timestamp: new Date().toISOString() });
    this.apiService.moveTopic(topic.id, targetCourseId!).subscribe({
      next: () => {
        console.log(`[LessonTreeContainer] onTopicMoved: Successfully moved topic ${topic.title} to course ${targetCourse!.title}`, { timestamp: new Date().toISOString() });
        if (!sourceCourse.topics) sourceCourse.topics = [];
        if (!targetCourse!.topics) targetCourse!.topics = [];
        sourceCourse.topics = sourceCourse.topics.filter(t => t.id !== topic.id);
        targetCourse!.topics.push(topic);
        topic.courseId = targetCourseId!;
        this.refreshTrigger = !this.refreshTrigger;
        this.toastr.success(`Moved Topic ${topic.title} from Course ${sourceCourse.title} to Course ${targetCourse!.title}`);
      },
      error: (err) => {
        console.error('[LessonTreeContainer] onTopicMoved: Failed to move topic via API:', err, { timestamp: new Date().toISOString() });
        this.toastr.error('Failed to move topic', 'Error');
        this.loadCourses();
      }
    });
  }

  onLessonMoved(event: { lesson: Lesson, sourceSubTopicId?: number, targetSubTopicId?: number, targetTopicId?: number }): void {
    console.log('[LessonTreeContainer] onLessonMoved: Lesson moved event:', event, { timestamp: new Date().toISOString() });
    const { lesson, sourceSubTopicId, targetSubTopicId, targetTopicId } = event;

    let sourceSubTopic: SubTopic | undefined;
    let targetSubTopic: SubTopic | undefined;
    let targetTopic: Topic | undefined;

    for (const course of this.courses) {
      if (!course.topics) continue;
      for (const topic of course.topics) {
        if (targetTopicId && topic.id === targetTopicId) {
          targetTopic = topic;
        }
        if (!topic.subTopics) continue;
        if (!sourceSubTopic) {
          sourceSubTopic = topic.subTopics.find(st => st.id === sourceSubTopicId);
        }
        if (!targetSubTopic && targetSubTopicId) {
          targetSubTopic = topic.subTopics.find(st => st.id === targetSubTopicId);
        }
        if ((sourceSubTopic && targetSubTopic) || (sourceSubTopic && targetTopic)) break;
      }
      if ((sourceSubTopic && targetSubTopic) || (sourceSubTopic && targetTopic)) break;
    }

    if (!sourceSubTopic || (!targetSubTopic && !targetTopic)) {
      console.error('[LessonTreeContainer] onLessonMoved: Source or target not found:', { sourceSubTopicId, targetSubTopicId, targetTopicId }, { timestamp: new Date().toISOString() });
      this.toastr.error('Failed to update course data after moving lesson', 'Error');
      this.loadCourses();
      return;
    }

    sourceSubTopic.lessons = sourceSubTopic.lessons.filter(l => l.id !== lesson.id);
    console.log(`[LessonTreeContainer] onLessonMoved: Removed lesson ${lesson.id} from source subTopic ${sourceSubTopicId}`, { timestamp: new Date().toISOString() });

    if (targetSubTopic) {
      if (!targetSubTopic.lessons) targetSubTopic.lessons = [];
      targetSubTopic.lessons.push(lesson);
      lesson.subTopicId = targetSubTopicId;
      lesson.topicId = undefined;
      console.log(`[LessonTreeContainer] onLessonMoved: Added lesson ${lesson.id} to target subTopic ${targetSubTopicId}`, { timestamp: new Date().toISOString() });
    } else if (targetTopic) {
      if (!targetTopic.lessons) targetTopic.lessons = [];
      targetTopic.lessons.push(lesson);
      lesson.subTopicId = undefined;
      lesson.topicId = targetTopicId;
      console.log(`[LessonTreeContainer] onLessonMoved: Added lesson ${lesson.id} to target topic ${targetTopicId}`, { timestamp: new Date().toISOString() });
    }

    this.refreshTrigger = !this.refreshTrigger;
    this.toastr.success(`Moved Lesson ${lesson.title} from SubTopic ${sourceSubTopic.title} to ${targetSubTopic ? `SubTopic ${targetSubTopic.title}` : `Topic ${targetTopic!.title}`}`);
  }

  private updateCoursesWithNewNode(node: TreeData): void {
    const courseId = node.courseId;
    if (!courseId) {
      console.warn('[LessonTreeContainer] updateCoursesWithNewNode: Course ID not found for node', { 
        nodeId: node.nodeId, 
        timestamp: new Date().toISOString() 
      });
      this.loadCourses();
      return;
    }
  
    const course = this.courses.find(c => c.id === courseId);
    if (!course) {
      console.warn('[LessonTreeContainer] updateCoursesWithNewNode: Course not found', { 
        courseId, 
        nodeId: node.nodeId, 
        timestamp: new Date().toISOString() 
      });
      this.loadCourses();
      return;
    }
  
    switch (node.nodeType) {
      case 'Topic':
        if (!course.topics) course.topics = [];
        course.topics.push(node as Topic);
        console.log(`[LessonTreeContainer] Added Topic to course ${courseId}`, { 
          topicId: node.id, 
          timestamp: new Date().toISOString() 
        });
        break;
        
      case 'SubTopic':
        const subTopic = node as SubTopic;
        const topic = course.topics?.find(t => t.id === subTopic.topicId);
        if (topic) {
          if (!topic.subTopics) topic.subTopics = [];
          topic.subTopics.push(subTopic);
          console.log(`[LessonTreeContainer] Added SubTopic to course ${courseId}`, { 
            topicId: topic.id, 
            subTopicId: node.id, 
            timestamp: new Date().toISOString() 
          });
        }
        break;
        
      case 'Lesson':
        const lesson = node as Lesson;
        if (lesson.subTopicId) {
          const topicWithSubTopic = course.topics?.find(t => 
            t.subTopics?.some(st => st.id === lesson.subTopicId)
          );
          
          const subTopic = topicWithSubTopic?.subTopics?.find(st => 
            st.id === lesson.subTopicId
          );
          
          if (subTopic) {
            if (!subTopic.lessons) subTopic.lessons = [];
            subTopic.lessons.push(lesson);
            console.log(`[LessonTreeContainer] Added Lesson to subTopic ${lesson.subTopicId}`, { 
              lessonId: lesson.id, 
              timestamp: new Date().toISOString() 
            });
          }
        } else if (lesson.topicId) {
          const topic = course.topics?.find(t => t.id === lesson.topicId);
          if (topic) {
            if (!topic.lessons) topic.lessons = [];
            topic.lessons.push(lesson);
            console.log(`[LessonTreeContainer] Added Lesson to topic ${lesson.topicId}`, { 
              lessonId: lesson.id, 
              timestamp: new Date().toISOString() 
            });
          }
        }
        break;
        
      case 'Course':
        // Should not happen - Courses are added directly to the courses array
        console.warn('[LessonTreeContainer] Attempted to add Course inside updateCoursesWithNewNode', { 
          courseId: node.id, 
          timestamp: new Date().toISOString() 
        });
        break;
    }
  }
  
  // Update the updateCoursesWithEditedNode method
  private updateCoursesWithEditedNode(node: TreeData): void {
    const courseId = node.courseId;
    if (!courseId) {
      console.warn('[LessonTreeContainer] updateCoursesWithEditedNode: Course ID not found for node', { 
        nodeId: node.nodeId, 
        timestamp: new Date().toISOString() 
      });
      this.loadCourses();
      return;
    }
  
    const course = this.courses.find(c => c.id === courseId);
    if (!course || !course.topics) {
      console.warn('[LessonTreeContainer] updateCoursesWithEditedNode: Course or topics not found', { 
        courseId, 
        nodeId: node.nodeId, 
        timestamp: new Date().toISOString() 
      });
      this.loadCourses();
      return;
    }
  
    // Simple update function that supports nested entities
    const updateNode = (topics: Topic[]): boolean => {
      for (let i = 0; i < topics.length; i++) {
        if (node.nodeType === 'Topic' && topics[i].nodeId === node.nodeId) {
          topics[i] = { ...node as Topic };
          console.log(`[LessonTreeContainer] Updated Topic`, { 
            nodeId: node.nodeId, 
            title: topics[i].title, 
            timestamp: new Date().toISOString() 
          });
          return true;
        }
        
        if (topics[i] && topics[i].subTopics && topics[i].subTopics!.length > 0) {
          for (let j = 0; j < topics[i].subTopics!.length; j++) {
            if (node.nodeType === 'SubTopic' && topics[i].subTopics![j].nodeId === node.nodeId) {
              topics[i].subTopics![j] = { ...node as SubTopic };
              console.log(`[LessonTreeContainer] Updated SubTopic`, { 
                nodeId: node.nodeId, 
                title: topics[i].subTopics![j].title, 
                timestamp: new Date().toISOString() 
              });
              return true;
            }
            
            if (topics[i]!.subTopics![j].lessons && topics[i].subTopics![j].lessons.length > 0) {
              for (let k = 0; k < topics[i].subTopics![j].lessons.length; k++) {
                if (node.nodeType === 'Lesson' && topics[i].subTopics![j].lessons[k].nodeId === node.nodeId) {
                  topics[i].subTopics![j].lessons[k] = { ...node as Lesson };
                  console.log(`[LessonTreeContainer] Updated Lesson`, { 
                    nodeId: node.nodeId, 
                    title: topics[i].subTopics![j].lessons[k].title, 
                    timestamp: new Date().toISOString() 
                  });
                  return true;
                }
              }
            }
          }
        }
        
        if (topics[i] && topics[i].lessons && topics[i].lessons!.length > 0) {
          for (let k = 0; k < topics[i].lessons!.length; k++) {
            if (node.nodeType === 'Lesson' && topics[i].lessons![k].nodeId === node.nodeId) {
              topics[i].lessons![k] = { ...node as Lesson };
              console.log(`[LessonTreeContainer] Updated Lesson`, { 
                nodeId: node.nodeId, 
                title: topics[i].lessons![k].title, 
                timestamp: new Date().toISOString() 
              });
              return true;
            }
          }
        }
      }
      return false;
    };
  
    if (updateNode(course.topics)) {
      console.log(`[LessonTreeContainer] Node updated in course ${course.id}`, { 
        nodeId: node.nodeId, 
        timestamp: new Date().toISOString() 
      });
    } else {
      console.warn(`[LessonTreeContainer] Edited node not found in course ${course.id}`, { 
        nodeId: node.nodeId, 
        timestamp: new Date().toISOString() 
      });
      this.loadCourses();
    }
  }
  
}