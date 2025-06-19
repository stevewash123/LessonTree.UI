// src/app/routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { adminGuard } from './shared/guards/admin.guard';
import { AccountManagementComponent } from './account/account-management/account-management.component';
import { HomeComponent } from './home/home.component';
import { LandingComponent } from './landing/landing.component';
import { LessonTreeContainerComponent } from './lesson-tree-container/lesson-tree-container.component';
import { UserConfigComponent } from './user-config/user-config.component';


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