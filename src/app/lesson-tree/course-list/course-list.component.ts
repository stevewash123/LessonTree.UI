// RESPONSIBILITY: Displays filtered course tree cards with local search functionality
// DOES NOT: Handle course header display or global filtering (moved to container)
// CALLED BY: LessonTreeContainer in various layout modes

import { Component, OnInit, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { Course } from '../../models/course';
import TreeWrapperComponent from '../tree-wrapper/tree-wrapper.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PanelStateService } from '../../info-panel/panel-state.service';
import { SyncfusionModule } from '../../shared/modules/syncfusion.module';
import { CourseDataService } from '../services/course-data/course-data.service';
import { CourseCrudService } from '../services/course-operations/course-crud.service';

@Component({
  selector: 'course-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SyncfusionModule,
    TreeWrapperComponent
  ],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {

  // Local filter signals (private)
  private readonly _localSearchTerm = signal<string>('');
  private readonly _localCourseFilter = signal<'active' | 'archived' | 'both'>('active');
  private readonly _localVisibilityFilter = signal<'private' | 'team'>('private');

  // Computed signal for courses to display (all local filters)
  readonly displayCourses = computed(() => {
    const allCourses = this.courseDataService.getCourses();
    const searchTerm = this._localSearchTerm().toLowerCase();
    const courseFilter = this._localCourseFilter();
    const visibilityFilter = this._localVisibilityFilter();

    return allCourses.filter((course: Course) => {
      // Apply course filter (active/archived/both)
      if (courseFilter === 'active' && course.archived) return false;
      if (courseFilter === 'archived' && !course.archived) return false;
      // 'both' includes all courses regardless of archived status

      // Apply visibility filter
      if (visibilityFilter === 'private' && course.visibility !== 'Private') return false;
      if (visibilityFilter === 'team' && course.visibility === 'Private') return false;
      // Note: 'team' filter includes both 'Team' and 'Public' courses

      // Apply search filter
      if (searchTerm) {
        const matchesTitle = course.title.toLowerCase().includes(searchTerm);
        const matchesDescription = course.description?.toLowerCase().includes(searchTerm);
        if (!matchesTitle && !matchesDescription) return false;
      }

      return true;
    });
  });

  constructor(
    private toastr: ToastrService,
    private panelStateService: PanelStateService,
    public courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized');

    // ✅ Self-contained data loading
    this.courseCrudService.loadCourses().subscribe({
      next: (courses) => {
        console.log('[CourseList] Initial courses loaded:', courses.length);
        // Signal architecture will handle the rest automatically
      },
      error: (error) => {
        console.error('[CourseList] Failed to load courses:', error);
      }
    });
  }

  // Getters for local filter state (for template binding)
  get localSearchTerm(): string {
    return this._localSearchTerm();
  }

  get localCourseFilter(): 'active' | 'archived' | 'both' {
    return this._localCourseFilter();
  }

  get localVisibilityFilter(): 'private' | 'team' {
    return this._localVisibilityFilter();
  }

  // PUBLIC METHODS for external filter control (called by LessonTreeContainer)
  setLocalFilters(courseFilter: 'active' | 'archived' | 'both', visibilityFilter: 'private' | 'team', searchTerm?: string): void {
    console.log('[CourseList] Setting local filters from external source', {
      courseFilter,
      visibilityFilter,
      searchTerm,
      timestamp: new Date().toISOString()
    });

    this._localCourseFilter.set(courseFilter);
    this._localVisibilityFilter.set(visibilityFilter);

    if (searchTerm !== undefined) {
      this._localSearchTerm.set(searchTerm);
    }
  }

  setLocalSearchTerm(searchTerm: string): void {
    this._localSearchTerm.set(searchTerm);
  }

  initiateAddCourse(): void {
    console.log('[CourseList] initiateAddCourse: Initiating new Course creation', { timestamp: new Date().toISOString() });
    this.panelStateService.initiateAddMode('Course', null);
    this.toastr.info('Initiating new course creation', 'Info');
  }
}
