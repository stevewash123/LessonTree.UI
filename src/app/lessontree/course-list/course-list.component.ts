// src/app/lessontree/course-list/course-list.component.ts
import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input, SimpleChanges, OnChanges, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';
import { TreeWrapperComponent } from './tree/tree-wrapper.component';
import { NodeSelectedEvent, NodeType, TopicMovedEvent, TreeData, TreeNode } from '../../models/tree-node';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CourseFilterDialogComponent } from './course-filter/course-filter-dialog.component';
import { UserService } from '../../core/services/user.service';
import { NodeSelectionService } from '../../core/services/node-selection.service';
import { PanelStateService } from '../../core/services/panel-state.service';

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
export class CourseListComponent implements OnInit, OnChanges {
    private nodeSelectionService = inject(NodeSelectionService);
    @Input() courses: Course[] = [];
    @Input() triggerRefresh: boolean = false;
    @Input() newNode: TreeData | null = null;
    @Input() nodeEdited: TreeData | null = null;

    // Keep output events for backward compatibility
    @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>();
    @Output() lessonMoved = new EventEmitter<{ lesson: Lesson, sourceSubTopicId?: number, targetSubTopicId?: number, targetTopicId?: number }>();

    refreshTrigger: boolean = false;
    treeActiveNode: TreeNode | null = null;

    constructor(
        private toastr: ToastrService,
        private dialog: MatDialog,
        private userService: UserService,
        private panelStateService: PanelStateService
    ) {}

    ngOnInit(): void {
        console.log('[CourseList] Component initialized', { timestamp: new Date().toISOString() });
      }
    
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['triggerRefresh'] && changes['triggerRefresh'].currentValue !== changes['triggerRefresh'].previousValue) {
          console.log(`[CourseList] Refresh triggered`, { newValue: changes['triggerRefresh'].currentValue, timestamp: new Date().toISOString() });
          this.refreshTrigger = !this.refreshTrigger;
        }
    }

    initiateAddCourse(): void {
        console.log('[CourseList] initiateAddCourse: Initiating new Course creation', { timestamp: new Date().toISOString() });
        this.panelStateService.initiateAddMode('Course', null);
        this.toastr.info('Initiating new course creation', 'Info');
      }
      
  onTopicMoved(event: TopicMovedEvent): void {
    console.log('[CourseList] onTopicMoved: Passing through event', event, { timestamp: new Date().toISOString() });
    this.nodeDragStop.emit(event);
  }

  onLessonMoved(event: { lesson: Lesson, sourceSubTopicId?: number, targetSubTopicId?: number, targetTopicId?: number }): void {
    console.log('[CourseList] onLessonMoved: Passing through event', event, { timestamp: new Date().toISOString() });
    this.lessonMoved.emit(event);
  }

  
  // Filter dialog method
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
        // Handle filter changes
      }
    });
  }

  
}