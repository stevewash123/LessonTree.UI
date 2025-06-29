// RESPONSIBILITY: Course filtering logic and computed filter signals. Pure filter management.
// DOES NOT: Handle data storage, mutations, or signal emission.
// CALLED BY: CourseDataService, CourseFilterDialog, CourseList components

import { Injectable, signal, computed } from '@angular/core';
import { Course } from '../../../models/course';
import { CourseDataStorageService } from './course-data-storage.service';

@Injectable({
  providedIn: 'root'
})
export class CourseFilterService {
  
  
  // Filter State Signals
  private readonly _courseFilter = signal<'active' | 'archived' | 'both'>('active');
  private readonly _visibilityFilter = signal<'private' | 'team'>('private');
  
  // Readonly accessors for filter signals
  readonly courseFilter = this._courseFilter.asReadonly();
  readonly visibilityFilter = this._visibilityFilter.asReadonly();
  
  // Computed Signals for reactive filtering
  readonly filteredCourses = computed(() => {
    const courses = this.storageService.getCurrentCourses();
    const courseFilter = this._courseFilter();
    const visibilityFilter = this._visibilityFilter();
    
    return courses.filter((course: Course) => {
      // Apply course filter (active/archived/both)
      if (courseFilter === 'active' && course.archived) return false;
      if (courseFilter === 'archived' && !course.archived) return false;
      // 'both' includes all courses regardless of archived status
      
      // Apply visibility filter
      if (visibilityFilter === 'private' && course.visibility !== 'Private') return false;
      if (visibilityFilter === 'team' && course.visibility === 'Private') return false;
      // Note: 'team' filter includes both 'Team' and 'Public' courses
      
      return true;
    });
  });

  // Simple active courses filter for TreeWrapper and LessonCalendar
  readonly activeCourses = computed(() => {
    return this.storageService.getCurrentCourses().filter((course: Course) => !course.archived);
  });

  // Filter-specific computed signals
  readonly filteredCoursesCount = computed(() => this.filteredCourses().length);
  readonly hasFilteredData = computed(() => this.filteredCoursesCount() > 0);
  readonly isFilteredEmpty = computed(() => this.filteredCoursesCount() === 0);

  readonly courseStats = computed(() => {
    const allCourses = this.storageService.getCurrentCourses();
    const filteredCourses = this.filteredCourses();
    
    return {
      total: allCourses.length,
      filtered: filteredCourses.length,
      active: allCourses.filter((c: Course) => !c.archived).length,
      archived: allCourses.filter((c: Course) => c.archived).length,
      byVisibility: {
        private: allCourses.filter((c: Course) => c.visibility === 'Private').length,
        team: allCourses.filter((c: Course) => c.visibility === 'Team').length,
        public: allCourses.filter((c: Course) => c.visibility === 'Public').length
      },
      currentFilter: {
        courseFilter: this._courseFilter(),
        visibilityFilter: this._visibilityFilter()
      }
    };
  });

  // Filter status computed signals
  readonly isShowingActiveOnly = computed(() => this._courseFilter() === 'active');
  readonly isShowingArchivedOnly = computed(() => this._courseFilter() === 'archived');
  readonly isShowingBoth = computed(() => this._courseFilter() === 'both');
  readonly isShowingPrivateOnly = computed(() => this._visibilityFilter() === 'private');
  readonly isShowingTeamOnly = computed(() => this._visibilityFilter() === 'team');
  
  // Filter change detection
  readonly hasActiveFilters = computed(() => {
    return this._courseFilter() !== 'active' || this._visibilityFilter() !== 'private';
  });
  
  constructor(private storageService: CourseDataStorageService) {
    console.log('[CourseFilterService] Service initialized');
  }

  // === FILTER STATE METHODS ===
  
  setFilters(courseFilter: 'active' | 'archived' | 'both', visibilityFilter: 'private' | 'team'): void {
    console.log('[CourseFilterService] Setting filters', {
      courseFilter,
      visibilityFilter,
      timestamp: new Date().toISOString()
    });
    
    this._courseFilter.set(courseFilter);
    this._visibilityFilter.set(visibilityFilter);
  }

  setCourseFilter(filter: 'active' | 'archived' | 'both'): void {
    console.log('[CourseFilterService] Setting course filter', {
      filter,
      previous: this._courseFilter(),
      timestamp: new Date().toISOString()
    });
    this._courseFilter.set(filter);
  }

  setVisibilityFilter(filter: 'private' | 'team'): void {
    console.log('[CourseFilterService] Setting visibility filter', {
      filter,
      previous: this._visibilityFilter(),
      timestamp: new Date().toISOString()
    });
    this._visibilityFilter.set(filter);
  }

  // === FILTER UTILITY METHODS ===
  
  resetFilters(): void {
    console.log('[CourseFilterService] Resetting filters to defaults');
    this._courseFilter.set('active');
    this._visibilityFilter.set('private');
  }

  toggleCourseFilter(): void {
    const current = this._courseFilter();
    const next = current === 'active' ? 'both' : 
                 current === 'both' ? 'archived' : 'active';
    this.setCourseFilter(next);
  }

  toggleVisibilityFilter(): void {
    const current = this._visibilityFilter();
    const next = current === 'private' ? 'team' : 'private';
    this.setVisibilityFilter(next);
  }

  // === FILTER QUERY METHODS ===
  
  getCoursesByFilter(): Course[] {
    return [...this.filteredCourses()];
  }

  getActiveCourses(): Course[] {
    return [...this.activeCourses()];
  }

  getCoursesByVisibility(visibility: 'Private' | 'Team' | 'Public'): Course[] {
    return this.storageService.getCurrentCourses().filter((course: Course) => course.visibility === visibility);
  }

  getCoursesByArchiveStatus(archived: boolean): Course[] {
    return this.storageService.getCurrentCourses().filter((course: Course) => course.archived === archived);
  }

  // === FILTER MATCHING METHODS ===
  
  doesCourseMatchCurrentFilter(course: Course): boolean {
    const courseFilter = this._courseFilter();
    const visibilityFilter = this._visibilityFilter();
    
    // Check course filter (active/archived/both)
    if (courseFilter === 'active' && course.archived) return false;
    if (courseFilter === 'archived' && !course.archived) return false;
    
    // Check visibility filter
    if (visibilityFilter === 'private' && course.visibility !== 'Private') return false;
    if (visibilityFilter === 'team' && course.visibility === 'Private') return false;
    
    return true;
  }

  getFilterDescription(): string {
    const courseFilter = this._courseFilter();
    const visibilityFilter = this._visibilityFilter();
    
    const courseDesc = courseFilter === 'active' ? 'Active' :
                       courseFilter === 'archived' ? 'Archived' : 'All';
    const visibilityDesc = visibilityFilter === 'private' ? 'Private' : 'Team';
    
    return `${courseDesc} ${visibilityDesc} courses`;
  }
}