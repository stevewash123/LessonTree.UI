import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../core/services/api.service';
import { Course } from '../../models/course';
import { Topic } from '../../models/topic';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SyncfusionModule } from '../../core/modules/syncfusion.module';
import { TreeComponent } from './tree/tree.component';
import { NodeSelectedEvent, TopicMovedEvent, TreeNode } from '../../models/tree-node';
import { SubTopic } from '../../models/subTopic';
import { Lesson } from '../../models/lesson';

@Component({
    selector: 'course-list',
    standalone: true,
    imports: [
        MatCardModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        SyncfusionModule,
        TreeComponent
    ],
    templateUrl: './course-list.component.html',
    styleUrls: ['./course-list.component.css']
})
export class CourseListPanelComponent implements OnInit {
    @Output() activeNodeChange = new EventEmitter<TreeNode>();
    courses: Course[] = [];
    expandedCourseIds: string[] = [];
    refreshTrigger: boolean = false;
    activeNode: TreeNode | null = null;

    constructor(
        private apiService: ApiService,
        private toastr: ToastrService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadCourses();
    }

    loadCourses() {
        console.log('Loading courses from API');
        this.apiService.get<Course[]>('course').subscribe({
            next: (courses) => {
                this.courses = courses;
                console.log('Courses loaded successfully:', courses);
            },
            error: (err) => {
                console.error('Failed to load courses:', err);
                this.toastr.error('Failed to load courses: ' + err.message, 'Error', { timeOut: 0 });
            }
        });
    }

    toggleCourse(courseNodeId: string) {
        const course = this.courses.find(c => c.nodeId === courseNodeId);
        if (!course) {
            console.warn('Course not found for nodeId:', courseNodeId);
            return;
        }

        if (this.expandedCourseIds.includes(courseNodeId)) {
            this.expandedCourseIds = this.expandedCourseIds.filter(id => id !== courseNodeId);
            console.log('Collapsed Course Node ID:', courseNodeId, 'Expanded Course IDs:', this.expandedCourseIds);
        } else {
            if (this.expandedCourseIds.length >= 2) {
                const removedCourseId = this.expandedCourseIds.shift();
                console.log('Removed oldest expanded Course Node ID:', removedCourseId);
            }
            this.expandedCourseIds.push(courseNodeId);
            console.log('Expanded Course Node ID:', courseNodeId, 'Expanded Course IDs:', this.expandedCourseIds);

            if (!course.topics) {
                console.log('Fetching topics for course:', course.id);
                this.apiService.getTopicsByCourse(course.id).subscribe({
                    next: (topics) => {
                        course.topics = topics;
                        console.log('Topics loaded for course', course.id, ':', topics.map(t => ({
                            id: t.id,
                            title: t.title,
                            hasChildren: t.hasChildren
                        })));
                        this.cdr.detectChanges();
                        this.selectFirstTopic(course);
                    },
                    error: (err) => {
                        console.error('Failed to load topics for course', course.id, ':', err);
                        this.toastr.error('Failed to load topics: ' + err.message, 'Error');
                    }
                });
            } else {
                console.log('Topics already loaded for course:', course.id);
                this.selectFirstTopic(course);
            }
        }
    }

    private selectFirstTopic(course: Course) {
        if (course.topics && course.topics.length > 0) {
            const firstTopic = course.topics[0];
            const firstNode: TreeNode = {
                id: firstTopic.nodeId,
                text: firstTopic.title,
                nodeType: 'Topic',
                original: firstTopic
            };
            const activeNodeCourseId = this.getCourseIdForNode(this.activeNode);
            if (activeNodeCourseId !== course.id) {
                this.activeNode = firstNode;
                this.activeNodeChange.next(this.activeNode);
                console.log('Selected first topic as active node:', firstNode);
            }
        }
    }

    private getCourseIdForNode(node: TreeNode | null): number | null {
        if (node && node.original) {
            if (node.nodeType === 'Topic') return (node.original as Topic).courseId;
            if (node.nodeType === 'SubTopic') return (node.original as SubTopic).courseId;
            if (node.nodeType === 'Lesson') return (node.original as Lesson).courseId;
        }
        return null;
    }

    onNodeSelected(event: NodeSelectedEvent) {
        this.activeNode = event.node;
        this.activeNodeChange.next(this.activeNode);
        console.log('Node selected:', event.node);
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

    onTopicMoved(event: TopicMovedEvent) {
        console.log('Topic moved event:', event);
        const { topic, sourceCourseId, targetCourseId } = event;
        const sourceCourse = this.courses.find(c => c.id === sourceCourseId);
        const targetCourse = this.courses.find(c => c.id === targetCourseId);

        if (sourceCourse && targetCourse) {
            if (!sourceCourse.topics) sourceCourse.topics = [];
            if (!targetCourse.topics) targetCourse.topics = [];
            sourceCourse.topics = sourceCourse.topics.filter(t => t.id !== topic.id);
            targetCourse.topics.push(topic);

            if (!this.expandedCourseIds.includes(targetCourse.nodeId)) {
                this.expandedCourseIds.push(targetCourse.nodeId);
            }
            if (!this.expandedCourseIds.includes(sourceCourse.nodeId)) {
                this.expandedCourseIds.push(sourceCourse.nodeId);
            }

            this.refreshTrigger = !this.refreshTrigger;
            this.cdr.detectChanges();
            this.toastr.success(`Moved Topic ${topic.title} from Course ${sourceCourse.title} to Course ${targetCourse.title}`);
        } else {
            console.error('Source or target course not found:', { sourceCourseId, targetCourseId });
            this.toastr.error('Failed to update course data after moving topic', 'Error');
            this.loadCourses();
        }
    }

    public triggerChangeDetection() {
        this.refreshTrigger = !this.refreshTrigger;
        this.cdr.detectChanges();
        console.log('Triggered change detection, refreshTrigger:', this.refreshTrigger);
    }
}