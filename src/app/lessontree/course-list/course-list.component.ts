import { Component, OnInit, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';
import { TreeWrapperComponent } from './tree/tree-wrapper.component';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CourseFilterDialogComponent } from './course-filter/course-filter-dialog.component';
import { UserService } from '../../core/services/user.service';
import { PanelStateService } from '../../core/services/panel-state.service';
import { CourseCrudService } from '../../core/services/course-crud.service';
import { CourseDataService } from '../../core/services/course-data.service';
import { Course } from '../../models/course';

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
    TreeWrapperComponent,
    MatDialogModule
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
    private dialog: MatDialog,
    private userService: UserService,
    private panelStateService: PanelStateService,
    public courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized', { timestamp: new Date().toISOString() });
  }

  // Method to update local search term with proper event handling
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._localSearchTerm.set(target?.value || '');
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

  initiateAddCourse(): void {
    console.log('[CourseList] initiateAddCourse: Initiating new Course creation', { timestamp: new Date().toISOString() });
    this.panelStateService.initiateAddMode('Course', null);
    this.toastr.info('Initiating new course creation', 'Info');
  }
      
  // Filter dialog method - now updates local filters only
  openFilterDialog(): void {
    const districtId = this.userService.getDistrictId();
    const dialogRef = this.dialog.open(CourseFilterDialogComponent, {
      width: '300px',
      data: {
        districtId: districtId,
        courseFilter: this._localCourseFilter(),
        visibilityFilter: this._localVisibilityFilter(),
        searchTerm: this._localSearchTerm()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[CourseList] Local filters applied from dialog', { 
          courseFilter: result.courseFilter, 
          visibilityFilter: result.visibilityFilter, 
          timestamp: new Date().toISOString() 
        });
        
        // Update local filters only - no global impact
        this._localCourseFilter.set(result.courseFilter);
        this._localVisibilityFilter.set(result.visibilityFilter);
        
        // Update search term if provided
        if (result.searchTerm !== undefined) {
          this._localSearchTerm.set(result.searchTerm);
        }
      }
    });
  }

}