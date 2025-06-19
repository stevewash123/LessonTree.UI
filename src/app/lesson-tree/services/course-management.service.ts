// RESPONSIBILITY: Course selection, availability, and high-level management operations
// DOES NOT: Handle CRUD operations, data state, or API calls directly
// CALLED BY: Calendar components and other services for course management logic

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CourseDataService } from '../../shared/services/course-data.service';
import { NodeSelectionService } from './node-selection.service';
import { ApiService } from '../../shared/services/api.service';
import { Course } from '../../models/course';

@Injectable({
  providedIn: 'root'
})
export class CourseManagementService {
  private readonly nodeSelectionService = inject(NodeSelectionService);
  
  constructor(
    private courseDataService: CourseDataService,
    private apiService: ApiService
  ) {
    console.log('[CourseManagementService] Initialized for course management operations');
  }

  // === COURSE AVAILABILITY AND SELECTION ===

  /**
   * Get the first available active course for default selection
   */
  getFirstAvailableCourse(): Course | null {
    const activeCourses = this.courseDataService.activeCourses();
    
    if (activeCourses.length === 0) {
      console.warn('[CourseManagementService] No active courses available for default selection', { 
        timestamp: new Date().toISOString() 
      });
      return null;
    }

    const firstCourse = activeCourses[0];
    console.log('[CourseManagementService] Found first available course', {
      courseId: firstCourse.id,
      courseTitle: firstCourse.title,
      timestamp: new Date().toISOString()
    });

    return firstCourse;
  }

  /**
   * Select the first available course programmatically
   */
  selectFirstAvailableCourse(source: 'calendar' | 'programmatic' = 'programmatic'): boolean {
    const firstCourse = this.getFirstAvailableCourse();
    
    if (!firstCourse) {
      console.warn('[CourseManagementService] Cannot select first course - no courses available', { 
        timestamp: new Date().toISOString() 
      });
      return false;
    }

    console.log('[CourseManagementService] Selecting first available course', {
      courseId: firstCourse.id,
      courseTitle: firstCourse.title,
      source,
      timestamp: new Date().toISOString()
    });

    this.nodeSelectionService.selectById(firstCourse.id, 'Course', source);
    return true;
  }

  /**
   * Check if courses are available for calendar/tree operations
   */
  hasCoursesAvailable(): boolean {
    return this.courseDataService.activeCourses().length > 0;
  }

  /**
   * Get course count for display/logging
   */
  getActiveCourseCount(): number {
    return this.courseDataService.activeCourses().length;
  }

  /**
   * Get course by ID with error handling and logging
   */
  getCourseByIdSafely(courseId: number): Course | null {
    const course = this.courseDataService.getCourseById(courseId);
    
    if (!course) {
      console.warn('[CourseManagementService] Course not found', {
        courseId,
        availableCourses: this.courseDataService.activeCourses().map(c => c.id),
        timestamp: new Date().toISOString()
      });
    }

    return course;
  }

  /**
   * Validate course selection context for calendar operations
   */
  validateCourseSelection(): { isValid: boolean; courseId?: number; course?: Course; error?: string } {
    const selectedNode = this.nodeSelectionService.selectedNode();
    
    if (!selectedNode) {
      return { 
        isValid: false, 
        error: 'No course selected' 
      };
    }

    if (selectedNode.nodeType !== 'Course') {
      return { 
        isValid: false, 
        error: `Selected node is ${selectedNode.nodeType}, not Course` 
      };
    }

    const courseId = selectedNode.id;
    const course = this.getCourseByIdSafely(courseId);

    if (!course) {
      return { 
        isValid: false, 
        courseId, 
        error: 'Selected course not found in data' 
      };
    }

    return { 
      isValid: true, 
      courseId, 
      course 
    };
  }

  // === COURSE LOADING WITH SELECTION ===

  /**
   * Load courses and optionally select first available
   */
  loadCoursesAndSelectFirst(
    courseFilter: 'active' | 'archived' | 'both' = 'active',
    visibilityFilter: 'private' | 'team' = 'private',
    autoSelectFirst: boolean = true,
    selectionSource: 'calendar' | 'programmatic' = 'programmatic'
  ): Observable<Course[]> {
    console.log('[CourseManagementService] Loading courses with auto-selection', {
      courseFilter,
      visibilityFilter,
      autoSelectFirst,
      selectionSource,
      timestamp: new Date().toISOString()
    });

    return this.loadCourses(courseFilter, visibilityFilter).pipe(
      tap(courses => {
        if (autoSelectFirst && courses.length > 0) {
          // Only auto-select if nothing is currently selected
          const hasSelection = this.nodeSelectionService.hasSelection();
          
          if (!hasSelection) {
            console.log('[CourseManagementService] Auto-selecting first course after load', {
              coursesLoaded: courses.length,
              hasSelection,
              timestamp: new Date().toISOString()
            });
            
            this.selectFirstAvailableCourse(selectionSource);
          } else {
            console.log('[CourseManagementService] Skipping auto-selection - node already selected', {
              selectedNodeType: this.nodeSelectionService.selectedNodeType(),
              selectedNodeId: this.nodeSelectionService.selectedNodeId(),
              timestamp: new Date().toISOString()
            });
          }
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
    console.log('[CourseManagementService] Loading courses', {
      courseFilter,
      visibilityFilter,
      timestamp: new Date().toISOString()
    });

    return this.apiService.getCourses(courseFilter, visibilityFilter).pipe(
      tap(courses => {
        this.courseDataService.setCourses(courses, 'initialization');
        console.log('[CourseManagementService] Courses loaded successfully:', 
          courses.map(c => ({ id: c.id, title: c.title })),
          { timestamp: new Date().toISOString() }
        );
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
   * Check if a specific course is active and available
   */
  isCourseActiveAndAvailable(courseId: number): boolean {
    const course = this.getCourseByIdSafely(courseId);
    return course !== null && !course.archived;
  }

  /**
   * Get all active courses for selection lists
   */
  getActiveCoursesForSelection(): Course[] {
    return this.courseDataService.activeCourses();
  }

  /**
   * Get course statistics for management dashboards
   */
  getCourseStatistics(): {
    totalActive: number;
    totalArchived: number;
    hasSelection: boolean;
    selectedCourseId?: number;
  } {
    const allCourses = this.courseDataService.courses();
    const selectedNode = this.nodeSelectionService.selectedNode();
    
    return {
      totalActive: allCourses.filter(c => !c.archived).length,
      totalArchived: allCourses.filter(c => c.archived).length,
      hasSelection: selectedNode?.nodeType === 'Course',
      selectedCourseId: selectedNode?.nodeType === 'Course' ? selectedNode.id : undefined
    };
  }
}