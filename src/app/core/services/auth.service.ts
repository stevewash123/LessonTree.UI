import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/account`;
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
      const username = this.jwtHelper.decodeToken(token).unique_name;
      this.currentUserSubject.next(username);
      // Load user data if token is valid
      this.userService.loadUserData(username).subscribe({
        next: () => {
          console.log('[AuthService] User data loaded on initialization');
        },
        error: (error) => {
          console.error('[AuthService] Error loading user data on initialization:', error);
        }
      });
    }
  }

  login(username: string, password: string): Observable<any> {
    const payload = { id: 0, username, password }; // Match UserResource
    return this.http.post<any>(`${this.baseUrl}/login`, payload).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next(username);
        // Load user data after successful login
        this.userService.loadUserData(username).subscribe({
          next: () => {
            console.log('[AuthService] User data loaded successfully after login');
          },
          error: (error) => {
            console.error('[AuthService] Error loading user data after login:', error);
          }
        });
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