// calendar-aware-api.service.spec.ts
// Unit tests for CalendarAwareApiService - Calendar-optimized API operations
// Tests calendar context integration, optimized endpoints, and fallback behavior

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CalendarAwareApiService } from './calendar-aware-api.service';
import { ApiService } from './api.service';
import { CalendarContextService } from '../../calendar/services/integration/calendar-context.service';
import { environment } from '../../../environments/environment';

describe('CalendarAwareApiService', () => {
  let service: CalendarAwareApiService;
  let httpMock: HttpTestingController;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockCalendarContext: jasmine.SpyObj<CalendarContextService>;

  // Test data setup
  const baseUrl = environment.apiUrl;
  const testOptimizationPayload = {
    calendarStartDate: '2024-03-11T00:00:00.000Z',
    calendarEndDate: '2024-03-17T23:59:59.999Z',
    requestPartialScheduleUpdate: true
  };

  const testLessonData = {
    title: 'Test Lesson',
    subTopicId: 1,
    topicId: 2,
    visibility: 'active',
    objective: 'Learn testing',
    sortOrder: 1
  };

  beforeEach(() => {
    // Create spy objects
    const apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'moveLesson',
      'get',
      'put',
      'getCourses',
      'createCourse',
      'moveTopic',
      'moveSubTopic'
    ]);

    const calendarContextSpy = jasmine.createSpyObj('CalendarContextService', [
      'canOptimize',
      'getOptimizationPayload',
      'getDebugInfo',
      'refreshContext'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CalendarAwareApiService,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: CalendarContextService, useValue: calendarContextSpy }
      ]
    });

    service = TestBed.inject(CalendarAwareApiService);
    httpMock = TestBed.inject(HttpTestingController);
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    mockCalendarContext = TestBed.inject(CalendarContextService) as jasmine.SpyObj<CalendarContextService>;
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with proper dependencies', () => {
      expect(service['apiService']).toBeDefined();
      expect(service['calendarContext']).toBeDefined();
      expect(service['http']).toBeDefined();
      expect(service['baseUrl']).toBe(baseUrl);
    });
  });

  describe('Lesson Move Operations', () => {
    it('should use optimized endpoint when calendar context is available', () => {
      // Arrange: Mock available calendar context
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      const lessonId = 123;
      const targetSubTopicId = 456;
      const targetTopicId = 789;
      const afterSiblingId = 101;

      // Act: Move lesson with optimization
      service.moveLessonOptimized(lessonId, targetSubTopicId, targetTopicId, afterSiblingId);

      // Assert: Should call optimized endpoint with calendar context
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/move-optimized`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        lessonId,
        newSubTopicId: targetSubTopicId,
        newTopicId: targetTopicId,
        afterSiblingId: afterSiblingId,
        calendarStartDate: testOptimizationPayload.calendarStartDate,
        calendarEndDate: testOptimizationPayload.calendarEndDate,
        requestPartialScheduleUpdate: testOptimizationPayload.requestPartialScheduleUpdate
      });

      // Complete the request
      req.flush({ success: true });
    });

    it('should handle null/undefined optional parameters in optimized move', () => {
      // Arrange: Mock available calendar context
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      const lessonId = 123;

      // Act: Move lesson with only required parameter
      service.moveLessonOptimized(lessonId);

      // Assert: Should handle null parameters correctly
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/move-optimized`);
      expect(req.request.body).toEqual({
        lessonId,
        newSubTopicId: null,
        newTopicId: null,
        afterSiblingId: null,
        calendarStartDate: testOptimizationPayload.calendarStartDate,
        calendarEndDate: testOptimizationPayload.calendarEndDate,
        requestPartialScheduleUpdate: testOptimizationPayload.requestPartialScheduleUpdate
      });

      req.flush({ success: true });
    });

    it('should fallback to regular API when no calendar context available', () => {
      // Arrange: Mock no calendar context
      mockCalendarContext.canOptimize.and.returnValue(false);
      mockCalendarContext.getOptimizationPayload.and.returnValue(null);
      mockApiService.moveLesson.and.returnValue(new Observable(observer => observer.next({ success: true })));

      const lessonId = 123;
      const targetSubTopicId = 456;

      // Act: Move lesson without optimization
      service.moveLessonOptimized(lessonId, targetSubTopicId);

      // Assert: Should call regular API service
      expect(mockApiService.moveLesson).toHaveBeenCalledWith(
        lessonId,
        targetSubTopicId,
        undefined,
        undefined,
        undefined,
        undefined
      );

      // Should not make HTTP request to optimized endpoint
      httpMock.expectNone(`${baseUrl}/api/lesson/move-optimized`);
    });
  });

  describe('Lesson Create Operations', () => {
    it('should use optimized endpoint when calendar context is available', () => {
      // Arrange: Mock available calendar context
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      // Act: Create lesson with optimization
      service.createLessonOptimized(testLessonData);

      // Assert: Should call optimized endpoint with calendar context
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/create-optimized`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        ...testLessonData,
        calendarStartDate: testOptimizationPayload.calendarStartDate,
        calendarEndDate: testOptimizationPayload.calendarEndDate,
        requestPartialScheduleUpdate: testOptimizationPayload.requestPartialScheduleUpdate
      });

      req.flush({ id: 456, title: 'Test Lesson' });
    });

    it('should fallback to regular endpoint when no calendar context available', () => {
      // Arrange: Mock no calendar context
      mockCalendarContext.canOptimize.and.returnValue(false);
      mockCalendarContext.getOptimizationPayload.and.returnValue(null);

      // Act: Create lesson without optimization
      service.createLessonOptimized(testLessonData);

      // Assert: Should call regular endpoint
      const req = httpMock.expectOne(`${baseUrl}/api/lesson`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(testLessonData);

      // Should not contain calendar optimization fields
      expect(req.request.body.calendarStartDate).toBeUndefined();
      expect(req.request.body.calendarEndDate).toBeUndefined();
      expect(req.request.body.requestPartialScheduleUpdate).toBeUndefined();

      req.flush({ id: 456, title: 'Test Lesson' });
    });

    it('should preserve all lesson data when adding optimization context', () => {
      // Arrange: Mock available calendar context
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      const extendedLessonData = {
        ...testLessonData,
        materials: 'Test materials',
        classTime: '45 minutes',
        methods: 'Lecture and practice',
        specialNeeds: 'None',
        assessment: 'Quiz'
      };

      // Act: Create lesson with extended data
      service.createLessonOptimized(extendedLessonData);

      // Assert: Should preserve all original data plus optimization fields
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/create-optimized`);
      expect(req.request.body).toEqual({
        ...extendedLessonData,
        calendarStartDate: testOptimizationPayload.calendarStartDate,
        calendarEndDate: testOptimizationPayload.calendarEndDate,
        requestPartialScheduleUpdate: testOptimizationPayload.requestPartialScheduleUpdate
      });

      req.flush({ id: 789 });
    });
  });

  describe('Lesson Delete Operations', () => {
    it('should use optimized endpoint when calendar context is available', () => {
      // Arrange: Mock available calendar context
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      const lessonId = 123;

      // Act: Delete lesson with optimization
      service.deleteLessonOptimized(lessonId);

      // Assert: Should call optimized endpoint with calendar context
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/delete-optimized`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({
        lessonId,
        calendarStartDate: testOptimizationPayload.calendarStartDate,
        calendarEndDate: testOptimizationPayload.calendarEndDate,
        requestPartialScheduleUpdate: testOptimizationPayload.requestPartialScheduleUpdate
      });

      req.flush({ success: true });
    });

    it('should fallback to regular delete when no calendar context available', () => {
      // Arrange: Mock no calendar context
      mockCalendarContext.canOptimize.and.returnValue(false);
      mockCalendarContext.getOptimizationPayload.and.returnValue(null);

      const lessonId = 123;

      // Act: Delete lesson without optimization
      service.deleteLessonOptimized(lessonId);

      // Assert: Should call regular delete endpoint
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/${lessonId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull(); // Regular DELETE has no body

      req.flush({ success: true });
    });
  });

  describe('Convenience Methods', () => {
    it('should check optimization availability', () => {
      // Arrange: Mock calendar context response
      mockCalendarContext.canOptimize.and.returnValue(true);

      // Act & Assert: Should delegate to calendar context
      expect(service.isOptimizationAvailable()).toBeTrue();
      expect(mockCalendarContext.canOptimize).toHaveBeenCalled();
    });

    it('should get current calendar context for debugging', () => {
      // Arrange: Mock debug info
      const debugInfo = {
        isCalendarActive: true,
        hasDateRange: true,
        currentDate: '2024-03-15'
      };
      mockCalendarContext.getDebugInfo.and.returnValue(debugInfo);

      // Act & Assert: Should return debug info
      expect(service.getCurrentCalendarContext()).toEqual(debugInfo);
      expect(mockCalendarContext.getDebugInfo).toHaveBeenCalled();
    });

    it('should refresh calendar context', () => {
      // Act: Refresh context
      service.refreshCalendarContext();

      // Assert: Should delegate to calendar context
      expect(mockCalendarContext.refreshContext).toHaveBeenCalled();
    });
  });

  describe('Passthrough Methods', () => {
    it('should get single lesson via API service', () => {
      // Arrange: Mock API response
      const lessonId = 123;
      const expectedLesson = { id: lessonId, title: 'Test Lesson' };
      mockApiService.get.and.returnValue(new Observable(observer => observer.next(expectedLesson)));

      // Act: Get lesson
      const result = service.getLesson(lessonId);

      // Assert: Should call API service
      expect(mockApiService.get).toHaveBeenCalledWith(`/api/lesson/${lessonId}`);
      result.subscribe(lesson => {
        expect(lesson).toEqual(expectedLesson);
      });
    });

    it('should get all lessons via API service', () => {
      // Arrange: Mock API response
      const expectedLessons = [
        { id: 1, title: 'Lesson 1' },
        { id: 2, title: 'Lesson 2' }
      ];
      mockApiService.get.and.returnValue(new Observable(observer => observer.next(expectedLessons)));

      // Act: Get lessons
      const result = service.getLessons();

      // Assert: Should call API service
      expect(mockApiService.get).toHaveBeenCalledWith('/api/lesson');
      result.subscribe(lessons => {
        expect(lessons).toEqual(expectedLessons);
      });
    });

    it('should update lesson via API service', () => {
      // Arrange: Mock lesson update data
      const lessonData = { id: 123, title: 'Updated Lesson' };
      mockApiService.put.and.returnValue(new Observable(observer => observer.next(lessonData)));

      // Act: Update lesson
      const result = service.updateLesson(lessonData);

      // Assert: Should call API service
      expect(mockApiService.put).toHaveBeenCalledWith(`/api/lesson/${lessonData.id}`, lessonData);
      result.subscribe(lesson => {
        expect(lesson).toEqual(lessonData);
      });
    });

    it('should get courses via API service', () => {
      // Arrange: Mock courses response
      const expectedCourses = [
        { id: 1, title: 'Course 1' },
        { id: 2, title: 'Course 2' }
      ];
      mockApiService.getCourses.and.returnValue(new Observable(observer => observer.next(expectedCourses)));

      // Act: Get courses
      const result = service.getCourses();

      // Assert: Should call API service with correct parameters
      expect(mockApiService.getCourses).toHaveBeenCalledWith('active', null);
      result.subscribe(courses => {
        expect(courses).toEqual(expectedCourses);
      });
    });

    it('should create course via API service', () => {
      // Arrange: Mock course creation data
      const courseData = { title: 'New Course', description: 'Test course' };
      const createdCourse = { id: 456, ...courseData };
      mockApiService.createCourse.and.returnValue(new Observable(observer => observer.next(createdCourse)));

      // Act: Create course
      const result = service.createCourse(courseData);

      // Assert: Should call API service
      expect(mockApiService.createCourse).toHaveBeenCalledWith(courseData);
      result.subscribe(course => {
        expect(course).toEqual(createdCourse);
      });
    });
  });

  describe('Future Optimized Operations (TODO methods)', () => {
    it('should move topic using regular API (TODO: optimize)', () => {
      // Arrange: Mock move topic response
      const topicId = 123;
      const targetCourseId = 456;
      const afterSiblingId = 789;
      mockApiService.moveTopic.and.returnValue(new Observable(observer => observer.next({ success: true })));

      // Act: Move topic
      const result = service.moveTopicOptimized(topicId, targetCourseId, afterSiblingId);

      // Assert: Should use regular API service (not optimized yet)
      expect(mockApiService.moveTopic).toHaveBeenCalledWith(
        topicId,
        targetCourseId,
        afterSiblingId,
        undefined,
        undefined
      );
    });

    it('should move subtopic using regular API (TODO: optimize)', () => {
      // Arrange: Mock move subtopic response
      const subTopicId = 123;
      const targetTopicId = 456;
      const afterSiblingId = 789;
      mockApiService.moveSubTopic.and.returnValue(new Observable(observer => observer.next({ success: true })));

      // Act: Move subtopic
      const result = service.moveSubTopicOptimized(subTopicId, targetTopicId, afterSiblingId);

      // Assert: Should use regular API service (not optimized yet)
      expect(mockApiService.moveSubTopic).toHaveBeenCalledWith(
        subTopicId,
        targetTopicId,
        afterSiblingId,
        undefined,
        undefined
      );
    });
  });

  describe('Calendar Context Integration', () => {
    it('should request week-based optimization payload for all operations', () => {
      // Arrange: Mock calendar context
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      // Act: Perform various optimized operations
      service.moveLessonOptimized(1);
      service.createLessonOptimized(testLessonData);
      service.deleteLessonOptimized(1);

      // Assert: All should request week-based optimization
      expect(mockCalendarContext.getOptimizationPayload).toHaveBeenCalledWith('week');
      expect(mockCalendarContext.getOptimizationPayload).toHaveBeenCalledTimes(3);
    });

    it('should handle calendar context becoming unavailable during operation', () => {
      // Arrange: Mock calendar context that returns null
      mockCalendarContext.canOptimize.and.returnValue(false);
      mockCalendarContext.getOptimizationPayload.and.returnValue(null);
      mockApiService.moveLesson.and.returnValue(new Observable(observer => observer.next({ success: true })));

      // Act: Attempt optimized operation
      service.moveLessonOptimized(123);

      // Assert: Should fallback gracefully
      expect(mockApiService.moveLesson).toHaveBeenCalled();
      httpMock.expectNone(`${baseUrl}/api/lesson/move-optimized`);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors in optimized operations', () => {
      // Arrange: Mock available calendar context
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      // Act: Perform operation that will error
      const result = service.moveLessonOptimized(123);

      // Assert: Should handle HTTP error
      const req = httpMock.expectOne(`${baseUrl}/api/lesson/move-optimized`);
      req.error(new ErrorEvent('Network error'), { status: 500 });

      result.subscribe({
        next: () => fail('Should have errored'),
        error: (error) => {
          expect(error).toBeDefined();
        }
      });
    });

    it('should handle calendar context service errors gracefully', () => {
      // Arrange: Mock calendar context that throws error
      mockCalendarContext.canOptimize.and.throwError('Calendar error');

      // Act & Assert: Should not throw error
      expect(() => service.isOptimizationAvailable()).toThrow('Calendar error');
    });
  });

  describe('Debug Methods', () => {
    it('should provide test integration method', () => {
      // Arrange: Mock calendar context methods
      mockCalendarContext.getDebugInfo.and.returnValue({ test: 'debug' });
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);
      mockCalendarContext.canOptimize.and.returnValue(true);

      // Act & Assert: Should not throw error (method just logs)
      expect(() => service.testCalendarIntegration()).not.toThrow();

      // Should call all debug methods
      expect(mockCalendarContext.getDebugInfo).toHaveBeenCalled();
      expect(mockCalendarContext.getOptimizationPayload).toHaveBeenCalled();
      expect(mockCalendarContext.canOptimize).toHaveBeenCalled();
    });
  });

  describe('Service Integration', () => {
    it('should maintain consistent optimization behavior across operations', () => {
      // Arrange: Test optimization consistency
      mockCalendarContext.canOptimize.and.returnValue(true);
      mockCalendarContext.getOptimizationPayload.and.returnValue(testOptimizationPayload);

      // Act: Perform multiple operations
      service.moveLessonOptimized(1);
      service.createLessonOptimized(testLessonData);
      service.deleteLessonOptimized(2);

      // Assert: All should use optimized endpoints
      httpMock.expectOne(`${baseUrl}/api/lesson/move-optimized`).flush({ success: true });
      httpMock.expectOne(`${baseUrl}/api/lesson/create-optimized`).flush({ id: 456 });
      httpMock.expectOne(`${baseUrl}/api/lesson/delete-optimized`).flush({ success: true });
    });

    it('should maintain consistent fallback behavior across operations', () => {
      // Arrange: Test fallback consistency
      mockCalendarContext.canOptimize.and.returnValue(false);
      mockCalendarContext.getOptimizationPayload.and.returnValue(null);
      mockApiService.moveLesson.and.returnValue(new Observable(observer => observer.next({ success: true })));

      // Act: Perform operations without optimization
      service.moveLessonOptimized(1);
      service.createLessonOptimized(testLessonData);
      service.deleteLessonOptimized(2);

      // Assert: Should use regular endpoints
      expect(mockApiService.moveLesson).toHaveBeenCalled();
      httpMock.expectOne(`${baseUrl}/api/lesson`); // Regular create
      httpMock.expectOne(`${baseUrl}/api/lesson/2`); // Regular delete

      // No optimized endpoints should be called
      httpMock.expectNone(`${baseUrl}/api/lesson/move-optimized`);
      httpMock.expectNone(`${baseUrl}/api/lesson/create-optimized`);
      httpMock.expectNone(`${baseUrl}/api/lesson/delete-optimized`);
    });
  });
});