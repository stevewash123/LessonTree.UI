import { Component, OnInit } from '@angular/core';
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
import { CourseDataService } from '../../core/services/course-data.service';

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
  
  refreshTrigger: boolean = false;

  constructor(
    private toastr: ToastrService,
    private dialog: MatDialog,
    private userService: UserService,
    private panelStateService: PanelStateService,
    public courseDataService: CourseDataService
  ) {}

  ngOnInit(): void {
    console.log('[CourseList] Component initialized', { timestamp: new Date().toISOString() });
  }

  initiateAddCourse(): void {
    console.log('[CourseList] initiateAddCourse: Initiating new Course creation', { timestamp: new Date().toISOString() });
    this.panelStateService.initiateAddMode('Course', null);
    this.toastr.info('Initiating new course creation', 'Info');
  }
      
  // Filter dialog method (unchanged)
  openFilterDialog(): void {
    const districtId = this.userService.getDistrictId();
    const dialogRef = this.dialog.open(CourseFilterDialogComponent, {
      width: '300px',
      data: {
        districtId: districtId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[CourseList] Filters applied from dialog', { 
          courseFilter: result.courseFilter, 
          visibilityFilter: result.visibilityFilter, 
          timestamp: new Date().toISOString() 
        });
        
        // Use service to apply filters and reload
        this.courseDataService.loadCourses(
          result.courseFilter,
          result.visibilityFilter
        ).subscribe();
      }
    });
  }

}