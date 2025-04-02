import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'course-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
    MatDialogActions,
    MatDialogContent
  ],
  templateUrl: './course-filter-dialog.component.html',
  styleUrls: ['./course-filter-dialog.component.css']
})
export class CourseFilterDialogComponent {
    courseFilter: 'active' | 'archived' | 'both';
    visibilityFilter: 'private' | 'team' = 'private'; // Default to private
    hasDistrictId: boolean;
  
    constructor(
      public dialogRef: MatDialogRef<CourseFilterDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: { courseFilter: string, visibilityFilter: string, districtId?: number }
    ) {
      this.courseFilter = data.courseFilter as 'active' | 'archived' | 'both';
      this.visibilityFilter = data.visibilityFilter as 'private' | 'team' || 'private';
      this.hasDistrictId = !!data.districtId;
    }
  
    applyFilters(): void {
      this.dialogRef.close({
        courseFilter: this.courseFilter,
        visibilityFilter: this.hasDistrictId ? this.visibilityFilter : 'private'
      });
    }
  
    cancel(): void {
      this.dialogRef.close();
    }
  }