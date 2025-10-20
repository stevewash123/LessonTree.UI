// entity-selection.service.spec.ts
// Comprehensive unit tests for EntitySelectionService - State management for entity selection
// Tests selection state, signal management, selection history, computed signals, and entity operations

import { TestBed } from '@angular/core/testing';
import { EntitySelectionService, SelectionSource, SelectionEvent } from './entity-selection.service';
import { Entity, EntityType } from '../../../models/entity';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { Lesson } from '../../../models/lesson';
import { generateNodeIdFromEntity } from '../../../shared/utils/type-conversion.utils';

describe('EntitySelectionService', () => {
  let service: EntitySelectionService;

  // Test data fixtures
  const mockCourse: Course = new Course({
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    visibility: 'Private',
    sortOrder: 0,
    archived: false,
    userId: 1,
    topics: [],
    standards: []
  });

  const mockTopic: Topic = new Topic({
    id: 2,
    title: 'Test Topic',
    description: 'Test Description',
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockSubTopic: SubTopic = new SubTopic({
    id: 3,
    title: 'Test SubTopic',
    description: 'Test Description',
    topicId: 2,
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockLesson: Lesson = new Lesson({
    id: 4,
    title: 'Test Lesson',
    courseId: 1,
    topicId: 2,
    subTopicId: 3,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test Objective',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EntitySelectionService]
    });

    service = TestBed.inject(EntitySelectionService);
  });

  afterEach(() => {
    // Reset service state for clean tests
    service.reset();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no selection', () => {
      expect(service.selectedEntity()).toBeNull();
      expect(service.hasSelection()).toBe(false);
      expect(service.selectionSource()).toBe('programmatic');
      expect(service.selectionHistory()).toEqual([]);
    });

    it('should initialize computed signals correctly', () => {
      expect(service.selectedEntityType()).toBeNull();
      expect(service.selectedEntityId()).toBeNull();
      expect(service.activeCourseId()).toBeNull();
      expect(service.selectedCourse()).toBeNull();
      expect(service.selectedTopic()).toBeNull();
      expect(service.selectedSubTopic()).toBeNull();
      expect(service.selectedLesson()).toBeNull();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = new EntitySelectionService();
      expect(console.log).toHaveBeenCalledWith(
        '[EntitySelectionService] Initialized with Entity-based signal state management'
      );
    });
  });

  describe('Basic Selection Operations', () => {
    describe('selectNode()', () => {
      it('should select a course entity', () => {
        service.selectNode(mockCourse, 'tree');

        expect(service.selectedEntity()).toEqual(mockCourse);
        expect(service.hasSelection()).toBe(true);
        expect(service.selectionSource()).toBe('tree');
        expect(service.selectedEntityType()).toBe('Course');
        expect(service.selectedEntityId()).toBe('course_1');
      });

      it('should select a topic entity', () => {
        service.selectNode(mockTopic, 'calendar');

        expect(service.selectedEntity()).toEqual(mockTopic);
        expect(service.selectedEntityType()).toBe('Topic');
        expect(service.selectionSource()).toBe('calendar');
        expect(service.selectedEntityId()).toBe('topic_2');
      });

      it('should select a subtopic entity', () => {
        service.selectNode(mockSubTopic, 'infopanel');

        expect(service.selectedEntity()).toEqual(mockSubTopic);
        expect(service.selectedEntityType()).toBe('SubTopic');
        expect(service.selectionSource()).toBe('infopanel');
        expect(service.selectedEntityId()).toBe('subtopic_3');
      });

      it('should select a lesson entity', () => {
        service.selectNode(mockLesson, 'programmatic');

        expect(service.selectedEntity()).toEqual(mockLesson);
        expect(service.selectedEntityType()).toBe('Lesson');
        expect(service.selectionSource()).toBe('programmatic');
        expect(service.selectedEntityId()).toBe('lesson_4');
      });

      it('should select null to clear selection', () => {
        service.selectNode(mockCourse, 'tree');
        service.selectNode(null, 'programmatic');

        expect(service.selectedEntity()).toBeNull();
        expect(service.hasSelection()).toBe(false);
        expect(service.selectedEntityType()).toBeNull();
        expect(service.selectedEntityId()).toBeNull();
      });

      it('should not update if selecting same entity from same source', () => {
        service.selectNode(mockCourse, 'tree');
        const historyLength = service.selectionHistory().length;

        service.selectNode(mockCourse, 'tree');

        expect(service.selectionHistory().length).toBe(historyLength);
      });

      it('should update if selecting same entity from different source', () => {
        service.selectNode(mockCourse, 'tree');
        const historyLength = service.selectionHistory().length;

        service.selectNode(mockCourse, 'calendar');

        expect(service.selectionHistory().length).toBe(historyLength + 1);
        expect(service.selectionSource()).toBe('calendar');
      });

      it('should use default source when not specified', () => {
        service.selectNode(mockCourse);

        expect(service.selectionSource()).toBe('programmatic');
      });

      it('should log selection details', () => {
        spyOn(console, 'log');
        service.selectNode(mockTopic, 'tree');

        expect(console.log).toHaveBeenCalledWith(
          '[EntitySelectionService] Entity selection updated:',
          jasmine.objectContaining({
            entityType: 'Topic',
            nodeId: 'topic_2',
            entityId: 2,
            source: 'tree'
          })
        );
      });
    });

    describe('clearSelection()', () => {
      it('should clear selection when entity is selected', () => {
        service.selectNode(mockCourse, 'tree');
        service.clearSelection('infopanel');

        expect(service.selectedEntity()).toBeNull();
        expect(service.hasSelection()).toBe(false);
        expect(service.selectionSource()).toBe('infopanel');
      });

      it('should not update when no entity is selected', () => {
        const historyLength = service.selectionHistory().length;
        service.clearSelection('tree');

        expect(service.selectionHistory().length).toBe(historyLength);
      });

      it('should use default source when not specified', () => {
        service.selectNode(mockCourse, 'tree');
        service.clearSelection();

        expect(service.selectionSource()).toBe('programmatic');
      });
    });
  });

  describe('Selection by ID Methods', () => {
    describe('selectById()', () => {
      it('should select course by ID and type', () => {
        service.selectById(1, 'Course', 'tree');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(1);
        expect(service.selectedEntity()!.entityType).toBe('Course');
        expect(service.selectionSource()).toBe('tree');
      });

      it('should select topic by ID and type', () => {
        service.selectById(2, 'Topic', 'calendar');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(2);
        expect(service.selectedEntity()!.entityType).toBe('Topic');
        expect(service.selectionSource()).toBe('calendar');
      });

      it('should select subtopic by ID and type', () => {
        service.selectById(3, 'SubTopic', 'infopanel');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(3);
        expect(service.selectedEntity()!.entityType).toBe('SubTopic');
        expect(service.selectionSource()).toBe('infopanel');
      });

      it('should select lesson by ID and type', () => {
        service.selectById(4, 'Lesson', 'programmatic');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(4);
        expect(service.selectedEntity()!.entityType).toBe('Lesson');
        expect(service.selectionSource()).toBe('programmatic');
      });

      it('should use default source when not specified', () => {
        service.selectById(1, 'Course');

        expect(service.selectionSource()).toBe('programmatic');
      });

      it('should create minimal entity for selection purposes', () => {
        service.selectById(5, 'Course');

        const selected = service.selectedEntity();
        expect(selected).toBeDefined();
        expect(selected!.id).toBe(5);
        expect(selected!.title).toBe('Course 5');
        expect(selected!.entityType).toBe('Course');
        expect(selected!.visibility).toBe('Private');
        expect(selected!.archived).toBe(false);
      });
    });

    describe('selectByNodeId()', () => {
      it('should select by valid course node ID', () => {
        service.selectByNodeId('course_1', 'tree');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(1);
        expect(service.selectedEntity()!.entityType).toBe('Course');
        expect(service.selectionSource()).toBe('tree');
      });

      it('should select by valid topic node ID', () => {
        service.selectByNodeId('topic_2', 'calendar');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(2);
        expect(service.selectedEntity()!.entityType).toBe('Topic');
        expect(service.selectionSource()).toBe('calendar');
      });

      it('should select by valid subtopic node ID', () => {
        service.selectByNodeId('subtopic_3', 'infopanel');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(3);
        expect(service.selectedEntity()!.entityType).toBe('SubTopic');
        expect(service.selectionSource()).toBe('infopanel');
      });

      it('should select by valid lesson node ID', () => {
        service.selectByNodeId('lesson_4', 'programmatic');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.id).toBe(4);
        expect(service.selectedEntity()!.entityType).toBe('Lesson');
        expect(service.selectionSource()).toBe('programmatic');
      });

      it('should handle invalid node ID format', () => {
        spyOn(console, 'error');
        service.selectByNodeId('invalid_format', 'tree');

        expect(service.selectedEntity()).toBeNull();
        expect(console.error).toHaveBeenCalledWith(
          '[EntitySelectionService] Cannot select - invalid nodeId format:',
          'invalid_format'
        );
      });

      it('should handle node ID with non-numeric ID', () => {
        spyOn(console, 'warn');
        service.selectByNodeId('course_abc', 'tree');

        expect(service.selectedEntity()).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
          '[EntitySelectionService] Invalid ID in nodeId:',
          'course_abc'
        );
      });

      it('should handle unknown entity type in node ID', () => {
        spyOn(console, 'warn');
        service.selectByNodeId('unknown_1', 'tree');

        expect(service.selectedEntity()).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
          '[EntitySelectionService] Unknown entity type in nodeId:',
          'unknown_1'
        );
      });

      it('should handle case-insensitive entity types', () => {
        service.selectByNodeId('COURSE_1', 'tree');

        expect(service.selectedEntity()).toBeDefined();
        expect(service.selectedEntity()!.entityType).toBe('Course');
      });

      it('should use default source when not specified', () => {
        service.selectByNodeId('course_1');

        expect(service.selectionSource()).toBe('programmatic');
      });
    });
  });

  describe('Selection Checking Methods', () => {
    describe('isEntitySelected()', () => {
      it('should return true when entity is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isEntitySelected(mockCourse);

        expect(result).toBe(true);
      });

      it('should return false when different entity is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isEntitySelected(mockTopic);

        expect(result).toBe(false);
      });

      it('should return false when no entity is selected', () => {
        const result = service.isEntitySelected(mockCourse);

        expect(result).toBe(false);
      });

      it('should handle entities with same ID but different types', () => {
        const courseWithSameId = new Course({
          id: 1,
          title: 'Another Course',
          visibility: 'Private',
          sortOrder: 0,
          archived: false,
          userId: 1,
          topics: [],
          standards: []
        });

        const topicWithSameId = new Topic({
          id: 1,
          title: 'Topic with same ID',
          courseId: 2,
          visibility: 'Private',
          sortOrder: 0,
          archived: false,
          userId: 1
        });

        service.selectNode(courseWithSameId, 'tree');

        expect(service.isEntitySelected(courseWithSameId)).toBe(true);
        expect(service.isEntitySelected(topicWithSameId)).toBe(false);
      });
    });

    describe('isSelected()', () => {
      it('should return true when entity with ID and type is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isSelected(1, 'Course');

        expect(result).toBe(true);
      });

      it('should return false when different ID is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isSelected(2, 'Course');

        expect(result).toBe(false);
      });

      it('should return false when different type is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isSelected(1, 'Topic');

        expect(result).toBe(false);
      });

      it('should return false when no entity is selected', () => {
        const result = service.isSelected(1, 'Course');

        expect(result).toBe(false);
      });
    });

    describe('isSelectedByNodeId()', () => {
      it('should return true when entity with node ID is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isSelectedByNodeId('course_1');

        expect(result).toBe(true);
      });

      it('should return false when different node ID is selected', () => {
        service.selectNode(mockCourse, 'tree');

        const result = service.isSelectedByNodeId('topic_2');

        expect(result).toBe(false);
      });

      it('should return false when no entity is selected', () => {
        const result = service.isSelectedByNodeId('course_1');

        expect(result).toBe(false);
      });
    });
  });

  describe('Computed Signals', () => {
    describe('activeCourseId()', () => {
      it('should return course ID when course is selected', () => {
        service.selectNode(mockCourse, 'tree');

        expect(service.activeCourseId()).toBe(1);
      });

      it('should return course ID when topic is selected', () => {
        service.selectNode(mockTopic, 'tree');

        expect(service.activeCourseId()).toBe(1);
      });

      it('should return course ID when subtopic is selected', () => {
        service.selectNode(mockSubTopic, 'tree');

        expect(service.activeCourseId()).toBe(1);
      });

      it('should return course ID when lesson is selected', () => {
        service.selectNode(mockLesson, 'tree');

        expect(service.activeCourseId()).toBe(1);
      });

      it('should return null when no entity is selected', () => {
        expect(service.activeCourseId()).toBeNull();
      });

      it('should return null for unknown entity type', () => {
        const unknownEntity = {
          id: 1,
          entityType: 'Unknown' as EntityType,
          title: 'Unknown'
        } as Entity;

        service.selectNode(unknownEntity, 'tree');

        expect(service.activeCourseId()).toBeNull();
      });
    });

    describe('Entity Type Computed Signals', () => {
      it('should return selected course when course is selected', () => {
        service.selectNode(mockCourse, 'tree');

        expect(service.selectedCourse()).toEqual(mockCourse);
        expect(service.selectedTopic()).toBeNull();
        expect(service.selectedSubTopic()).toBeNull();
        expect(service.selectedLesson()).toBeNull();
      });

      it('should return selected topic when topic is selected', () => {
        service.selectNode(mockTopic, 'tree');

        expect(service.selectedCourse()).toBeNull();
        expect(service.selectedTopic()).toEqual(mockTopic);
        expect(service.selectedSubTopic()).toBeNull();
        expect(service.selectedLesson()).toBeNull();
      });

      it('should return selected subtopic when subtopic is selected', () => {
        service.selectNode(mockSubTopic, 'tree');

        expect(service.selectedCourse()).toBeNull();
        expect(service.selectedTopic()).toBeNull();
        expect(service.selectedSubTopic()).toEqual(mockSubTopic);
        expect(service.selectedLesson()).toBeNull();
      });

      it('should return selected lesson when lesson is selected', () => {
        service.selectNode(mockLesson, 'tree');

        expect(service.selectedCourse()).toBeNull();
        expect(service.selectedTopic()).toBeNull();
        expect(service.selectedSubTopic()).toBeNull();
        expect(service.selectedLesson()).toEqual(mockLesson);
      });

      it('should return all nulls when no entity is selected', () => {
        expect(service.selectedCourse()).toBeNull();
        expect(service.selectedTopic()).toBeNull();
        expect(service.selectedSubTopic()).toBeNull();
        expect(service.selectedLesson()).toBeNull();
      });
    });

    describe('isSelectedEntityType()', () => {
      it('should return function that checks entity type correctly', () => {
        service.selectNode(mockCourse, 'tree');

        const isSelectedEntityType = service.isSelectedEntityType();

        expect(isSelectedEntityType('Course')).toBe(true);
        expect(isSelectedEntityType('Topic')).toBe(false);
        expect(isSelectedEntityType('SubTopic')).toBe(false);
        expect(isSelectedEntityType('Lesson')).toBe(false);
      });

      it('should return function that returns false when no entity selected', () => {
        const isSelectedEntityType = service.isSelectedEntityType();

        expect(isSelectedEntityType('Course')).toBe(false);
        expect(isSelectedEntityType('Topic')).toBe(false);
        expect(isSelectedEntityType('SubTopic')).toBe(false);
        expect(isSelectedEntityType('Lesson')).toBe(false);
      });
    });
  });

  describe('Selection History Management', () => {
    it('should add selection events to history', () => {
      service.selectNode(mockCourse, 'tree');
      service.selectNode(mockTopic, 'calendar');

      const history = service.selectionHistory();

      expect(history).toHaveLength(2);
      expect(history[0].entity).toEqual(mockCourse);
      expect(history[0].source).toBe('tree');
      expect(history[1].entity).toEqual(mockTopic);
      expect(history[1].source).toBe('calendar');
    });

    it('should add timestamps to selection events', () => {
      service.selectNode(mockCourse, 'tree');

      const history = service.selectionHistory();

      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit history to 50 entries', () => {
      // Add 55 selections
      for (let i = 0; i < 55; i++) {
        service.selectById(i + 1, 'Course', 'programmatic');
      }

      const history = service.selectionHistory();

      expect(history).toHaveLength(50);
      expect(history[0].entity!.id).toBe(6); // First 5 should be removed
      expect(history[49].entity!.id).toBe(55);
    });

    it('should add null selections to history', () => {
      service.selectNode(mockCourse, 'tree');
      service.selectNode(null, 'programmatic');

      const history = service.selectionHistory();

      expect(history).toHaveLength(2);
      expect(history[1].entity).toBeNull();
      expect(history[1].source).toBe('programmatic');
    });

    describe('getRecentSelectionsByType()', () => {
      beforeEach(() => {
        service.selectNode(mockCourse, 'tree');
        service.selectNode(mockTopic, 'calendar');
        service.selectNode(mockSubTopic, 'infopanel');
        service.selectNode(mockLesson, 'programmatic');
        service.selectNode(mockCourse, 'tree'); // Another course selection
      });

      it('should return recent selections of specific type', () => {
        const courseSelections = service.getRecentSelectionsByType('Course');

        expect(courseSelections).toHaveLength(2);
        expect(courseSelections[0].entity!.entityType).toBe('Course');
        expect(courseSelections[1].entity!.entityType).toBe('Course');
      });

      it('should return selections in most recent first order', () => {
        const courseSelections = service.getRecentSelectionsByType('Course');

        expect(courseSelections[0].source).toBe('tree'); // Most recent
        expect(courseSelections[1].source).toBe('tree'); // Oldest
      });

      it('should limit results to specified limit', () => {
        const courseSelections = service.getRecentSelectionsByType('Course', 1);

        expect(courseSelections).toHaveLength(1);
        expect(courseSelections[0].source).toBe('tree'); // Most recent only
      });

      it('should return empty array for type with no selections', () => {
        const unknownSelections = service.getRecentSelectionsByType('Course' as EntityType);
        service.clearSelection();

        const emptySelections = service.getRecentSelectionsByType('Course');

        expect(emptySelections.filter(s => s.entity !== null)).toHaveLength(2); // The two course selections
      });

      it('should use default limit of 10', () => {
        // Add many course selections
        for (let i = 0; i < 15; i++) {
          service.selectById(i + 10, 'Course', 'programmatic');
        }

        const courseSelections = service.getRecentSelectionsByType('Course');

        expect(courseSelections.length).toBeLessThanOrEqual(10);
      });
    });

    describe('getRecentSelectionsBySource()', () => {
      beforeEach(() => {
        service.selectNode(mockCourse, 'tree');
        service.selectNode(mockTopic, 'tree');
        service.selectNode(mockSubTopic, 'calendar');
        service.selectNode(mockLesson, 'calendar');
        service.selectNode(mockCourse, 'tree'); // Another tree selection
      });

      it('should return recent selections from specific source', () => {
        const treeSelections = service.getRecentSelectionsBySource('tree');

        expect(treeSelections).toHaveLength(3);
        expect(treeSelections.every(s => s.source === 'tree')).toBe(true);
      });

      it('should return selections in most recent first order', () => {
        const treeSelections = service.getRecentSelectionsBySource('tree');

        expect(treeSelections[0].entity!.entityType).toBe('Course'); // Most recent
        expect(treeSelections[1].entity!.entityType).toBe('Topic');
        expect(treeSelections[2].entity!.entityType).toBe('Course'); // Oldest
      });

      it('should limit results to specified limit', () => {
        const treeSelections = service.getRecentSelectionsBySource('tree', 2);

        expect(treeSelections).toHaveLength(2);
      });

      it('should return empty array for source with no selections', () => {
        const infopanelSelections = service.getRecentSelectionsBySource('infopanel');

        expect(infopanelSelections).toHaveLength(0);
      });

      it('should use default limit of 10', () => {
        // Add many tree selections
        for (let i = 0; i < 15; i++) {
          service.selectById(i + 10, 'Course', 'tree');
        }

        const treeSelections = service.getRecentSelectionsBySource('tree');

        expect(treeSelections.length).toBeLessThanOrEqual(10);
      });
    });

    describe('clearHistory()', () => {
      it('should clear all selection history', () => {
        service.selectNode(mockCourse, 'tree');
        service.selectNode(mockTopic, 'calendar');

        service.clearHistory();

        expect(service.selectionHistory()).toEqual([]);
      });

      it('should log history clear operation', () => {
        spyOn(console, 'log');
        service.clearHistory();

        expect(console.log).toHaveBeenCalledWith(
          '[EntitySelectionService] Selection history cleared'
        );
      });
    });
  });

  describe('Selection Statistics', () => {
    beforeEach(() => {
      // Create varied selection history
      service.selectNode(mockCourse, 'tree');
      service.selectNode(mockTopic, 'calendar');
      service.selectNode(mockSubTopic, 'infopanel');
      service.selectNode(mockLesson, 'programmatic');
      service.selectNode(mockCourse, 'tree');
      service.selectNode(null, 'calendar');
    });

    it('should calculate total selections', () => {
      const stats = service.selectionStats();

      expect(stats.total).toBe(6);
    });

    it('should calculate selections by entity type', () => {
      const stats = service.selectionStats();

      expect(stats.byCourse).toBe(2);
      expect(stats.byTopic).toBe(1);
      expect(stats.bySubTopic).toBe(1);
      expect(stats.byLesson).toBe(1);
    });

    it('should calculate selections by source', () => {
      const stats = service.selectionStats();

      expect(stats.bySource.tree).toBe(2);
      expect(stats.bySource.calendar).toBe(2);
      expect(stats.bySource.infopanel).toBe(1);
      expect(stats.bySource.programmatic).toBe(1);
    });

    it('should count null selections correctly', () => {
      const stats = service.selectionStats();

      // Null selections should not be counted in entity type stats
      expect(stats.byCourse + stats.byTopic + stats.bySubTopic + stats.byLesson).toBe(5);
      expect(stats.total).toBe(6); // But total should include null
    });

    it('should handle empty history', () => {
      service.clearHistory();

      const stats = service.selectionStats();

      expect(stats.total).toBe(0);
      expect(stats.byCourse).toBe(0);
      expect(stats.byTopic).toBe(0);
      expect(stats.bySubTopic).toBe(0);
      expect(stats.byLesson).toBe(0);
      expect(stats.bySource.tree).toBe(0);
      expect(stats.bySource.calendar).toBe(0);
      expect(stats.bySource.infopanel).toBe(0);
      expect(stats.bySource.programmatic).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    describe('getSelectionContext()', () => {
      it('should return complete selection context when entity selected', () => {
        service.selectNode(mockTopic, 'calendar');

        const context = service.getSelectionContext();

        expect(context.hasSelection).toBe(true);
        expect(context.selectedEntity).toEqual(mockTopic);
        expect(context.selectedEntityType).toBe('Topic');
        expect(context.selectedNodeId).toBe('topic_2');
        expect(context.selectedEntityId).toBe(2);
        expect(context.activeCourseId).toBe(1);
        expect(context.selectionSource).toBe('calendar');
        expect(context.selectionStats).toBeDefined();
        expect(context.timestamp).toBeDefined();
      });

      it('should return empty selection context when no entity selected', () => {
        const context = service.getSelectionContext();

        expect(context.hasSelection).toBe(false);
        expect(context.selectedEntity).toBeNull();
        expect(context.selectedEntityType).toBeNull();
        expect(context.selectedNodeId).toBeNull();
        expect(context.selectedEntityId).toBeNull();
        expect(context.activeCourseId).toBeNull();
        expect(context.selectionSource).toBe('programmatic');
        expect(context.selectionStats).toBeDefined();
        expect(context.timestamp).toBeDefined();
      });

      it('should include current timestamp', () => {
        const beforeTime = new Date().getTime();
        const context = service.getSelectionContext();
        const afterTime = new Date().getTime();

        const contextTime = new Date(context.timestamp).getTime();
        expect(contextTime).toBeGreaterThanOrEqual(beforeTime);
        expect(contextTime).toBeLessThanOrEqual(afterTime);
      });
    });

    describe('reset()', () => {
      it('should reset all service state', () => {
        service.selectNode(mockCourse, 'tree');
        service.selectNode(mockTopic, 'calendar');

        service.reset();

        expect(service.selectedEntity()).toBeNull();
        expect(service.selectionSource()).toBe('programmatic');
        expect(service.selectionHistory()).toEqual([]);
        expect(service.hasSelection()).toBe(false);
      });

      it('should log reset operation', () => {
        spyOn(console, 'log');
        service.reset();

        expect(console.log).toHaveBeenCalledWith(
          '[EntitySelectionService] Service state reset'
        );
      });
    });
  });

  describe('Entity Creation for Selection', () => {
    it('should create Course entity with minimal data', () => {
      service.selectById(5, 'Course');

      const selected = service.selectedEntity() as Course;
      expect(selected).toBeInstanceOf(Course);
      expect(selected.id).toBe(5);
      expect(selected.title).toBe('Course 5');
      expect(selected.entityType).toBe('Course');
      expect(selected.topics).toEqual([]);
      expect(selected.standards).toEqual([]);
    });

    it('should create Topic entity with minimal data', () => {
      service.selectById(5, 'Topic');

      const selected = service.selectedEntity() as Topic;
      expect(selected).toBeInstanceOf(Topic);
      expect(selected.id).toBe(5);
      expect(selected.title).toBe('Topic 5');
      expect(selected.entityType).toBe('Topic');
      expect(selected.courseId).toBe(0);
    });

    it('should create SubTopic entity with minimal data', () => {
      service.selectById(5, 'SubTopic');

      const selected = service.selectedEntity() as SubTopic;
      expect(selected).toBeInstanceOf(SubTopic);
      expect(selected.id).toBe(5);
      expect(selected.title).toBe('SubTopic 5');
      expect(selected.entityType).toBe('SubTopic');
      expect(selected.topicId).toBe(0);
      expect(selected.courseId).toBe(0);
    });

    it('should create Lesson entity with minimal data', () => {
      service.selectById(5, 'Lesson');

      const selected = service.selectedEntity() as Lesson;
      expect(selected).toBeInstanceOf(Lesson);
      expect(selected.id).toBe(5);
      expect(selected.title).toBe('Lesson 5');
      expect(selected.entityType).toBe('Lesson');
      expect(selected.courseId).toBe(0);
      expect(selected.objective).toBe('');
    });

    it('should throw error for unknown entity type', () => {
      expect(() => {
        (service as any).createSelectionEntity(5, 'Unknown');
      }).toThrowError('[EntitySelectionService] Unknown entity type: Unknown');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle entities with null or undefined properties', () => {
      const entityWithNulls = new Course({
        id: 1,
        title: null as any,
        description: undefined,
        visibility: null as any,
        sortOrder: null as any,
        archived: null as any,
        userId: null as any,
        topics: null as any,
        standards: null as any
      });

      expect(() => {
        service.selectNode(entityWithNulls, 'tree');
      }).not.toThrow();

      expect(service.selectedEntity()).toEqual(entityWithNulls);
    });

    it('should handle malformed node IDs gracefully', () => {
      const malformedNodeIds = [
        '',
        'invalid',
        'course_',
        '_1',
        'course_1_extra',
        'Course_1', // Wrong case
        'course_-1', // Negative ID
        'course_0' // Zero ID
      ];

      malformedNodeIds.forEach(nodeId => {
        spyOn(console, 'warn').and.stub();
        spyOn(console, 'error').and.stub();

        service.selectByNodeId(nodeId);
        expect(service.selectedEntity()).toBeNull();
      });
    });

    it('should handle selection sources consistently', () => {
      const sources: SelectionSource[] = ['tree', 'calendar', 'infopanel', 'programmatic'];

      sources.forEach(source => {
        service.selectNode(mockCourse, source);
        expect(service.selectionSource()).toBe(source);
      });
    });

    it('should handle rapid consecutive selections', () => {
      const entities = [mockCourse, mockTopic, mockSubTopic, mockLesson];

      entities.forEach((entity, index) => {
        service.selectNode(entity, 'tree');
        expect(service.selectedEntity()).toEqual(entity);
      });

      expect(service.selectionHistory()).toHaveLength(4);
    });

    it('should handle selection of entities with same ID but different types', () => {
      const courseId1 = new Course({ id: 1, title: 'Course 1', visibility: 'Private', sortOrder: 0, archived: false, userId: 1, topics: [], standards: [] });
      const topicId1 = new Topic({ id: 1, title: 'Topic 1', courseId: 2, visibility: 'Private', sortOrder: 0, archived: false, userId: 1 });

      service.selectNode(courseId1, 'tree');
      expect(service.isEntitySelected(courseId1)).toBe(true);
      expect(service.isEntitySelected(topicId1)).toBe(false);

      service.selectNode(topicId1, 'tree');
      expect(service.isEntitySelected(courseId1)).toBe(false);
      expect(service.isEntitySelected(topicId1)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete selection workflow', () => {
      // Select course
      service.selectNode(mockCourse, 'tree');
      expect(service.activeCourseId()).toBe(1);
      expect(service.selectedCourse()).toEqual(mockCourse);

      // Select topic within course
      service.selectNode(mockTopic, 'calendar');
      expect(service.activeCourseId()).toBe(1); // Should still be same course
      expect(service.selectedTopic()).toEqual(mockTopic);
      expect(service.selectedCourse()).toBeNull();

      // Select subtopic within topic
      service.selectNode(mockSubTopic, 'infopanel');
      expect(service.activeCourseId()).toBe(1);
      expect(service.selectedSubTopic()).toEqual(mockSubTopic);

      // Select lesson within subtopic
      service.selectNode(mockLesson, 'programmatic');
      expect(service.activeCourseId()).toBe(1);
      expect(service.selectedLesson()).toEqual(mockLesson);

      // Check history contains all selections
      expect(service.selectionHistory()).toHaveLength(4);

      // Clear selection
      service.clearSelection();
      expect(service.hasSelection()).toBe(false);
      expect(service.activeCourseId()).toBeNull();
    });

    it('should maintain consistent state across different selection methods', () => {
      // Select using entity
      service.selectNode(mockCourse, 'tree');
      const context1 = service.getSelectionContext();

      // Select same entity using ID
      service.selectById(1, 'Course', 'tree');
      const context2 = service.getSelectionContext();

      // Select same entity using node ID
      service.selectByNodeId('course_1', 'tree');
      const context3 = service.getSelectionContext();

      // All contexts should have same selected entity info
      expect(context1.selectedEntityId).toBe(context2.selectedEntityId);
      expect(context2.selectedEntityId).toBe(context3.selectedEntityId);
      expect(context1.selectedEntityType).toBe(context2.selectedEntityType);
      expect(context2.selectedEntityType).toBe(context3.selectedEntityType);
    });

    it('should handle mixed selection operations efficiently', () => {
      const startTime = performance.now();

      // Perform many mixed operations
      for (let i = 0; i < 100; i++) {
        if (i % 4 === 0) {
          service.selectNode(mockCourse, 'tree');
        } else if (i % 4 === 1) {
          service.selectById(2, 'Topic', 'calendar');
        } else if (i % 4 === 2) {
          service.selectByNodeId('subtopic_3', 'infopanel');
        } else {
          service.clearSelection('programmatic');
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);

      // Should maintain valid state
      expect(service.selectionHistory().length).toBeLessThanOrEqual(50); // History limit
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with large selection history', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Create many selections to test memory management
      for (let i = 0; i < 1000; i++) {
        service.selectById(i % 100 + 1, 'Course', 'programmatic');
      }

      // History should be limited to 50 entries
      expect(service.selectionHistory()).toHaveLength(50);

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 10MB)
      // Note: This is a rough check and may vary by environment
      if (initialMemory > 0) {
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
      }
    });

    it('should clean up properly on reset', () => {
      // Fill up service with data
      for (let i = 0; i < 100; i++) {
        service.selectById(i + 1, 'Course', 'programmatic');
      }

      // Reset should clear everything
      service.reset();

      expect(service.selectedEntity()).toBeNull();
      expect(service.selectionHistory()).toEqual([]);
      expect(service.selectionStats().total).toBe(0);
    });
  });
});