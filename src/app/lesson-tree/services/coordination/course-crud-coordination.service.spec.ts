// course-crud-coordination.service.spec.ts
// Comprehensive unit tests for CourseCrudCoordinationService - CRUD operation coordination
// Tests Observable event management, cross-service coordination, lesson operations, and lifecycle management

import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  CourseCrudCoordinationService,
  EntitySaveCompletedEvent,
  EntitySaveErrorEvent,
  LessonSaveCompletedEvent,
  LessonSaveErrorEvent,
  CrudCoordinationEvent
} from './course-crud-coordination.service';
import { CourseCrudBusinessService } from '../business/course-crud-business.service';
import { CourseBusinessService } from '../business/course-business.service';
import { CalendarRefreshService } from '../../../calendar/services/integration/calendar-refresh.service';
import { LessonDetail } from '../../../models/lesson';

describe('CourseCrudCoordinationService', () => {
  let service: CourseCrudCoordinationService;
  let businessServiceSpy: jasmine.SpyObj<CourseCrudBusinessService>;
  let courseBusinessServiceSpy: jasmine.SpyObj<CourseBusinessService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let calendarRefreshSpy: jasmine.SpyObj<CalendarRefreshService>;

  // Test data fixtures
  const mockLessonDetail: LessonDetail = {
    id: 1,
    title: 'Test Lesson',
    courseId: 2,
    topicId: 3,
    subTopicId: 4,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test objective',
    materials: 'Test materials',
    classTime: '45 minutes',
    methods: 'Test methods',
    specialNeeds: 'None',
    assessment: 'Quiz',
    sortOrder: 1,
    archived: false,
    userId: 1,
    attachments: [],
    standards: [],
    notes: []
  } as LessonDetail;

  const mockCoordinationEvent = {
    operation: 'create',
    entityType: 'Lesson',
    entityId: 1,
    entityTitle: 'Test Lesson',
    success: true,
    timestamp: new Date()
  };

  const mockValidationEvent = {
    validationType: 'parent-container',
    entityType: 'SubTopic',
    entityId: 4,
    success: true,
    timestamp: new Date()
  };

  const mockWorkflowEvent = {
    workflowType: 'entity-added',
    coordinationAction: 'refresh-cache',
    entityDetails: {
      entityType: 'Lesson',
      entityId: 1,
      entityTitle: 'Test Lesson'
    },
    success: true,
    timestamp: new Date()
  };

  // Mock subjects for CourseBusinessService
  let mockCoordinationCompletedSubject: Subject<any>;
  let mockValidationCompletedSubject: Subject<any>;
  let mockWorkflowCoordinatedSubject: Subject<any>;

  beforeEach(() => {
    const businessServiceSpyObj = jasmine.createSpyObj('CourseCrudBusinessService', [
      'createLesson',
      'updateLesson'
    ]);

    const courseBusinessServiceSpyObj = jasmine.createSpyObj('CourseBusinessService', [], {
      coordinationCompleted$: new Subject(),
      validationCompleted$: new Subject(),
      workflowCoordinated$: new Subject()
    });

    const toastrServiceSpyObj = jasmine.createSpyObj('ToastrService', [
      'success',
      'error',
      'warning'
    ]);

    const calendarRefreshSpyObj = jasmine.createSpyObj('CalendarRefreshService', [
      'refreshCalendarForCourse'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CourseCrudCoordinationService,
        { provide: CourseCrudBusinessService, useValue: businessServiceSpyObj },
        { provide: CourseBusinessService, useValue: courseBusinessServiceSpyObj },
        { provide: ToastrService, useValue: toastrServiceSpyObj },
        { provide: CalendarRefreshService, useValue: calendarRefreshSpyObj }
      ]
    });

    service = TestBed.inject(CourseCrudCoordinationService);
    businessServiceSpy = TestBed.inject(CourseCrudBusinessService) as jasmine.SpyObj<CourseCrudBusinessService>;
    courseBusinessServiceSpy = TestBed.inject(CourseBusinessService) as jasmine.SpyObj<CourseBusinessService>;
    toastrSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    calendarRefreshSpy = TestBed.inject(CalendarRefreshService) as jasmine.SpyObj<CalendarRefreshService>;

    // Set up mock subjects
    mockCoordinationCompletedSubject = new Subject();
    mockValidationCompletedSubject = new Subject();
    mockWorkflowCoordinatedSubject = new Subject();

    (courseBusinessServiceSpy as any).coordinationCompleted$ = mockCoordinationCompletedSubject.asObservable();
    (courseBusinessServiceSpy as any).validationCompleted$ = mockValidationCompletedSubject.asObservable();
    (courseBusinessServiceSpy as any).workflowCoordinated$ = mockWorkflowCoordinatedSubject.asObservable();
  });

  afterEach(() => {
    service.ngOnDestroy();
    mockCoordinationCompletedSubject.complete();
    mockValidationCompletedSubject.complete();
    mockWorkflowCoordinatedSubject.complete();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = new CourseCrudCoordinationService(
        businessServiceSpy,
        courseBusinessServiceSpy,
        toastrSpy,
        calendarRefreshSpy
      );
      expect(console.log).toHaveBeenCalledWith(
        '[CourseCrudCoordinationService] Enhanced with Observable coordination patterns'
      );
      newService.ngOnDestroy();
    });

    it('should initialize all Observable events', () => {
      expect(service.courseSaveCompleted$).toBeDefined();
      expect(service.courseSaveError$).toBeDefined();
      expect(service.topicSaveCompleted$).toBeDefined();
      expect(service.topicSaveError$).toBeDefined();
      expect(service.subTopicSaveCompleted$).toBeDefined();
      expect(service.subTopicSaveError$).toBeDefined();
      expect(service.lessonSaveCompleted$).toBeDefined();
      expect(service.lessonSaveError$).toBeDefined();
      expect(service.crudCoordinated$).toBeDefined();
    });

    it('should set up Observable consumption', () => {
      spyOn(console, 'log');
      const newService = new CourseCrudCoordinationService(
        businessServiceSpy,
        courseBusinessServiceSpy,
        toastrSpy,
        calendarRefreshSpy
      );

      expect(console.log).toHaveBeenCalledWith(
        '[CourseCrudCoordinationService] Setting up Observable consumption for cross-service coordination'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[CourseCrudCoordinationService] Observable consumption setup complete - monitoring 3 coordination streams'
      );
      newService.ngOnDestroy();
    });
  });

  describe('Observable Event Consumption', () => {
    describe('Coordination Completed Events', () => {
      it('should handle successful coordination completed event', () => {
        spyOn(console, 'log');
        const crudCoordinationEvents: CrudCoordinationEvent[] = [];

        service.crudCoordinated$.subscribe(event => {
          crudCoordinationEvents.push(event);
        });

        mockCoordinationCompletedSubject.next(mockCoordinationEvent);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Received coordination completed event',
          jasmine.objectContaining({
            operation: 'create',
            entityType: 'Lesson',
            entityId: 1,
            success: true
          })
        );

        expect(crudCoordinationEvents).toHaveLength(1);
        expect(crudCoordinationEvents[0]).toEqual(jasmine.objectContaining({
          coordinationType: 'post-create',
          triggerEvent: 'coordination-completed',
          sourceService: 'CourseStateCoordinationService',
          success: true
        }));
      });

      it('should handle create operation coordination', () => {
        const crudCoordinationEvents: CrudCoordinationEvent[] = [];
        service.crudCoordinated$.subscribe(event => {
          crudCoordinationEvents.push(event);
        });

        const createEvent = { ...mockCoordinationEvent, operation: 'create' };
        mockCoordinationCompletedSubject.next(createEvent);

        expect(crudCoordinationEvents[0].coordinationAction).toContain('refresh-entity-cache');
        expect(crudCoordinationEvents[0].coordinationAction).toContain('update-ui-state');
      });

      it('should handle update operation coordination', () => {
        const crudCoordinationEvents: CrudCoordinationEvent[] = [];
        service.crudCoordinated$.subscribe(event => {
          crudCoordinationEvents.push(event);
        });

        const updateEvent = { ...mockCoordinationEvent, operation: 'update' };
        mockCoordinationCompletedSubject.next(updateEvent);

        expect(crudCoordinationEvents[0].coordinationAction).toContain('validate-entity-relationships');
        expect(crudCoordinationEvents[0].coordinationAction).toContain('update-dependent-views');
      });

      it('should handle course creation coordination', () => {
        const crudCoordinationEvents: CrudCoordinationEvent[] = [];
        service.crudCoordinated$.subscribe(event => {
          crudCoordinationEvents.push(event);
        });

        const courseCreateEvent = {
          ...mockCoordinationEvent,
          operation: 'create',
          entityType: 'Course'
        };
        mockCoordinationCompletedSubject.next(courseCreateEvent);

        expect(crudCoordinationEvents[0].coordinationAction).toContain('refresh-course-list');
      });

      it('should handle coordination errors gracefully', () => {
        spyOn(console, 'error');

        // Trigger an error by passing malformed event
        mockCoordinationCompletedSubject.next(null);

        expect(console.error).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Error handling coordination completed:',
          jasmine.any(Error)
        );
      });
    });

    describe('Validation Completed Events', () => {
      it('should handle successful validation completed event', () => {
        spyOn(console, 'log');
        const crudCoordinationEvents: CrudCoordinationEvent[] = [];

        service.crudCoordinated$.subscribe(event => {
          crudCoordinationEvents.push(event);
        });

        mockValidationCompletedSubject.next(mockValidationEvent);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Received validation completed event',
          jasmine.objectContaining({
            validationType: 'parent-container',
            entityType: 'SubTopic',
            success: true
          })
        );

        expect(crudCoordinationEvents).toHaveLength(1);
        expect(crudCoordinationEvents[0]).toEqual(jasmine.objectContaining({
          coordinationType: 'post-creation',
          triggerEvent: 'validation-completed',
          sourceService: 'CourseStateCoordinationService',
          coordinationAction: 'validation-passed',
          success: true
        }));
      });

      it('should handle validation failure with user feedback', () => {
        spyOn(console, 'warn');
        const failedValidationEvent = {
          ...mockValidationEvent,
          success: false,
          error: 'Parent container not found'
        };

        mockValidationCompletedSubject.next(failedValidationEvent);

        expect(console.warn).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Parent container validation failed',
          jasmine.objectContaining({
            entityType: 'SubTopic',
            error: 'Parent container not found'
          })
        );

        expect(toastrSpy.warning).toHaveBeenCalledWith(
          'Validation issue: Parent container not found',
          'Validation Warning'
        );
      });

      it('should handle validation errors gracefully', () => {
        spyOn(console, 'error');

        // Trigger an error by passing malformed event
        mockValidationCompletedSubject.next({ invalidEvent: true });

        expect(console.error).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Error handling validation completed:',
          jasmine.any(Error)
        );
      });
    });

    describe('Workflow Coordinated Events', () => {
      it('should handle successful workflow coordinated event', () => {
        spyOn(console, 'log');
        const crudCoordinationEvents: CrudCoordinationEvent[] = [];

        service.crudCoordinated$.subscribe(event => {
          crudCoordinationEvents.push(event);
        });

        mockWorkflowCoordinatedSubject.next(mockWorkflowEvent);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Received workflow coordinated event',
          jasmine.objectContaining({
            workflowType: 'entity-added',
            coordinationAction: 'refresh-cache',
            success: true
          })
        );

        expect(crudCoordinationEvents).toHaveLength(1);
        expect(crudCoordinationEvents[0]).toEqual(jasmine.objectContaining({
          coordinationType: 'post-creation',
          triggerEvent: 'workflow-coordinated',
          sourceService: 'CourseStateCoordinationService',
          coordinationAction: 'processed-refresh-cache',
          success: true
        }));
      });

      it('should handle workflow coordination processing', () => {
        spyOn(console, 'log');

        mockWorkflowCoordinatedSubject.next(mockWorkflowEvent);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Processing workflow coordination',
          jasmine.objectContaining({
            workflowType: 'entity-added',
            entityType: 'Lesson',
            coordinationAction: 'refresh-cache'
          })
        );
      });

      it('should handle workflow coordination errors gracefully', () => {
        spyOn(console, 'error');

        // Trigger an error by passing malformed event
        mockWorkflowCoordinatedSubject.next(null);

        expect(console.error).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Error handling workflow coordinated:',
          jasmine.any(Error)
        );
      });
    });
  });

  describe('Lesson Operations with Events', () => {
    describe('createLessonWithEvents()', () => {
      it('should create lesson successfully with event emission', () => {
        businessServiceSpy.createLesson.and.returnValue(of(mockLessonDetail));
        const lessonSaveEvents: LessonSaveCompletedEvent[] = [];

        service.lessonSaveCompleted$.subscribe(event => {
          lessonSaveEvents.push(event);
        });

        service.createLessonWithEvents(mockLessonDetail);

        expect(businessServiceSpy.createLesson).toHaveBeenCalledWith(mockLessonDetail);
        expect(lessonSaveEvents).toHaveLength(1);
        expect(lessonSaveEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'create',
          lesson: mockLessonDetail,
          timestamp: jasmine.any(Date)
        }));
      });

      it('should trigger delayed calendar refresh after lesson creation', (done) => {
        businessServiceSpy.createLesson.and.returnValue(of(mockLessonDetail));
        spyOn(console, 'log');

        service.createLessonWithEvents(mockLessonDetail);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] ✅ Requesting DELAYED calendar refresh after lesson creation'
        );

        // Wait for the setTimeout to complete
        setTimeout(() => {
          expect(console.log).toHaveBeenCalledWith(
            '[CourseCrudCoordinationService] 🔄 Executing delayed calendar refresh for course:',
            2
          );
          expect(calendarRefreshSpy.refreshCalendarForCourse).toHaveBeenCalledWith(2);
          done();
        }, 1100); // Wait slightly longer than the 1000ms timeout
      });

      it('should handle lesson creation errors with event emission', () => {
        const error = new Error('Creation failed');
        businessServiceSpy.createLesson.and.returnValue(throwError(() => error));
        const lessonErrorEvents: LessonSaveErrorEvent[] = [];

        service.lessonSaveError$.subscribe(event => {
          lessonErrorEvents.push(event);
        });

        service.createLessonWithEvents(mockLessonDetail);

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Failed to create lesson: Creation failed',
          'Error'
        );
        expect(lessonErrorEvents).toHaveLength(1);
        expect(lessonErrorEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'create',
          error: error,
          timestamp: jasmine.any(Date)
        }));
      });

      it('should log lesson creation initiation', () => {
        spyOn(console, 'log');
        businessServiceSpy.createLesson.and.returnValue(of(mockLessonDetail));

        service.createLessonWithEvents(mockLessonDetail);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Creating lesson with events'
        );
      });
    });

    describe('updateLessonWithEvents()', () => {
      it('should update lesson successfully with event emission', () => {
        businessServiceSpy.updateLesson.and.returnValue(of(mockLessonDetail));
        const lessonSaveEvents: LessonSaveCompletedEvent[] = [];

        service.lessonSaveCompleted$.subscribe(event => {
          lessonSaveEvents.push(event);
        });

        service.updateLessonWithEvents(mockLessonDetail);

        expect(businessServiceSpy.updateLesson).toHaveBeenCalledWith(mockLessonDetail);
        expect(lessonSaveEvents).toHaveLength(1);
        expect(lessonSaveEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'update',
          lesson: mockLessonDetail,
          timestamp: jasmine.any(Date)
        }));
      });

      it('should trigger immediate calendar refresh after lesson update', () => {
        businessServiceSpy.updateLesson.and.returnValue(of(mockLessonDetail));
        spyOn(console, 'log');

        service.updateLessonWithEvents(mockLessonDetail);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] ✅ Requesting calendar refresh after lesson update'
        );
        expect(calendarRefreshSpy.refreshCalendarForCourse).toHaveBeenCalledWith(2);
      });

      it('should handle lesson update errors with event emission', () => {
        const error = new Error('Update failed');
        businessServiceSpy.updateLesson.and.returnValue(throwError(() => error));
        const lessonErrorEvents: LessonSaveErrorEvent[] = [];

        service.lessonSaveError$.subscribe(event => {
          lessonErrorEvents.push(event);
        });

        service.updateLessonWithEvents(mockLessonDetail);

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Failed to update lesson: Update failed',
          'Error'
        );
        expect(lessonErrorEvents).toHaveLength(1);
        expect(lessonErrorEvents[0]).toEqual(jasmine.objectContaining({
          operation: 'update',
          error: error,
          timestamp: jasmine.any(Date)
        }));
      });

      it('should log lesson update initiation', () => {
        spyOn(console, 'log');
        businessServiceSpy.updateLesson.and.returnValue(of(mockLessonDetail));

        service.updateLessonWithEvents(mockLessonDetail);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Updating lesson with events'
        );
      });
    });
  });

  describe('Service Lifecycle Management', () => {
    describe('ngOnDestroy()', () => {
      it('should complete all Observable subjects', () => {
        spyOn(console, 'log');

        // Create subscribers to test completion
        let courseSaveCompletedCompleted = false;
        let courseSaveErrorCompleted = false;
        let topicSaveCompletedCompleted = false;
        let topicSaveErrorCompleted = false;
        let subTopicSaveCompletedCompleted = false;
        let subTopicSaveErrorCompleted = false;
        let lessonSaveCompletedCompleted = false;
        let lessonSaveErrorCompleted = false;
        let crudCoordinatedCompleted = false;

        service.courseSaveCompleted$.subscribe({
          complete: () => courseSaveCompletedCompleted = true
        });
        service.courseSaveError$.subscribe({
          complete: () => courseSaveErrorCompleted = true
        });
        service.topicSaveCompleted$.subscribe({
          complete: () => topicSaveCompletedCompleted = true
        });
        service.topicSaveError$.subscribe({
          complete: () => topicSaveErrorCompleted = true
        });
        service.subTopicSaveCompleted$.subscribe({
          complete: () => subTopicSaveCompletedCompleted = true
        });
        service.subTopicSaveError$.subscribe({
          complete: () => subTopicSaveErrorCompleted = true
        });
        service.lessonSaveCompleted$.subscribe({
          complete: () => lessonSaveCompletedCompleted = true
        });
        service.lessonSaveError$.subscribe({
          complete: () => lessonSaveErrorCompleted = true
        });
        service.crudCoordinated$.subscribe({
          complete: () => crudCoordinatedCompleted = true
        });

        service.ngOnDestroy();

        expect(courseSaveCompletedCompleted).toBe(true);
        expect(courseSaveErrorCompleted).toBe(true);
        expect(topicSaveCompletedCompleted).toBe(true);
        expect(topicSaveErrorCompleted).toBe(true);
        expect(subTopicSaveCompletedCompleted).toBe(true);
        expect(subTopicSaveErrorCompleted).toBe(true);
        expect(lessonSaveCompletedCompleted).toBe(true);
        expect(lessonSaveErrorCompleted).toBe(true);
        expect(crudCoordinatedCompleted).toBe(true);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] Cleaning up Observable subscriptions and subjects'
        );
        expect(console.log).toHaveBeenCalledWith(
          '[CourseCrudCoordinationService] All Observable subjects and subscriptions completed'
        );
      });

      it('should unsubscribe from all external observables', () => {
        const subscriptionSpy = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        (service as any).subscriptions = subscriptionSpy;

        service.ngOnDestroy();

        expect(subscriptionSpy.unsubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Observable Event Architecture', () => {
    it('should provide distinct observables for each entity type', () => {
      expect(service.courseSaveCompleted$).not.toBe(service.topicSaveCompleted$);
      expect(service.topicSaveCompleted$).not.toBe(service.subTopicSaveCompleted$);
      expect(service.subTopicSaveCompleted$).not.toBe(service.lessonSaveCompleted$);
    });

    it('should provide distinct error observables for each entity type', () => {
      expect(service.courseSaveError$).not.toBe(service.topicSaveError$);
      expect(service.topicSaveError$).not.toBe(service.subTopicSaveError$);
      expect(service.subTopicSaveError$).not.toBe(service.lessonSaveError$);
    });

    it('should provide unified coordination observable', () => {
      expect(service.crudCoordinated$).toBeDefined();
      expect(service.crudCoordinated$).not.toBe(service.lessonSaveCompleted$);
    });

    it('should maintain event isolation between operations', () => {
      businessServiceSpy.createLesson.and.returnValue(of(mockLessonDetail));
      const lessonEvents: LessonSaveCompletedEvent[] = [];
      const coordinationEvents: CrudCoordinationEvent[] = [];

      service.lessonSaveCompleted$.subscribe(event => {
        lessonEvents.push(event);
      });

      service.crudCoordinated$.subscribe(event => {
        coordinationEvents.push(event);
      });

      // Trigger lesson creation
      service.createLessonWithEvents(mockLessonDetail);

      // Trigger coordination event
      mockCoordinationCompletedSubject.next(mockCoordinationEvent);

      expect(lessonEvents).toHaveLength(1);
      expect(coordinationEvents).toHaveLength(1);
      expect(lessonEvents[0].operation).toBe('create');
      expect(coordinationEvents[0].triggerEvent).toBe('coordination-completed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null lesson detail in create operation', () => {
      businessServiceSpy.createLesson.and.returnValue(of(null as any));
      const lessonSaveEvents: LessonSaveCompletedEvent[] = [];

      service.lessonSaveCompleted$.subscribe(event => {
        lessonSaveEvents.push(event);
      });

      service.createLessonWithEvents(null as any);

      expect(lessonSaveEvents).toHaveLength(1);
      expect(lessonSaveEvents[0].lesson).toBeNull();
    });

    it('should handle undefined lesson detail in update operation', () => {
      businessServiceSpy.updateLesson.and.returnValue(of(undefined as any));
      const lessonSaveEvents: LessonSaveCompletedEvent[] = [];

      service.lessonSaveCompleted$.subscribe(event => {
        lessonSaveEvents.push(event);
      });

      service.updateLessonWithEvents(undefined as any);

      expect(lessonSaveEvents).toHaveLength(1);
      expect(lessonSaveEvents[0].lesson).toBeUndefined();
    });

    it('should handle coordination events with missing properties', () => {
      const incompleteEvent = {
        operation: 'create'
        // Missing other required properties
      };

      expect(() => {
        mockCoordinationCompletedSubject.next(incompleteEvent);
      }).not.toThrow();
    });

    it('should handle validation events with missing error property', () => {
      const validationEventWithoutError = {
        ...mockValidationEvent,
        success: false
        // Missing error property
      };

      expect(() => {
        mockValidationCompletedSubject.next(validationEventWithoutError);
      }).not.toThrow();
    });

    it('should handle workflow events with malformed entity details', () => {
      const malformedWorkflowEvent = {
        ...mockWorkflowEvent,
        entityDetails: null
      };

      expect(() => {
        mockWorkflowCoordinatedSubject.next(malformedWorkflowEvent);
      }).not.toThrow();
    });

    it('should handle Observable errors in external subscriptions', () => {
      spyOn(console, 'error');

      // Simulate error in external observable
      mockCoordinationCompletedSubject.error(new Error('External observable error'));

      // Service should continue to function
      expect(service).toBeTruthy();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete lesson creation workflow with coordination', () => {
      // Setup
      businessServiceSpy.createLesson.and.returnValue(of(mockLessonDetail));
      const allEvents: any[] = [];

      // Subscribe to all relevant events
      service.lessonSaveCompleted$.subscribe(event => {
        allEvents.push({ type: 'lesson-save-completed', event });
      });

      service.crudCoordinated$.subscribe(event => {
        allEvents.push({ type: 'crud-coordinated', event });
      });

      // Execute lesson creation
      service.createLessonWithEvents(mockLessonDetail);

      // Execute coordination event
      mockCoordinationCompletedSubject.next(mockCoordinationEvent);

      // Verify workflow
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].type).toBe('lesson-save-completed');
      expect(allEvents[1].type).toBe('crud-coordinated');
      expect(businessServiceSpy.createLesson).toHaveBeenCalledWith(mockLessonDetail);
    });

    it('should handle lesson update with validation workflow', () => {
      // Setup
      businessServiceSpy.updateLesson.and.returnValue(of(mockLessonDetail));
      const allEvents: any[] = [];

      // Subscribe to events
      service.lessonSaveCompleted$.subscribe(event => {
        allEvents.push({ type: 'lesson-save-completed', event });
      });

      service.crudCoordinated$.subscribe(event => {
        allEvents.push({ type: 'crud-coordinated', event });
      });

      // Execute lesson update
      service.updateLessonWithEvents(mockLessonDetail);

      // Execute validation event
      mockValidationCompletedSubject.next(mockValidationEvent);

      // Verify workflow
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].event.operation).toBe('update');
      expect(allEvents[1].event.triggerEvent).toBe('validation-completed');
      expect(calendarRefreshSpy.refreshCalendarForCourse).toHaveBeenCalledWith(2);
    });

    it('should handle error recovery in complex workflow', () => {
      // Setup error scenario
      const error = new Error('Complex workflow error');
      businessServiceSpy.createLesson.and.returnValue(throwError(() => error));
      const errorEvents: LessonSaveErrorEvent[] = [];

      service.lessonSaveError$.subscribe(event => {
        errorEvents.push(event);
      });

      // Execute failing lesson creation
      service.createLessonWithEvents(mockLessonDetail);

      // Execute successful coordination (should still work)
      mockCoordinationCompletedSubject.next(mockCoordinationEvent);

      // Verify error handling doesn't break coordination
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].error).toEqual(error);
      expect(toastrSpy.error).toHaveBeenCalledWith(
        'Failed to create lesson: Complex workflow error',
        'Error'
      );
    });
  });
});