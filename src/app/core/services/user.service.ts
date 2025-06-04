// src/app/core/services/user.service.ts - UPDATED FOR NEW API
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { TeachingConfig, TeachingConfigUpdate, User } from '../../models/user';
import { PeriodAssignment } from '../../models/shared';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private jwtHelper: JwtHelperService
  ) {}

  loadUserData(username: string): Observable<User> {
    return new Observable<User>(observer => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[UserService] No token found in localStorage');
        this.userSubject.next(null);
        observer.error('No token found');
        return;
      }
  
      const decoded = this.jwtHelper.decodeToken(token);
      if (!decoded) {
        console.error('[UserService] Failed to decode token');
        this.userSubject.next(null);
        observer.error('Invalid token');
        return;
      }
  
      const userId = decoded.sub || decoded.nameid || decoded.userId || decoded.id;
      const parsedUserId = userId ? parseInt(userId.toString(), 10) : null;
      
      if (!parsedUserId) {
        console.error('[UserService] No user ID found in token claims');
        this.userSubject.next(null);
        observer.error('No user ID in token');
        return;
      }
  
      const roles = decoded.role
        ? Array.isArray(decoded.role)
          ? decoded.role
          : [decoded.role]
        : [];
  
      const firstName = decoded.firstName || '';
      const lastName = decoded.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const districtId = decoded.districtId ? parseInt(decoded.districtId, 10) : null;
  
      const claims: { [key: string]: string | string[] } = {};
      for (const key in decoded) {
        if (Object.prototype.hasOwnProperty.call(decoded, key)) {
          if (['role', 'districtId', 'firstName', 'lastName', 'sub', 'nameid', 'userId', 'id', 'name', 'iss', 'aud', 'exp', 'iat'].includes(key)) {
            continue;
          }
          claims[key] = decoded[key];
        }
      }
  
      const baseUser: User = {
        id: parsedUserId.toString(),
        username,
        fullName,
        district: districtId,
        roles,
        claims
      };
  
      // UPDATED: Fetch configuration from new endpoint
      this.apiService.get(`User/${parsedUserId}/configuration`).pipe(
        map((configResponse: any) => {
          // Transform API response to TeachingConfig
          const config: TeachingConfig = {
            schoolYear: configResponse.schoolYear || '',
            periodsPerDay: configResponse.periodsPerDay || 6,
            periodAssignments: this.transformPeriodAssignments(configResponse.periodAssignments || []),
            lastModified: new Date(configResponse.lastUpdated || Date.now())
          };
          return { ...baseUser, teachingConfig: config };
        }),
        catchError(error => {
          console.warn('[UserService] Failed to load user configuration, continuing without it:', error);
          return [baseUser];
        })
      ).subscribe({
        next: (userWithConfig) => {
          console.log('[UserService] User data loaded with configuration:', userWithConfig);
          this.userSubject.next(userWithConfig);
          observer.next(userWithConfig);
          observer.complete();
        },
        error: (error) => {
          console.error('[UserService] Error loading user data:', error);
          this.userSubject.next(null);
          observer.error(error);
        }
      });
    });
  }

  // Transform API PeriodAssignmentResource to frontend PeriodAssignment
  private transformPeriodAssignments(apiAssignments: any[]): PeriodAssignment[] {
    return apiAssignments.map((assignment: any) => ({
      id: assignment.id || 0,
      period: assignment.period,
      courseId: assignment.courseId,
      sectionName: assignment.sectionName,  // NEW from API
      room: assignment.room,
      notes: assignment.notes,              // NEW from API
      backgroundColor: assignment.backgroundColor || '#FFFFFF',
      fontColor: assignment.fontColor || '#000000'
    }));
  }

  // Transform frontend PeriodAssignment to API PeriodAssignmentResource
  private transformPeriodAssignmentsForApi(assignments: PeriodAssignment[]): any[] {
    return assignments.map((assignment: PeriodAssignment) => ({
      id: assignment.id,
      period: assignment.period,
      courseId: assignment.courseId,
      sectionName: assignment.sectionName,
      room: assignment.room,
      notes: assignment.notes,
      backgroundColor: assignment.backgroundColor,
      fontColor: assignment.fontColor
    }));
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) ?? false;
  }

  getDistrictId(): number | null {
    const user = this.getCurrentUser();
    return user?.district ?? null;
  }

  getUserId(): string | null {
    const user = this.getCurrentUser();
    return user?.id ?? null;
  }

  clearUserData(): void {
    this.userSubject.next(null);
  }

  // UPDATED: Use new configuration endpoint
  updateTeachingConfig(configUpdate: TeachingConfigUpdate): Observable<TeachingConfig> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No current user found'));
    }
  
    const userId = parseInt(currentUser.id, 10);
    
    // Transform frontend model to API resource
    const apiConfigUpdate = {
      schoolYear: configUpdate.schoolYear,
      periodsPerDay: configUpdate.periodsPerDay,
      periodAssignments: this.transformPeriodAssignmentsForApi(configUpdate.periodAssignments)
    };
    
    return this.apiService.put(`/api/User/${userId}/configuration`, apiConfigUpdate).pipe(
      map((response: any) => {
        // Transform API response back to TeachingConfig
        const updatedConfig: TeachingConfig = {
          schoolYear: response.schoolYear,
          periodsPerDay: response.periodsPerDay,
          periodAssignments: this.transformPeriodAssignments(response.periodAssignments),
          lastModified: new Date(response.lastUpdated || Date.now())
        };
  
        // Update local state immediately
        const updatedUser: User = {
          ...currentUser,
          teachingConfig: updatedConfig
        };
  
        console.log('[UserService] User configuration updated:', updatedConfig);
        this.userSubject.next(updatedUser);
        
        return updatedConfig;
      }),
      catchError(error => {
        console.error('[UserService] Failed to update user configuration:', error);
        return throwError(() => error);
      })
    );
  }
  
  getTeachingConfig(): TeachingConfig | null {
    const user = this.getCurrentUser();
    return user?.teachingConfig ?? null;
  }
  
  hasTeachingConfig(): boolean {
    const user = this.getCurrentUser();
    return user?.teachingConfig !== undefined;
  }

  // NEW: Helper methods for period-specific operations
  getPeriodAssignment(period: number): PeriodAssignment | null {
    const config = this.getTeachingConfig();
    if (!config) return null;
    
    return config.periodAssignments.find(assignment => assignment.period === period) || null;
  }

  getPeriodAssignmentsForCourse(courseId: number): PeriodAssignment[] {
    const config = this.getTeachingConfig();
    if (!config) return [];
    
    return config.periodAssignments.filter(assignment => assignment.courseId === courseId);
  }

  getPeriodsPerDay(): number {
    const config = this.getTeachingConfig();
    return config?.periodsPerDay || 6;
  }

  // NEW: Period configuration helpers for calendar service
  getAllPeriods(): number[] {
    const periodsPerDay = this.getPeriodsPerDay();
    return Array.from({ length: periodsPerDay }, (_, i) => i + 1);
  }

  isPeriodAssigned(period: number): boolean {
    return this.getPeriodAssignment(period) !== null;
  }

  getPeriodCourseId(period: number): number | null {
    const assignment = this.getPeriodAssignment(period);
    return assignment?.courseId || null;
  }
}