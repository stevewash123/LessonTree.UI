import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../core/services/api.service';
import { Course } from '../../models/course';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TreeComponent } from '../tree/tree.component';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';

@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TreeComponent,
    SyncfusionModule
  ],
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.scss']
})
export class CourseManagementComponent implements OnInit {
  courses: Course[] = [];
  expandedCourseId: string | null = null;  // Changed from number | null to string | null

  constructor(private apiService: ApiService, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.apiService.get<Course[]>('course').subscribe({
      next: (courses) => {
        this.courses = courses;
        //console.log('API Response Courses Data:', JSON.stringify(this.courses));
      },
      error: (err) => this.toastr.error('Failed to load courses: ' + err.message, 'Error', { timeOut: 0 })
    });
  }
  
  toggleCourse(courseNodeId: string) {  // Updated parameter to string (nodeId)
    this.expandedCourseId = this.expandedCourseId === courseNodeId ? null : courseNodeId;
    console.log('Toggling Course Node ID:', courseNodeId, 'Expanded Course ID:', this.expandedCourseId);
  }

  editCourse(course: Course) {
    console.log('Edit Course:', course);
    this.toastr.info(`Editing course: ${course.title}`, 'Info');
  }

  deleteCourse(courseId: number) {
    console.log('Delete Course ID:', courseId);
    this.toastr.warning(`Deleting course with ID: ${courseId}`, 'Warning', { timeOut: 0 });
  }

  addTopic(courseId: number) {
    console.log('Add Topic to Course ID:', courseId);
    this.toastr.info(`Adding topic to course with ID: ${courseId}`, 'Info');
  }

  openAddCourseDialog() {
    console.log('Open Add Course Dialog');
    this.toastr.info('Add Course dialog opened', 'Info');
  }
}