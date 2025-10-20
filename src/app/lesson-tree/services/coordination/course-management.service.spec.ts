// course-management.service.spec.ts
// Comprehensive unit tests for CourseManagementService - Course coordination and management logic
// Tests course selection, availability, loading coordination, validation, and state management

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CourseManagementService } from './course-management.service';
import { CourseDataService } from '../course-data/course-data.service';
import { ApiService } from '../../../shared/services/api.service';
import { EntitySelectionService } from '../state/entity-selection.service';
import { Course } from '../../../models/course';

describe('CourseManagementService', () => {
  let service: CourseManagementService;
  let courseDataServiceSpy: jasmine.SpyObj<CourseDataService>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let entitySelectionServiceSpy: jasmine.SpyObj<EntitySelectionService>;

  // Test data fixtures
  const mockCourses: Course[] = [
    {
      id: 1,
      title: 'Active Course 1',
      description: 'Active course description',
      visibility: 'Private',
      archived: false,
      topics: []
    } as Course,
    {
      id: 2,
      title: 'Active Course 2',
      description: 'Another active course',
      visibility: 'Private',
      archived: false,
      topics: []
    } as Course,
    {
      id: 3,
      title: 'Archived Course',
      description: 'Archived course description',
      visibility: 'Private',
      archived: true,
      topics: []
    } as Course
  ];

  const activeCourses = mockCourses.filter(c => !c.archived);
  const archivedCourses = mockCourses.filter(c => c.archived);

  const mockSelectedEntity = {
    id: 1,
    entityType: 'Course' as const
  };

  const mockSelectedNonCourseEntity = {
    id: 5,
    entityType: 'Topic' as const
  };

  beforeEach(() => {
    const courseDataServiceSpyObj = jasmine.createSpyObj('CourseDataService', [
      'activeCourses',
      'courses',
      'getCourseById',
      'setCourses'
    ]);

    const apiServiceSpyObj = jasmine.createSpyObj('ApiService', [
      'getCourses'
    ]);

    const entitySelectionServiceSpyObj = jasmine.createSpyObj('EntitySelectionService', [
      'selectById',
      'hasSelection',
      'selectedEntity'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CourseManagementService,
        { provide: CourseDataService, useValue: courseDataServiceSpyObj },
        { provide: ApiService, useValue: apiServiceSpyObj },
        { provide: EntitySelectionService, useValue: entitySelectionServiceSpyObj }
      ]
    });

    service = TestBed.inject(CourseManagementService);
    courseDataServiceSpy = TestBed.inject(CourseDataService) as jasmine.SpyObj<CourseDataService>;
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    entitySelectionServiceSpy = TestBed.inject(EntitySelectionService) as jasmine.SpyObj<EntitySelectionService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = new CourseManagementService(
        courseDataServiceSpy,
        apiServiceSpy,
        entitySelectionServiceSpy
      );
      expect(console.log).toHaveBeenCalledWith(
        '[CourseManagementService] Service initialized for course management coordination'
      );
    });
  });

  describe('Course Availability and Selection', () => {
    describe('getFirstAvailableCourse()', () => {
      it('should return first active course when courses are available', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        const result = service.getFirstAvailableCourse();

        expect(result).toEqual(activeCourses[0]);
        expect(courseDataServiceSpy.activeCourses).toHaveBeenCalled();
      });

      it('should return null when no active courses are available', () => {
        courseDataServiceSpy.activeCourses.and.returnValue([]);

        const result = service.getFirstAvailableCourse();

        expect(result).toBeNull();
      });

      it('should log course availability details', () => {
        spyOn(console, 'log');
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        service.getFirstAvailableCourse();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] First available course:',
          {
            id: 1,
            title: 'Active Course 1',
            totalActive: 2
          }
        );
      });

      it('should log warning when no courses available', () => {
        spyOn(console, 'warn');
        courseDataServiceSpy.activeCourses.and.returnValue([]);

        service.getFirstAvailableCourse();

        expect(console.warn).toHaveBeenCalledWith(
          '[CourseManagementService] No active courses available for default selection'
        );
      });
    });

    describe('selectFirstAvailableCourse()', () => {
      it('should select first available course with default source', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        const result = service.selectFirstAvailableCourse();

        expect(result).toBe(true);
        expect(entitySelectionServiceSpy.selectById).toHaveBeenCalledWith(
          1,
          'Course',
          'programmatic'
        );
      });

      it('should select first available course with calendar source', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        const result = service.selectFirstAvailableCourse('calendar');

        expect(result).toBe(true);
        expect(entitySelectionServiceSpy.selectById).toHaveBeenCalledWith(
          1,
          'Course',
          'calendar'
        );
      });

      it('should return false when no courses available', () => {
        courseDataServiceSpy.activeCourses.and.returnValue([]);

        const result = service.selectFirstAvailableCourse();

        expect(result).toBe(false);
        expect(entitySelectionServiceSpy.selectById).not.toHaveBeenCalled();
      });

      it('should log selection details on success', () => {
        spyOn(console, 'log');
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        service.selectFirstAvailableCourse('calendar');

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Selected first available course:',
          {
            courseId: 1,
            courseTitle: 'Active Course 1',
            source: 'calendar',
            availableCourses: 2
          }
        );
      });

      it('should log warning when selection fails', () => {
        spyOn(console, 'warn');
        courseDataServiceSpy.activeCourses.and.returnValue([]);

        service.selectFirstAvailableCourse();

        expect(console.warn).toHaveBeenCalledWith(
          '[CourseManagementService] Cannot select first course - no courses available'
        );
      });
    });

    describe('hasCoursesAvailable()', () => {
      it('should return true when active courses exist', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        const result = service.hasCoursesAvailable();

        expect(result).toBe(true);
      });

      it('should return false when no active courses exist', () => {
        courseDataServiceSpy.activeCourses.and.returnValue([]);

        const result = service.hasCoursesAvailable();

        expect(result).toBe(false);
      });

      it('should log availability check details', () => {
        spyOn(console, 'log');
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        service.hasCoursesAvailable();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Course availability check:',
          {
            totalActive: 2,
            coursesAvailable: true
          }
        );
      });
    });

    describe('getActiveCourseCount()', () => {
      it('should return count of active courses', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        const result = service.getActiveCourseCount();

        expect(result).toBe(2);
      });

      it('should return 0 when no active courses', () => {
        courseDataServiceSpy.activeCourses.and.returnValue([]);

        const result = service.getActiveCourseCount();

        expect(result).toBe(0);
      });
    });
  });

  describe('Course Retrieval and Safety', () => {
    describe('getCourseByIdSafely()', () => {
      it('should return course when found', () => {
        const expectedCourse = activeCourses[0];
        courseDataServiceSpy.getCourseById.and.returnValue(expectedCourse);

        const result = service.getCourseByIdSafely(1);

        expect(result).toEqual(expectedCourse);
        expect(courseDataServiceSpy.getCourseById).toHaveBeenCalledWith(1);
      });

      it('should return undefined when course not found', () => {
        courseDataServiceSpy.getCourseById.and.returnValue(null);

        const result = service.getCourseByIdSafely(999);

        expect(result).toBeUndefined();
      });

      it('should log warning when course not found', () => {
        spyOn(console, 'warn');
        courseDataServiceSpy.getCourseById.and.returnValue(null);

        service.getCourseByIdSafely(999);

        expect(console.warn).toHaveBeenCalledWith(
          '[CourseManagementService] Course not found:',
          999
        );
      });

      it('should handle null return from data service', () => {
        courseDataServiceSpy.getCourseById.and.returnValue(null);

        const result = service.getCourseByIdSafely(1);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Course Selection Validation', () => {
    describe('validateCourseSelection()', () => {
      it('should validate successful course selection', () => {
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);
        courseDataServiceSpy.getCourseById.and.returnValue(activeCourses[0]);

        const result = service.validateCourseSelection();

        expect(result.isValid).toBe(true);
        expect(result.courseId).toBe(1);
        expect(result.course).toEqual(activeCourses[0]);
        expect(result.error).toBeUndefined();
      });

      it('should handle no selection', () => {
        entitySelectionServiceSpy.selectedEntity.and.returnValue(null);

        const result = service.validateCourseSelection();

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('No course selected');
      });

      it('should handle non-course selection', () => {
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedNonCourseEntity);

        const result = service.validateCourseSelection();

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Selected node is Topic, not Course');
      });

      it('should handle selected course not found in data', () => {
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);
        courseDataServiceSpy.getCourseById.and.returnValue(null);

        const result = service.validateCourseSelection();

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Selected course not found in data');
      });

      it('should warn about archived course but still validate', () => {
        spyOn(console, 'warn');
        const archivedCourse = archivedCourses[0];
        entitySelectionServiceSpy.selectedEntity.and.returnValue({ id: 3, entityType: 'Course' });
        courseDataServiceSpy.getCourseById.and.returnValue(archivedCourse);

        const result = service.validateCourseSelection();

        expect(result.isValid).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
          '[CourseManagementService] Selected course is archived:',
          3
        );
      });

      it('should log validation details', () => {
        spyOn(console, 'log');
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);
        courseDataServiceSpy.getCourseById.and.returnValue(activeCourses[0]);

        service.validateCourseSelection();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Course selection validation:',
          {
            isValid: true,
            courseId: 1,
            courseTitle: 'Active Course 1',
            error: undefined,
            hasSelection: true,
            entityType: 'Course'
          }
        );
      });
    });
  });

  describe('Course Loading with Selection', () => {
    describe('loadCoursesAndSelectFirst()', () => {
      it('should load courses and auto-select first when no selection exists', () => {
        apiServiceSpy.getCourses.and.returnValue(of(activeCourses));
        entitySelectionServiceSpy.hasSelection.and.returnValue(false);
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        service.loadCoursesAndSelectFirst('active', 'private', true, 'calendar').subscribe(courses => {
          expect(courses).toEqual(activeCourses);
        });

        expect(apiServiceSpy.getCourses).toHaveBeenCalledWith('active', 'private');
        expect(courseDataServiceSpy.setCourses).toHaveBeenCalledWith(activeCourses, 'initialization');
        expect(entitySelectionServiceSpy.selectById).toHaveBeenCalledWith(1, 'Course', 'calendar');
      });

      it('should load courses but not auto-select when selection exists', () => {
        apiServiceSpy.getCourses.and.returnValue(of(activeCourses));
        entitySelectionServiceSpy.hasSelection.and.returnValue(true);

        service.loadCoursesAndSelectFirst('active', 'private', true, 'programmatic').subscribe();

        expect(entitySelectionServiceSpy.selectById).not.toHaveBeenCalled();
      });

      it('should load courses with auto-select disabled', () => {
        apiServiceSpy.getCourses.and.returnValue(of(activeCourses));
        entitySelectionServiceSpy.hasSelection.and.returnValue(false);

        service.loadCoursesAndSelectFirst('active', 'private', false).subscribe();

        expect(entitySelectionServiceSpy.selectById).not.toHaveBeenCalled();
      });

      it('should handle empty course list', () => {
        apiServiceSpy.getCourses.and.returnValue(of([]));
        entitySelectionServiceSpy.hasSelection.and.returnValue(false);

        service.loadCoursesAndSelectFirst().subscribe();

        expect(entitySelectionServiceSpy.selectById).not.toHaveBeenCalled();
      });

      it('should use default parameters', () => {
        apiServiceSpy.getCourses.and.returnValue(of(activeCourses));

        service.loadCoursesAndSelectFirst().subscribe();

        expect(apiServiceSpy.getCourses).toHaveBeenCalledWith('active', 'private');
      });

      it('should handle archived and team visibility filters', () => {
        apiServiceSpy.getCourses.and.returnValue(of(mockCourses));

        service.loadCoursesAndSelectFirst('archived', 'team').subscribe();

        expect(apiServiceSpy.getCourses).toHaveBeenCalledWith('archived', 'team');
      });

      it('should handle both course filter', () => {
        apiServiceSpy.getCourses.and.returnValue(of(mockCourses));

        service.loadCoursesAndSelectFirst('both', 'private').subscribe();

        expect(apiServiceSpy.getCourses).toHaveBeenCalledWith('both', 'private');
      });

      it('should log loading options and results', () => {
        spyOn(console, 'log');
        apiServiceSpy.getCourses.and.returnValue(of(activeCourses));
        entitySelectionServiceSpy.hasSelection.and.returnValue(false);
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        service.loadCoursesAndSelectFirst('active', 'team', true, 'calendar').subscribe();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Loading courses with options:',
          {
            courseFilter: 'active',
            visibilityFilter: 'team',
            autoSelectFirst: true,
            selectionSource: 'calendar'
          }
        );
        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Courses loaded successfully:',
          {
            coursesLoaded: 2,
            courseFilter: 'active',
            visibilityFilter: 'team'
          }
        );
      });

      it('should handle API errors', () => {
        spyOn(console, 'error');
        const error = new Error('API Error');
        apiServiceSpy.getCourses.and.returnValue(throwError(() => error));

        service.loadCoursesAndSelectFirst().subscribe({
          error: (err) => {
            expect(err).toEqual(error);
          }
        });

        expect(console.error).toHaveBeenCalledWith(
          '[CourseManagementService] Course loading failed:',
          error
        );
      });
    });
  });

  describe('Course Information Queries', () => {
    describe('getCourseInfo()', () => {
      it('should return course info when course exists', () => {
        const course = activeCourses[0];
        courseDataServiceSpy.getCourseById.and.returnValue(course);

        const result = service.getCourseInfo(1);

        expect(result).toEqual({
          exists: true,
          course: course,
          title: 'Active Course 1',
          isActive: true
        });
      });

      it('should return exists false when course not found', () => {
        courseDataServiceSpy.getCourseById.and.returnValue(null);

        const result = service.getCourseInfo(999);

        expect(result).toEqual({ exists: false });
      });

      it('should identify archived course correctly', () => {
        const archivedCourse = archivedCourses[0];
        courseDataServiceSpy.getCourseById.and.returnValue(archivedCourse);

        const result = service.getCourseInfo(3);

        expect(result.isActive).toBe(false);
      });
    });

    describe('isCourseActiveAndAvailable()', () => {
      it('should return true for active course', () => {
        courseDataServiceSpy.getCourseById.and.returnValue(activeCourses[0]);

        const result = service.isCourseActiveAndAvailable(1);

        expect(result).toBe(true);
      });

      it('should return false for archived course', () => {
        courseDataServiceSpy.getCourseById.and.returnValue(archivedCourses[0]);

        const result = service.isCourseActiveAndAvailable(3);

        expect(result).toBe(false);
      });

      it('should return false for non-existent course', () => {
        courseDataServiceSpy.getCourseById.and.returnValue(null);

        const result = service.isCourseActiveAndAvailable(999);

        expect(result).toBe(false);
      });

      it('should log availability check details', () => {
        spyOn(console, 'log');
        courseDataServiceSpy.getCourseById.and.returnValue(activeCourses[0]);

        service.isCourseActiveAndAvailable(1);

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Course active status check:',
          {
            courseId: 1,
            courseTitle: 'Active Course 1',
            exists: true,
            isActive: true
          }
        );
      });
    });

    describe('getActiveCoursesForSelection()', () => {
      it('should return active courses for selection', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);

        const result = service.getActiveCoursesForSelection();

        expect(result).toEqual(activeCourses);
        expect(courseDataServiceSpy.activeCourses).toHaveBeenCalled();
      });
    });

    describe('getCourseStatistics()', () => {
      it('should return course statistics with course selection', () => {
        courseDataServiceSpy.courses.and.returnValue(mockCourses);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);

        const result = service.getCourseStatistics();

        expect(result).toEqual({
          totalActive: 2,
          totalArchived: 1,
          hasSelection: true,
          selectedCourseId: 1
        });
      });

      it('should return course statistics without selection', () => {
        courseDataServiceSpy.courses.and.returnValue(mockCourses);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(null);

        const result = service.getCourseStatistics();

        expect(result).toEqual({
          totalActive: 2,
          totalArchived: 1,
          hasSelection: false,
          selectedCourseId: undefined
        });
      });

      it('should return course statistics with non-course selection', () => {
        courseDataServiceSpy.courses.and.returnValue(mockCourses);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedNonCourseEntity);

        const result = service.getCourseStatistics();

        expect(result).toEqual({
          totalActive: 2,
          totalArchived: 1,
          hasSelection: false,
          selectedCourseId: undefined
        });
      });

      it('should log computed statistics', () => {
        spyOn(console, 'log');
        courseDataServiceSpy.courses.and.returnValue(mockCourses);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);

        const stats = service.getCourseStatistics();

        expect(console.log).toHaveBeenCalledWith(
          '[CourseManagementService] Course statistics computed:',
          stats
        );
      });
    });
  });

  describe('Debug and Utility Methods', () => {
    describe('getDebugInfo()', () => {
      it('should return comprehensive debug information', () => {
        // Setup all dependencies
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);
        courseDataServiceSpy.courses.and.returnValue(mockCourses);
        courseDataServiceSpy.getCourseById.and.returnValue(activeCourses[0]);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);

        const result = service.getDebugInfo();

        expect(result).toEqual({
          courseManagement: {
            coursesAvailable: true,
            activeCourseCount: 2,
            firstAvailableCourse: {
              id: 1,
              title: 'Active Course 1'
            }
          },
          statistics: {
            totalActive: 2,
            totalArchived: 1,
            hasSelection: true,
            selectedCourseId: 1
          },
          currentSelection: {
            isValid: true,
            courseId: 1,
            courseTitle: 'Active Course 1',
            error: undefined
          },
          serviceArchitecture: {
            delegates: ['CourseDataService', 'NodeSelectionService', 'ApiService'],
            responsibilities: ['Course selection', 'Availability management', 'Loading coordination'],
            hasObservableEvents: false
          }
        });
      });

      it('should handle debug info with no courses available', () => {
        courseDataServiceSpy.activeCourses.and.returnValue([]);
        courseDataServiceSpy.courses.and.returnValue([]);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(null);

        const result = service.getDebugInfo();

        expect(result.courseManagement.coursesAvailable).toBe(false);
        expect(result.courseManagement.activeCourseCount).toBe(0);
        expect(result.courseManagement.firstAvailableCourse).toBeNull();
        expect(result.currentSelection.isValid).toBe(false);
      });

      it('should handle debug info with invalid selection', () => {
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);
        courseDataServiceSpy.courses.and.returnValue(mockCourses);
        courseDataServiceSpy.getCourseById.and.returnValue(null);
        entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);

        const result = service.getDebugInfo();

        expect(result.currentSelection.isValid).toBe(false);
        expect(result.currentSelection.error).toBe('Selected course not found in data');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined course arrays', () => {
      courseDataServiceSpy.activeCourses.and.returnValue(null as any);

      expect(() => service.hasCoursesAvailable()).not.toThrow();
      expect(service.hasCoursesAvailable()).toBe(false);
    });

    it('should handle undefined course arrays', () => {
      courseDataServiceSpy.activeCourses.and.returnValue(undefined as any);

      expect(() => service.getActiveCourseCount()).not.toThrow();
      expect(service.getActiveCourseCount()).toBe(0);
    });

    it('should handle courses with missing properties', () => {
      const incompleteCourse = { id: 1 } as Course;
      courseDataServiceSpy.getCourseById.and.returnValue(incompleteCourse);

      const result = service.getCourseInfo(1);

      expect(result.exists).toBe(true);
      expect(result.course).toEqual(incompleteCourse);
    });

    it('should handle selection validation with missing entity properties', () => {
      const incompleteEntity = { id: undefined, entityType: 'Course' };
      entitySelectionServiceSpy.selectedEntity.and.returnValue(incompleteEntity as any);

      const result = service.validateCourseSelection();

      expect(result.isValid).toBe(false);
    });

    it('should handle statistics computation with empty arrays', () => {
      courseDataServiceSpy.courses.and.returnValue([]);
      entitySelectionServiceSpy.selectedEntity.and.returnValue(null);

      const result = service.getCourseStatistics();

      expect(result.totalActive).toBe(0);
      expect(result.totalArchived).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete course loading and selection workflow', () => {
      // Setup initial state - no courses loaded, no selection
      courseDataServiceSpy.activeCourses.and.returnValue([]);
      entitySelectionServiceSpy.hasSelection.and.returnValue(false);

      // API returns courses
      apiServiceSpy.getCourses.and.returnValue(of(activeCourses));

      // After loading, courses become available
      let loadingComplete = false;
      service.loadCoursesAndSelectFirst('active', 'private', true, 'programmatic').subscribe(() => {
        loadingComplete = true;
        // Simulate courses now being available after loading
        courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);
      });

      expect(loadingComplete).toBe(true);
      expect(apiServiceSpy.getCourses).toHaveBeenCalledWith('active', 'private');
      expect(courseDataServiceSpy.setCourses).toHaveBeenCalledWith(activeCourses, 'initialization');
    });

    it('should handle course validation workflow', () => {
      // Validate courses are available
      courseDataServiceSpy.activeCourses.and.returnValue(activeCourses);
      expect(service.hasCoursesAvailable()).toBe(true);

      // Get first available course
      const firstCourse = service.getFirstAvailableCourse();
      expect(firstCourse).toEqual(activeCourses[0]);

      // Select the course
      const selectionResult = service.selectFirstAvailableCourse('calendar');
      expect(selectionResult).toBe(true);

      // Validate selection
      entitySelectionServiceSpy.selectedEntity.and.returnValue(mockSelectedEntity);
      courseDataServiceSpy.getCourseById.and.returnValue(activeCourses[0]);
      const validation = service.validateCourseSelection();
      expect(validation.isValid).toBe(true);
    });
  });
});