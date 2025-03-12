// src/app/routes.ts
import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { HomeComponent } from './home/home.component';
import { CourseManagementComponent } from './course/course-management/course-management.component';
import { LessonManagementComponent } from './lesson/lesson-management/lesson-management.component';
import { AccountManagementComponent } from './account/account-management/account-management.component';
import { UserConfigComponent } from './home/user-config/user-config.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { LessonTreeContainerComponent } from './home/lesson-tree-container/lesson-tree-container.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'lesson-tree', pathMatch: 'full' }, // Updated default route
      { path: 'lesson-tree', component: LessonTreeContainerComponent }, // New default component
      { path: 'courses', component: CourseManagementComponent },
      { path: 'lessons', component: LessonManagementComponent },
      { path: 'account', component: AccountManagementComponent, canActivate: [adminGuard] },
      { path: 'user-config', component: UserConfigComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];