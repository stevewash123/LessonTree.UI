import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7238/account';
  private currentUserSubject = new BehaviorSubject<string | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private jwtHelper: JwtHelperService) {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.currentUserSubject.next(this.jwtHelper.decodeToken(token).unique_name);
    }
  }

  login(username: string, password: string): Observable<any> {
    const payload = { id: 0, username, password }; // Match UserResource
    return this.http.post<any>(`${this.apiUrl}/login`, payload).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next(username);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return token != null && !this.jwtHelper.isTokenExpired(token);
  }

  hasRole(role: string): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const decoded = this.jwtHelper.decodeToken(token);
    return decoded.role === role || (Array.isArray(decoded.role) && decoded.role.includes(role));
  }
}