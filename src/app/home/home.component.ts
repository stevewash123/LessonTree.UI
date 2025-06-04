// **COMPLETE FILE** - Can directly replace existing home.component.ts
// RESPONSIBILITY: Main layout with toolbar and modal user configuration
// DOES NOT: Handle user configuration logic directly
// CALLED BY: Router and application shell

import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { UserConfigComponent } from './user-config/user-config.component';
import { ToolbarControlsService } from '../core/services/toolbar-controls.service';
import { CourseFilterDialogComponent } from '../lessontree/course-list/course-filter/course-filter-dialog.component';
import { DragMode } from '../core/services/node-operations.service';
import { LayoutMode } from '../core/services/layout-mode.service';

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
        RouterOutlet,
        RouterLink
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
    @ViewChild('toolbar') toolbar!: ElementRef;
    toolbarHeight: number | undefined;
    
    private dialog = inject(MatDialog);
    public toolbarControls = inject(ToolbarControlsService);

    // Disclosure widget state
    private readonly _controlsVisible = signal(false);
    readonly controlsVisible = this._controlsVisible.asReadonly();

    // Local form state for the disclosure widget
    searchTerm = '';
  
    constructor(public authService: AuthService) { }
  
    ngAfterViewInit() {
        if(this.toolbar && this.toolbar.nativeElement){
            this.toolbarHeight = this.toolbar.nativeElement.offsetHeight;
        }
        
        // Initialize search term from service
        this.searchTerm = this.toolbarControls.courseFilterState().searchTerm;
    }

    toggleControlsVisibility() {
        const newValue = !this._controlsVisible();
        console.log(`[HomeComponent] Toggling controls visibility to: ${newValue}`, { timestamp: new Date().toISOString() });
        this._controlsVisible.set(newValue);
    }

    onLayoutModeChange(mode: LayoutMode): void {
        console.log(`[HomeComponent] Layout mode changed to: ${mode}`, { timestamp: new Date().toISOString() });
        this.toolbarControls.setLayoutMode(mode);
    }

    onDragModeChange(mode: string): void {
        const dragMode = mode === 'copy' ? DragMode.Copy : DragMode.Move;
        console.log(`[HomeComponent] Drag mode changed to: ${dragMode}`, { timestamp: new Date().toISOString() });
        this.toolbarControls.setDragMode(dragMode);
    }

    onSearchTermChange(): void {
        console.log(`[HomeComponent] Search term changed to: ${this.searchTerm}`, { timestamp: new Date().toISOString() });
        this.toolbarControls.setSearchTerm(this.searchTerm);
    }

    openCourseFilterDialog(): void {
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

                // Update local search term
                this.searchTerm = result.searchTerm;
            }
        });
    }

    openUserConfig() {
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
  
    logout() {
        this.authService.logout();
    }
}