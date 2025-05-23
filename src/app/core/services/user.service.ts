// src/app/core/services/user.service.ts - COMPLETE FILE
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service'; // Use ApiService for HTTP requests
import { JwtHelperService } from '@auth0/angular-jwt';
import { User } from '../../models/user';

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
      // First, check if the JWT token contains the necessary data
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[UserService] No token found in localStorage');
        this.userSubject.next(null);
        observer.error('No token found');
        return;
      }

      // Decode the JWT token to extract claims
      const decoded = this.jwtHelper.decodeToken(token);
      if (!decoded) {
        console.error('[UserService] Failed to decode token');
        this.userSubject.next(null);
        observer.error('Invalid token');
        return;
      }

      // Extract user ID (could be in 'sub', 'nameid', 'userId', or 'id' claim)
      const userId = decoded.sub || decoded.nameid || decoded.userId || decoded.id;
      const parsedUserId = userId ? parseInt(userId.toString(), 10) : null;
      
      if (!parsedUserId) {
        console.error('[UserService] No user ID found in token claims');
        this.userSubject.next(null);
        observer.error('No user ID in token');
        return;
      }

      // Extract roles
      const roles = decoded.role
        ? Array.isArray(decoded.role)
          ? decoded.role
          : [decoded.role]
        : [];

      // Extract fullName (combine firstName and lastName from token)
      const firstName = decoded.firstName || '';
      const lastName = decoded.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      // Extract districtId from claims
      const districtId = decoded.districtId ? parseInt(decoded.districtId, 10) : null;

      // Extract all claims into a dictionary
      const claims: { [key: string]: string | string[] } = {};
      for (const key in decoded) {
        if (Object.prototype.hasOwnProperty.call(decoded, key)) {
          // Skip known properties that are already mapped
          if (['role', 'districtId', 'firstName', 'lastName', 'sub', 'nameid', 'userId', 'id', 'name', 'iss', 'aud', 'exp', 'iat'].includes(key)) {
            continue;
          }
          claims[key] = decoded[key];
        }
      }

      // Create the user object
      const user: User = {
        id: parsedUserId.toString(), // Convert to string for User model
        username,
        fullName,
        district: districtId,
        roles,
        claims
      };

      console.log('[UserService] User data loaded:', user);
      this.userSubject.next(user);
      observer.next(user);
      observer.complete();
    });
  }

  // Get the current user
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  // Check if the user has a specific role
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) ?? false;
  }

  // Get the DistrictId
  getDistrictId(): number | null {
    const user = this.getCurrentUser();
    return user?.district ?? null;
  }

  // Get the User ID
  getUserId(): string | null {
    const user = this.getCurrentUser();
    return user?.id ?? null;
  }

  // Clear user data on logout
  clearUserData(): void {
    this.userSubject.next(null);
  }
}