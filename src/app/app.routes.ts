// src/app/routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { HomeComponent } from './home/home.component';
import { LandingComponent } from './landing/landing.component';
import { AccountManagementComponent } from './account/account-management/account-management.component';
import { UserConfigComponent } from './home/user-config/user-config.component';
import { LessonTreeContainerComponent } from './lessontree/lesson-tree-container/lesson-tree-container.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'lesson-tree', pathMatch: 'full' }, // Updated default route
      { path: 'lesson-tree', component: LessonTreeContainerComponent }, // New default component
      { path: 'account', component: AccountManagementComponent, canActivate: [adminGuard] },
      { path: 'user-config', component: UserConfigComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];