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
          // Skip known properties that_are already mapped (e.g., role, districtId)
          if (key === 'role' || key === 'districtId' || key === 'firstName' || key === 'lastName' || key === 'sub' || key === 'name' || key === 'iss' || key === 'aud' || key === 'exp' || key === 'iat') {
            continue;
          }
          claims[key] = decoded[key];
        }
      }

      // Create the user object
      const user: User = {
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

  // Clear user data on logout
  clearUserData(): void {
    this.userSubject.next(null);
  }
}