// **COMPLETE FILE** - CourseManagementService - Observable Infrastructure REMOVED
// RESPONSIBILITY: Course selection, availability, and high-level management operations with clean business logic
// DOES NOT: Handle CRUD operations, data state, or API calls directly - delegates to appropriate services
// CALLED BY: Calendar components and other services for course management logic

import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Course } from '../../../models/course';
import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';
import { EntitySelectionService } from '../state/entity-selection.service';

@Injectable({
  providedIn: 'root'
})
export class CourseManagementService {

  constructor(
    private courseDataService: CourseDataService,
    private apiService: ApiService,
    private nodeSelectionService: EntitySelectionService
  ) {
    console.log('[CourseManagementService] Service initialized for course management coordination');
  }

  // === COURSE AVAILABILITY AND SELECTION ===

  /**
   * Get the first available active course
   */
  getFirstAvailableCourse(): Course | null {
    const activeCourses = this.courseDataService.activeCourses();

    if (activeCourses.length === 0) {
      console.warn('[CourseManagementService] No active courses available for default selection');
      return null;
    }

    const firstCourse = activeCourses[0];
    console.log('[CourseManagementService] First available course:', {
      id: firstCourse.id,
      title: firstCourse.title,
      totalActive: activeCourses.length
    });

    return firstCourse;
  }

  /**
   * Select the first available course
   */
  selectFirstAvailableCourse(selectionSource: 'calendar' | 'programmatic' = 'programmatic'): boolean {
    const firstCourse = this.getFirstAvailableCourse();

    if (!firstCourse) {
      console.warn('[CourseManagementService] Cannot select first course - no courses available');
      return false;
    }

    this.nodeSelectionService.selectById(firstCourse.id, 'Course', selectionSource);

    console.log('[CourseManagementService] Selected first available course:', {
      courseId: firstCourse.id,
      courseTitle: firstCourse.title,
      source: selectionSource,
      availableCourses: this.courseDataService.activeCourses().length
    });

    return true;
  }

  /**
   * Check if courses are available
   */
  hasCoursesAvailable(): boolean {
    const activeCourses = this.courseDataService.activeCourses();
    const coursesAvailable = activeCourses.length > 0;

    console.log('[CourseManagementService] Course availability check:', {
      totalActive: activeCourses.length,
      coursesAvailable
    });

    return coursesAvailable;
  }

  /**
   * Get course count for display/logging
   */
  getActiveCourseCount(): number {
    return this.courseDataService.activeCourses().length;
  }

  /**
   * Get course by ID with proper null handling
   */
  getCourseByIdSafely(courseId: number): Course | undefined {
    const course = this.courseDataService.getCourseById(courseId);

    if (!course) {
      console.warn('[CourseManagementService] Course not found:', courseId);
    }

    return course || undefined;
  }

  /**
   * Validate course selection context
   */
  validateCourseSelection(): { isValid: boolean; courseId?: number; course?: Course; error?: string } {
    const selectedNode = this.nodeSelectionService.selectedEntity();
    let isValid = true;
    let courseId: number | undefined;
    let course: Course | undefined;
    let error: string | undefined;

    if (!selectedNode) {
      isValid = false;
      error = 'No course selected';
    } else if (selectedNode.entityType !== 'Course') {
      isValid = false;
      error = `Selected node is ${selectedNode.entityType}, not Course`;
    } else {
      courseId = selectedNode.id;
      course = this.getCourseByIdSafely(courseId);

      if (!course) {
        isValid = false;
        error = 'Selected course not found in data';
      } else if (course.archived) {
        console.warn('[CourseManagementService] Selected course is archived:', courseId);
      }
    }

    console.log('[CourseManagementService] Course selection validation:', {
      isValid,
      courseId,
      courseTitle: course?.title,
      error,
      hasSelection: !!selectedNode,
      nodeType: selectedNode?.entityType
    });

    return { isValid, courseId, course, error };
  }

  // === COURSE LOADING WITH SELECTION ===

  /**
   * Load courses and optionally select first
   */
  loadCoursesAndSelectFirst(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private',
    autoSelectFirst: boolean = true,
    selectionSource: 'calendar' | 'programmatic' = 'programmatic'
  ): Observable<Course[]> {

    console.log('[CourseManagementService] Loading courses with options:', {
      courseFilter,
      visibilityFilter,
      autoSelectFirst,
      selectionSource
    });

    return this.loadCourses(courseFilter, visibilityFilter).pipe(
      tap((courses: Course[]) => {
        console.log('[CourseManagementService] Courses loaded successfully:', {
          coursesLoaded: courses.length,
          courseFilter,
          visibilityFilter
        });

        if (autoSelectFirst && courses.length > 0) {
          const hasSelection = this.nodeSelectionService.hasSelection();
          let selectionAttempted = false;
          let selectionSuccessful = false;

          if (!hasSelection) {
            selectionAttempted = true;
            selectionSuccessful = this.selectFirstAvailableCourse(selectionSource);
          }

          console.log('[CourseManagementService] Auto-selection handling:', {
            hasSelection,
            selectionAttempted,
            selectionSuccessful,
            coursesAvailable: courses.length
          });
        }
      }),
      tap({
        error: (error: any) => {
          console.error('[CourseManagementService] Course loading failed:', error);
        }
      })
    );
  }

  // === COURSE LOADING (DELEGATES TO API) ===

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

  // === COURSE INFORMATION QUERIES ===

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
   * Check if course is active and available
   */
  isCourseActiveAndAvailable(courseId: number): boolean {
    const course = this.getCourseByIdSafely(courseId);
    const isActive = course !== undefined && !course.archived;

    console.log('[CourseManagementService] Course active status check:', {
      courseId,
      courseTitle: course?.title,
      exists: !!course,
      isActive
    });

    return isActive;
  }

  /**
   * Get all active courses for selection lists
   */
  getActiveCoursesForSelection(): Course[] {
    return this.courseDataService.activeCourses();
  }

  /**
   * Get course statistics
   */
  getCourseStatistics(): {
    totalActive: number;
    totalArchived: number;
    hasSelection: boolean;
    selectedCourseId?: number;
  } {
    const allCourses = this.courseDataService.courses();
    const selectedNode = this.nodeSelectionService.selectedEntity();

    const stats = {
      totalActive: allCourses.filter((c: Course) => !c.archived).length,
      totalArchived: allCourses.filter((c: Course) => c.archived).length,
      hasSelection: selectedNode?.entityType === 'Course',
      selectedCourseId: selectedNode?.entityType === 'Course' ? selectedNode.id : undefined
    };

    console.log('[CourseManagementService] Course statistics computed:', stats);
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
      serviceArchitecture: {
        delegates: ['CourseDataService', 'NodeSelectionService', 'ApiService'],
        responsibilities: ['Course selection', 'Availability management', 'Loading coordination'],
        hasObservableEvents: false
      }
    };
  }
}
