import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from '../../user-config/user.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api/account`;
  private currentUserSubject = new BehaviorSubject<string | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService,
    private userService: UserService,
    private router: Router
  ) {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      // DEBUG: Show what's actually in the token
      const decoded = this.jwtHelper.decodeToken(token);
      console.log('[AuthService] JWT token contents:', decoded);
      console.log('[AuthService] Available claims:', Object.keys(decoded));

      // FIX: Use 'username' instead of 'unique_name'
      const username = decoded.username;
      console.log('[AuthService] Extracted username:', username);

      if (username) {
        this.currentUserSubject.next(username);
        // Load user data if token is valid
        console.log('[AuthService] Loading user data for:', username);
        this.userService.loadUserData(username).subscribe({
          next: (user) => {
            console.log('[AuthService] User data loaded on initialization:', user);
          },
          error: (error) => {
            console.error('[AuthService] Error loading user data on initialization:', error);
          }
        });
      } else {
        console.error('[AuthService] No username found in token - clearing auth state');
        this.logout();
      }
    } else {
      console.log('[AuthService] No valid token found during initialization');
    }
  }

  login(username: string, password: string): Observable<any> {
    const payload = { id: 0, username, password }; // Match UserResource
    return this.http.post<any>(`${this.baseUrl}/login`, payload).pipe(
      tap(response => {
        console.log('[AuthService] Login response received');
        localStorage.setItem('token', response.token);

        // DEBUG: Show what's in the new token
        const decoded = this.jwtHelper.decodeToken(response.token);
        console.log('[AuthService] New JWT token contents:', decoded);
        console.log('[AuthService] Available claims:', Object.keys(decoded));

        this.currentUserSubject.next(username);

        // 🔧 FIXED: Use setTimeout to ensure token is fully committed to localStorage
        // This prevents the race condition where UserService checks for token before it's stored
        setTimeout(() => {
          console.log('[AuthService] Loading user data after login for:', username);
          this.userService.loadUserData(username).subscribe({
            next: (user) => {
              console.log('[AuthService] User data loaded successfully after login:', user);
            },
            error: (error) => {
              console.error('[AuthService] Error loading user data after login:', error);
            }
          });
        }, 0); // Minimal delay to ensure localStorage operation completes
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.userService.clearUserData(); // Clear user data in UserService
    this.router.navigate(['']); // Redirect to landing page
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return token != null && !this.jwtHelper.isTokenExpired(token);
  }

  hasRole(role: string): boolean {
    return this.userService.hasRole(role); // Delegate to UserService
  }
}
