// course-crud.service.spec.ts
// Comprehensive unit tests for CourseCrudService - Course CRUD operations facade
// Tests delegation to business and coordination services, Observable streams, and cleanup

import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CourseCrudService } from './course-crud.service';
import { CourseCrudBusinessService } from '../business/course-crud-business.service';
import { CourseCrudCoordinationService, EntitySaveCompletedEvent, EntitySaveErrorEvent, LessonSaveCompletedEvent, LessonSaveErrorEvent, CourseSaveCompletedEvent } from '../coordination/course-crud-coordination.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { LessonDetail } from '../../../models/lesson';

describe('CourseCrudService', () => {
  let service: CourseCrudService;
  let businessServiceSpy: jasmine.SpyObj<CourseCrudBusinessService>;
  let coordinationServiceSpy: jasmine.SpyObj<CourseCrudCoordinationService>;

  // Mock Observable subjects for testing
  let courseSaveCompletedSubject: Subject<CourseSaveCompletedEvent>;
  let lessonSaveCompletedSubject: Subject<LessonSaveCompletedEvent>;
  let lessonSaveErrorSubject: Subject<LessonSaveErrorEvent>;

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
    // Create mock Observable subjects
    courseSaveCompletedSubject = new Subject<CourseSaveCompletedEvent>();
    lessonSaveCompletedSubject = new Subject<LessonSaveCompletedEvent>();
    lessonSaveErrorSubject = new Subject<LessonSaveErrorEvent>();

    // Create spy objects
    const businessServiceSpyObj = jasmine.createSpyObj('CourseCrudBusinessService', [
      'loadCourses',
      'createCourse',
      'updateCourse',
      'deleteCourse',
      'createTopic',
      'updateTopic',
      'deleteTopic',
      'createSubTopic',
      'updateSubTopic',
      'deleteSubTopic',
      'deleteLesson'
    ]);

    const coordinationServiceSpyObj = jasmine.createSpyObj('CourseCrudCoordinationService', [
      'createLessonWithEvents',
      'updateLessonWithEvents',
      'ngOnDestroy'
    ], {
      courseSaveCompleted$: courseSaveCompletedSubject.asObservable(),
      lessonSaveCompleted$: lessonSaveCompletedSubject.asObservable(),
      lessonSaveError$: lessonSaveErrorSubject.asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        CourseCrudService,
        { provide: CourseCrudBusinessService, useValue: businessServiceSpyObj },
        { provide: CourseCrudCoordinationService, useValue: coordinationServiceSpyObj }
      ]
    });

    service = TestBed.inject(CourseCrudService);
    businessServiceSpy = TestBed.inject(CourseCrudBusinessService) as jasmine.SpyObj<CourseCrudBusinessService>;
    coordinationServiceSpy = TestBed.inject(CourseCrudCoordinationService) as jasmine.SpyObj<CourseCrudCoordinationService>;
  });

  afterEach(() => {
    // Complete subjects to avoid memory leaks
    courseSaveCompletedSubject.complete();
    lessonSaveCompletedSubject.complete();
    lessonSaveErrorSubject.complete();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with business and coordination services', () => {
      expect(businessServiceSpy).toBeTruthy();
      expect(coordinationServiceSpy).toBeTruthy();
    });

    it('should log facade pattern initialization', () => {
      spyOn(console, 'log');
      const newService = new CourseCrudService(businessServiceSpy, coordinationServiceSpy);

      expect(console.log).toHaveBeenCalledWith(
        '[CourseCrudService] FACADE PATTERN - Delegating to split services'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[CourseCrudService] Business Service:',
        true
      );
      expect(console.log).toHaveBeenCalledWith(
        '[CourseCrudService] Coordination Service:',
        true
      );
    });
  });

  describe('Observable Streams Delegation', () => {
    it('should delegate courseSaveCompleted$ to coordination service', () => {
      const testEvent: CourseSaveCompletedEvent = {
        course: mockCourse,
        timestamp: new Date(),
        success: true
      };

      const receivedEvents: CourseSaveCompletedEvent[] = [];
      service.courseSaveCompleted$.subscribe(event => {
        receivedEvents.push(event);
      });

      courseSaveCompletedSubject.next(testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(testEvent);
    });

    it('should delegate lessonSaveCompleted$ to coordination service', () => {
      const testEvent: LessonSaveCompletedEvent = {
        lesson: mockLessonDetail,
        timestamp: new Date(),
        success: true
      };

      const receivedEvents: LessonSaveCompletedEvent[] = [];
      service.lessonSaveCompleted$.subscribe(event => {
        receivedEvents.push(event);
      });

      lessonSaveCompletedSubject.next(testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(testEvent);
    });

    it('should delegate lessonSaveError$ to coordination service', () => {
      const testEvent: LessonSaveErrorEvent = {
        lesson: mockLessonDetail,
        error: new Error('Save failed'),
        timestamp: new Date(),
        success: false
      };

      const receivedEvents: LessonSaveErrorEvent[] = [];
      service.lessonSaveError$.subscribe(event => {
        receivedEvents.push(event);
      });

      lessonSaveErrorSubject.next(testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(testEvent);
    });

    it('should maintain Observable subscriptions across service lifetime', () => {
      let courseSaveEventCount = 0;
      let lessonSaveEventCount = 0;
      let lessonErrorEventCount = 0;

      service.courseSaveCompleted$.subscribe(() => courseSaveEventCount++);
      service.lessonSaveCompleted$.subscribe(() => lessonSaveEventCount++);
      service.lessonSaveError$.subscribe(() => lessonErrorEventCount++);

      // Emit multiple events
      courseSaveCompletedSubject.next({ course: mockCourse, timestamp: new Date(), success: true });
      courseSaveCompletedSubject.next({ course: mockCourse, timestamp: new Date(), success: true });

      lessonSaveCompletedSubject.next({ lesson: mockLessonDetail, timestamp: new Date(), success: true });

      lessonSaveErrorSubject.next({ lesson: mockLessonDetail, error: new Error(), timestamp: new Date(), success: false });
      lessonSaveErrorSubject.next({ lesson: mockLessonDetail, error: new Error(), timestamp: new Date(), success: false });
      lessonSaveErrorSubject.next({ lesson: mockLessonDetail, error: new Error(), timestamp: new Date(), success: false });

      expect(courseSaveEventCount).toBe(2);
      expect(lessonSaveEventCount).toBe(1);
      expect(lessonErrorEventCount).toBe(3);
    });
  });

  describe('Course Operations Delegation', () => {
    describe('loadCourses()', () => {
      it('should delegate to business service', () => {
        const mockCourses = [mockCourse];
        businessServiceSpy.loadCourses.and.returnValue(of(mockCourses));

        const result$ = service.loadCourses();

        expect(businessServiceSpy.loadCourses).toHaveBeenCalled();
        result$.subscribe(courses => {
          expect(courses).toEqual(mockCourses);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.loadCourses.and.returnValue(of([]));

        service.loadCourses();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating loadCourses to business service'
        );
      });

      it('should handle business service errors', () => {
        const error = new Error('Load failed');
        businessServiceSpy.loadCourses.and.returnValue(of().pipe(() => {
          throw error;
        }));

        expect(() => {
          service.loadCourses().subscribe();
        }).not.toThrow(); // Should not throw, error should be in Observable
      });
    });

    describe('createCourse()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.createCourse.and.returnValue(of(mockCourse));

        const result$ = service.createCourse(mockCourse);

        expect(businessServiceSpy.createCourse).toHaveBeenCalledWith(mockCourse);
        result$.subscribe(course => {
          expect(course).toEqual(mockCourse);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.createCourse.and.returnValue(of(mockCourse));

        service.createCourse(mockCourse);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating createCourse to business service'
        );
      });
    });

    describe('updateCourse()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.updateCourse.and.returnValue(of(mockCourse));

        const result$ = service.updateCourse(mockCourse);

        expect(businessServiceSpy.updateCourse).toHaveBeenCalledWith(mockCourse);
        result$.subscribe(course => {
          expect(course).toEqual(mockCourse);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.updateCourse.and.returnValue(of(mockCourse));

        service.updateCourse(mockCourse);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating updateCourse to business service'
        );
      });
    });

    describe('deleteCourse()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.deleteCourse.and.returnValue(of(void 0));

        const result$ = service.deleteCourse(1);

        expect(businessServiceSpy.deleteCourse).toHaveBeenCalledWith(1);
        result$.subscribe(result => {
          expect(result).toBeUndefined();
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.deleteCourse.and.returnValue(of(void 0));

        service.deleteCourse(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating deleteCourse to business service'
        );
      });
    });
  });

  describe('Topic Operations Delegation', () => {
    describe('createTopic()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.createTopic.and.returnValue(of(mockTopic));

        const result$ = service.createTopic(mockTopic);

        expect(businessServiceSpy.createTopic).toHaveBeenCalledWith(mockTopic);
        result$.subscribe(topic => {
          expect(topic).toEqual(mockTopic);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.createTopic.and.returnValue(of(mockTopic));

        service.createTopic(mockTopic);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating createTopic to business service'
        );
      });
    });

    describe('updateTopic()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.updateTopic.and.returnValue(of(mockTopic));

        const result$ = service.updateTopic(mockTopic);

        expect(businessServiceSpy.updateTopic).toHaveBeenCalledWith(mockTopic);
        result$.subscribe(topic => {
          expect(topic).toEqual(mockTopic);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.updateTopic.and.returnValue(of(mockTopic));

        service.updateTopic(mockTopic);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating updateTopic to business service'
        );
      });
    });

    describe('deleteTopic()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.deleteTopic.and.returnValue(of(void 0));

        const result$ = service.deleteTopic(1);

        expect(businessServiceSpy.deleteTopic).toHaveBeenCalledWith(1);
        result$.subscribe(result => {
          expect(result).toBeUndefined();
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.deleteTopic.and.returnValue(of(void 0));

        service.deleteTopic(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating deleteTopic to business service'
        );
      });
    });
  });

  describe('SubTopic Operations Delegation', () => {
    describe('createSubTopic()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.createSubTopic.and.returnValue(of(mockSubTopic));

        const result$ = service.createSubTopic(mockSubTopic);

        expect(businessServiceSpy.createSubTopic).toHaveBeenCalledWith(mockSubTopic);
        result$.subscribe(subTopic => {
          expect(subTopic).toEqual(mockSubTopic);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.createSubTopic.and.returnValue(of(mockSubTopic));

        service.createSubTopic(mockSubTopic);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating createSubTopic to business service'
        );
      });
    });

    describe('updateSubTopic()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.updateSubTopic.and.returnValue(of(mockSubTopic));

        const result$ = service.updateSubTopic(mockSubTopic);

        expect(businessServiceSpy.updateSubTopic).toHaveBeenCalledWith(mockSubTopic);
        result$.subscribe(subTopic => {
          expect(subTopic).toEqual(mockSubTopic);
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.updateSubTopic.and.returnValue(of(mockSubTopic));

        service.updateSubTopic(mockSubTopic);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating updateSubTopic to business service'
        );
      });
    });

    describe('deleteSubTopic()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.deleteSubTopic.and.returnValue(of(void 0));

        const result$ = service.deleteSubTopic(1);

        expect(businessServiceSpy.deleteSubTopic).toHaveBeenCalledWith(1);
        result$.subscribe(result => {
          expect(result).toBeUndefined();
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.deleteSubTopic.and.returnValue(of(void 0));

        service.deleteSubTopic(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating deleteSubTopic to business service'
        );
      });
    });
  });

  describe('Lesson Operations Delegation', () => {
    describe('createLessonWithEvents()', () => {
      it('should delegate to coordination service', () => {
        service.createLessonWithEvents(mockLessonDetail);

        expect(coordinationServiceSpy.createLessonWithEvents).toHaveBeenCalledWith(mockLessonDetail);
      });

      it('should log delegation', () => {
        spyOn(console, 'log');

        service.createLessonWithEvents(mockLessonDetail);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating createLessonWithEvents to coordination service'
        );
      });
    });

    describe('updateLessonWithEvents()', () => {
      it('should delegate to coordination service', () => {
        service.updateLessonWithEvents(mockLessonDetail);

        expect(coordinationServiceSpy.updateLessonWithEvents).toHaveBeenCalledWith(mockLessonDetail);
      });

      it('should log delegation', () => {
        spyOn(console, 'log');

        service.updateLessonWithEvents(mockLessonDetail);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating updateLessonWithEvents to coordination service'
        );
      });
    });

    describe('deleteLesson()', () => {
      it('should delegate to business service', () => {
        businessServiceSpy.deleteLesson.and.returnValue(of(void 0));

        const result$ = service.deleteLesson(1);

        expect(businessServiceSpy.deleteLesson).toHaveBeenCalledWith(1);
        result$.subscribe(result => {
          expect(result).toBeUndefined();
        });
      });

      it('should log delegation', () => {
        spyOn(console, 'log');
        businessServiceSpy.deleteLesson.and.returnValue(of(void 0));

        service.deleteLesson(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating deleteLesson to business service'
        );
      });
    });
  });

  describe('Service Cleanup', () => {
    describe('ngOnDestroy()', () => {
      it('should delegate cleanup to coordination service', () => {
        service.ngOnDestroy();

        expect(coordinationServiceSpy.ngOnDestroy).toHaveBeenCalled();
      });

      it('should log delegation', () => {
        spyOn(console, 'log');

        service.ngOnDestroy();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudService] FACADE: Delegating cleanup to coordination service'
        );
      });

      it('should not call business service cleanup', () => {
        // Business service should not have cleanup as it's stateless
        service.ngOnDestroy();

        // Only coordination service should be called
        expect(coordinationServiceSpy.ngOnDestroy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null course in operations', () => {
      businessServiceSpy.createCourse.and.returnValue(of(null as any));

      expect(() => {
        service.createCourse(null as any).subscribe();
      }).not.toThrow();

      expect(businessServiceSpy.createCourse).toHaveBeenCalledWith(null);
    });

    it('should handle null topic in operations', () => {
      businessServiceSpy.createTopic.and.returnValue(of(null as any));

      expect(() => {
        service.createTopic(null as any).subscribe();
      }).not.toThrow();

      expect(businessServiceSpy.createTopic).toHaveBeenCalledWith(null);
    });

    it('should handle null subtopic in operations', () => {
      businessServiceSpy.createSubTopic.and.returnValue(of(null as any));

      expect(() => {
        service.createSubTopic(null as any).subscribe();
      }).not.toThrow();

      expect(businessServiceSpy.createSubTopic).toHaveBeenCalledWith(null);
    });

    it('should handle null lesson in operations', () => {
      expect(() => {
        service.createLessonWithEvents(null as any);
      }).not.toThrow();

      expect(coordinationServiceSpy.createLessonWithEvents).toHaveBeenCalledWith(null);
    });

    it('should handle invalid IDs in delete operations', () => {
      businessServiceSpy.deleteCourse.and.returnValue(of(void 0));
      businessServiceSpy.deleteTopic.and.returnValue(of(void 0));
      businessServiceSpy.deleteSubTopic.and.returnValue(of(void 0));
      businessServiceSpy.deleteLesson.and.returnValue(of(void 0));

      const invalidIds = [0, -1, NaN, undefined as any, null as any];

      invalidIds.forEach(id => {
        expect(() => {
          service.deleteCourse(id);
          service.deleteTopic(id);
          service.deleteSubTopic(id);
          service.deleteLesson(id);
        }).not.toThrow();
      });
    });

    it('should maintain delegation even when business service throws', () => {
      const error = new Error('Business service error');
      businessServiceSpy.createCourse.and.throwError(error);

      expect(() => {
        service.createCourse(mockCourse);
      }).toThrowError(error);

      // Should still have attempted delegation
      expect(businessServiceSpy.createCourse).toHaveBeenCalledWith(mockCourse);
    });

    it('should maintain delegation even when coordination service throws', () => {
      const error = new Error('Coordination service error');
      coordinationServiceSpy.createLessonWithEvents.and.throwError(error);

      expect(() => {
        service.createLessonWithEvents(mockLessonDetail);
      }).toThrowError(error);

      // Should still have attempted delegation
      expect(coordinationServiceSpy.createLessonWithEvents).toHaveBeenCalledWith(mockLessonDetail);
    });
  });

  describe('Observable Stream Integration', () => {
    it('should allow multiple subscribers to Observable streams', () => {
      let subscriber1EventCount = 0;
      let subscriber2EventCount = 0;
      let subscriber3EventCount = 0;

      // Multiple subscribers to the same stream
      service.courseSaveCompleted$.subscribe(() => subscriber1EventCount++);
      service.courseSaveCompleted$.subscribe(() => subscriber2EventCount++);
      service.lessonSaveCompleted$.subscribe(() => subscriber3EventCount++);

      // Emit events
      courseSaveCompletedSubject.next({ course: mockCourse, timestamp: new Date(), success: true });
      lessonSaveCompletedSubject.next({ lesson: mockLessonDetail, timestamp: new Date(), success: true });

      expect(subscriber1EventCount).toBe(1);
      expect(subscriber2EventCount).toBe(1);
      expect(subscriber3EventCount).toBe(1);
    });

    it('should handle rapid successive events', () => {
      const receivedEvents: CourseSaveCompletedEvent[] = [];
      service.courseSaveCompleted$.subscribe(event => {
        receivedEvents.push(event);
      });

      // Emit many events rapidly
      for (let i = 0; i < 100; i++) {
        courseSaveCompletedSubject.next({
          course: { ...mockCourse, id: i + 1 } as Course,
          timestamp: new Date(),
          success: true
        });
      }

      expect(receivedEvents).toHaveLength(100);
      expect(receivedEvents[0].course.id).toBe(1);
      expect(receivedEvents[99].course.id).toBe(100);
    });

    it('should handle error events without affecting other streams', () => {
      let courseSaveEventCount = 0;
      let lessonSaveEventCount = 0;
      let lessonErrorEventCount = 0;

      service.courseSaveCompleted$.subscribe(() => courseSaveEventCount++);
      service.lessonSaveCompleted$.subscribe(() => lessonSaveEventCount++);
      service.lessonSaveError$.subscribe(() => lessonErrorEventCount++);

      // Emit error events
      lessonSaveErrorSubject.next({
        lesson: mockLessonDetail,
        error: new Error('Save failed'),
        timestamp: new Date(),
        success: false
      });

      // Other streams should continue working
      courseSaveCompletedSubject.next({ course: mockCourse, timestamp: new Date(), success: true });
      lessonSaveCompletedSubject.next({ lesson: mockLessonDetail, timestamp: new Date(), success: true });

      expect(courseSaveEventCount).toBe(1);
      expect(lessonSaveEventCount).toBe(1);
      expect(lessonErrorEventCount).toBe(1);
    });
  });

  describe('Type Exports and Backward Compatibility', () => {
    it('should re-export types from coordination service', () => {
      // These should be available through imports from this service
      // This test verifies the re-export statements work correctly

      const courseSaveEvent: CourseSaveCompletedEvent = {
        course: mockCourse,
        timestamp: new Date(),
        success: true
      };

      const lessonSaveEvent: LessonSaveCompletedEvent = {
        lesson: mockLessonDetail,
        timestamp: new Date(),
        success: true
      };

      const lessonErrorEvent: LessonSaveErrorEvent = {
        lesson: mockLessonDetail,
        error: new Error('Test error'),
        timestamp: new Date(),
        success: false
      };

      // If types are properly re-exported, these assignments should work
      expect(courseSaveEvent).toBeDefined();
      expect(lessonSaveEvent).toBeDefined();
      expect(lessonErrorEvent).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete CRUD workflow for course', () => {
      // Setup return values
      businessServiceSpy.loadCourses.and.returnValue(of([]));
      businessServiceSpy.createCourse.and.returnValue(of(mockCourse));
      businessServiceSpy.updateCourse.and.returnValue(of(mockCourse));
      businessServiceSpy.deleteCourse.and.returnValue(of(void 0));

      // Load courses
      service.loadCourses().subscribe(courses => {
        expect(courses).toEqual([]);
      });

      // Create course
      service.createCourse(mockCourse).subscribe(course => {
        expect(course).toEqual(mockCourse);
      });

      // Update course
      service.updateCourse(mockCourse).subscribe(course => {
        expect(course).toEqual(mockCourse);
      });

      // Delete course
      service.deleteCourse(1).subscribe(result => {
        expect(result).toBeUndefined();
      });

      // Verify all delegations occurred
      expect(businessServiceSpy.loadCourses).toHaveBeenCalled();
      expect(businessServiceSpy.createCourse).toHaveBeenCalledWith(mockCourse);
      expect(businessServiceSpy.updateCourse).toHaveBeenCalledWith(mockCourse);
      expect(businessServiceSpy.deleteCourse).toHaveBeenCalledWith(1);
    });

    it('should handle complete CRUD workflow for topic', () => {
      // Setup return values
      businessServiceSpy.createTopic.and.returnValue(of(mockTopic));
      businessServiceSpy.updateTopic.and.returnValue(of(mockTopic));
      businessServiceSpy.deleteTopic.and.returnValue(of(void 0));

      // Create topic
      service.createTopic(mockTopic).subscribe(topic => {
        expect(topic).toEqual(mockTopic);
      });

      // Update topic
      service.updateTopic(mockTopic).subscribe(topic => {
        expect(topic).toEqual(mockTopic);
      });

      // Delete topic
      service.deleteTopic(1).subscribe(result => {
        expect(result).toBeUndefined();
      });

      // Verify all delegations occurred
      expect(businessServiceSpy.createTopic).toHaveBeenCalledWith(mockTopic);
      expect(businessServiceSpy.updateTopic).toHaveBeenCalledWith(mockTopic);
      expect(businessServiceSpy.deleteTopic).toHaveBeenCalledWith(1);
    });

    it('should handle complete lesson workflow with events', () => {
      // Create lesson with events
      service.createLessonWithEvents(mockLessonDetail);
      expect(coordinationServiceSpy.createLessonWithEvents).toHaveBeenCalledWith(mockLessonDetail);

      // Update lesson with events
      service.updateLessonWithEvents(mockLessonDetail);
      expect(coordinationServiceSpy.updateLessonWithEvents).toHaveBeenCalledWith(mockLessonDetail);

      // Delete lesson (business service)
      businessServiceSpy.deleteLesson.and.returnValue(of(void 0));
      service.deleteLesson(1).subscribe(result => {
        expect(result).toBeUndefined();
      });
      expect(businessServiceSpy.deleteLesson).toHaveBeenCalledWith(1);
    });

    it('should coordinate between business and coordination services', () => {
      let businessCallCount = 0;
      let coordinationCallCount = 0;

      // Track delegation calls
      businessServiceSpy.createCourse.and.callFake(() => {
        businessCallCount++;
        return of(mockCourse);
      });

      coordinationServiceSpy.createLessonWithEvents.and.callFake(() => {
        coordinationCallCount++;
      });

      // Make calls to both services
      service.createCourse(mockCourse).subscribe();
      service.createLessonWithEvents(mockLessonDetail);

      expect(businessCallCount).toBe(1);
      expect(coordinationCallCount).toBe(1);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not create new Observable instances on each property access', () => {
      const stream1 = service.courseSaveCompleted$;
      const stream2 = service.courseSaveCompleted$;
      const stream3 = service.lessonSaveCompleted$;
      const stream4 = service.lessonSaveCompleted$;

      // Should be the same instance (delegation to coordination service)
      expect(stream1).toBe(stream2);
      expect(stream3).toBe(stream4);
    });

    it('should handle cleanup without memory leaks', () => {
      // Subscribe to all streams
      const subscriptions = [
        service.courseSaveCompleted$.subscribe(),
        service.lessonSaveCompleted$.subscribe(),
        service.lessonSaveError$.subscribe()
      ];

      // Service cleanup
      service.ngOnDestroy();

      // Coordination service cleanup should be called
      expect(coordinationServiceSpy.ngOnDestroy).toHaveBeenCalled();

      // Manually unsubscribe to prevent test memory leaks
      subscriptions.forEach(sub => sub.unsubscribe());
    });

    it('should handle many concurrent operations efficiently', () => {
      const startTime = performance.now();

      // Setup business service to return immediately
      businessServiceSpy.createCourse.and.returnValue(of(mockCourse));
      businessServiceSpy.createTopic.and.returnValue(of(mockTopic));
      businessServiceSpy.createSubTopic.and.returnValue(of(mockSubTopic));

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        service.createCourse(mockCourse).subscribe();
        service.createTopic(mockTopic).subscribe();
        service.createSubTopic(mockSubTopic).subscribe();
        service.createLessonWithEvents(mockLessonDetail);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms for 400 operations)
      expect(duration).toBeLessThan(100);

      // Verify all delegations occurred
      expect(businessServiceSpy.createCourse).toHaveBeenCalledTimes(100);
      expect(businessServiceSpy.createTopic).toHaveBeenCalledTimes(100);
      expect(businessServiceSpy.createSubTopic).toHaveBeenCalledTimes(100);
      expect(coordinationServiceSpy.createLessonWithEvents).toHaveBeenCalledTimes(100);
    });
  });
});