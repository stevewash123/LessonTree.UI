// **COMPLETE FILE** - Can directly replace existing home.component.ts
// RESPONSIBILITY: Main layout with toolbar and modal user configuration
// DOES NOT: Handle user configuration logic directly
// CALLED BY: Router and application shell

import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { ReportService } from '../shared/services/report.service';
import { UserConfigComponent } from '../user-config/user-config.component';
import { ToolbarControlsService } from '../shared/services/toolbar-controls.service';
import { CourseFilterDialogComponent } from '../lesson-tree/course-filter/course-filter-dialog.component';
import { LayoutMode } from '../lesson-tree-container/layout-mode.service';
import {ScheduleConfigComponent} from '../schedule-config/schedule-config.component';
import {DragMode} from '../lesson-tree/services/state/node-drag-mode.service';

@Component({
    selector: 'app-home',
    imports: [
        CommonModule,
        FormsModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatTooltipModule,
        MatSidenavModule,
        MatDividerModule,
        RouterOutlet,
        RouterLink
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
    @ViewChild('toolbar') toolbar!: ElementRef;
    @ViewChild('navMenu') navMenu: any;
    @ViewChild('accountMenu') accountMenu: any;
    toolbarHeight: number | undefined;

    private dialog = inject(MatDialog);
    public toolbarControls = inject(ToolbarControlsService);

    // Submenu states
    dragModeExpanded = false;
    layoutModeExpanded = false;


    constructor(public authService: AuthService, private reportService: ReportService, private router: Router) { }

    ngAfterViewInit() {
        if(this.toolbar && this.toolbar.nativeElement){
            this.toolbarHeight = this.toolbar.nativeElement.offsetHeight;
        }

    }


    // Submenu toggle methods
    toggleDragModeSubmenu(): void {
        this.dragModeExpanded = !this.dragModeExpanded;
        if (this.dragModeExpanded) {
            this.layoutModeExpanded = false; // Close other submenus
        }
    }

    toggleLayoutModeSubmenu(): void {
        this.layoutModeExpanded = !this.layoutModeExpanded;
        if (this.layoutModeExpanded) {
            this.dragModeExpanded = false; // Close other submenus
        }
    }

    // Action methods
    setDragMode(mode: string): void {
        const dragMode = mode === 'copy' ? DragMode.Copy : DragMode.Move;
        console.log(`[HomeComponent] Drag mode changed to: ${dragMode}`, { timestamp: new Date().toISOString() });
        this.toolbarControls.setDragMode(dragMode);
        this.dragModeExpanded = false; // Close submenu after selection
    }

    setLayoutMode(mode: LayoutMode): void {
        console.log(`[HomeComponent] Layout mode changed to: ${mode}`, { timestamp: new Date().toISOString() });
        this.toolbarControls.setLayoutMode(mode);
        this.layoutModeExpanded = false; // Close submenu after selection
    }


    openCourseFilterDialog(): void {
        this.closeNavMenu();
        
        const currentFilters = this.toolbarControls.getCurrentCourseFilters();
        const districtId = this.toolbarControls.getDistrictId();

        const dialogRef = this.dialog.open(CourseFilterDialogComponent, {
            width: '300px',
            data: {
                districtId: districtId,
                courseFilter: currentFilters.courseFilter,
                visibilityFilter: currentFilters.visibilityFilter,
                searchTerm: currentFilters.searchTerm
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('[HomeComponent] Course filters applied from dialog', {
                    courseFilter: result.courseFilter,
                    visibilityFilter: result.visibilityFilter,
                    searchTerm: result.searchTerm,
                    timestamp: new Date().toISOString()
                });

                // Update the service state
                this.toolbarControls.setCourseFilterState({
                    courseFilter: result.courseFilter,
                    visibilityFilter: result.visibilityFilter,
                    searchTerm: result.searchTerm
                });

            }
        });
    }

    openUserConfig() {
        this.closeNavMenu();
        
        const dialogRef = this.dialog.open(UserConfigComponent, {
            width: '800px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            disableClose: false,
            autoFocus: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('User configuration saved:', result);
                // Could add success notification here
            }
        });
    }

    openScheduleConfig() {
        this.closeNavMenu();
        
        const dialogRef = this.dialog.open(ScheduleConfigComponent, {
            width: '1000px',  // Changed from '800px'
            maxWidth: '95vw',
            maxHeight: '90vh',
            disableClose: false,
            autoFocus: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('Schedule configuration saved:', result);
            }
        });
    }

    generateWeeklyReport() {
        this.closeNavMenu();
        
        // Get current week start date
        const weekStart = this.reportService.getCurrentWeekStart();
        
        console.log('Generating weekly report for week starting:', weekStart);
        this.reportService.downloadWeeklyReport(weekStart);
    }

    logout() {
        this.closeNavMenu();
        this.authService.logout();
    }

    closeNavMenu() {
        if (this.accountMenu) {
            this.accountMenu.closed.emit();
        }
        if (this.navMenu) {
            this.navMenu.closed.emit();
        }
    }

    getPageTitle(): string {
        const url = this.router.url;
        if (url.includes('/courses')) {
            return 'Courses';
        } else if (url.includes('/lessons')) {
            return 'Lessons';
        } else if (url.includes('/account')) {
            return 'Account Management';
        }
        return 'LessonTree';
    }
}
