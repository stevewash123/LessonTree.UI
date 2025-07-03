// **COMPLETE FILE** - CourseManagementService with Observable Events - FIXED
// RESPONSIBILITY: Course selection, availability, and high-level management operations with cross-component event coordination
// DOES NOT: Handle CRUD operations, data state, or API calls directly - delegates to appropriate services
// CALLED BY: Calendar components and other services for course management logic

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { Course } from '../../../models/course';
import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';
import { NodeSelectionService } from '../node-operations/node-selection.service';

// ✅ FIXED: Single CourseManagementEvent interface with union source type
export interface CourseManagementEvent {
  operationType: 'course-selected' | 'first-course-selected' | 'course-validation' | 'course-loading-completed' | 'selection-failed';
  courseId: number | null;
  courseTitle: string | null;
  source: 'calendar' | 'programmatic' | 'course-management';
  success: boolean;
  availableCourses: number;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

export interface CourseAvailabilityEvent {
  availabilityType: 'courses-loaded' | 'availability-checked' | 'statistics-computed' | 'first-course-determined';
  totalActive: number;
  totalArchived: number;
  hasSelection: boolean;
  selectedCourseId: number | null;
  firstAvailableCourseId: number | null;
  coursesAvailable: boolean;
  source: 'course-management';
  timestamp: Date;
}

export interface CourseValidationEvent {
  validationType: 'selection-context' | 'course-active-status' | 'course-existence';
  courseId: number | null;
  courseTitle: string | null;
  isValid: boolean;
  validationDetails: {
    hasSelection?: boolean;
    isCorrectType?: boolean;
    courseExists?: boolean;
    isActive?: boolean;
  };
  errors: string[];
  source: 'course-management';
  timestamp: Date;
}

export interface CourseLoadingEvent {
  loadingType: 'courses-requested' | 'courses-loaded' | 'auto-selection-attempted' | 'loading-failed';
  courseFilter: 'active' | 'archived' | 'both';
  visibilityFilter: 'private' | 'team';
  coursesLoaded: number;
  autoSelectFirst: boolean;
  selectionAttempted: boolean;
  selectionSuccessful: boolean;
  errors: string[];
  source: 'course-management';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CourseManagementService implements OnDestroy {

  // ✅ Observable events for cross-component coordination
  private readonly _courseManagement$ = new Subject<CourseManagementEvent>();
  private readonly _courseAvailability$ = new Subject<CourseAvailabilityEvent>();
  private readonly _courseValidation$ = new Subject<CourseValidationEvent>();
  private readonly _courseLoading$ = new Subject<CourseLoadingEvent>();

  // Public observables for business logic subscriptions
  readonly courseManagement$ = this._courseManagement$.asObservable();
  readonly courseAvailability$ = this._courseAvailability$.asObservable();
  readonly courseValidation$ = this._courseValidation$.asObservable();
  readonly courseLoading$ = this._courseLoading$.asObservable();

  constructor(
    private courseDataService: CourseDataService,
    private apiService: ApiService,
    private nodeSelectionService: NodeSelectionService
  ) {
    console.log('[CourseManagementService] Initialized with Observable events for course management coordination');
  }

  // === ENHANCED COURSE AVAILABILITY AND SELECTION ===

  /**
   * ✅ ENHANCED: Get the first available active course with Observable event emission
   */
  getFirstAvailableCourse(): Course | null {
    const activeCourses = this.courseDataService.activeCourses();

    if (activeCourses.length === 0) {
      console.warn('[CourseManagementService] No active courses available for default selection');

      // ✅ Emit availability event for no courses
      this._courseAvailability$.next({
        availabilityType: 'first-course-determined',
        totalActive: 0,
        totalArchived: this.courseDataService.courses().filter((c: Course) => c.archived).length,
        hasSelection: this.nodeSelectionService.hasSelection(),
        selectedCourseId: null,
        firstAvailableCourseId: null,
        coursesAvailable: false,
        source: 'course-management',
        timestamp: new Date()
      });

      console.log('🚨 [CourseManagementService] EMITTED courseAvailability event:', 'first-course-determined');
      return null;
    }

    const firstCourse = activeCourses[0];

    // ✅ Emit availability event for first course found
    this._courseAvailability$.next({
      availabilityType: 'first-course-determined',
      totalActive: activeCourses.length,
      totalArchived: this.courseDataService.courses().filter((c: Course) => c.archived).length,
      hasSelection: this.nodeSelectionService.hasSelection(),
      selectedCourseId: this.nodeSelectionService.activeCourseId(),
      firstAvailableCourseId: firstCourse.id,
      coursesAvailable: true,
      source: 'course-management',
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseAvailability event:', 'first-course-determined');
    return firstCourse;
  }

  /**
   * ✅ ENHANCED: Select the first available course with Observable event emission
   */
  selectFirstAvailableCourse(selectionSource: 'calendar' | 'programmatic' = 'programmatic'): boolean {
    const firstCourse = this.getFirstAvailableCourse();

    if (!firstCourse) {
      console.warn('[CourseManagementService] Cannot select first course - no courses available');

      // ✅ FIXED: Use selectionSource instead of source
      this._courseManagement$.next({
        operationType: 'selection-failed',
        courseId: null,
        courseTitle: null,
        source: selectionSource,
        success: false,
        availableCourses: 0,
        errors: ['No courses available for selection'],
        warnings: [],
        timestamp: new Date()
      });

      console.log('🚨 [CourseManagementService] EMITTED courseManagement event:', 'selection-failed');
      return false;
    }

    this.nodeSelectionService.selectById(firstCourse.id, 'Course', selectionSource);

    // ✅ FIXED: Use selectionSource instead of source
    this._courseManagement$.next({
      operationType: 'first-course-selected',
      courseId: firstCourse.id,
      courseTitle: firstCourse.title,
      source: selectionSource,
      success: true,
      availableCourses: this.courseDataService.activeCourses().length,
      errors: [],
      warnings: [],
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseManagement event:', 'first-course-selected');
    return true;
  }

  /**
   * ✅ ENHANCED: Check if courses are available with Observable event emission
   */
  hasCoursesAvailable(): boolean {
    const activeCourses = this.courseDataService.activeCourses();
    const coursesAvailable = activeCourses.length > 0;

    // ✅ Emit availability checked event
    this._courseAvailability$.next({
      availabilityType: 'availability-checked',
      totalActive: activeCourses.length,
      totalArchived: this.courseDataService.courses().filter((c: Course) => c.archived).length,
      hasSelection: this.nodeSelectionService.hasSelection(),
      selectedCourseId: this.nodeSelectionService.activeCourseId(),
      firstAvailableCourseId: activeCourses.length > 0 ? activeCourses[0].id : null,
      coursesAvailable,
      source: 'course-management',
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseAvailability event:', 'availability-checked');
    return coursesAvailable;
  }

  /**
   * Get course count for display/logging
   */
  getActiveCourseCount(): number {
    return this.courseDataService.activeCourses().length;
  }

  /**
   * ✅ FIXED: Get course by ID with proper null handling
   */
  getCourseByIdSafely(courseId: number): Course | undefined {
    const course = this.courseDataService.getCourseById(courseId);

    if (!course) {
      console.warn('[CourseManagementService] Course not found:', courseId);
    }

    return course || undefined;
  }

  /**
   * ✅ ENHANCED: Validate course selection context with Observable event emission
   */
  validateCourseSelection(): { isValid: boolean; courseId?: number; course?: Course; error?: string } {
    const selectedNode = this.nodeSelectionService.selectedNode();
    const errors: string[] = [];
    let isValid = true;
    let courseId: number | undefined;
    let course: Course | undefined;
    let error: string | undefined;

    const validationDetails = {
      hasSelection: !!selectedNode,
      isCorrectType: selectedNode?.nodeType === 'Course',
      courseExists: false,
      isActive: false
    };

    if (!selectedNode) {
      isValid = false;
      error = 'No course selected';
      errors.push(error);
    } else if (selectedNode.nodeType !== 'Course') {
      isValid = false;
      error = `Selected node is ${selectedNode.nodeType}, not Course`;
      errors.push(error);
    } else {
      courseId = selectedNode.id;
      course = this.getCourseByIdSafely(courseId);
      validationDetails.courseExists = !!course;

      if (!course) {
        isValid = false;
        error = 'Selected course not found in data';
        errors.push(error);
      } else {
        validationDetails.isActive = !course.archived;
        if (course.archived) {
          errors.push('Selected course is archived');
        }
      }
    }

    // ✅ Emit selection context validation event
    this._courseValidation$.next({
      validationType: 'selection-context',
      courseId: courseId || null,
      courseTitle: course?.title || null,
      isValid,
      validationDetails,
      errors,
      source: 'course-management',
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseValidation event:', 'selection-context');

    return {
      isValid,
      courseId,
      course,
      error
    };
  }

  // === ENHANCED COURSE LOADING WITH SELECTION ===

  /**
   * ✅ ENHANCED: Load courses and optionally select first with Observable event emission
   */
  loadCoursesAndSelectFirst(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private',
    autoSelectFirst: boolean = true,
    selectionSource: 'calendar' | 'programmatic' = 'programmatic'
  ): Observable<Course[]> {

    // ✅ Emit loading requested event
    this._courseLoading$.next({
      loadingType: 'courses-requested',
      courseFilter,
      visibilityFilter,
      coursesLoaded: 0,
      autoSelectFirst,
      selectionAttempted: false,
      selectionSuccessful: false,
      errors: [],
      source: 'course-management',
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseLoading event:', 'courses-requested');

    return this.loadCourses(courseFilter, visibilityFilter).pipe(
      tap((courses: Course[]) => {
        // ✅ Emit courses loaded event
        this._courseLoading$.next({
          loadingType: 'courses-loaded',
          courseFilter,
          visibilityFilter,
          coursesLoaded: courses.length,
          autoSelectFirst,
          selectionAttempted: false,
          selectionSuccessful: false,
          errors: [],
          source: 'course-management',
          timestamp: new Date()
        });

        console.log('🚨 [CourseManagementService] EMITTED courseLoading event:', 'courses-loaded');

        // ✅ Emit course management loading completed event
        this._courseManagement$.next({
          operationType: 'course-loading-completed',
          courseId: null,
          courseTitle: null,
          source: selectionSource,
          success: true,
          availableCourses: courses.length,
          errors: [],
          warnings: courses.length === 0 ? ['No courses loaded'] : [],
          timestamp: new Date()
        });

        console.log('🚨 [CourseManagementService] EMITTED courseManagement event:', 'course-loading-completed');

        if (autoSelectFirst && courses.length > 0) {
          const hasSelection = this.nodeSelectionService.hasSelection();
          let selectionAttempted = false;
          let selectionSuccessful = false;

          if (!hasSelection) {
            selectionAttempted = true;
            selectionSuccessful = this.selectFirstAvailableCourse(selectionSource);
          }

          // ✅ Emit auto-selection attempted event
          this._courseLoading$.next({
            loadingType: 'auto-selection-attempted',
            courseFilter,
            visibilityFilter,
            coursesLoaded: courses.length,
            autoSelectFirst,
            selectionAttempted,
            selectionSuccessful,
            errors: selectionSuccessful ? [] : ['Auto-selection failed'],
            source: 'course-management',
            timestamp: new Date()
          });

          console.log('🚨 [CourseManagementService] EMITTED courseLoading event:', 'auto-selection-attempted');
        }
      }),
      tap({
        error: (error: any) => {
          // ✅ Emit loading failed event
          this._courseLoading$.next({
            loadingType: 'loading-failed',
            courseFilter,
            visibilityFilter,
            coursesLoaded: 0,
            autoSelectFirst,
            selectionAttempted: false,
            selectionSuccessful: false,
            errors: [error.message || 'Course loading failed'],
            source: 'course-management',
            timestamp: new Date()
          });

          console.log('🚨 [CourseManagementService] EMITTED courseLoading event:', 'loading-failed');
        }
      })
    );
  }

  // === COURSE LOADING (DELEGATES TO CRUD SERVICE) ===

  /**
   * Load courses with filtering - delegates to API
   */
  private loadCourses(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private'
  ): Observable<Course[]> {

    return this.apiService.getCourses(courseFilter, visibilityFilter).pipe(
      tap((courses: Course[]) => {
        this.courseDataService.setCourses(courses, 'initialization');
      })
    );
  }

  // === ENHANCED COURSE INFORMATION QUERIES ===

  /**
   * Get basic course information for display
   */
  getCourseInfo(courseId: number): { exists: boolean; course?: Course; title?: string; isActive?: boolean } {
    const course = this.getCourseByIdSafely(courseId);

    if (!course) {
      return { exists: false };
    }

    return {
      exists: true,
      course,
      title: course.title,
      isActive: !course.archived
    };
  }

  /**
   * ✅ ENHANCED: Check if course is active and available with Observable event emission
   */
  isCourseActiveAndAvailable(courseId: number): boolean {
    const course = this.getCourseByIdSafely(courseId);
    const isActive = course !== undefined && !course.archived;

    // ✅ Emit course active status validation event
    this._courseValidation$.next({
      validationType: 'course-active-status',
      courseId,
      courseTitle: course?.title || null,
      isValid: isActive,
      validationDetails: {
        courseExists: !!course,
        isActive: isActive
      },
      errors: isActive ? [] : [course ? 'Course is archived' : 'Course not found'],
      source: 'course-management',
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseValidation event:', 'course-active-status');
    return isActive;
  }

  /**
   * Get all active courses for selection lists
   */
  getActiveCoursesForSelection(): Course[] {
    return this.courseDataService.activeCourses();
  }

  /**
   * ✅ ENHANCED: Get course statistics with Observable event emission
   */
  getCourseStatistics(): {
    totalActive: number;
    totalArchived: number;
    hasSelection: boolean;
    selectedCourseId?: number;
  } {
    const allCourses = this.courseDataService.courses();
    const selectedNode = this.nodeSelectionService.selectedNode();

    const stats = {
      totalActive: allCourses.filter((c: Course) => !c.archived).length,
      totalArchived: allCourses.filter((c: Course) => c.archived).length,
      hasSelection: selectedNode?.nodeType === 'Course',
      selectedCourseId: selectedNode?.nodeType === 'Course' ? selectedNode.id : undefined
    };

    // ✅ Emit statistics computed event
    this._courseAvailability$.next({
      availabilityType: 'statistics-computed',
      totalActive: stats.totalActive,
      totalArchived: stats.totalArchived,
      hasSelection: stats.hasSelection,
      selectedCourseId: stats.selectedCourseId || null,
      firstAvailableCourseId: stats.totalActive > 0 ? this.getFirstAvailableCourse()?.id || null : null,
      coursesAvailable: stats.totalActive > 0,
      source: 'course-management',
      timestamp: new Date()
    });

    console.log('🚨 [CourseManagementService] EMITTED courseAvailability event:', 'statistics-computed');
    return stats;
  }

  // === DEBUG AND UTILITY METHODS ===

  /**
   * Get debug information about course management state
   */
  getDebugInfo(): any {
    const statistics = this.getCourseStatistics();
    const validation = this.validateCourseSelection();
    const firstCourse = this.getFirstAvailableCourse();

    return {
      courseManagement: {
        coursesAvailable: this.hasCoursesAvailable(),
        activeCourseCount: this.getActiveCourseCount(),
        firstAvailableCourse: firstCourse ? {
          id: firstCourse.id,
          title: firstCourse.title
        } : null
      },
      statistics,
      currentSelection: {
        isValid: validation.isValid,
        courseId: validation.courseId,
        courseTitle: validation.course?.title,
        error: validation.error
      },
      observableEvents: {
        courseManagement: true,
        courseAvailability: true,
        courseValidation: true,
        courseLoading: true
      },
      serviceArchitecture: {
        delegates: ['CourseDataService', 'NodeSelectionService', 'ApiService'],
        responsibilities: ['Course selection', 'Availability management', 'Loading coordination'],
        hasObservableEvents: true
      }
    };
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    this._courseManagement$.complete();
    this._courseAvailability$.complete();
    this._courseValidation$.complete();
    this._courseLoading$.complete();
    console.log('[CourseManagementService] All Observable subjects completed on destroy');
  }
}
