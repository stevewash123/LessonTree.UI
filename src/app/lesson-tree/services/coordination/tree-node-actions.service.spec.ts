// tree-node-actions.service.spec.ts
// Comprehensive unit tests for TreeNodeActionsService - Action coordination for tree nodes
// Tests node selection, auto-selection, add operations, delete operations, validation, and entity type management

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TreeNodeActionsService, NodeActionResult } from './tree-node-actions.service';
import { EntitySelectionService } from '../state/entity-selection.service';
import { PanelStateService } from '../../../info-panel/panel-state.service';
import { CourseCrudService } from '../course-operations/course-crud.service';
import { TreeNodeBuilderService } from '../ui/tree-node-builder.service';
import { CalendarRefreshService } from '../../../calendar/services/integration/calendar-refresh.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { Lesson } from '../../../models/lesson';
import { TreeNode } from '../../../models/tree-node';
import { Entity, EntityType } from '../../../models/entity';

describe('TreeNodeActionsService', () => {
  let service: TreeNodeActionsService;
  let entitySelectionServiceSpy: jasmine.SpyObj<EntitySelectionService>;
  let panelStateServiceSpy: jasmine.SpyObj<PanelStateService>;
  let courseCrudServiceSpy: jasmine.SpyObj<CourseCrudService>;
  let treeNodeBuilderServiceSpy: jasmine.SpyObj<TreeNodeBuilderService>;
  let calendarRefreshServiceSpy: jasmine.SpyObj<CalendarRefreshService>;

  // Test data fixtures
  const mockCourse: Course = {
    id: 1,
    title: 'Test Course',
    description: 'Test course description',
    visibility: 'Private',
    archived: false,
    topics: []
  } as Course;

  const mockTopic: Topic = {
    id: 2,
    title: 'Test Topic',
    description: 'Test topic description',
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    subTopics: [],
    lessons: []
  } as Topic;

  const mockSubTopic: SubTopic = {
    id: 3,
    title: 'Test SubTopic',
    description: 'Test subtopic description',
    topicId: 2,
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    lessons: []
  } as SubTopic;

  const mockLesson: Lesson = {
    id: 4,
    title: 'Test Lesson',
    courseId: 1,
    topicId: 2,
    subTopicId: 3,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test objective',
    sortOrder: 1,
    archived: false
  } as Lesson;

  const mockCourseEntity: Entity = {
    id: 1,
    entityType: 'Course'
  };

  const mockTopicEntity: Entity = {
    id: 2,
    entityType: 'Topic'
  };

  const mockSubTopicEntity: Entity = {
    id: 3,
    entityType: 'SubTopic'
  };

  const mockLessonEntity: Entity = {
    id: 4,
    entityType: 'Lesson'
  };

  const mockTreeNodeCourse: TreeNode = {
    id: 'course-1',
    text: 'Test Course',
    original: mockCourse,
    entityType: 'Course'
  } as TreeNode;

  const mockTreeNodeTopic: TreeNode = {
    id: 'topic-2',
    text: 'Test Topic',
    original: mockTopic,
    entityType: 'Topic'
  } as TreeNode;

  const mockTreeNodeSubTopic: TreeNode = {
    id: 'subtopic-3',
    text: 'Test SubTopic',
    original: mockSubTopic,
    entityType: 'SubTopic'
  } as TreeNode;

  const mockTreeNodeLesson: TreeNode = {
    id: 'lesson-4',
    text: 'Test Lesson',
    original: mockLesson,
    entityType: 'Lesson'
  } as TreeNode;

  const mockTreeData: TreeNode[] = [
    mockTreeNodeCourse,
    mockTreeNodeTopic,
    mockTreeNodeSubTopic,
    mockTreeNodeLesson
  ];

  const mockSelectionArgs = {
    nodeData: { id: 'topic-2' }
  };

  const mockExpandArgs = {
    nodeData: { id: 'course-1' }
  };

  beforeEach(() => {
    const entitySelectionServiceSpyObj = jasmine.createSpyObj('EntitySelectionService', [
      'selectNode'
    ]);

    const panelStateServiceSpyObj = jasmine.createSpyObj('PanelStateService', [
      'initiateAddMode'
    ]);

    const courseCrudServiceSpyObj = jasmine.createSpyObj('CourseCrudService', [
      'deleteCourse',
      'deleteTopic',
      'deleteSubTopic',
      'deleteLesson'
    ]);

    const treeNodeBuilderServiceSpyObj = jasmine.createSpyObj('TreeNodeBuilderService', [
      'findNodeById',
      'getEntityTypeIcon'
    ]);

    const calendarRefreshServiceSpyObj = jasmine.createSpyObj('CalendarRefreshService', [
      'refreshCalendar',
      'refreshCalendarForCourse'
    ]);

    TestBed.configureTestingModule({
      providers: [
        TreeNodeActionsService,
        { provide: EntitySelectionService, useValue: entitySelectionServiceSpyObj },
        { provide: PanelStateService, useValue: panelStateServiceSpyObj },
        { provide: CourseCrudService, useValue: courseCrudServiceSpyObj },
        { provide: TreeNodeBuilderService, useValue: treeNodeBuilderServiceSpyObj },
        { provide: CalendarRefreshService, useValue: calendarRefreshServiceSpyObj }
      ]
    });

    service = TestBed.inject(TreeNodeActionsService);
    entitySelectionServiceSpy = TestBed.inject(EntitySelectionService) as jasmine.SpyObj<EntitySelectionService>;
    panelStateServiceSpy = TestBed.inject(PanelStateService) as jasmine.SpyObj<PanelStateService>;
    courseCrudServiceSpy = TestBed.inject(CourseCrudService) as jasmine.SpyObj<CourseCrudService>;
    treeNodeBuilderServiceSpy = TestBed.inject(TreeNodeBuilderService) as jasmine.SpyObj<TreeNodeBuilderService>;
    calendarRefreshServiceSpy = TestBed.inject(CalendarRefreshService) as jasmine.SpyObj<CalendarRefreshService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = new TreeNodeActionsService(
        entitySelectionServiceSpy,
        panelStateServiceSpy,
        courseCrudServiceSpy,
        treeNodeBuilderServiceSpy,
        calendarRefreshServiceSpy
      );
      expect(console.log).toHaveBeenCalledWith(
        '[TreeNodeActionsService] Service initialized for node action coordination with Entity architecture'
      );
    });

    it('should initialize action statistics', () => {
      const stats = service.getActionStats();
      expect(stats.totalActionsHandled).toBe(0);
      expect(stats.actionsByType.select).toBe(0);
      expect(stats.actionsByType.add).toBe(0);
      expect(stats.actionsByType.delete).toBe(0);
      expect(stats.actionsByType['auto-select']).toBe(0);
    });
  });

  describe('Node Selection Handling', () => {
    describe('handleNodeSelected()', () => {
      it('should handle successful topic node selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);

        const result = service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.action).toBe('select');
        expect(result.nodeId).toBe('topic-2');
        expect(result.entityType).toBe('Topic');
        expect(entitySelectionServiceSpy.selectNode).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 2, entityType: 'Topic' }),
          'tree'
        );
      });

      it('should handle course node selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        const args = { nodeData: { id: 'course-1' } };
        const result = service.handleNodeSelected(args, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('Course');
        expect(entitySelectionServiceSpy.selectNode).toHaveBeenCalled();
      });

      it('should handle subtopic node selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeSubTopic);

        const args = { nodeData: { id: 'subtopic-3' } };
        const result = service.handleNodeSelected(args, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('SubTopic');
      });

      it('should handle lesson node selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeLesson);

        const args = { nodeData: { id: 'lesson-4' } };
        const result = service.handleNodeSelected(args, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('Lesson');
      });

      it('should handle missing node data', () => {
        const argsWithoutNodeData = {};

        const result = service.handleNodeSelected(argsWithoutNodeData as any, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.action).toBe('select');
        expect(result.error).toBe('No node data provided');
      });

      it('should handle missing node ID', () => {
        const argsWithoutId = { nodeData: {} };

        const result = service.handleNodeSelected(argsWithoutId as any, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('No node data provided');
      });

      it('should handle node not found in tree data', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(null);

        const result = service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Node not found in tree data');
      });

      it('should handle node without original entity', () => {
        const nodeWithoutOriginal = { ...mockTreeNodeTopic, original: null };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithoutOriginal);

        const result = service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Could not extract entity from tree node');
      });

      it('should update action statistics on successful selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);

        service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);

        const stats = service.getActionStats();
        expect(stats.totalActionsHandled).toBe(1);
        expect(stats.actionsByType.select).toBe(1);
      });

      it('should log selection details', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);

        service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);

        expect(console.log).toHaveBeenCalledWith(
          '[TreeNodeActionsService] Node selected:',
          {
            nodeId: 'topic-2',
            entityType: 'Topic',
            action: 'select'
          }
        );
      });
    });
  });

  describe('Auto-Selection on Expand', () => {
    describe('handleAutoSelectOnExpand()', () => {
      it('should auto-select expanded node when no current selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        const result = service.handleAutoSelectOnExpand(
          mockExpandArgs,
          mockTreeData,
          1,
          false // hasCurrentSelection
        );

        expect(result.success).toBe(true);
        expect(result.action).toBe('auto-select');
        expect(result.nodeId).toBe('course-1');
        expect(result.entityType).toBe('Course');
        expect(entitySelectionServiceSpy.selectNode).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 1, entityType: 'Course' }),
          'tree'
        );
      });

      it('should not auto-select when current selection exists', () => {
        const result = service.handleAutoSelectOnExpand(
          mockExpandArgs,
          mockTreeData,
          1,
          true // hasCurrentSelection
        );

        expect(result.success).toBe(false);
        expect(result.action).toBe('auto-select');
        expect(result.error).toBe('Selection already exists');
        expect(entitySelectionServiceSpy.selectNode).not.toHaveBeenCalled();
      });

      it('should handle missing expand node data', () => {
        const argsWithoutNodeData = {};

        const result = service.handleAutoSelectOnExpand(
          argsWithoutNodeData as any,
          mockTreeData,
          1,
          false
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('No expanded node data');
      });

      it('should handle expanded node not found', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(null);

        const result = service.handleAutoSelectOnExpand(
          mockExpandArgs,
          mockTreeData,
          1,
          false
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Expanded node not found in tree data');
      });

      it('should handle expanded node without entity', () => {
        const nodeWithoutOriginal = { ...mockTreeNodeCourse, original: null };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithoutOriginal);

        const result = service.handleAutoSelectOnExpand(
          mockExpandArgs,
          mockTreeData,
          1,
          false
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Could not extract entity from expanded node');
      });

      it('should update action statistics on successful auto-selection', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        service.handleAutoSelectOnExpand(mockExpandArgs, mockTreeData, 1, false);

        const stats = service.getActionStats();
        expect(stats.totalActionsHandled).toBe(1);
        expect(stats.actionsByType['auto-select']).toBe(1);
      });

      it('should log auto-selection details', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        service.handleAutoSelectOnExpand(mockExpandArgs, mockTreeData, 1, false);

        expect(console.log).toHaveBeenCalledWith(
          '[TreeNodeActionsService] Auto-selected on expand:',
          {
            nodeId: 'course-1',
            entityType: 'Course',
            action: 'auto-select'
          }
        );
      });
    });
  });

  describe('Add Child Node Operations', () => {
    describe('initiateAddChildNode()', () => {
      it('should initiate adding topic to course', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        const data = { id: 'course-1' };
        const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.action).toBe('add');
        expect(result.nodeId).toBe('course-1');
        expect(result.entityType).toBe('Topic');
        expect(panelStateServiceSpy.initiateAddMode).toHaveBeenCalledWith(
          'Topic',
          mockCourse,
          1
        );
      });

      it('should initiate adding subtopic to topic', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);

        const data = { id: 'topic-2' };
        const result = service.initiateAddChildNode(data, 'SubTopic', mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('SubTopic');
        expect(panelStateServiceSpy.initiateAddMode).toHaveBeenCalledWith(
          'SubTopic',
          mockTopic,
          2
        );
      });

      it('should initiate adding lesson to topic', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);

        const data = { id: 'topic-2' };
        const result = service.initiateAddChildNode(data, 'Lesson', mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('Lesson');
      });

      it('should initiate adding lesson to subtopic', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeSubTopic);

        const data = { id: 'subtopic-3' };
        const result = service.initiateAddChildNode(data, 'Lesson', mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(panelStateServiceSpy.initiateAddMode).toHaveBeenCalledWith(
          'Lesson',
          mockSubTopic,
          3
        );
      });

      it('should handle parent node not found', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(null);

        const data = { id: 'nonexistent-node' };
        const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Parent node not found');
      });

      it('should handle node without original entity', () => {
        const nodeWithoutOriginal = { ...mockTreeNodeCourse, original: null };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithoutOriginal);

        const data = { id: 'course-1' };
        const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Could not extract entity from parent node');
      });

      it('should handle invalid business entity ID', () => {
        const courseWithInvalidId = { ...mockCourse, id: 0 };
        const nodeWithInvalidId = { ...mockTreeNodeCourse, original: courseWithInvalidId };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithInvalidId);

        const data = { id: 'course-1' };
        const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid business entity ID');
      });

      it('should handle lessons trying to have children', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeLesson);

        const data = { id: 'lesson-4' };
        const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot cast to specific entity type');
      });

      it('should update action statistics on successful add initiation', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        const data = { id: 'course-1' };
        service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        const stats = service.getActionStats();
        expect(stats.totalActionsHandled).toBe(1);
        expect(stats.actionsByType.add).toBe(1);
      });

      it('should log add child initiation details', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

        const data = { id: 'course-1' };
        service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

        expect(console.log).toHaveBeenCalledWith(
          '[TreeNodeActionsService] Add child node initiated:',
          {
            parentNodeId: 'course-1',
            parentEntityType: 'Course',
            childType: 'Topic',
            action: 'add'
          }
        );
      });
    });
  });

  describe('Delete Node Operations', () => {
    describe('deleteNode()', () => {
      it('should delete course successfully', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
        courseCrudServiceSpy.deleteCourse.and.returnValue(of({}));

        const data = { id: 'course-1' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.action).toBe('delete');
        expect(result.entityType).toBe('Course');
        expect(courseCrudServiceSpy.deleteCourse).toHaveBeenCalledWith(1);
      });

      it('should delete topic successfully', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);
        courseCrudServiceSpy.deleteTopic.and.returnValue(of({}));

        const data = { id: 'topic-2' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('Topic');
        expect(courseCrudServiceSpy.deleteTopic).toHaveBeenCalledWith(2);
      });

      it('should delete subtopic successfully', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeSubTopic);
        courseCrudServiceSpy.deleteSubTopic.and.returnValue(of({}));

        const data = { id: 'subtopic-3' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('SubTopic');
        expect(courseCrudServiceSpy.deleteSubTopic).toHaveBeenCalledWith(3);
      });

      it('should delete lesson successfully', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeLesson);
        courseCrudServiceSpy.deleteLesson.and.returnValue(of({}));

        const data = { id: 'lesson-4' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(true);
        expect(result.entityType).toBe('Lesson');
        expect(courseCrudServiceSpy.deleteLesson).toHaveBeenCalledWith(4);
      });

      it('should handle node not found for deletion', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(null);

        const data = { id: 'nonexistent-node' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Node not found for deletion');
      });

      it('should handle node without entity', () => {
        const nodeWithoutOriginal = { ...mockTreeNodeCourse, original: null };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithoutOriginal);

        const data = { id: 'course-1' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Could not extract entity from node');
      });

      it('should handle invalid entity ID for deletion', () => {
        const courseWithInvalidId = { ...mockCourse, id: 0 };
        const nodeWithInvalidId = { ...mockTreeNodeCourse, original: courseWithInvalidId };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithInvalidId);

        const data = { id: 'course-1' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid entity ID for deletion');
      });

      it('should trigger calendar refresh for course deletion', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
        courseCrudServiceSpy.deleteCourse.and.returnValue(of({}));

        const data = { id: 'course-1' };
        service.deleteNode(data, mockTreeData, 1);

        expect(calendarRefreshServiceSpy.refreshCalendar).toHaveBeenCalled();
      });

      it('should trigger calendar refresh for topic deletion', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);
        courseCrudServiceSpy.deleteTopic.and.returnValue(of({}));

        const data = { id: 'topic-2' };
        service.deleteNode(data, mockTreeData, 1);

        expect(calendarRefreshServiceSpy.refreshCalendarForCourse).toHaveBeenCalledWith(1);
      });

      it('should trigger calendar refresh for subtopic deletion', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeSubTopic);
        courseCrudServiceSpy.deleteSubTopic.and.returnValue(of({}));

        const data = { id: 'subtopic-3' };
        service.deleteNode(data, mockTreeData, 1);

        expect(calendarRefreshServiceSpy.refreshCalendarForCourse).toHaveBeenCalledWith(1);
      });

      it('should trigger calendar refresh for lesson deletion', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeLesson);
        courseCrudServiceSpy.deleteLesson.and.returnValue(of({}));

        const data = { id: 'lesson-4' };
        service.deleteNode(data, mockTreeData, 1);

        expect(calendarRefreshServiceSpy.refreshCalendarForCourse).toHaveBeenCalledWith(1);
      });

      it('should handle deletion API errors', () => {
        spyOn(console, 'error');
        const error = new Error('Deletion failed');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
        courseCrudServiceSpy.deleteCourse.and.returnValue(throwError(() => error));

        const data = { id: 'course-1' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(true); // Deletion is initiated successfully
        expect(console.error).toHaveBeenCalledWith(
          '[TreeNodeActionsService] ❌ Failed to delete course 1:',
          error
        );
      });

      it('should handle unsupported entity type for deletion', () => {
        const unsupportedEntity = { ...mockCourse, id: 1 };
        const unsupportedNode = {
          ...mockTreeNodeCourse,
          original: unsupportedEntity,
          entityType: 'UnsupportedType'
        };
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(unsupportedNode as any);

        const data = { id: 'unsupported-1' };
        const result = service.deleteNode(data, mockTreeData, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unsupported node type for deletion: UnsupportedType');
      });

      it('should update action statistics on successful deletion initiation', () => {
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
        courseCrudServiceSpy.deleteCourse.and.returnValue(of({}));

        const data = { id: 'course-1' };
        service.deleteNode(data, mockTreeData, 1);

        const stats = service.getActionStats();
        expect(stats.totalActionsHandled).toBe(1);
        expect(stats.actionsByType.delete).toBe(1);
      });

      it('should log deletion details', () => {
        spyOn(console, 'log');
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
        courseCrudServiceSpy.deleteCourse.and.returnValue(of({}));

        const data = { id: 'course-1' };
        service.deleteNode(data, mockTreeData, 1);

        expect(console.log).toHaveBeenCalledWith(
          '[TreeNodeActionsService] Node deletion initiated:',
          {
            nodeId: 'course-1',
            entityType: 'Course',
            entityId: 1,
            action: 'delete'
          }
        );
      });
    });
  });

  describe('Validation Methods', () => {
    describe('validateNodeAction()', () => {
      it('should validate add action with valid parent-child relationship', () => {
        const result = service.validateNodeAction('add', 'Course', 'Topic');

        expect(result.isValid).toBe(true);
      });

      it('should validate add action for topic with subtopic child', () => {
        const result = service.validateNodeAction('add', 'Topic', 'SubTopic');

        expect(result.isValid).toBe(true);
      });

      it('should validate add action for topic with lesson child', () => {
        const result = service.validateNodeAction('add', 'Topic', 'Lesson');

        expect(result.isValid).toBe(true);
      });

      it('should validate add action for subtopic with lesson child', () => {
        const result = service.validateNodeAction('add', 'SubTopic', 'Lesson');

        expect(result.isValid).toBe(true);
      });

      it('should invalidate add action for invalid parent-child relationship', () => {
        const result = service.validateNodeAction('add', 'Course', 'Lesson');

        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Course cannot have Lesson children');
      });

      it('should invalidate add action for lesson having children', () => {
        const result = service.validateNodeAction('add', 'Lesson', 'Topic');

        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Lesson cannot have Topic children');
      });

      it('should require child type for add action', () => {
        const result = service.validateNodeAction('add', 'Course');

        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Child type required for add action');
      });

      it('should validate delete action for all entity types', () => {
        expect(service.validateNodeAction('delete', 'Course').isValid).toBe(true);
        expect(service.validateNodeAction('delete', 'Topic').isValid).toBe(true);
        expect(service.validateNodeAction('delete', 'SubTopic').isValid).toBe(true);
        expect(service.validateNodeAction('delete', 'Lesson').isValid).toBe(true);
      });

      it('should validate select action for all entity types', () => {
        expect(service.validateNodeAction('select', 'Course').isValid).toBe(true);
        expect(service.validateNodeAction('select', 'Topic').isValid).toBe(true);
        expect(service.validateNodeAction('select', 'SubTopic').isValid).toBe(true);
        expect(service.validateNodeAction('select', 'Lesson').isValid).toBe(true);
      });

      it('should handle unknown action type', () => {
        const result = service.validateNodeAction('unknown' as any, 'Course');

        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Unknown action type');
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getEntityTypeIcon()', () => {
      it('should delegate to TreeNodeBuilderService for entity type icon', () => {
        treeNodeBuilderServiceSpy.getEntityTypeIcon.and.returnValue('fa-book');

        const result = service.getEntityTypeIcon('Course');

        expect(result).toBe('fa-book');
        expect(treeNodeBuilderServiceSpy.getEntityTypeIcon).toHaveBeenCalledWith('Course');
      });
    });

    describe('getActionStats()', () => {
      it('should return action statistics', () => {
        // Perform some actions to update stats
        treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
        service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);
        service.handleAutoSelectOnExpand(mockExpandArgs, mockTreeData, 1, false);

        const stats = service.getActionStats();

        expect(stats.totalActionsHandled).toBe(2);
        expect(stats.actionsByType.select).toBe(1);
        expect(stats.actionsByType['auto-select']).toBe(1);
      });
    });

    describe('getDebugInfo()', () => {
      it('should return comprehensive debug information', () => {
        const debugInfo = service.getDebugInfo();

        expect(debugInfo).toEqual({
          actionStats: jasmine.any(Object),
          serviceArchitecture: {
            delegates: ['EntitySelectionService', 'PanelStateService', 'CourseCrudService', 'TreeNodeBuilderService'],
            responsibilities: ['Node selection coordination', 'Add/delete actions', 'Business service delegation'],
            hasObservableEvents: false,
            entityArchitecture: true
          },
          supportedActions: ['select', 'add', 'delete', 'auto-select'],
          validParentChildRelationships: {
            'Course': ['Topic'],
            'Topic': ['SubTopic', 'Lesson'],
            'SubTopic': ['Lesson'],
            'Lesson': []
          }
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle entity extraction errors', () => {
      spyOn(console, 'error');
      const corruptedNode = { id: 'test', original: 'invalid-entity' };
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(corruptedNode as any);

      const result = service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract entity from tree node');
    });

    it('should handle null tree data', () => {
      const result = service.handleNodeSelected(mockSelectionArgs, null as any, 1);

      expect(result.success).toBe(false);
    });

    it('should handle empty tree data', () => {
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(null);

      const result = service.handleNodeSelected(mockSelectionArgs, [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Node not found in tree data');
    });

    it('should handle entities without id property', () => {
      const entityWithoutId = { entityType: 'Course' };
      const nodeWithoutId = { ...mockTreeNodeCourse, original: entityWithoutId };
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithoutId as any);

      const data = { id: 'course-1' };
      const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid business entity ID');
    });

    it('should handle entities with negative id', () => {
      const entityWithNegativeId = { ...mockCourse, id: -1 };
      const nodeWithNegativeId = { ...mockTreeNodeCourse, original: entityWithNegativeId };
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(nodeWithNegativeId);

      const data = { id: 'course-1' };
      const result = service.deleteNode(data, mockTreeData, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid entity ID for deletion');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete add workflow', () => {
      // 1. Validate add action
      const validation = service.validateNodeAction('add', 'Course', 'Topic');
      expect(validation.isValid).toBe(true);

      // 2. Find parent node
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);

      // 3. Initiate add mode
      const data = { id: 'course-1' };
      const result = service.initiateAddChildNode(data, 'Topic', mockTreeData, 1);

      expect(result.success).toBe(true);
      expect(panelStateServiceSpy.initiateAddMode).toHaveBeenCalledWith('Topic', mockCourse, 1);
    });

    it('should handle complete delete workflow', () => {
      // 1. Validate delete action
      const validation = service.validateNodeAction('delete', 'Course');
      expect(validation.isValid).toBe(true);

      // 2. Find node to delete
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeCourse);
      courseCrudServiceSpy.deleteCourse.and.returnValue(of({}));

      // 3. Delete node
      const data = { id: 'course-1' };
      const result = service.deleteNode(data, mockTreeData, 1);

      expect(result.success).toBe(true);
      expect(courseCrudServiceSpy.deleteCourse).toHaveBeenCalledWith(1);
    });

    it('should handle complete selection workflow', () => {
      // 1. Handle node selection
      treeNodeBuilderServiceSpy.findNodeById.and.returnValue(mockTreeNodeTopic);

      const selectionResult = service.handleNodeSelected(mockSelectionArgs, mockTreeData, 1);
      expect(selectionResult.success).toBe(true);

      // 2. Handle auto-selection on expand (should not select when selection exists)
      const autoSelectResult = service.handleAutoSelectOnExpand(
        mockExpandArgs,
        mockTreeData,
        1,
        true // hasCurrentSelection
      );
      expect(autoSelectResult.success).toBe(false);
      expect(autoSelectResult.error).toBe('Selection already exists');
    });
  });
});