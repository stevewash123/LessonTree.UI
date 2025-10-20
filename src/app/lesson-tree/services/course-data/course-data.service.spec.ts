// course-data.service.spec.ts
// Comprehensive unit tests for CourseDataService - Signal coordination and delegation service
// Tests signal emission, service delegation, entity operations, and state management

import { TestBed } from '@angular/core/testing';
import { CourseDataService, OperationType, OperationMetadata, ChangeSource } from './course-data.service';
import { CourseDataStorageService } from './course-data-storage.service';
import { CourseTreeMutationService } from './course-tree-mutation.service';
import { CourseQueryService } from './course-query.service';
import { CourseFilterService } from './course-filter.service';
import { CourseSignalService } from './course-signal.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { Lesson, LessonDetail } from '../../../models/lesson';
import { Entity } from '../../../models/entity';
import { signal } from '@angular/core';

describe('CourseDataService', () => {
  let service: CourseDataService;
  let storageServiceSpy: jasmine.SpyObj<CourseDataStorageService>;
  let mutationServiceSpy: jasmine.SpyObj<CourseTreeMutationService>;
  let queryServiceSpy: jasmine.SpyObj<CourseQueryService>;
  let filterServiceSpy: jasmine.SpyObj<CourseFilterService>;
  let signalServiceSpy: jasmine.SpyObj<CourseSignalService>;

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
    id: 1,
    title: 'Test Topic',
    description: 'Test Description',
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockSubTopic: SubTopic = new SubTopic({
    id: 1,
    title: 'Test SubTopic',
    description: 'Test Description',
    topicId: 1,
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockLesson: Lesson = new Lesson({
    id: 1,
    title: 'Test Lesson',
    courseId: 1,
    topicId: 1,
    subTopicId: null,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test Objective',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockLessonDetail: LessonDetail = new LessonDetail({
    id: 1,
    title: 'Test Lesson Detail',
    courseId: 1,
    topicId: 1,
    subTopicId: null,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test Objective',
    materials: 'Test Materials',
    classTime: '45 minutes',
    methods: 'Test Methods',
    specialNeeds: 'None',
    assessment: 'Quiz',
    sortOrder: 1,
    archived: false,
    userId: 1,
    attachments: [],
    standards: [],
    notes: []
  });

  beforeEach(() => {
    // Create spy objects
    const storageServiceSpyObj = jasmine.createSpyObj('CourseDataStorageService', [
      'setCourses'
    ], {
      courses: signal([mockCourse]),
      loading: signal(false),
      lastUpdated: signal(new Date()),
      coursesCount: signal(1),
      hasData: signal(true),
      isEmpty: signal(false)
    });

    const mutationServiceSpyObj = jasmine.createSpyObj('CourseTreeMutationService', [
      'addEntity',
      'updateEntity',
      'removeEntity'
    ]);

    const queryServiceSpyObj = jasmine.createSpyObj('CourseQueryService', [
      'getCourses',
      'getCourseById',
      'getTopicById',
      'getSubTopicById',
      'getLessonById',
      'getLessonDetailById',
      'collectLessonsFromCourse',
      'getLessonCountForCourse',
      'validateCourseForScheduling'
    ]);

    const filterServiceSpyObj = jasmine.createSpyObj('CourseFilterService', [
      'setFilters',
      'setCourseFilter',
      'setVisibilityFilter'
    ], {
      courseFilter: signal('active'),
      visibilityFilter: signal('private'),
      filteredCourses: signal([mockCourse]),
      activeCourses: signal([mockCourse]),
      courseStats: signal({ total: 1, active: 1, archived: 0 }),
      filteredCoursesCount: signal(1),
      hasFilteredData: signal(true),
      isFilteredEmpty: signal(false)
    });

    const signalServiceSpyObj = jasmine.createSpyObj('CourseSignalService', [
      'emitEntityAdded',
      'emitEntityEdited',
      'emitEntityDeleted',
      'emitEntityMoved'
    ], {
      entityAdded: signal(null),
      entityEdited: signal(null),
      entityDeleted: signal(null),
      entityMoved: signal(null)
    });

    TestBed.configureTestingModule({
      providers: [
        CourseDataService,
        { provide: CourseDataStorageService, useValue: storageServiceSpyObj },
        { provide: CourseTreeMutationService, useValue: mutationServiceSpyObj },
        { provide: CourseQueryService, useValue: queryServiceSpyObj },
        { provide: CourseFilterService, useValue: filterServiceSpyObj },
        { provide: CourseSignalService, useValue: signalServiceSpyObj }
      ]
    });

    service = TestBed.inject(CourseDataService);
    storageServiceSpy = TestBed.inject(CourseDataStorageService) as jasmine.SpyObj<CourseDataStorageService>;
    mutationServiceSpy = TestBed.inject(CourseTreeMutationService) as jasmine.SpyObj<CourseTreeMutationService>;
    queryServiceSpy = TestBed.inject(CourseQueryService) as jasmine.SpyObj<CourseQueryService>;
    filterServiceSpy = TestBed.inject(CourseFilterService) as jasmine.SpyObj<CourseFilterService>;
    signalServiceSpy = TestBed.inject(CourseSignalService) as jasmine.SpyObj<CourseSignalService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize delegated signals from storage service', () => {
      expect(service.courses).toBeDefined();
      expect(service.loading).toBeDefined();
      expect(service.lastUpdated).toBeDefined();
      expect(service.coursesCount).toBeDefined();
      expect(service.hasData).toBeDefined();
      expect(service.isEmpty).toBeDefined();
    });

    it('should initialize delegated signals from filter service', () => {
      expect(service.courseFilter).toBeDefined();
      expect(service.visibilityFilter).toBeDefined();
      expect(service.filteredCourses).toBeDefined();
      expect(service.activeCourses).toBeDefined();
      expect(service.courseStats).toBeDefined();
      expect(service.filteredCoursesCount).toBeDefined();
      expect(service.hasFilteredData).toBeDefined();
      expect(service.isFilteredEmpty).toBeDefined();
    });

    it('should initialize signal service delegation for node operations', () => {
      expect(service.nodeAdded).toBeDefined();
      expect(service.nodeEdited).toBeDefined();
      expect(service.nodeDeleted).toBeDefined();
      expect(service.nodeMoved).toBeDefined();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = TestBed.inject(CourseDataService);
      expect(console.log).toHaveBeenCalledWith(
        '[CourseDataService] Service initialized with specialized service delegation',
        jasmine.any(Object)
      );
    });
  });

  describe('Signal Emission Methods', () => {
    describe('emitEntityAdded()', () => {
      it('should emit entity added signal with default parameters', () => {
        service.emitEntityAdded(mockCourse);

        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          mockCourse,
          'api',
          'API_RESPONSE'
        );
      });

      it('should emit entity added signal with custom parameters', () => {
        const metadata: OperationMetadata = {
          parentNodeId: 'course_1',
          insertPosition: 0,
          userAction: 'ADD_TOPIC_BUTTON'
        };

        service.emitEntityAdded(mockTopic, 'tree', 'USER_ADD', metadata);

        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          mockTopic,
          'tree',
          'USER_ADD'
        );
      });

      it('should log entity added signal emission', () => {
        spyOn(console, 'log');
        service.emitEntityAdded(mockCourse, 'infopanel', 'USER_ADD');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Emitting entity added signal',
          jasmine.objectContaining({
            entityType: 'Course',
            entityId: 1,
            entityTitle: 'Test Course',
            source: 'infopanel',
            operationType: 'USER_ADD'
          })
        );
      });

      it('should handle different entity types', () => {
        const entities = [mockCourse, mockTopic, mockSubTopic, mockLesson];

        entities.forEach(entity => {
          service.emitEntityAdded(entity);
          expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
            entity,
            'api',
            'API_RESPONSE'
          );
        });

        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledTimes(4);
      });
    });

    describe('emitEntityEdited()', () => {
      it('should emit entity edited signal with default parameters', () => {
        service.emitEntityEdited(mockCourse);

        expect(signalServiceSpy.emitEntityEdited).toHaveBeenCalledWith(
          mockCourse,
          'api',
          'API_RESPONSE'
        );
      });

      it('should emit entity edited signal with custom parameters', () => {
        service.emitEntityEdited(mockTopic, 'infopanel', 'USER_EDIT');

        expect(signalServiceSpy.emitEntityEdited).toHaveBeenCalledWith(
          mockTopic,
          'infopanel',
          'USER_EDIT'
        );
      });

      it('should log entity edited signal emission', () => {
        spyOn(console, 'log');
        service.emitEntityEdited(mockSubTopic, 'calendar', 'IMPORT');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Emitting entity edited signal',
          jasmine.objectContaining({
            entityType: 'SubTopic',
            entityId: 1,
            entityTitle: 'Test SubTopic',
            source: 'calendar',
            operationType: 'IMPORT'
          })
        );
      });
    });

    describe('emitEntityDeleted()', () => {
      it('should emit entity deleted signal with default parameters', () => {
        service.emitEntityDeleted(mockLesson);

        expect(signalServiceSpy.emitEntityDeleted).toHaveBeenCalledWith(
          mockLesson,
          'api',
          'API_RESPONSE'
        );
      });

      it('should emit entity deleted signal with custom parameters', () => {
        service.emitEntityDeleted(mockCourse, 'tree', 'USER_DELETE');

        expect(signalServiceSpy.emitEntityDeleted).toHaveBeenCalledWith(
          mockCourse,
          'tree',
          'USER_DELETE'
        );
      });

      it('should log entity deleted signal emission', () => {
        spyOn(console, 'log');
        service.emitEntityDeleted(mockTopic, 'infopanel', 'BULK_LOAD');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Emitting entity deleted signal',
          jasmine.objectContaining({
            entityType: 'Topic',
            entityId: 1,
            entityTitle: 'Test Topic',
            source: 'infopanel',
            operationType: 'BULK_LOAD'
          })
        );
      });
    });

    describe('emitEntityMoved()', () => {
      it('should emit entity moved signal with default parameters', () => {
        service.emitEntityMoved(mockLesson, 'topic_1', 'topic_2');

        expect(signalServiceSpy.emitEntityMoved).toHaveBeenCalledWith(
          mockLesson,
          'topic_1',
          'topic_2',
          'api',
          undefined
        );
      });

      it('should emit entity moved signal with custom parameters', () => {
        const metadata = {
          oldSortOrder: 1,
          newSortOrder: 2,
          moveType: 'drag-drop' as const,
          apiResponse: { success: true }
        };

        service.emitEntityMoved(
          mockSubTopic,
          'topic_1',
          'topic_2',
          'tree',
          'DRAG_MOVE',
          metadata
        );

        expect(signalServiceSpy.emitEntityMoved).toHaveBeenCalledWith(
          mockSubTopic,
          'topic_1',
          'topic_2',
          'tree',
          metadata
        );
      });

      it('should log entity moved signal emission', () => {
        spyOn(console, 'log');
        service.emitEntityMoved(mockTopic, 'course_1', 'course_2', 'calendar', 'COPY_PASTE');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Emitting entity moved signal',
          jasmine.objectContaining({
            entityType: 'Topic',
            entityId: 1,
            entityTitle: 'Test Topic',
            sourceLocation: 'course_1',
            targetLocation: 'course_2',
            changeSource: 'calendar',
            operationType: 'COPY_PASTE'
          })
        );
      });

      it('should handle all operation types', () => {
        const operationTypes: OperationType[] = [
          'USER_ADD', 'USER_EDIT', 'USER_DELETE', 'API_RESPONSE',
          'BULK_LOAD', 'DRAG_MOVE', 'COPY_PASTE', 'IMPORT', 'UNKNOWN'
        ];

        operationTypes.forEach(opType => {
          service.emitEntityMoved(mockCourse, 'source', 'target', 'api', opType);
          expect(signalServiceSpy.emitEntityMoved).toHaveBeenCalledWith(
            mockCourse,
            'source',
            'target',
            'api',
            undefined
          );
        });
      });
    });
  });

  describe('Storage Service Delegation', () => {
    describe('setCourses()', () => {
      it('should delegate to storage service with default source', () => {
        const courses = [mockCourse];
        service.setCourses(courses);

        expect(storageServiceSpy.setCourses).toHaveBeenCalledWith(courses, 'initialization');
      });

      it('should delegate to storage service with custom source', () => {
        const courses = [mockCourse];
        service.setCourses(courses, 'api');

        expect(storageServiceSpy.setCourses).toHaveBeenCalledWith(courses, 'api');
      });

      it('should log delegation message', () => {
        spyOn(console, 'log');
        service.setCourses([mockCourse], 'tree');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Delegating setCourses to storage service',
          jasmine.objectContaining({
            count: 1,
            source: 'tree'
          })
        );
      });
    });
  });

  describe('Filter Service Delegation', () => {
    describe('setFilters()', () => {
      it('should delegate to filter service', () => {
        service.setFilters('active', 'private');

        expect(filterServiceSpy.setFilters).toHaveBeenCalledWith('active', 'private');
      });

      it('should log delegation message', () => {
        spyOn(console, 'log');
        service.setFilters('archived', 'team');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Delegating setFilters to filter service',
          jasmine.objectContaining({
            courseFilter: 'archived',
            visibilityFilter: 'team'
          })
        );
      });
    });

    describe('setCourseFilter()', () => {
      it('should delegate to filter service', () => {
        service.setCourseFilter('both');

        expect(filterServiceSpy.setCourseFilter).toHaveBeenCalledWith('both');
      });
    });

    describe('setVisibilityFilter()', () => {
      it('should delegate to filter service', () => {
        service.setVisibilityFilter('team');

        expect(filterServiceSpy.setVisibilityFilter).toHaveBeenCalledWith('team');
      });
    });
  });

  describe('Query Service Delegation', () => {
    describe('getCourses()', () => {
      it('should delegate to query service', () => {
        queryServiceSpy.getCourses.and.returnValue([mockCourse]);

        const result = service.getCourses();

        expect(queryServiceSpy.getCourses).toHaveBeenCalled();
        expect(result).toEqual([mockCourse]);
      });
    });

    describe('getCourseById()', () => {
      it('should delegate to query service and return course', () => {
        queryServiceSpy.getCourseById.and.returnValue(mockCourse);

        const result = service.getCourseById(1);

        expect(queryServiceSpy.getCourseById).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockCourse);
      });

      it('should return null when course not found', () => {
        queryServiceSpy.getCourseById.and.returnValue(null);

        const result = service.getCourseById(999);

        expect(result).toBeNull();
      });
    });

    describe('getTopicById()', () => {
      it('should delegate to query service', () => {
        queryServiceSpy.getTopicById.and.returnValue(mockTopic);

        const result = service.getTopicById(1);

        expect(queryServiceSpy.getTopicById).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockTopic);
      });
    });

    describe('getSubTopicById()', () => {
      it('should delegate to query service', () => {
        queryServiceSpy.getSubTopicById.and.returnValue(mockSubTopic);

        const result = service.getSubTopicById(1);

        expect(queryServiceSpy.getSubTopicById).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockSubTopic);
      });
    });

    describe('getLessonById()', () => {
      it('should delegate to query service', () => {
        queryServiceSpy.getLessonById.and.returnValue(mockLesson);

        const result = service.getLessonById(1);

        expect(queryServiceSpy.getLessonById).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockLesson);
      });
    });

    describe('getLessonDetailById()', () => {
      it('should delegate to query service', () => {
        queryServiceSpy.getLessonDetailById.and.returnValue(mockLessonDetail);

        const result = service.getLessonDetailById(1);

        expect(queryServiceSpy.getLessonDetailById).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockLessonDetail);
      });
    });

    describe('collectLessonsFromCourse()', () => {
      it('should delegate to query service', () => {
        const lessons = [mockLesson];
        queryServiceSpy.collectLessonsFromCourse.and.returnValue(lessons);

        const result = service.collectLessonsFromCourse(mockCourse);

        expect(queryServiceSpy.collectLessonsFromCourse).toHaveBeenCalledWith(mockCourse);
        expect(result).toEqual(lessons);
      });
    });

    describe('getLessonCountForCourse()', () => {
      it('should delegate to query service', () => {
        queryServiceSpy.getLessonCountForCourse.and.returnValue(5);

        const result = service.getLessonCountForCourse(1);

        expect(queryServiceSpy.getLessonCountForCourse).toHaveBeenCalledWith(1);
        expect(result).toBe(5);
      });
    });

    describe('validateCourseForScheduling()', () => {
      it('should delegate to query service', () => {
        const validation = { valid: true, errors: [] };
        queryServiceSpy.validateCourseForScheduling.and.returnValue(validation);

        const result = service.validateCourseForScheduling(1);

        expect(queryServiceSpy.validateCourseForScheduling).toHaveBeenCalledWith(1);
        expect(result).toEqual(validation);
      });
    });
  });

  describe('Mutation Methods with Signal Emission', () => {
    describe('addEntity()', () => {
      it('should delegate to mutation service and emit signal with default parameters', () => {
        service.addEntity(mockCourse);

        expect(mutationServiceSpy.addEntity).toHaveBeenCalledWith(mockCourse);
        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          mockCourse,
          'tree',
          'USER_ADD'
        );
      });

      it('should delegate to mutation service and emit signal with custom parameters', () => {
        const metadata: OperationMetadata = {
          parentNodeId: 'course_1',
          userAction: 'ADD_LESSON_BUTTON'
        };

        service.addEntity(mockTopic, 'infopanel', 'IMPORT', metadata);

        expect(mutationServiceSpy.addEntity).toHaveBeenCalledWith(mockTopic);
        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          mockTopic,
          'infopanel',
          'IMPORT'
        );
      });

      it('should log entity addition', () => {
        spyOn(console, 'log');
        service.addEntity(mockSubTopic, 'calendar', 'BULK_LOAD');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Adding entity with operation context',
          jasmine.objectContaining({
            entityType: 'SubTopic',
            entityId: 1,
            source: 'calendar',
            operationType: 'BULK_LOAD'
          })
        );
      });
    });

    describe('updateEntity()', () => {
      it('should delegate to mutation service and emit signal', () => {
        service.updateEntity(mockCourse, 'infopanel');

        expect(mutationServiceSpy.updateEntity).toHaveBeenCalledWith(mockCourse);
        expect(signalServiceSpy.emitEntityEdited).toHaveBeenCalledWith(
          mockCourse,
          'infopanel',
          'USER_EDIT'
        );
      });

      it('should log entity update', () => {
        spyOn(console, 'log');
        service.updateEntity(mockLesson, 'tree');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Updating entity',
          jasmine.objectContaining({
            entityType: 'Lesson',
            entityId: 1,
            source: 'tree'
          })
        );
      });
    });

    describe('removeEntity()', () => {
      it('should delegate to mutation service and emit signal', () => {
        service.removeEntity(mockTopic, 'calendar');

        expect(mutationServiceSpy.removeEntity).toHaveBeenCalledWith(mockTopic);
        expect(signalServiceSpy.emitEntityDeleted).toHaveBeenCalledWith(
          mockTopic,
          'calendar',
          'USER_DELETE'
        );
      });

      it('should log entity removal', () => {
        spyOn(console, 'log');
        service.removeEntity(mockSubTopic, 'api');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseDataService] Removing entity',
          jasmine.objectContaining({
            entityType: 'SubTopic',
            entityId: 1,
            source: 'api'
          })
        );
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null entity in signal emission methods', () => {
      expect(() => {
        // @ts-ignore - Testing runtime behavior
        service.emitEntityAdded(null);
      }).not.toThrow();
    });

    it('should handle undefined metadata in signal emission', () => {
      expect(() => {
        service.emitEntityAdded(mockCourse, 'api', 'USER_ADD', undefined);
      }).not.toThrow();
    });

    it('should handle empty courses array', () => {
      service.setCourses([]);
      expect(storageServiceSpy.setCourses).toHaveBeenCalledWith([], 'initialization');
    });

    it('should handle invalid filter values gracefully', () => {
      // @ts-ignore - Testing runtime behavior
      service.setFilters('invalid', 'invalid');
      expect(filterServiceSpy.setFilters).toHaveBeenCalledWith('invalid', 'invalid');
    });

    it('should handle query service returning null/undefined', () => {
      queryServiceSpy.getCourseById.and.returnValue(null);
      queryServiceSpy.getTopicById.and.returnValue(undefined as any);

      expect(service.getCourseById(999)).toBeNull();
      expect(service.getTopicById(999)).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete entity lifecycle', () => {
      // Add entity
      service.addEntity(mockCourse, 'tree', 'USER_ADD');
      expect(mutationServiceSpy.addEntity).toHaveBeenCalledWith(mockCourse);
      expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalled();

      // Update entity
      service.updateEntity(mockCourse, 'infopanel');
      expect(mutationServiceSpy.updateEntity).toHaveBeenCalledWith(mockCourse);
      expect(signalServiceSpy.emitEntityEdited).toHaveBeenCalled();

      // Remove entity
      service.removeEntity(mockCourse, 'calendar');
      expect(mutationServiceSpy.removeEntity).toHaveBeenCalledWith(mockCourse);
      expect(signalServiceSpy.emitEntityDeleted).toHaveBeenCalled();
    });

    it('should coordinate filtering and data operations', () => {
      // Set filters
      service.setFilters('active', 'private');
      expect(filterServiceSpy.setFilters).toHaveBeenCalledWith('active', 'private');

      // Set courses
      service.setCourses([mockCourse], 'api');
      expect(storageServiceSpy.setCourses).toHaveBeenCalledWith([mockCourse], 'api');

      // Query data
      queryServiceSpy.getCourses.and.returnValue([mockCourse]);
      const courses = service.getCourses();
      expect(courses).toEqual([mockCourse]);
    });

    it('should handle multiple entity types in same operation', () => {
      const entities = [mockCourse, mockTopic, mockSubTopic, mockLesson];

      entities.forEach((entity, index) => {
        service.addEntity(entity, 'tree', 'BULK_LOAD');
        expect(mutationServiceSpy.addEntity).toHaveBeenCalledWith(entity);
        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          entity,
          'tree',
          'BULK_LOAD'
        );
      });

      expect(mutationServiceSpy.addEntity).toHaveBeenCalledTimes(4);
      expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledTimes(4);
    });
  });

  describe('Change Source Variations', () => {
    it('should handle all change sources for signal emission', () => {
      const changeSources: ChangeSource[] = ['tree', 'calendar', 'infopanel', 'api', 'initialization'];

      changeSources.forEach(source => {
        service.emitEntityAdded(mockCourse, source);
        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          mockCourse,
          source,
          'API_RESPONSE'
        );
      });
    });

    it('should handle all change sources for entity operations', () => {
      const changeSources: ChangeSource[] = ['tree', 'calendar', 'infopanel', 'api', 'initialization'];

      changeSources.forEach(source => {
        service.addEntity(mockTopic, source);
        expect(signalServiceSpy.emitEntityAdded).toHaveBeenCalledWith(
          mockTopic,
          source,
          'USER_ADD'
        );
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should not create unnecessary objects during delegation', () => {
      const courses = [mockCourse];
      service.setCourses(courses);

      // Should pass the same array reference, not create a new one
      expect(storageServiceSpy.setCourses).toHaveBeenCalledWith(courses, 'initialization');
    });

    it('should handle large entity arrays efficiently', () => {
      const largeCourseArray = Array.from({ length: 1000 }, (_, i) =>
        new Course({
          id: i + 1,
          title: `Course ${i + 1}`,
          description: '',
          visibility: 'Private',
          sortOrder: i,
          archived: false,
          userId: 1,
          topics: [],
          standards: []
        })
      );

      expect(() => {
        service.setCourses(largeCourseArray);
      }).not.toThrow();

      expect(storageServiceSpy.setCourses).toHaveBeenCalledWith(largeCourseArray, 'initialization');
    });
  });
});