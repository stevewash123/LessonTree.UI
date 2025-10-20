// course-business.service.spec.ts
// Comprehensive unit tests for CourseBusinessService - Core business logic and state coordination
// Tests sort order computation, state coordination, validation, entity preparation, and Observable events

import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { CourseBusinessService, EntityCoordinationEvent, ValidationEvent, WorkflowCoordinationEvent } from './course-business.service';
import { CourseQueryService } from '../course-data/course-query.service';
import { CourseDataService, OperationType, OperationMetadata } from '../course-data/course-data.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { Lesson, LessonDetail } from '../../../models/lesson';

describe('CourseBusinessService', () => {
  let service: CourseBusinessService;
  let courseQueryServiceSpy: jasmine.SpyObj<CourseQueryService>;
  let courseDataServiceSpy: jasmine.SpyObj<CourseDataService>;

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
    const courseQueryServiceSpyObj = jasmine.createSpyObj('CourseQueryService', [
      'getCourseById',
      'getTopicById',
      'getSubTopicById'
    ]);

    const courseDataServiceSpyObj = jasmine.createSpyObj('CourseDataService', [
      'addEntity',
      'updateEntity',
      'removeEntity'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CourseBusinessService,
        { provide: CourseQueryService, useValue: courseQueryServiceSpyObj },
        { provide: CourseDataService, useValue: courseDataServiceSpyObj }
      ]
    });

    service = TestBed.inject(CourseBusinessService);
    courseQueryServiceSpy = TestBed.inject(CourseQueryService) as jasmine.SpyObj<CourseQueryService>;
    courseDataServiceSpy = TestBed.inject(CourseDataService) as jasmine.SpyObj<CourseDataService>;
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize Observable events for external consumers', () => {
      expect(service.coordinationCompleted$).toBeDefined();
      expect(service.validationCompleted$).toBeDefined();
      expect(service.workflowCoordinated$).toBeDefined();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = new CourseBusinessService(courseQueryServiceSpy, courseDataServiceSpy);
      expect(console.log).toHaveBeenCalledWith(
        '[CourseStateCoordinationService] Service initialized with required Observable events for external consumers'
      );
    });
  });

  describe('Sort Order Computation', () => {
    describe('computeTopicSortOrder()', () => {
      it('should compute sort order for course with no topics', () => {
        const courseWithNoTopics = new Course({
          ...mockCourse,
          topics: []
        });
        courseQueryServiceSpy.getCourseById.and.returnValue(courseWithNoTopics);

        const result = service.computeTopicSortOrder(1);

        expect(result).toBe(0);
        expect(courseQueryServiceSpy.getCourseById).toHaveBeenCalledWith(1);
      });

      it('should compute sort order for course with existing topics', () => {
        const existingTopics = [
          new Topic({ ...mockTopic, id: 1, sortOrder: 0 }),
          new Topic({ ...mockTopic, id: 2, sortOrder: 2 }),
          new Topic({ ...mockTopic, id: 3, sortOrder: 1 })
        ];
        const courseWithTopics = new Course({
          ...mockCourse,
          topics: existingTopics
        });
        courseQueryServiceSpy.getCourseById.and.returnValue(courseWithTopics);

        const result = service.computeTopicSortOrder(1);

        expect(result).toBe(3); // Max sort order (2) + 1
      });

      it('should handle course not found', () => {
        courseQueryServiceSpy.getCourseById.and.returnValue(null);

        const result = service.computeTopicSortOrder(999);

        expect(result).toBe(0);
      });

      it('should handle course with null topics', () => {
        const courseWithNullTopics = new Course({
          ...mockCourse,
          topics: null as any
        });
        courseQueryServiceSpy.getCourseById.and.returnValue(courseWithNullTopics);

        const result = service.computeTopicSortOrder(1);

        expect(result).toBe(0);
      });

      it('should log computation details', () => {
        spyOn(console, 'log');
        courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);

        service.computeTopicSortOrder(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Computing topic sort order for course 1'
        );
        expect(console.log).toHaveBeenCalledWith(
          jasmine.stringMatching(/Computed topic sort order: \d+ \(\d+ existing topics\)/)
        );
      });
    });

    describe('computeUnifiedSortOrder()', () => {
      describe('for SubTopic containers', () => {
        it('should compute sort order for subtopic with no lessons', () => {
          const subTopicWithNoLessons = new SubTopic({
            ...mockSubTopic,
            lessons: []
          });
          courseQueryServiceSpy.getSubTopicById.and.returnValue(subTopicWithNoLessons);

          const result = service.computeUnifiedSortOrder(null, 1);

          expect(result).toBe(0);
        });

        it('should compute sort order for subtopic with existing lessons', () => {
          const existingLessons = [
            new Lesson({ ...mockLesson, id: 1, sortOrder: 0 }),
            new Lesson({ ...mockLesson, id: 2, sortOrder: 3 }),
            new Lesson({ ...mockLesson, id: 3, sortOrder: 1 })
          ];
          const subTopicWithLessons = new SubTopic({
            ...mockSubTopic,
            lessons: existingLessons
          });
          courseQueryServiceSpy.getSubTopicById.and.returnValue(subTopicWithLessons);

          const result = service.computeUnifiedSortOrder(null, 1);

          expect(result).toBe(4); // Max sort order (3) + 1
        });

        it('should handle lessons with null sort orders', () => {
          const lessonsWithNullSort = [
            new Lesson({ ...mockLesson, id: 1, sortOrder: 0 }),
            new Lesson({ ...mockLesson, id: 2, sortOrder: null as any }),
            new Lesson({ ...mockLesson, id: 3, sortOrder: 2 })
          ];
          const subTopicWithLessons = new SubTopic({
            ...mockSubTopic,
            lessons: lessonsWithNullSort
          });
          courseQueryServiceSpy.getSubTopicById.and.returnValue(subTopicWithLessons);

          const result = service.computeUnifiedSortOrder(null, 1);

          expect(result).toBe(3); // Max valid sort order (2) + 1
        });

        it('should handle subtopic not found', () => {
          courseQueryServiceSpy.getSubTopicById.and.returnValue(null);

          const result = service.computeUnifiedSortOrder(null, 999);

          expect(result).toBe(0);
        });
      });

      describe('for Topic containers', () => {
        it('should compute sort order for topic with no children', () => {
          const topicWithNoChildren = new Topic({
            ...mockTopic,
            subTopics: [],
            lessons: []
          });
          courseQueryServiceSpy.getTopicById.and.returnValue(topicWithNoChildren);

          const result = service.computeUnifiedSortOrder(1, null);

          expect(result).toBe(0);
        });

        it('should compute sort order for topic with subtopics and lessons', () => {
          const subTopics = [
            new SubTopic({ ...mockSubTopic, id: 1, sortOrder: 0 }),
            new SubTopic({ ...mockSubTopic, id: 2, sortOrder: 2 })
          ];
          const lessons = [
            new Lesson({ ...mockLesson, id: 1, sortOrder: 1 }),
            new Lesson({ ...mockLesson, id: 2, sortOrder: 4 })
          ];
          const topicWithChildren = new Topic({
            ...mockTopic,
            subTopics,
            lessons
          });
          courseQueryServiceSpy.getTopicById.and.returnValue(topicWithChildren);

          const result = service.computeUnifiedSortOrder(1, null);

          expect(result).toBe(5); // Max sort order from all items (4) + 1
        });

        it('should handle topic with only subtopics', () => {
          const subTopics = [
            new SubTopic({ ...mockSubTopic, id: 1, sortOrder: 0 }),
            new SubTopic({ ...mockSubTopic, id: 2, sortOrder: 3 })
          ];
          const topicWithSubTopics = new Topic({
            ...mockTopic,
            subTopics,
            lessons: []
          });
          courseQueryServiceSpy.getTopicById.and.returnValue(topicWithSubTopics);

          const result = service.computeUnifiedSortOrder(1, null);

          expect(result).toBe(4); // Max subtopic sort order (3) + 1
        });

        it('should handle topic with only lessons', () => {
          const lessons = [
            new Lesson({ ...mockLesson, id: 1, sortOrder: 0 }),
            new Lesson({ ...mockLesson, id: 2, sortOrder: 2 })
          ];
          const topicWithLessons = new Topic({
            ...mockTopic,
            subTopics: [],
            lessons
          });
          courseQueryServiceSpy.getTopicById.and.returnValue(topicWithLessons);

          const result = service.computeUnifiedSortOrder(1, null);

          expect(result).toBe(3); // Max lesson sort order (2) + 1
        });

        it('should handle topic not found', () => {
          courseQueryServiceSpy.getTopicById.and.returnValue(null);

          const result = service.computeUnifiedSortOrder(999, null);

          expect(result).toBe(0);
        });

        it('should filter out null and undefined sort orders', () => {
          const mixedSortOrders = [
            new SubTopic({ ...mockSubTopic, id: 1, sortOrder: 0 }),
            new SubTopic({ ...mockSubTopic, id: 2, sortOrder: null as any }),
            new Lesson({ ...mockLesson, id: 1, sortOrder: undefined as any }),
            new Lesson({ ...mockLesson, id: 2, sortOrder: 5 })
          ];
          const topicWithMixedSort = new Topic({
            ...mockTopic,
            subTopics: mixedSortOrders.slice(0, 2) as SubTopic[],
            lessons: mixedSortOrders.slice(2) as Lesson[]
          });
          courseQueryServiceSpy.getTopicById.and.returnValue(topicWithMixedSort);

          const result = service.computeUnifiedSortOrder(1, null);

          expect(result).toBe(6); // Max valid sort order (5) + 1
        });
      });

      it('should handle no valid parent container', () => {
        spyOn(console, 'warn');

        const result = service.computeUnifiedSortOrder(null, null);

        expect(result).toBe(0);
        expect(console.warn).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] No valid parent container provided for sort order computation'
        );
      });

      it('should log computation details', () => {
        spyOn(console, 'log');
        courseQueryServiceSpy.getTopicById.and.returnValue(mockTopic);

        service.computeUnifiedSortOrder(1, null);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Computing unified sort order',
          { topicId: 1, subTopicId: null }
        );
      });
    });
  });

  describe('State Coordination Methods', () => {
    describe('coordinateCourseCreation()', () => {
      it('should coordinate successful course creation', () => {
        const apiOperation = of(mockCourse);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateCourseCreation(
          apiOperation,
          mockCourse,
          'Course created successfully'
        ).subscribe();

        expect(courseDataServiceSpy.addEntity).toHaveBeenCalledWith(
          mockCourse,
          'infopanel',
          'USER_ADD',
          undefined
        );
        expect(coordinationEvents).toHaveLength(1);
        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'create',
          entityType: 'Course',
          entityId: 1,
          entityTitle: 'Test Course',
          success: true
        }));
      });

      it('should coordinate course creation with custom operation type and metadata', () => {
        const apiOperation = of(mockCourse);
        const metadata: OperationMetadata = {
          parentNodeId: 'root',
          userAction: 'ADD_TOPIC_BUTTON'
        };

        service.coordinateCourseCreation(
          apiOperation,
          mockCourse,
          'Course imported successfully',
          'IMPORT',
          metadata
        ).subscribe();

        expect(courseDataServiceSpy.addEntity).toHaveBeenCalledWith(
          mockCourse,
          'infopanel',
          'IMPORT',
          metadata
        );
      });

      it('should handle course creation error', () => {
        const error = new Error('Creation failed');
        const apiOperation = throwError(() => error);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateCourseCreation(
          apiOperation,
          mockCourse,
          'Course created successfully'
        ).subscribe({
          error: () => {} // Expect error
        });

        expect(coordinationEvents).toHaveLength(1);
        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'create',
          entityType: 'Course',
          entityId: 0,
          entityTitle: 'Unknown',
          success: false,
          error
        }));
      });

      it('should log coordination messages', () => {
        spyOn(console, 'log');
        const apiOperation = of(mockCourse);

        service.coordinateCourseCreation(
          apiOperation,
          mockCourse,
          'Course created successfully'
        ).subscribe();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Coordinating course creation'
        );
        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Course created successfully'
        );
      });
    });

    describe('coordinateEntityUpdate()', () => {
      it('should coordinate successful entity update', () => {
        const apiOperation = of(mockTopic);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateEntityUpdate(
          apiOperation,
          'Topic updated successfully',
          'Topic'
        ).subscribe();

        expect(courseDataServiceSpy.updateEntity).toHaveBeenCalledWith(mockTopic, 'infopanel');
        expect(coordinationEvents).toHaveLength(1);
        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'update',
          entityType: 'Topic',
          entityId: 1,
          entityTitle: 'Test Topic',
          success: true
        }));
      });

      it('should handle entity update error', () => {
        const error = new Error('Update failed');
        const apiOperation = throwError(() => error);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateEntityUpdate(
          apiOperation,
          'SubTopic updated successfully',
          'SubTopic'
        ).subscribe({
          error: () => {} // Expect error
        });

        expect(coordinationEvents).toHaveLength(1);
        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'update',
          entityType: 'SubTopic',
          success: false,
          error
        }));
      });

      it('should use default entity type when not specified', () => {
        const apiOperation = of(mockCourse);

        service.coordinateEntityUpdate(
          apiOperation,
          'Entity updated successfully'
        ).subscribe();

        expect(courseDataServiceSpy.updateEntity).toHaveBeenCalledWith(mockCourse, 'infopanel');
      });
    });

    describe('coordinateEntityDeletion()', () => {
      it('should coordinate successful entity deletion', () => {
        const apiOperation = of(null);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateEntityDeletion(
          apiOperation,
          mockLesson,
          'Lesson deleted successfully',
          'Lesson'
        ).subscribe();

        expect(courseDataServiceSpy.removeEntity).toHaveBeenCalledWith(mockLesson, 'infopanel');
        expect(coordinationEvents).toHaveLength(1);
        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'delete',
          entityType: 'Lesson',
          entityId: 1,
          entityTitle: 'Test Lesson',
          success: true
        }));
      });

      it('should handle entity deletion error', () => {
        const error = new Error('Deletion failed');
        const apiOperation = throwError(() => error);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateEntityDeletion(
          apiOperation,
          mockCourse,
          'Course deleted successfully',
          'Course'
        ).subscribe({
          error: () => {} // Expect error
        });

        expect(coordinationEvents).toHaveLength(1);
        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'delete',
          entityType: 'Course',
          entityId: 1,
          entityTitle: 'Test Course',
          success: false,
          error
        }));
      });

      it('should handle null entity to delete', () => {
        const apiOperation = of(null);

        service.coordinateEntityDeletion(
          apiOperation,
          null,
          'Entity deleted successfully'
        ).subscribe();

        expect(courseDataServiceSpy.removeEntity).not.toHaveBeenCalled();
      });

      it('should handle entity without id or title', () => {
        const entityWithoutDetails = { id: undefined, title: undefined };
        const apiOperation = of(null);
        const coordinationEvents: EntityCoordinationEvent[] = [];

        service.coordinationCompleted$.subscribe(event => {
          coordinationEvents.push(event);
        });

        service.coordinateEntityDeletion(
          apiOperation,
          entityWithoutDetails as any,
          'Entity deleted successfully'
        ).subscribe();

        expect(coordinationEvents[0]).toEqual(jasmine.objectContaining({
          entityId: 0,
          entityTitle: 'Unknown'
        }));
      });
    });
  });

  describe('Entity Preparation Methods', () => {
    describe('prepareCourseForCreation()', () => {
      it('should prepare course with all fields', () => {
        const result = service.prepareCourseForCreation(mockCourse);

        expect(result).toEqual({
          title: 'Test Course',
          description: 'Test Description',
          visibility: 'Private'
        });
      });

      it('should handle course with null description', () => {
        const courseWithNullDesc = new Course({
          ...mockCourse,
          description: null as any
        });

        const result = service.prepareCourseForCreation(courseWithNullDesc);

        expect(result).toEqual({
          title: 'Test Course',
          description: '',
          visibility: 'Private'
        });
      });

      it('should handle course with undefined description', () => {
        const courseWithUndefinedDesc = new Course({
          ...mockCourse,
          description: undefined
        });

        const result = service.prepareCourseForCreation(courseWithUndefinedDesc);

        expect(result).toEqual({
          title: 'Test Course',
          description: '',
          visibility: 'Private'
        });
      });

      it('should use default visibility when not set', () => {
        const courseWithoutVisibility = new Course({
          ...mockCourse,
          visibility: null as any
        });

        const result = service.prepareCourseForCreation(courseWithoutVisibility);

        expect(result.visibility).toBe('Private');
      });
    });

    describe('prepareTopicForCreation()', () => {
      it('should prepare topic with computed sort order', () => {
        courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);
        spyOn(service, 'computeTopicSortOrder').and.returnValue(3);

        const result = service.prepareTopicForCreation(mockTopic);

        expect(result).toEqual({
          title: 'Test Topic',
          description: 'Test Description',
          courseId: 1,
          visibility: 'Private',
          sortOrder: 3
        });
        expect(service.computeTopicSortOrder).toHaveBeenCalledWith(1);
      });

      it('should handle topic with null description', () => {
        const topicWithNullDesc = new Topic({
          ...mockTopic,
          description: null as any
        });
        courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);
        spyOn(service, 'computeTopicSortOrder').and.returnValue(0);

        const result = service.prepareTopicForCreation(topicWithNullDesc);

        expect(result.description).toBe('');
      });
    });

    describe('prepareSubTopicForCreation()', () => {
      it('should prepare subtopic with computed sort order', () => {
        spyOn(service, 'computeUnifiedSortOrder').and.returnValue(2);

        const result = service.prepareSubTopicForCreation(mockSubTopic);

        expect(result).toEqual({
          title: 'Test SubTopic',
          description: 'Test Description',
          topicId: 1,
          visibility: 'Private',
          sortOrder: 2
        });
        expect(service.computeUnifiedSortOrder).toHaveBeenCalledWith(1);
      });

      it('should handle subtopic with null description', () => {
        const subTopicWithNullDesc = new SubTopic({
          ...mockSubTopic,
          description: null as any
        });
        spyOn(service, 'computeUnifiedSortOrder').and.returnValue(0);

        const result = service.prepareSubTopicForCreation(subTopicWithNullDesc);

        expect(result.description).toBe('');
      });
    });

    describe('prepareLessonForCreation()', () => {
      it('should prepare lesson with all fields and computed sort order', () => {
        spyOn(service, 'computeUnifiedSortOrder').and.returnValue(4);

        const result = service.prepareLessonForCreation(mockLessonDetail);

        expect(result).toEqual({
          title: 'Test Lesson Detail',
          subTopicId: null,
          topicId: 1,
          visibility: 'Private',
          level: 'Beginner',
          objective: 'Test Objective',
          materials: 'Test Materials',
          classTime: '45 minutes',
          methods: 'Test Methods',
          specialNeeds: 'None',
          assessment: 'Quiz',
          sortOrder: 4
        });
        expect(service.computeUnifiedSortOrder).toHaveBeenCalledWith(1, null);
      });

      it('should handle lesson with subtopic', () => {
        const lessonWithSubTopic = new LessonDetail({
          ...mockLessonDetail,
          subTopicId: 2
        });
        spyOn(service, 'computeUnifiedSortOrder').and.returnValue(1);

        const result = service.prepareLessonForCreation(lessonWithSubTopic);

        expect(result.subTopicId).toBe(2);
        expect(service.computeUnifiedSortOrder).toHaveBeenCalledWith(1, 2);
      });

      it('should handle lesson with null/undefined optional fields', () => {
        const lessonWithNulls = new LessonDetail({
          ...mockLessonDetail,
          level: null,
          materials: null,
          classTime: null,
          methods: null,
          specialNeeds: null,
          assessment: null
        });
        spyOn(service, 'computeUnifiedSortOrder').and.returnValue(0);

        const result = service.prepareLessonForCreation(lessonWithNulls);

        expect(result.level).toBeNull();
        expect(result.materials).toBeNull();
        expect(result.classTime).toBeNull();
        expect(result.methods).toBeNull();
        expect(result.specialNeeds).toBeNull();
        expect(result.assessment).toBeNull();
      });

      it('should use default visibility when not set', () => {
        const lessonWithoutVisibility = new LessonDetail({
          ...mockLessonDetail,
          visibility: null as any
        });
        spyOn(service, 'computeUnifiedSortOrder').and.returnValue(0);

        const result = service.prepareLessonForCreation(lessonWithoutVisibility);

        expect(result.visibility).toBe('Private');
      });
    });

    describe('createFullLessonEntity()', () => {
      it('should create full lesson entity from API response', () => {
        const apiResponse = {
          id: 5,
          userId: 123
        };
        const computedSortOrder = 3;

        const result = service.createFullLessonEntity(
          mockLessonDetail,
          apiResponse,
          computedSortOrder
        );

        expect(result).toBeInstanceOf(LessonDetail);
        expect(result.id).toBe(5);
        expect(result.title).toBe('Test Lesson Detail');
        expect(result.sortOrder).toBe(3);
        expect(result.archived).toBe(false);
        expect(result.userId).toBe(123);
        expect(result.standards).toEqual([]);
        expect(result.attachments).toEqual([]);
        expect(result.notes).toEqual([]);
      });

      it('should handle API response without userId', () => {
        const apiResponse = { id: 5 };
        const computedSortOrder = 2;

        const result = service.createFullLessonEntity(
          mockLessonDetail,
          apiResponse,
          computedSortOrder
        );

        expect(result.userId).toBe(0);
      });
    });
  });

  describe('Validation Methods', () => {
    describe('validateParentContainers()', () => {
      it('should validate existing subtopic', () => {
        courseQueryServiceSpy.getSubTopicById.and.returnValue(mockSubTopic);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateParentContainers(null, 1);

        expect(result).toBe(true);
        expect(courseQueryServiceSpy.getSubTopicById).toHaveBeenCalledWith(1);
        expect(validationEvents).toHaveLength(1);
        expect(validationEvents[0]).toEqual(jasmine.objectContaining({
          validationType: 'parent-container',
          entityType: 'SubTopic',
          entityId: 1,
          success: true
        }));
      });

      it('should validate existing topic', () => {
        courseQueryServiceSpy.getTopicById.and.returnValue(mockTopic);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateParentContainers(1, null);

        expect(result).toBe(true);
        expect(courseQueryServiceSpy.getTopicById).toHaveBeenCalledWith(1);
        expect(validationEvents).toHaveLength(1);
        expect(validationEvents[0]).toEqual(jasmine.objectContaining({
          validationType: 'parent-container',
          entityType: 'Topic',
          entityId: 1,
          success: true
        }));
      });

      it('should validate both topic and subtopic', () => {
        courseQueryServiceSpy.getTopicById.and.returnValue(mockTopic);
        courseQueryServiceSpy.getSubTopicById.and.returnValue(mockSubTopic);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateParentContainers(1, 1);

        expect(result).toBe(true);
        expect(validationEvents).toHaveLength(2);
      });

      it('should handle missing subtopic', () => {
        courseQueryServiceSpy.getSubTopicById.and.returnValue(null);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateParentContainers(null, 999);

        expect(result).toBe(false);
        expect(validationEvents[0]).toEqual(jasmine.objectContaining({
          validationType: 'parent-container',
          entityType: 'SubTopic',
          entityId: 999,
          success: false,
          error: 'SubTopic 999 not found'
        }));
      });

      it('should handle missing topic', () => {
        courseQueryServiceSpy.getTopicById.and.returnValue(null);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateParentContainers(999, null);

        expect(result).toBe(false);
        expect(validationEvents[0]).toEqual(jasmine.objectContaining({
          validationType: 'parent-container',
          entityType: 'Topic',
          entityId: 999,
          success: false,
          error: 'Topic 999 not found'
        }));
      });

      it('should log validation details', () => {
        spyOn(console, 'log');
        courseQueryServiceSpy.getTopicById.and.returnValue(mockTopic);

        service.validateParentContainers(1, null);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Validating parent containers',
          { topicId: 1, subTopicId: null }
        );
        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Parent container validation result: true'
        );
      });
    });

    describe('validateCourse()', () => {
      it('should validate existing course', () => {
        courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateCourse(1);

        expect(result).toBe(true);
        expect(courseQueryServiceSpy.getCourseById).toHaveBeenCalledWith(1);
        expect(validationEvents).toHaveLength(1);
        expect(validationEvents[0]).toEqual(jasmine.objectContaining({
          validationType: 'course-exists',
          entityType: 'Course',
          entityId: 1,
          success: true
        }));
      });

      it('should handle missing course', () => {
        courseQueryServiceSpy.getCourseById.and.returnValue(null);
        const validationEvents: ValidationEvent[] = [];

        service.validationCompleted$.subscribe(event => {
          validationEvents.push(event);
        });

        const result = service.validateCourse(999);

        expect(result).toBe(false);
        expect(validationEvents[0]).toEqual(jasmine.objectContaining({
          validationType: 'course-exists',
          entityType: 'Course',
          entityId: 999,
          success: false,
          error: 'Course 999 not found'
        }));
      });

      it('should log validation details', () => {
        spyOn(console, 'log');
        courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);

        service.validateCourse(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Validating course 1'
        );
        expect(console.log).toHaveBeenCalledWith(
          '[CourseStateCoordinationService] Course validation result: true'
        );
      });
    });
  });

  describe('Observable Events', () => {
    it('should emit coordination events for successful operations', () => {
      const coordinationEvents: EntityCoordinationEvent[] = [];
      service.coordinationCompleted$.subscribe(event => {
        coordinationEvents.push(event);
      });

      const apiOperation = of(mockCourse);
      service.coordinateCourseCreation(apiOperation, mockCourse, 'Success').subscribe();

      expect(coordinationEvents).toHaveLength(1);
      expect(coordinationEvents[0].success).toBe(true);
    });

    it('should emit validation events for validation operations', () => {
      const validationEvents: ValidationEvent[] = [];
      service.validationCompleted$.subscribe(event => {
        validationEvents.push(event);
      });

      courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);
      service.validateCourse(1);

      expect(validationEvents).toHaveLength(1);
      expect(validationEvents[0].success).toBe(true);
    });

    it('should provide workflow coordination observable', () => {
      expect(service.workflowCoordinated$).toBeDefined();

      // Subscribe to ensure observable is working
      const workflowEvents: WorkflowCoordinationEvent[] = [];
      service.workflowCoordinated$.subscribe(event => {
        workflowEvents.push(event);
      });

      // Initially should be empty
      expect(workflowEvents).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should complete all Observable subjects on destroy', () => {
      spyOn(console, 'log');

      // Create subscribers to test completion
      let coordinationCompleted = false;
      let validationCompleted = false;
      let workflowCompleted = false;

      service.coordinationCompleted$.subscribe({
        complete: () => coordinationCompleted = true
      });
      service.validationCompleted$.subscribe({
        complete: () => validationCompleted = true
      });
      service.workflowCoordinated$.subscribe({
        complete: () => workflowCompleted = true
      });

      service.ngOnDestroy();

      expect(coordinationCompleted).toBe(true);
      expect(validationCompleted).toBe(true);
      expect(workflowCompleted).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[CourseStateCoordinationService] Cleaning up Observable subjects'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[CourseStateCoordinationService] All Observable subjects completed'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle coordination with null entities', () => {
      const apiOperation = of(null);

      expect(() => {
        service.coordinateCourseCreation(apiOperation, null as any, 'Success').subscribe();
      }).not.toThrow();
    });

    it('should handle entity without title in coordination events', () => {
      const entityWithoutTitle = { ...mockCourse, title: null };
      const apiOperation = of(entityWithoutTitle);
      const coordinationEvents: EntityCoordinationEvent[] = [];

      service.coordinationCompleted$.subscribe(event => {
        coordinationEvents.push(event);
      });

      service.coordinateCourseCreation(apiOperation, entityWithoutTitle as any, 'Success').subscribe();

      expect(coordinationEvents[0].entityTitle).toBe('Unknown');
    });

    it('should handle sort order computation with edge cases', () => {
      // Empty arrays
      const courseWithEmptyTopics = new Course({
        ...mockCourse,
        topics: []
      });
      courseQueryServiceSpy.getCourseById.and.returnValue(courseWithEmptyTopics);

      expect(service.computeTopicSortOrder(1)).toBe(0);

      // Negative sort orders
      const topicsWithNegativeSorts = [
        new Topic({ ...mockTopic, sortOrder: -1 }),
        new Topic({ ...mockTopic, sortOrder: -5 })
      ];
      const courseWithNegativeSorts = new Course({
        ...mockCourse,
        topics: topicsWithNegativeSorts
      });
      courseQueryServiceSpy.getCourseById.and.returnValue(courseWithNegativeSorts);

      expect(service.computeTopicSortOrder(1)).toBe(0); // Max(-1, -5, -1) + 1 = 0
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete entity creation workflow', () => {
      // Setup
      courseQueryServiceSpy.getCourseById.and.returnValue(mockCourse);
      const coordinationEvents: EntityCoordinationEvent[] = [];
      service.coordinationCompleted$.subscribe(event => {
        coordinationEvents.push(event);
      });

      // Validate course exists
      expect(service.validateCourse(1)).toBe(true);

      // Prepare topic for creation
      spyOn(service, 'computeTopicSortOrder').and.returnValue(2);
      const preparedTopic = service.prepareTopicForCreation(mockTopic);
      expect(preparedTopic.sortOrder).toBe(2);

      // Coordinate creation
      const apiOperation = of(mockTopic);
      service.coordinateCourseCreation(apiOperation, mockTopic, 'Topic created').subscribe();

      expect(coordinationEvents).toHaveLength(1);
      expect(coordinationEvents[0].success).toBe(true);
    });
  });
});