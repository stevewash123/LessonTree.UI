// src/app/core/services/user.service.ts - UPDATED FOR NEW API
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, forkJoin, map, Observable, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { PeriodAssignment } from '../../models/period-assignment';
import { User, getFullName, UserProfileUpdate } from '../../models/user';
import { UserConfiguration, UserConfigurationUpdate } from '../../models/user-configuration.model';

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
    console.log('[UserService] loadUserData called with username:', username);
    
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
  
      // DEBUG: Show what we're working with
      console.log('[UserService] Full JWT decoded token:', decoded);
      console.log('[UserService] Available JWT claims:', Object.keys(decoded));
      
      // Try multiple possible user ID fields
      const possibleUserIds = {
        sub: decoded.sub,
        nameid: decoded.nameid, 
        userId: decoded.userId,
        id: decoded.id,
        unique_name: decoded.unique_name,
        username: decoded.username
      };
      
      console.log('[UserService] Possible user ID fields:', possibleUserIds);
      
      const userId = decoded.sub || decoded.nameid || decoded.userId || decoded.id;
      console.log('[UserService] Selected userId before parsing:', userId);
      
      const parsedUserId = userId ? parseInt(userId.toString(), 10) : null;
      console.log('[UserService] Parsed user ID:', parsedUserId);
      
      if (!parsedUserId) {
        console.error('[UserService] No user ID found in token claims');
        console.error('[UserService] Token structure:', {
          hasUserId: !!decoded.userId,
          hasId: !!decoded.id,
          hasSub: !!decoded.sub,
          hasNameId: !!decoded.nameid,
          allClaims: Object.keys(decoded)
        });
        this.userSubject.next(null);
        observer.error('No user ID in token');
        return;
      }
  
      // Extract profile data from JWT (identity data)
      const roles = decoded.role
        ? Array.isArray(decoded.role)
          ? decoded.role
          : [decoded.role]
        : [];
  
      const claims: { [key: string]: string | string[] } = {};
      for (const key in decoded) {
        if (Object.prototype.hasOwnProperty.call(decoded, key)) {
          if (['role', 'firstName', 'lastName', 'email', 'phone', 'sub', 'nameid', 'userId', 'id', 'name', 'iss', 'aud', 'exp', 'iat'].includes(key)) {
            continue;
          }
          claims[key] = decoded[key];
        }
      }
  
      // Base user from JWT (identity data)
      const baseUser: User = {
        id: parsedUserId.toString(),
        username,
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
        email: decoded.email || '',
        phone: decoded.phone || '',
        roles,
        claims
      };
  
      console.log('[UserService] User identity loaded from JWT:', {
        id: baseUser.id,
        username: baseUser.username,
        fullName: getFullName(baseUser),
        roles: baseUser.roles
      });
  
      // Load application data from API
      forkJoin({
        user: this.apiService.getUser(parsedUserId),           // For district
        config: this.apiService.getUserConfiguration(parsedUserId) // For configuration
      }).pipe(
        map(({ user: userResponse, config: configResponse }) => {
          // Add application data from API
          const userWithAppData: User = {
            ...baseUser,
            district: userResponse.district || undefined
          };
  
          // Add configuration if available
          if (configResponse) {
            const config: UserConfiguration = {
                lastUpdated: new Date(configResponse.lastUpdated || Date.now()),
                schoolYear: configResponse.schoolYear,
                periodsPerDay: configResponse.periodsPerDay || 6,
                startDate: configResponse.startDate ? new Date(configResponse.startDate) : this.getDefaultSchoolYearStart(),
                endDate: configResponse.endDate ? new Date(configResponse.endDate) : this.getDefaultSchoolYearEnd(),
                periodAssignments: this.transformPeriodAssignments(configResponse.periodAssignments || [])
              };
              
            userWithAppData.configuration = config;
          }
  
          return userWithAppData;
        }),
        catchError(error => {
          console.warn('[UserService] Failed to load application data, continuing with JWT data only:', error);
          return [baseUser]; // Return user without application data
        })
      ).subscribe({
        next: (completeUser) => {
            console.log('[UserService] About to set user in userSubject:', {
                userId: completeUser.id,
                username: completeUser.username,
                hasConfiguration: !!completeUser.configuration
              });
          this.userSubject.next(completeUser);
          console.log('[UserService] User set in userSubject. Current value check:', {
            subjectValue: this.userSubject.value,
            isNull: this.userSubject.value === null
          });
          observer.next(completeUser);
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
        id: assignment.id,
        period: assignment.period,
        courseId: assignment.courseId,
        specialPeriodType: assignment.specialPeriodType,
        room: assignment.room,
        notes: assignment.notes,
        teachingDays: assignment.teachingDays 
          ? (typeof assignment.teachingDays === 'string' 
              ? assignment.teachingDays.split(',').filter((day: string) => day.trim().length > 0)
              : assignment.teachingDays)
          : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], // Default M-F
        backgroundColor: assignment.backgroundColor,
        fontColor: assignment.fontColor
      }));
  }

  getCurrentUser(): User | null {
    const user = this.userSubject.value;
    
    // Minimal logging - only when there's an issue
    if (!user && localStorage.getItem('token')) {
      console.warn('[UserService] Token exists but no user loaded - may need to call loadUserData()');
    }
    
    return user;
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
    console.log('[UserService] clearUserData() called - CLEARING USER STATE');
    console.log('[UserService] Stack trace:', new Error().stack?.split('\n').slice(1, 5));
    this.userSubject.next(null);
  }

  updateUserProfile(profileUpdate: UserProfileUpdate): Observable<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No current user found'));
    }
  
    const userId = parseInt(currentUser.id, 10);
    
    // Prepare API payload - compute fullName from firstName + lastName
    const apiProfileUpdate = {
      id: userId,
      username: currentUser.username, // Keep existing username
      firstName: profileUpdate.firstName,
      lastName: profileUpdate.lastName,
      fullName: `${profileUpdate.firstName} ${profileUpdate.lastName}`.trim(), // Computed
      district: currentUser.district, // Keep existing district
      email: profileUpdate.email || currentUser.email || '', // Use existing if not provided
      phone: profileUpdate.phone || currentUser.phone || ''   // Use existing if not provided
    };
    
    console.log('[UserService] Updating user profile:', apiProfileUpdate);
    
    return this.apiService.updateUser(userId, apiProfileUpdate).pipe(
      map((response: any) => {
        // Update local user state - no fullName property needed
        const updatedUser: User = {
          ...currentUser,
          firstName: profileUpdate.firstName,
          lastName: profileUpdate.lastName,
          email: profileUpdate.email || currentUser.email,
          phone: profileUpdate.phone || currentUser.phone
        };
  
        console.log('[UserService] User profile updated:', updatedUser);
        console.log('[UserService] Computed full name:', getFullName(updatedUser));
        this.userSubject.next(updatedUser);
        
        return updatedUser;
      }),
      catchError(error => {
        console.error('[UserService] Failed to update user profile:', error);
        return throwError(() => error);
      })
    );
  }

  updateUserConfiguration(configUpdate: UserConfigurationUpdate): Observable<UserConfiguration> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
        return throwError(() => new Error('No current user found'));
    }

    const userId = parseInt(currentUser.id, 10);
    
    return this.apiService.updateUserConfiguration(userId, configUpdate).pipe(
        map((response: any) => {
            const updatedConfig: UserConfiguration = {
                lastUpdated: new Date(response.lastUpdated || Date.now()),
                schoolYear: response.schoolYear,
                periodsPerDay: response.periodsPerDay,
                startDate: response.startDate ? new Date(response.startDate) : this.getDefaultSchoolYearStart(),
                endDate: response.endDate ? new Date(response.endDate) : this.getDefaultSchoolYearEnd(),
                periodAssignments: this.transformPeriodAssignments(response.periodAssignments || [])
              }

            const updatedUser: User = {
                ...currentUser,
                configuration: updatedConfig
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

  private getDefaultSchoolYearStart(): Date {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-based
    
    // If we're before August (months 0-6), use previous year's Aug 1
    // If we're August or later (months 7-11), use current year's Aug 1
    const schoolYearStartYear = currentMonth < 7 ? currentYear - 1 : currentYear;
    
    return new Date(schoolYearStartYear, 7, 1); // August 1st
  }
  
  private getDefaultSchoolYearEnd(): Date {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-based
    
    // If we're before August, school year ends this year
    // If we're August or later, school year ends next year
    const schoolYearEndYear = currentMonth < 7 ? currentYear : currentYear + 1;
    
    return new Date(schoolYearEndYear, 5, 15); // June 15th
  }
  
  getUserConfiguration(): UserConfiguration | null {
    const user = this.getCurrentUser();
    return user?.configuration ?? null;
  }
  
  hasUserConfiguration(): boolean {
    const user = this.getCurrentUser();
    return user?.configuration !== undefined;
  }

    getPeriodAssignment(period: number): PeriodAssignment | null {
        const config = this.getUserConfiguration();
        if (!config) return null;
        
        return config.periodAssignments?.find(assignment => assignment.period === period) || null;
    }

    getPeriodAssignmentsForCourse(courseId: number): PeriodAssignment[] {
        const config = this.getUserConfiguration();
        if (!config || !config.periodAssignments) return [];
        
        return config.periodAssignments.filter(assignment => assignment.courseId === courseId);
    }

    getPeriodsPerDay(): number {
        const config = this.getUserConfiguration();
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