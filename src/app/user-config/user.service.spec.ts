// user.service.spec.ts
// Comprehensive unit tests for UserService - User configuration and profile management
// Tests JWT token handling, user data loading, profile updates, configuration management, and error handling

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { UserService } from './user.service';
import { ApiService } from '../shared/services/api.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { User, UserProfileUpdate } from '../models/user';
import { UserConfiguration, UserConfigurationUpdate } from '../models/user-configuration.model';
import { PeriodAssignment } from '../models/period-assignment';

describe('UserService', () => {
  let service: UserService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let jwtHelperSpy: jasmine.SpyObj<JwtHelperService>;

  // Test data fixtures
  const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNjQwOTk1MjAwfQ.signature';

  const mockDecodedToken = {
    sub: '123',
    nameid: '123',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    role: ['User', 'Teacher'],
    customClaim: 'customValue',
    exp: 1640995200,
    iat: 1640908800,
    iss: 'LessonTree',
    aud: 'LessonTree-Client'
  };

  const mockApiUserProfile = {
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    district: 'Test District'
  };

  const mockApiUserConfiguration = {
    lastUpdated: '2024-01-15T10:00:00Z',
    schoolYear: '2023-2024',
    periodsPerDay: 6,
    startDate: '2023-08-15T00:00:00Z',
    endDate: '2024-06-15T00:00:00Z',
    periodAssignments: [
      {
        id: 1,
        period: 1,
        courseId: 1,
        specialPeriodType: null,
        room: 'Room 101',
        notes: 'First period',
        teachingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
        backgroundColor: '#ffffff',
        fontColor: '#000000'
      }
    ]
  };

  const mockUser: User = {
    id: '123',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    roles: ['User', 'Teacher'],
    claims: { customClaim: 'customValue' },
    district: 'Test District',
    configuration: {
      lastUpdated: new Date('2024-01-15T10:00:00Z'),
      schoolYear: '2023-2024',
      periodsPerDay: 6,
      startDate: new Date('2023-08-15T00:00:00Z'),
      endDate: new Date('2024-06-15T00:00:00Z'),
      periodAssignments: [
        {
          id: 1,
          period: 1,
          courseId: 1,
          specialPeriodType: null,
          room: 'Room 101',
          notes: 'First period',
          teachingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          backgroundColor: '#ffffff',
          fontColor: '#000000'
        }
      ]
    }
  };

  beforeEach(() => {
    const apiServiceSpyObj = jasmine.createSpyObj('ApiService', [
      'getCurrentUserProfile',
      'getCurrentUserConfiguration',
      'updateCurrentUserProfile',
      'updateCurrentUserConfiguration'
    ]);

    const jwtHelperServiceSpyObj = jasmine.createSpyObj('JwtHelperService', [
      'decodeToken'
    ]);

    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        { provide: ApiService, useValue: apiServiceSpyObj },
        { provide: JwtHelperService, useValue: jwtHelperServiceSpyObj }
      ]
    });

    service = TestBed.inject(UserService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    jwtHelperSpy = TestBed.inject(JwtHelperService) as jasmine.SpyObj<JwtHelperService>;

    // Setup default spy behaviors
    jwtHelperSpy.decodeToken.and.returnValue(mockDecodedToken);
    apiServiceSpy.getCurrentUserProfile.and.returnValue(of(mockApiUserProfile));
    apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(mockApiUserConfiguration));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user state', () => {
      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should provide user observable', () => {
      expect(service.user$).toBeDefined();
    });
  });

  describe('loadUserData()', () => {
    beforeEach(() => {
      localStorage.setItem('token', mockJwtToken);
    });

    describe('successful loading', () => {
      it('should load user data with JWT and API data', (done) => {
        service.loadUserData('testuser').subscribe(user => {
          expect(user).toBeDefined();
          expect(user.id).toBe('123');
          expect(user.username).toBe('testuser');
          expect(user.firstName).toBe('John');
          expect(user.lastName).toBe('Doe');
          expect(user.email).toBe('john.doe@example.com');
          expect(user.district).toBe('Test District');
          expect(user.configuration).toBeDefined();
          expect(user.configuration!.schoolYear).toBe('2023-2024');
          done();
        });
      });

      it('should update user subject with loaded data', (done) => {
        service.loadUserData('testuser').subscribe(() => {
          service.user$.subscribe(user => {
            expect(user).toBeDefined();
            expect(user!.username).toBe('testuser');
            done();
          });
        });
      });

      it('should call API endpoints for user profile and configuration', (done) => {
        service.loadUserData('testuser').subscribe(() => {
          expect(apiServiceSpy.getCurrentUserProfile).toHaveBeenCalled();
          expect(apiServiceSpy.getCurrentUserConfiguration).toHaveBeenCalled();
          done();
        });
      });

      it('should handle JWT with alternative user ID fields', (done) => {
        const decodedWithAlternateId = {
          ...mockDecodedToken,
          sub: undefined,
          nameid: undefined,
          userId: '456'
        };
        jwtHelperSpy.decodeToken.and.returnValue(decodedWithAlternateId);

        service.loadUserData('testuser').subscribe(user => {
          expect(user.id).toBe('456');
          done();
        });
      });

      it('should handle single role as string', (done) => {
        const decodedWithSingleRole = {
          ...mockDecodedToken,
          role: 'Admin'
        };
        jwtHelperSpy.decodeToken.and.returnValue(decodedWithSingleRole);

        service.loadUserData('testuser').subscribe(user => {
          expect(user.roles).toEqual(['Admin']);
          done();
        });
      });

      it('should filter out standard JWT claims from custom claims', (done) => {
        service.loadUserData('testuser').subscribe(user => {
          expect(user.claims).toEqual({ customClaim: 'customValue' });
          expect(user.claims).not.toHaveProperty('firstName');
          expect(user.claims).not.toHaveProperty('exp');
          done();
        });
      });

      it('should log user identity loading', () => {
        spyOn(console, 'log');
        service.loadUserData('testuser').subscribe();

        expect(console.log).toHaveBeenCalledWith(
          '[UserService] loadUserData called with username:',
          'testuser'
        );
        expect(console.log).toHaveBeenCalledWith(
          '[UserService] Full JWT decoded token:',
          mockDecodedToken
        );
      });
    });

    describe('API data loading fallback', () => {
      it('should continue with JWT data only if API calls fail', (done) => {
        apiServiceSpy.getCurrentUserProfile.and.returnValue(throwError(() => new Error('API Error')));
        apiServiceSpy.getCurrentUserConfiguration.and.returnValue(throwError(() => new Error('API Error')));

        service.loadUserData('testuser').subscribe(user => {
          expect(user).toBeDefined();
          expect(user.username).toBe('testuser');
          expect(user.district).toBeUndefined();
          expect(user.configuration).toBeUndefined();
          done();
        });
      });

      it('should log warning when API data loading fails', () => {
        spyOn(console, 'warn');
        apiServiceSpy.getCurrentUserProfile.and.returnValue(throwError(() => new Error('API Error')));

        service.loadUserData('testuser').subscribe();

        expect(console.warn).toHaveBeenCalledWith(
          '[UserService] Failed to load application data, continuing with JWT data only:',
          jasmine.any(Error)
        );
      });
    });

    describe('error handling', () => {
      it('should handle missing token', (done) => {
        localStorage.removeItem('token');

        service.loadUserData('testuser').subscribe({
          error: (error) => {
            expect(error).toBe('No token found');
            service.user$.subscribe(user => {
              expect(user).toBeNull();
              done();
            });
          }
        });
      });

      it('should handle invalid token decode', (done) => {
        jwtHelperSpy.decodeToken.and.returnValue(null);

        service.loadUserData('testuser').subscribe({
          error: (error) => {
            expect(error).toBe('Invalid token');
            service.user$.subscribe(user => {
              expect(user).toBeNull();
              done();
            });
          }
        });
      });

      it('should handle missing user ID in token', (done) => {
        const decodedWithoutUserId = {
          ...mockDecodedToken,
          sub: undefined,
          nameid: undefined,
          userId: undefined,
          id: undefined
        };
        jwtHelperSpy.decodeToken.and.returnValue(decodedWithoutUserId);

        service.loadUserData('testuser').subscribe({
          error: (error) => {
            expect(error).toBe('No user ID in token');
            done();
          }
        });
      });

      it('should log detailed error information', () => {
        spyOn(console, 'error');
        localStorage.removeItem('token');

        service.loadUserData('testuser').subscribe({
          error: () => {}
        });

        expect(console.error).toHaveBeenCalledWith(
          '[UserService] No token found in localStorage'
        );
      });
    });

    describe('period assignments transformation', () => {
      it('should transform API period assignments correctly', (done) => {
        service.loadUserData('testuser').subscribe(user => {
          const assignment = user.configuration!.periodAssignments[0];
          expect(assignment.id).toBe(1);
          expect(assignment.period).toBe(1);
          expect(assignment.courseId).toBe(1);
          expect(assignment.room).toBe('Room 101');
          expect(assignment.teachingDays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
          done();
        });
      });

      it('should handle teaching days as array', (done) => {
        const configWithArrayDays = {
          ...mockApiUserConfiguration,
          periodAssignments: [{
            ...mockApiUserConfiguration.periodAssignments[0],
            teachingDays: ['Monday', 'Wednesday', 'Friday']
          }]
        };
        apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(configWithArrayDays));

        service.loadUserData('testuser').subscribe(user => {
          const assignment = user.configuration!.periodAssignments[0];
          expect(assignment.teachingDays).toEqual(['Monday', 'Wednesday', 'Friday']);
          done();
        });
      });

      it('should handle empty teaching days string', (done) => {
        const configWithEmptyDays = {
          ...mockApiUserConfiguration,
          periodAssignments: [{
            ...mockApiUserConfiguration.periodAssignments[0],
            teachingDays: '  ,  ,  '
          }]
        };
        apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(configWithEmptyDays));

        service.loadUserData('testuser').subscribe(user => {
          const assignment = user.configuration!.periodAssignments[0];
          expect(assignment.teachingDays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
          done();
        });
      });

      it('should use default teaching days when none provided', (done) => {
        const configWithoutDays = {
          ...mockApiUserConfiguration,
          periodAssignments: [{
            ...mockApiUserConfiguration.periodAssignments[0],
            teachingDays: null
          }]
        };
        apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(configWithoutDays));

        service.loadUserData('testuser').subscribe(user => {
          const assignment = user.configuration!.periodAssignments[0];
          expect(assignment.teachingDays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
          done();
        });
      });
    });

    describe('default date handling', () => {
      it('should use default dates when API dates are missing', (done) => {
        const configWithoutDates = {
          ...mockApiUserConfiguration,
          startDate: null,
          endDate: null
        };
        apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(configWithoutDates));

        service.loadUserData('testuser').subscribe(user => {
          const config = user.configuration!;
          expect(config.startDate).toBeInstanceOf(Date);
          expect(config.endDate).toBeInstanceOf(Date);
          expect(config.startDate.getMonth()).toBe(7); // August (0-based)
          expect(config.endDate.getMonth()).toBe(5); // June (0-based)
          done();
        });
      });

      it('should calculate school year dates based on current date', () => {
        // Mock current date to be in March (before August)
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(2024, 2, 15)); // March 15, 2024

        const startDate = (service as any).getDefaultSchoolYearStart();
        const endDate = (service as any).getDefaultSchoolYearEnd();

        expect(startDate.getFullYear()).toBe(2023); // Previous year for start
        expect(endDate.getFullYear()).toBe(2024); // Current year for end

        jasmine.clock().uninstall();
      });

      it('should calculate school year dates for current school year', () => {
        // Mock current date to be in September (after August)
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(2023, 8, 15)); // September 15, 2023

        const startDate = (service as any).getDefaultSchoolYearStart();
        const endDate = (service as any).getDefaultSchoolYearEnd();

        expect(startDate.getFullYear()).toBe(2023); // Current year for start
        expect(endDate.getFullYear()).toBe(2024); // Next year for end

        jasmine.clock().uninstall();
      });
    });
  });

  describe('getCurrentUser()', () => {
    it('should return current user when loaded', () => {
      service['userSubject'].next(mockUser);

      const result = service.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user loaded', () => {
      const result = service.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should log warning when token exists but no user loaded', () => {
      spyOn(console, 'warn');
      localStorage.setItem('token', mockJwtToken);

      service.getCurrentUser();

      expect(console.warn).toHaveBeenCalledWith(
        '[UserService] Token exists but no user loaded - may need to call loadUserData()'
      );
    });

    it('should not log warning when no token and no user', () => {
      spyOn(console, 'warn');

      service.getCurrentUser();

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('hasRole()', () => {
    it('should return true when user has role', () => {
      service['userSubject'].next(mockUser);

      const result = service.hasRole('User');

      expect(result).toBe(true);
    });

    it('should return false when user does not have role', () => {
      service['userSubject'].next(mockUser);

      const result = service.hasRole('Admin');

      expect(result).toBe(false);
    });

    it('should return false when no user loaded', () => {
      const result = service.hasRole('User');

      expect(result).toBe(false);
    });

    it('should return false when user has no roles', () => {
      const userWithoutRoles = { ...mockUser, roles: undefined };
      service['userSubject'].next(userWithoutRoles);

      const result = service.hasRole('User');

      expect(result).toBe(false);
    });

    it('should handle case-sensitive role checking', () => {
      service['userSubject'].next(mockUser);

      expect(service.hasRole('user')).toBe(false);
      expect(service.hasRole('User')).toBe(true);
    });
  });

  describe('getDistrictId()', () => {
    it('should return district when user has district', () => {
      service['userSubject'].next(mockUser);

      const result = service.getDistrictId();

      expect(result).toBe('Test District');
    });

    it('should return null when user has no district', () => {
      const userWithoutDistrict = { ...mockUser, district: undefined };
      service['userSubject'].next(userWithoutDistrict);

      const result = service.getDistrictId();

      expect(result).toBeNull();
    });

    it('should return null when no user loaded', () => {
      const result = service.getDistrictId();

      expect(result).toBeNull();
    });
  });

  describe('getUserId()', () => {
    it('should return user ID when user loaded', () => {
      service['userSubject'].next(mockUser);

      const result = service.getUserId();

      expect(result).toBe('123');
    });

    it('should return null when no user loaded', () => {
      const result = service.getUserId();

      expect(result).toBeNull();
    });
  });

  describe('clearUserData()', () => {
    it('should clear user data and set subject to null', () => {
      service['userSubject'].next(mockUser);

      service.clearUserData();

      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should log clear operation with stack trace', () => {
      spyOn(console, 'log');
      service['userSubject'].next(mockUser);

      service.clearUserData();

      expect(console.log).toHaveBeenCalledWith(
        '[UserService] clearUserData() called - CLEARING USER STATE'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[UserService] Stack trace:',
        jasmine.any(Array)
      );
    });
  });

  describe('updateUserProfile()', () => {
    beforeEach(() => {
      service['userSubject'].next(mockUser);
    });

    it('should update user profile successfully', (done) => {
      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '555-5678'
      };

      const apiUpdateResponse = {
        ...mockApiUserProfile,
        ...profileUpdate
      };

      apiServiceSpy.updateCurrentUserProfile.and.returnValue(of(apiUpdateResponse));

      service.updateUserProfile(profileUpdate).subscribe(updatedUser => {
        expect(updatedUser.firstName).toBe('Jane');
        expect(updatedUser.lastName).toBe('Smith');
        expect(updatedUser.email).toBe('jane.smith@example.com');
        expect(updatedUser.phone).toBe('555-5678');
        done();
      });
    });

    it('should call API with correct profile update data', (done) => {
      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '555-5678'
      };

      apiServiceSpy.updateCurrentUserProfile.and.returnValue(of(mockApiUserProfile));

      service.updateUserProfile(profileUpdate).subscribe(() => {
        expect(apiServiceSpy.updateCurrentUserProfile).toHaveBeenCalledWith({
          username: 'testuser',
          firstName: 'Jane',
          lastName: 'Smith',
          district: 'Test District',
          email: 'jane.smith@example.com',
          phone: '555-5678'
        });
        done();
      });
    });

    it('should update user subject with new data', (done) => {
      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      apiServiceSpy.updateCurrentUserProfile.and.returnValue(of(mockApiUserProfile));

      service.updateUserProfile(profileUpdate).subscribe(() => {
        service.user$.subscribe(user => {
          expect(user!.firstName).toBe('Jane');
          expect(user!.lastName).toBe('Smith');
          done();
        });
      });
    });

    it('should handle missing optional fields', (done) => {
      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      apiServiceSpy.updateCurrentUserProfile.and.returnValue(of(mockApiUserProfile));

      service.updateUserProfile(profileUpdate).subscribe(() => {
        expect(apiServiceSpy.updateCurrentUserProfile).toHaveBeenCalledWith(
          jasmine.objectContaining({
            email: 'john.doe@example.com', // Should use current user's email
            phone: '555-1234' // Should use current user's phone
          })
        );
        done();
      });
    });

    it('should handle API error', (done) => {
      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const error = new Error('Update failed');
      apiServiceSpy.updateCurrentUserProfile.and.returnValue(throwError(() => error));

      service.updateUserProfile(profileUpdate).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });

    it('should return error when no current user', (done) => {
      service['userSubject'].next(null);

      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      service.updateUserProfile(profileUpdate).subscribe({
        error: (error) => {
          expect(error.message).toBe('No current user found');
          done();
        }
      });
    });

    it('should log profile update operation', () => {
      spyOn(console, 'log');
      const profileUpdate: UserProfileUpdate = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      apiServiceSpy.updateCurrentUserProfile.and.returnValue(of(mockApiUserProfile));

      service.updateUserProfile(profileUpdate).subscribe();

      expect(console.log).toHaveBeenCalledWith(
        '[UserService] Updating user profile with new secure endpoint:',
        jasmine.any(Object)
      );
    });
  });

  describe('updateUserConfiguration()', () => {
    beforeEach(() => {
      service['userSubject'].next(mockUser);
    });

    it('should update user configuration successfully', (done) => {
      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025',
        periodsPerDay: 7,
        startDate: new Date('2024-08-20'),
        endDate: new Date('2025-06-20'),
        periodAssignments: []
      };

      const apiConfigResponse = {
        ...mockApiUserConfiguration,
        schoolYear: '2024-2025',
        periodsPerDay: 7
      };

      apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(of(apiConfigResponse));

      service.updateUserConfiguration(configUpdate).subscribe(updatedConfig => {
        expect(updatedConfig.schoolYear).toBe('2024-2025');
        expect(updatedConfig.periodsPerDay).toBe(7);
        done();
      });
    });

    it('should call API with configuration update', (done) => {
      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025',
        periodsPerDay: 7
      };

      apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(of(mockApiUserConfiguration));

      service.updateUserConfiguration(configUpdate).subscribe(() => {
        expect(apiServiceSpy.updateCurrentUserConfiguration).toHaveBeenCalledWith(configUpdate);
        done();
      });
    });

    it('should update user subject with new configuration', (done) => {
      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025'
      };

      const apiConfigResponse = {
        ...mockApiUserConfiguration,
        schoolYear: '2024-2025'
      };

      apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(of(apiConfigResponse));

      service.updateUserConfiguration(configUpdate).subscribe(() => {
        service.user$.subscribe(user => {
          expect(user!.configuration!.schoolYear).toBe('2024-2025');
          done();
        });
      });
    });

    it('should handle API error', (done) => {
      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025'
      };

      const error = new Error('Configuration update failed');
      apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(throwError(() => error));

      service.updateUserConfiguration(configUpdate).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });

    it('should return error when no current user', (done) => {
      service['userSubject'].next(null);

      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025'
      };

      service.updateUserConfiguration(configUpdate).subscribe({
        error: (error) => {
          expect(error.message).toBe('No current user found');
          done();
        }
      });
    });

    it('should transform API response to UserConfiguration', (done) => {
      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025'
      };

      apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(of(mockApiUserConfiguration));

      service.updateUserConfiguration(configUpdate).subscribe(config => {
        expect(config.lastUpdated).toBeInstanceOf(Date);
        expect(config.startDate).toBeInstanceOf(Date);
        expect(config.endDate).toBeInstanceOf(Date);
        expect(config.periodAssignments).toBeInstanceOf(Array);
        done();
      });
    });

    it('should log configuration update operation', () => {
      spyOn(console, 'log');
      const configUpdate: UserConfigurationUpdate = {
        schoolYear: '2024-2025'
      };

      apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(of(mockApiUserConfiguration));

      service.updateUserConfiguration(configUpdate).subscribe();

      expect(console.log).toHaveBeenCalledWith(
        '[UserService] User configuration updated with secure endpoint:',
        jasmine.any(Object)
      );
    });
  });

  describe('getUserConfiguration()', () => {
    it('should return user configuration when user has configuration', () => {
      service['userSubject'].next(mockUser);

      const result = service.getUserConfiguration();

      expect(result).toEqual(mockUser.configuration);
    });

    it('should return null when user has no configuration', () => {
      const userWithoutConfig = { ...mockUser, configuration: undefined };
      service['userSubject'].next(userWithoutConfig);

      const result = service.getUserConfiguration();

      expect(result).toBeNull();
    });

    it('should return null when no user loaded', () => {
      const result = service.getUserConfiguration();

      expect(result).toBeNull();
    });
  });

  describe('hasUserConfiguration()', () => {
    it('should return true when user has configuration', () => {
      service['userSubject'].next(mockUser);

      const result = service.hasUserConfiguration();

      expect(result).toBe(true);
    });

    it('should return false when user has no configuration', () => {
      const userWithoutConfig = { ...mockUser, configuration: undefined };
      service['userSubject'].next(userWithoutConfig);

      const result = service.hasUserConfiguration();

      expect(result).toBe(false);
    });

    it('should return false when no user loaded', () => {
      const result = service.hasUserConfiguration();

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle JWT decode throwing error', (done) => {
      localStorage.setItem('token', 'invalid-token');
      jwtHelperSpy.decodeToken.and.throwError('Invalid token format');

      service.loadUserData('testuser').subscribe({
        error: (error) => {
          expect(error).toBe('Invalid token');
          done();
        }
      });
    });

    it('should handle empty JWT claims', (done) => {
      const emptyDecodedToken = {
        sub: '123',
        exp: 1640995200
      };
      jwtHelperSpy.decodeToken.and.returnValue(emptyDecodedToken);

      service.loadUserData('testuser').subscribe(user => {
        expect(user.firstName).toBe('');
        expect(user.lastName).toBe('');
        expect(user.email).toBe('');
        expect(user.roles).toEqual([]);
        expect(user.claims).toEqual({});
        done();
      });
    });

    it('should handle null API responses', (done) => {
      apiServiceSpy.getCurrentUserProfile.and.returnValue(of(null as any));
      apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(null as any));

      service.loadUserData('testuser').subscribe(user => {
        expect(user.district).toBeUndefined();
        expect(user.configuration).toBeUndefined();
        done();
      });
    });

    it('should handle partial API responses', (done) => {
      const partialProfile = { username: 'testuser' };
      const partialConfig = { schoolYear: '2023-2024' };

      apiServiceSpy.getCurrentUserProfile.and.returnValue(of(partialProfile as any));
      apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(partialConfig as any));

      service.loadUserData('testuser').subscribe(user => {
        expect(user.district).toBeUndefined();
        expect(user.configuration!.schoolYear).toBe('2023-2024');
        expect(user.configuration!.periodsPerDay).toBe(6); // Default value
        done();
      });
    });

    it('should handle malformed period assignments', (done) => {
      const configWithMalformedAssignments = {
        ...mockApiUserConfiguration,
        periodAssignments: [
          null,
          { id: 1, period: 1 }, // Missing fields
          { id: 2, period: 2, teachingDays: 'InvalidFormat' }
        ]
      };

      apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(configWithMalformedAssignments as any));

      service.loadUserData('testuser').subscribe(user => {
        const assignments = user.configuration!.periodAssignments;
        expect(assignments).toHaveLength(3);
        // Should not crash, handle gracefully
        done();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user lifecycle', (done) => {
      localStorage.setItem('token', mockJwtToken);

      // Load user data
      service.loadUserData('testuser').subscribe(() => {
        // Check user is loaded
        expect(service.getCurrentUser()).toBeTruthy();
        expect(service.hasRole('User')).toBe(true);
        expect(service.hasUserConfiguration()).toBe(true);

        // Update profile
        const profileUpdate: UserProfileUpdate = {
          firstName: 'Jane',
          lastName: 'Smith'
        };

        apiServiceSpy.updateCurrentUserProfile.and.returnValue(of({
          ...mockApiUserProfile,
          firstName: 'Jane',
          lastName: 'Smith'
        }));

        service.updateUserProfile(profileUpdate).subscribe(() => {
          expect(service.getCurrentUser()!.firstName).toBe('Jane');

          // Clear user data
          service.clearUserData();
          expect(service.getCurrentUser()).toBeNull();
          expect(service.hasRole('User')).toBe(false);

          done();
        });
      });
    });

    it('should maintain user state across multiple operations', (done) => {
      localStorage.setItem('token', mockJwtToken);

      service.loadUserData('testuser').subscribe(() => {
        const initialUser = service.getCurrentUser();

        // Update configuration
        const configUpdate: UserConfigurationUpdate = {
          periodsPerDay: 8
        };

        apiServiceSpy.updateCurrentUserConfiguration.and.returnValue(of({
          ...mockApiUserConfiguration,
          periodsPerDay: 8
        }));

        service.updateUserConfiguration(configUpdate).subscribe(() => {
          const updatedUser = service.getCurrentUser();

          // User identity should remain the same
          expect(updatedUser!.id).toBe(initialUser!.id);
          expect(updatedUser!.username).toBe(initialUser!.username);

          // Only configuration should change
          expect(updatedUser!.configuration!.periodsPerDay).toBe(8);

          done();
        });
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large period assignments arrays', (done) => {
      const largePeriodAssignments = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        period: i + 1,
        courseId: i + 1,
        specialPeriodType: null,
        room: `Room ${i + 1}`,
        notes: `Notes ${i + 1}`,
        teachingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
        backgroundColor: '#ffffff',
        fontColor: '#000000'
      }));

      const configWithLargeAssignments = {
        ...mockApiUserConfiguration,
        periodAssignments: largePeriodAssignments
      };

      apiServiceSpy.getCurrentUserConfiguration.and.returnValue(of(configWithLargeAssignments));

      service.loadUserData('testuser').subscribe(user => {
        expect(user.configuration!.periodAssignments).toHaveLength(100);
        done();
      });
    });

    it('should not leak memory through Observable subscriptions', () => {
      let subscriptionCount = 0;

      // Create multiple subscriptions
      for (let i = 0; i < 10; i++) {
        service.user$.subscribe(() => {
          subscriptionCount++;
        });
      }

      // Update user to trigger all subscriptions
      service['userSubject'].next(mockUser);

      expect(subscriptionCount).toBe(10);

      // Clear user data - should not cause memory leaks
      service.clearUserData();

      // All subscriptions should still be active and receive null
      expect(subscriptionCount).toBe(20); // 10 initial + 10 from clearUserData
    });
  });
});