// auth.service.spec.ts
// Comprehensive unit tests for AuthService - Authentication, JWT token management, and user state
// Tests login, logout, token validation, role checking, and service initialization

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AuthService } from './auth.service';
import { UserService } from '../../user-config/user.service';
import { environment } from '../../../environments/environment';
import { of, throwError } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let jwtHelperSpy: jasmine.SpyObj<JwtHelperService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let routerSpy: jasmine.SpyObj<Router>;

  // Test data fixtures
  const mockValidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNjQwOTk1MjAwfQ.signature';
  const mockExpiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNjQwOTA1MjAwfQ.signature';

  const mockTokenPayload = {
    username: 'testuser',
    exp: 1640995200,
    iat: 1640908800
  };

  const mockLoginResponse = {
    token: mockValidToken,
    message: 'Login successful'
  };

  const mockUserData = {
    id: 1,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    roles: ['User']
  };

  beforeEach(() => {
    // Create spy objects
    const jwtHelperServiceSpy = jasmine.createSpyObj('JwtHelperService', [
      'isTokenExpired',
      'decodeToken'
    ]);
    const userServiceSpyObj = jasmine.createSpyObj('UserService', [
      'loadUserData',
      'clearUserData',
      'hasRole'
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: JwtHelperService, useValue: jwtHelperServiceSpy },
        { provide: UserService, useValue: userServiceSpyObj },
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    jwtHelperSpy = TestBed.inject(JwtHelperService) as jasmine.SpyObj<JwtHelperService>;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default spy behaviors
    jwtHelperSpy.isTokenExpired.and.returnValue(false);
    jwtHelperSpy.decodeToken.and.returnValue(mockTokenPayload);
    userServiceSpy.loadUserData.and.returnValue(of(mockUserData));
    userServiceSpy.hasRole.and.returnValue(false);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      service = TestBed.inject(AuthService);
      expect(service).toBeTruthy();
    });

    it('should initialize with no token in localStorage', () => {
      service = TestBed.inject(AuthService);

      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should initialize with valid token in localStorage', () => {
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      jwtHelperSpy.decodeToken.and.returnValue(mockTokenPayload);

      service = TestBed.inject(AuthService);

      service.currentUser$.subscribe(user => {
        expect(user).toBe('testuser');
      });

      expect(jwtHelperSpy.decodeToken).toHaveBeenCalledWith(mockValidToken);
      expect(userServiceSpy.loadUserData).toHaveBeenCalledWith('testuser');
    });

    it('should clear auth state when token is expired on initialization', () => {
      localStorage.setItem('token', mockExpiredToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(true);

      service = TestBed.inject(AuthService);

      expect(localStorage.getItem('token')).toBeNull();
      expect(userServiceSpy.clearUserData).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['']);
    });

    it('should handle token without username claim', () => {
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      jwtHelperSpy.decodeToken.and.returnValue({ exp: 1640995200 }); // No username

      service = TestBed.inject(AuthService);

      expect(localStorage.getItem('token')).toBeNull();
      expect(userServiceSpy.clearUserData).toHaveBeenCalled();
    });

    it('should handle user data loading error on initialization', () => {
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      jwtHelperSpy.decodeToken.and.returnValue(mockTokenPayload);
      userServiceSpy.loadUserData.and.returnValue(throwError(() => new Error('Load failed')));

      const consoleSpy = spyOn(console, 'error');
      service = TestBed.inject(AuthService);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuthService] Error loading user data on initialization:',
        jasmine.any(Error)
      );
    });
  });

  describe('login()', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should perform successful login', fakeAsync(() => {
      const username = 'testuser';
      const password = 'password123';

      service.login(username, password).subscribe(response => {
        expect(response).toEqual(mockLoginResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        id: 0,
        username: username,
        password: password
      });

      req.flush(mockLoginResponse);
      tick(1); // Handle setTimeout in login method

      expect(localStorage.getItem('token')).toBe(mockValidToken);
      expect(jwtHelperSpy.decodeToken).toHaveBeenCalledWith(mockValidToken);
      expect(userServiceSpy.loadUserData).toHaveBeenCalledWith(username);

      service.currentUser$.subscribe(user => {
        expect(user).toBe(username);
      });
    }));

    it('should handle login with user data loading success', fakeAsync(() => {
      const username = 'testuser';
      const password = 'password123';
      const consoleSpy = spyOn(console, 'log');

      service.login(username, password).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush(mockLoginResponse);
      tick(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuthService] User data loaded successfully after login:',
        mockUserData
      );
    }));

    it('should handle login with user data loading error', fakeAsync(() => {
      const username = 'testuser';
      const password = 'password123';
      const loadError = new Error('User data load failed');

      userServiceSpy.loadUserData.and.returnValue(throwError(() => loadError));
      const consoleSpy = spyOn(console, 'error');

      service.login(username, password).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush(mockLoginResponse);
      tick(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuthService] Error loading user data after login:',
        loadError
      );
    }));

    it('should handle login HTTP error', () => {
      const username = 'wronguser';
      const password = 'wrongpassword';
      const errorResponse = { status: 401, statusText: 'Unauthorized' };

      service.login(username, password).subscribe({
        error: error => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush('Unauthorized', errorResponse);

      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should handle malformed login response', () => {
      const username = 'testuser';
      const password = 'password123';
      const malformedResponse = { invalidProperty: 'value' };

      service.login(username, password).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush(malformedResponse);

      // Should not crash, but token won't be stored
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should clear authentication state', () => {
      localStorage.setItem('token', mockValidToken);
      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(userServiceSpy.clearUserData).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['']);

      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should handle logout when already logged out', () => {
      // Ensure no token exists
      expect(localStorage.getItem('token')).toBeNull();

      service.logout();

      expect(userServiceSpy.clearUserData).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['']);
    });

    it('should emit null user state on logout', () => {
      const userStates: (string | null)[] = [];

      service.currentUser$.subscribe(user => {
        userStates.push(user);
      });

      service.logout();

      expect(userStates).toContain(null);
    });
  });

  describe('isLoggedIn()', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should return true for valid token', () => {
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);

      expect(service.isLoggedIn()).toBeTruthy();
      expect(jwtHelperSpy.isTokenExpired).toHaveBeenCalledWith(mockValidToken);
    });

    it('should return false for expired token', () => {
      localStorage.setItem('token', mockExpiredToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(true);

      expect(service.isLoggedIn()).toBeFalsy();
      expect(jwtHelperSpy.isTokenExpired).toHaveBeenCalledWith(mockExpiredToken);
    });

    it('should return false when no token exists', () => {
      expect(service.isLoggedIn()).toBeFalsy();
      expect(jwtHelperSpy.isTokenExpired).not.toHaveBeenCalled();
    });

    it('should return false for null token', () => {
      localStorage.setItem('token', 'null');

      expect(service.isLoggedIn()).toBeFalsy();
    });

    it('should return false for empty token', () => {
      localStorage.setItem('token', '');

      expect(service.isLoggedIn()).toBeFalsy();
    });
  });

  describe('hasRole()', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should delegate to UserService hasRole method', () => {
      const role = 'Admin';
      userServiceSpy.hasRole.and.returnValue(true);

      const result = service.hasRole(role);

      expect(result).toBeTruthy();
      expect(userServiceSpy.hasRole).toHaveBeenCalledWith(role);
    });

    it('should return false when user does not have role', () => {
      const role = 'SuperAdmin';
      userServiceSpy.hasRole.and.returnValue(false);

      const result = service.hasRole(role);

      expect(result).toBeFalsy();
      expect(userServiceSpy.hasRole).toHaveBeenCalledWith(role);
    });

    it('should handle multiple role checks', () => {
      const roles = ['User', 'Admin', 'Teacher'];
      userServiceSpy.hasRole.and.returnValues(true, false, true);

      const results = roles.map(role => service.hasRole(role));

      expect(results).toEqual([true, false, true]);
      expect(userServiceSpy.hasRole).toHaveBeenCalledTimes(3);
    });
  });

  describe('currentUser$ Observable', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should emit user changes during login flow', fakeAsync(() => {
      const userStates: (string | null)[] = [];

      service.currentUser$.subscribe(user => {
        userStates.push(user);
      });

      // Initial state should be null
      expect(userStates[0]).toBeNull();

      // Perform login
      service.login('testuser', 'password123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush(mockLoginResponse);
      tick(1);

      // Should emit the username after login
      expect(userStates).toContain('testuser');
    }));

    it('should emit null after logout', () => {
      const userStates: (string | null)[] = [];

      service.currentUser$.subscribe(user => {
        userStates.push(user);
      });

      service.logout();

      expect(userStates).toContain(null);
    });

    it('should be a BehaviorSubject that replays current value', () => {
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      jwtHelperSpy.decodeToken.and.returnValue(mockTokenPayload);

      // Create service with token already in localStorage
      service = TestBed.inject(AuthService);

      // New subscriber should immediately get current value
      service.currentUser$.subscribe(user => {
        expect(user).toBe('testuser');
      });
    });
  });

  describe('JWT Token Handling', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should handle invalid JWT tokens gracefully', () => {
      localStorage.setItem('token', 'invalid.jwt.token');
      jwtHelperSpy.decodeToken.and.throwError('Invalid token');

      const consoleSpy = spyOn(console, 'error');

      // Service should not crash on invalid token
      service = TestBed.inject(AuthService);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle JWT decode errors during login', fakeAsync(() => {
      jwtHelperSpy.decodeToken.and.throwError('Decode error');
      const consoleSpy = spyOn(console, 'log');

      service.login('testuser', 'password123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush(mockLoginResponse);
      tick(1);

      // Should handle the error gracefully
      expect(consoleSpy).toHaveBeenCalled();
    }));

    it('should validate token expiration correctly', () => {
      localStorage.setItem('token', mockValidToken);

      // Test with unexpired token
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      expect(service.isLoggedIn()).toBeTruthy();

      // Test with expired token
      jwtHelperSpy.isTokenExpired.and.returnValue(true);
      expect(service.isLoggedIn()).toBeFalsy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should handle localStorage access errors', () => {
      // Mock localStorage to throw error
      spyOn(Storage.prototype, 'getItem').and.throwError('Storage error');
      spyOn(Storage.prototype, 'setItem').and.throwError('Storage error');
      spyOn(Storage.prototype, 'removeItem').and.throwError('Storage error');

      expect(() => service.isLoggedIn()).not.toThrow();
      expect(() => service.logout()).not.toThrow();
    });

    it('should handle network timeout errors during login', () => {
      const username = 'testuser';
      const password = 'password123';

      service.login(username, password).subscribe({
        error: error => {
          expect(error.name).toBe('TimeoutError');
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.error(new ProgressEvent('timeout'));
    });

    it('should handle concurrent login attempts', fakeAsync(() => {
      const username1 = 'user1';
      const username2 = 'user2';

      // Start two login attempts
      service.login(username1, 'password1').subscribe();
      service.login(username2, 'password2').subscribe();

      const requests = httpMock.match(() => true);
      expect(requests.length).toBe(2);

      // Complete second request first
      requests[1].flush({ token: 'token2' });
      requests[0].flush({ token: 'token1' });

      tick(1);

      // Last successful login should win
      service.currentUser$.subscribe(user => {
        expect(user).toBe(username1); // First login completed last
      });
    }));

    it('should handle malformed token payloads', () => {
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      jwtHelperSpy.decodeToken.and.returnValue({}); // Empty payload

      const consoleSpy = spyOn(console, 'error');
      service = TestBed.inject(AuthService);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AuthService] No username found in token - clearing auth state'
      );
    });

    it('should handle UserService dependency errors', () => {
      userServiceSpy.loadUserData.and.throwError('UserService error');
      userServiceSpy.clearUserData.and.throwError('UserService error');
      userServiceSpy.hasRole.and.throwError('UserService error');

      expect(() => service.logout()).not.toThrow();
      expect(() => service.hasRole('Admin')).toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthService);
    });

    it('should complete full authentication lifecycle', fakeAsync(() => {
      const userStates: (string | null)[] = [];

      service.currentUser$.subscribe(user => {
        userStates.push(user);
      });

      // 1. Start logged out
      expect(userStates[0]).toBeNull();
      expect(service.isLoggedIn()).toBeFalsy();

      // 2. Login
      service.login('testuser', 'password123').subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/api/account/login`);
      req.flush(mockLoginResponse);
      tick(1);

      expect(service.isLoggedIn()).toBeTruthy();
      expect(userStates).toContain('testuser');

      // 3. Check role
      userServiceSpy.hasRole.and.returnValue(true);
      expect(service.hasRole('User')).toBeTruthy();

      // 4. Logout
      service.logout();
      expect(service.isLoggedIn()).toBeFalsy();
      expect(userStates).toContain(null);
    }));

    it('should handle session restoration on page refresh', () => {
      // Simulate page refresh with valid token in localStorage
      localStorage.setItem('token', mockValidToken);
      jwtHelperSpy.isTokenExpired.and.returnValue(false);
      jwtHelperSpy.decodeToken.and.returnValue(mockTokenPayload);

      // Create new service instance (simulating page refresh)
      service = TestBed.inject(AuthService);

      expect(service.isLoggedIn()).toBeTruthy();
      service.currentUser$.subscribe(user => {
        expect(user).toBe('testuser');
      });
      expect(userServiceSpy.loadUserData).toHaveBeenCalledWith('testuser');
    });
  });
});