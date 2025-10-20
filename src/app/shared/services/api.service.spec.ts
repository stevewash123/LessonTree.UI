// api.service.spec.ts
// Comprehensive unit tests for ApiService - HTTP communication and data transformation
// Tests all public methods, error handling, data transformation, and edge cases

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { Course } from '../../models/course';
import { Topic, TopicMoveResource } from '../../models/topic';
import { SubTopic, SubTopicMoveResource } from '../../models/subTopic';
import { Lesson, LessonMoveResource } from '../../models/lesson';
import { Attachment } from '../../models/attachment';
import { Note } from '../../models/note';
import { Standard } from '../../models/standard';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  // Test data fixtures
  const mockCourse: Course = {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    visibility: 'Private',
    topics: []
  };

  const mockTopic: Topic = {
    id: 1,
    title: 'Test Topic',
    description: 'Test Description',
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    subTopics: [],
    lessons: []
  };

  const mockLesson: Lesson = {
    id: 1,
    title: 'Test Lesson',
    topicId: 1,
    subTopicId: null,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test Objective',
    materials: 'Test Materials',
    classTime: '45 minutes',
    methods: 'Test Methods',
    specialNeeds: 'None',
    assessment: 'Quiz',
    sortOrder: 1,
    attachments: []
  };

  const mockNote: Note = {
    id: 1,
    content: 'Test Note',
    visibility: 'Private',
    teamId: null,
    courseId: 1,
    topicId: null,
    subTopicId: null,
    lessonId: null
  };

  const mockStandard: Standard = {
    id: 1,
    name: 'Test Standard',
    description: 'Test Standard Description',
    districtId: 1,
    courseId: 1
  };

  beforeEach(() => {
    const toastrServiceSpy = jasmine.createSpyObj('ToastrService', ['error', 'success']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        { provide: ToastrService, useValue: toastrServiceSpy }
      ]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    toastrSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have correct base URL from environment', () => {
      expect((service as any).baseUrl).toBe(environment.apiUrl + '/api');
    });
  });

  describe('Generic HTTP Methods', () => {
    describe('get()', () => {
      it('should perform GET request and transform response', () => {
        const mockResponse = { $values: [mockCourse] };
        const endpoint = 'test';

        service.get<Course[]>(endpoint).subscribe(result => {
          expect(result).toEqual([mockCourse]);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });

      it('should handle GET request without $values wrapper', () => {
        const endpoint = 'test';

        service.get<Course>(endpoint).subscribe(result => {
          expect(result).toEqual(mockCourse);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        req.flush(mockCourse);
      });

      it('should handle GET request with custom options', () => {
        const endpoint = 'test';
        const options = {
          params: { filter: 'active' },
          suppressToast: true
        };

        service.get<Course[]>(endpoint, options).subscribe();

        const req = httpMock.expectOne(req =>
          req.url.includes(endpoint) && req.params.get('filter') === 'active'
        );
        expect(req.request.method).toBe('GET');
        req.flush([mockCourse]);
      });

      it('should handle GET request errors', () => {
        const endpoint = 'test';
        const errorResponse = { status: 404, statusText: 'Not Found' };

        service.get<Course[]>(endpoint).subscribe({
          error: error => {
            expect(error.status).toBe(404);
          }
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        req.flush('Not Found', errorResponse);

        expect(toastrSpy.error).toHaveBeenCalled();
      });
    });

    describe('post()', () => {
      it('should perform POST request and transform response', () => {
        const endpoint = 'test';
        const body = { title: 'Test' };
        const mockResponse = { $values: mockCourse };

        service.post<Course>(endpoint, body).subscribe(result => {
          expect(result).toEqual(mockCourse);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        req.flush(mockResponse);
      });

      it('should handle POST request errors with custom message', () => {
        const endpoint = 'test';
        const body = { title: 'Test' };
        const options = { customErrorMessage: 'Custom error' };
        const errorResponse = { status: 400, statusText: 'Bad Request' };

        service.post<Course>(endpoint, body, options).subscribe({
          error: error => {
            expect(error.status).toBe(400);
          }
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        req.flush('Bad Request', errorResponse);

        expect(toastrSpy.error).toHaveBeenCalledWith('Custom error', 'Error');
      });
    });

    describe('put()', () => {
      it('should perform PUT request and transform response', () => {
        const endpoint = 'test/1';
        const body = { title: 'Updated Test' };

        service.put<Course>(endpoint, body).subscribe(result => {
          expect(result).toEqual(mockCourse);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(body);
        req.flush(mockCourse);
      });
    });

    describe('delete()', () => {
      it('should perform DELETE request', () => {
        const endpoint = 'test/1';

        service.delete<void>(endpoint).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
      });

      it('should handle DELETE request errors with suppressed toast', () => {
        const endpoint = 'test/1';
        const options = { suppressToast: true };
        const errorResponse = { status: 403, statusText: 'Forbidden' };

        service.delete<void>(endpoint, options).subscribe({
          error: error => {
            expect(error.status).toBe(403);
          }
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/${endpoint}`);
        req.flush('Forbidden', errorResponse);

        expect(toastrSpy.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('Course Operations', () => {
    describe('getCourses()', () => {
      it('should fetch active courses with no visibility filter', () => {
        service.getCourses('active', null).subscribe(result => {
          expect(result).toEqual([mockCourse]);
        });

        const req = httpMock.expectOne(req =>
          req.url.includes('/course') &&
          req.params.get('filter') === 'Active' &&
          !req.params.has('visibility')
        );
        req.flush([mockCourse]);
      });

      it('should fetch archived courses with private visibility', () => {
        service.getCourses('archived', 'private').subscribe(result => {
          expect(result).toEqual([mockCourse]);
        });

        const req = httpMock.expectOne(req =>
          req.url.includes('/course') &&
          req.params.get('filter') === 'Archived' &&
          req.params.get('visibility') === '0'
        );
        req.flush([mockCourse]);
      });

      it('should fetch all courses with team visibility', () => {
        service.getCourses('both', 'team').subscribe(result => {
          expect(result).toEqual([mockCourse]);
        });

        const req = httpMock.expectOne(req =>
          req.url.includes('/course') &&
          !req.params.has('filter') &&
          req.params.get('visibility') === '1'
        );
        req.flush([mockCourse]);
      });
    });

    describe('createCourse()', () => {
      it('should create course with payload', () => {
        const coursePayload = {
          title: 'New Course',
          description: 'New Description',
          visibility: 'Private'
        };

        service.createCourse(coursePayload).subscribe(result => {
          expect(result).toEqual(mockCourse);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/course`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(coursePayload);
        req.flush(mockCourse);
      });
    });
  });

  describe('Move Operations', () => {
    describe('moveLesson()', () => {
      it('should move lesson with all parameters', () => {
        const lessonId = 1;
        const targetSubTopicId = 2;
        const targetTopicId = 3;
        const relativeToId = 4;
        const position = 'after';
        const relativeToType = 'Lesson';

        const expectedResource: LessonMoveResource = {
          lessonId,
          newSubTopicId: targetSubTopicId,
          newTopicId: targetTopicId,
          relativeToId,
          position,
          relativeToType
        };

        service.moveLesson(
          lessonId,
          targetSubTopicId,
          targetTopicId,
          relativeToId,
          position,
          relativeToType
        ).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/Lesson/move`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(expectedResource);
        req.flush({ success: true });
      });

      it('should move lesson with minimal parameters', () => {
        const lessonId = 1;
        const targetTopicId = 2;

        const expectedResource: LessonMoveResource = {
          lessonId,
          newSubTopicId: null,
          newTopicId: targetTopicId,
          relativeToId: null,
          position: null,
          relativeToType: null
        };

        service.moveLesson(lessonId, undefined, targetTopicId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/Lesson/move`);
        expect(req.request.body).toEqual(expectedResource);
        req.flush({ success: true });
      });
    });

    describe('moveSubTopic()', () => {
      it('should move subtopic with positioning', () => {
        const subTopicId = 1;
        const newTopicId = 2;
        const relativeToId = 3;
        const position = 'before';
        const relativeToType = 'SubTopic';

        const expectedResource: SubTopicMoveResource = {
          subTopicId,
          newTopicId,
          relativeToId,
          position,
          relativeToType
        };

        service.moveSubTopic(
          subTopicId,
          newTopicId,
          relativeToId,
          position,
          relativeToType
        ).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/subtopic/move`);
        expect(req.request.body).toEqual(expectedResource);
        req.flush({ success: true });
      });
    });

    describe('moveTopic()', () => {
      it('should move topic to different course', () => {
        const topicId = 1;
        const newCourseId = 2;

        const expectedResource: TopicMoveResource = {
          topicId,
          newCourseId,
          relativeToId: null,
          position: null,
          relativeToType: null
        };

        service.moveTopic(topicId, newCourseId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/topic/move`);
        expect(req.request.body).toEqual(expectedResource);
        req.flush({ success: true });
      });
    });
  });

  describe('Copy Operations', () => {
    describe('copyLesson()', () => {
      it('should copy lesson to subtopic', () => {
        const lessonId = 1;
        const targetSubTopicId = 2;

        service.copyLesson(lessonId, targetSubTopicId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/Lesson/copy`);
        expect(req.request.body.lessonId).toBe(lessonId);
        expect(req.request.body.newSubTopicId).toBe(targetSubTopicId);
        req.flush({ success: true });
      });

      it('should copy lesson to topic', () => {
        const lessonId = 1;
        const targetTopicId = 2;

        service.copyLesson(lessonId, undefined, targetTopicId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/Lesson/copy`);
        expect(req.request.body.newTopicId).toBe(targetTopicId);
        req.flush({ success: true });
      });
    });

    describe('copySubTopic()', () => {
      it('should copy subtopic', () => {
        const subTopicId = 1;
        const newTopicId = 2;

        service.copySubTopic(subTopicId, newTopicId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/subtopic/copy`);
        expect(req.request.body).toEqual({
          subTopicId,
          newTopicId,
          relativeToId: null,
          position: null,
          relativeToType: null
        });
        req.flush({ success: true });
      });
    });

    describe('copyTopic()', () => {
      it('should copy topic', () => {
        const topicId = 1;
        const newCourseId = 2;

        service.copyTopic(topicId, newCourseId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/topic/copy`);
        expect(req.request.body).toEqual({
          topicId,
          newCourseId,
          relativeToId: null,
          position: null,
          relativeToType: null
        });
        req.flush({ success: true });
      });
    });
  });

  describe('File Operations', () => {
    describe('uploadAttachment()', () => {
      it('should upload file attachment', () => {
        const lessonId = 1;
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        const mockAttachment: Attachment = {
          id: 1,
          fileName: 'test.pdf',
          filePath: '/attachments/test.pdf',
          lessonId: lessonId
        };

        service.uploadAttachment(lessonId, file).subscribe(result => {
          expect(result).toEqual(mockAttachment);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/lesson/${lessonId}/attachments`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body instanceof FormData).toBeTruthy();
        req.flush(mockAttachment);
      });
    });
  });

  describe('User Operations', () => {
    describe('createUser()', () => {
      it('should create new user', () => {
        const userData = { username: 'testuser', password: 'password123' };

        service.createUser(userData).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/account/register`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(userData);
        req.flush({ success: true });
      });
    });

    describe('getCurrentUserProfile()', () => {
      it('should get current user profile', () => {
        const mockProfile = { username: 'testuser', email: 'test@example.com' };

        service.getCurrentUserProfile().subscribe(result => {
          expect(result).toEqual(mockProfile);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/user/profile`);
        expect(req.request.method).toBe('GET');
        req.flush(mockProfile);
      });
    });

    describe('updateCurrentUserProfile()', () => {
      it('should update user profile', () => {
        const userData = {
          username: 'updateduser',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          district: 'Test District'
        };

        service.updateCurrentUserProfile(userData).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/user/profile`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(userData);
        req.flush({ success: true });
      });
    });

    describe('getCurrentUserConfiguration()', () => {
      it('should get user configuration', () => {
        const mockConfig = { schoolYear: '2024-2025', periodsPerDay: 6 };

        service.getCurrentUserConfiguration().subscribe(result => {
          expect(result).toEqual(mockConfig);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/user/configuration`);
        req.flush(mockConfig);
      });
    });

    describe('updateCurrentUserConfiguration()', () => {
      it('should update user configuration', () => {
        const configuration = {
          schoolYear: '2024-2025',
          periodsPerDay: 6,
          periodAssignments: [],
          startDate: '2024-08-15',
          endDate: '2025-06-15'
        };

        service.updateCurrentUserConfiguration(configuration).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/user/configuration`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(configuration);
        req.flush({ success: true });
      });
    });
  });

  describe('Note Operations', () => {
    describe('createNote()', () => {
      it('should create note with all fields', () => {
        const noteData: Partial<Note> = {
          content: 'Test note content',
          visibility: 'Private',
          teamId: 1,
          courseId: 1,
          topicId: 2,
          subTopicId: 3,
          lessonId: 4
        };

        service.createNote(noteData).subscribe(result => {
          expect(result).toEqual(mockNote);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/note`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(noteData);
        req.flush(mockNote);
      });

      it('should create note with minimal fields', () => {
        const noteData: Partial<Note> = {
          content: 'Simple note',
          visibility: 'Private'
        };

        service.createNote(noteData).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/note`);
        expect(req.request.body.content).toBe('Simple note');
        expect(req.request.body.visibility).toBe('Private');
        req.flush(mockNote);
      });
    });

    describe('deleteNote()', () => {
      it('should delete note by id', () => {
        const noteId = 1;

        service.deleteNote(noteId).subscribe();

        const req = httpMock.expectOne(`${environment.apiUrl}/api/note/${noteId}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
      });
    });
  });

  describe('Standards Operations', () => {
    describe('getStandardsByCourse()', () => {
      it('should fetch standards by course without district', () => {
        const courseId = 1;

        service.getStandardsByCourse(courseId).subscribe(result => {
          expect(result).toEqual([mockStandard]);
        });

        const req = httpMock.expectOne(req =>
          req.url.includes(`/standard/course/${courseId}`) &&
          req.params.get('courseId') === courseId.toString() &&
          !req.params.has('districtId')
        );
        req.flush([mockStandard]);
      });

      it('should fetch standards by course with district', () => {
        const courseId = 1;
        const districtId = 2;

        service.getStandardsByCourse(courseId, districtId).subscribe(result => {
          expect(result).toEqual([mockStandard]);
        });

        const req = httpMock.expectOne(req =>
          req.url.includes(`/standard/course/${courseId}`) &&
          req.params.get('courseId') === courseId.toString() &&
          req.params.get('districtId') === districtId.toString()
        );
        req.flush([mockStandard]);
      });
    });
  });

  describe('Data Transformation', () => {
    describe('transformResponse()', () => {
      it('should extract $values from response', () => {
        const response = { $values: [mockCourse] };

        service.get<Course[]>('test').subscribe(result => {
          expect(result).toEqual([mockCourse]);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
        req.flush(response);
      });

      it('should handle response without $values', () => {
        service.get<Course>('test').subscribe(result => {
          expect(result).toEqual(mockCourse);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
        req.flush(mockCourse);
      });
    });

    describe('transformKeysToCamelCaseAndEnsureArrays()', () => {
      it('should transform Pascal case to camel case', () => {
        const pascalCaseData = {
          Id: 1,
          Title: 'Test',
          Description: 'Test Description',
          SubTopics: null,
          Lessons: undefined
        };

        service.get<any>('test').subscribe(result => {
          expect(result.id).toBe(1);
          expect(result.title).toBe('Test');
          expect(result.description).toBe('Test Description');
          expect(result.subTopics).toEqual([]);
          expect(result.lessons).toEqual([]);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
        req.flush(pascalCaseData);
      });

      it('should transform visibility numbers to strings', () => {
        const dataWithVisibility = {
          Id: 1,
          Title: 'Test',
          Visibility: 0
        };

        service.get<any>('test').subscribe(result => {
          expect(result.visibility).toBe('Private');
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
        req.flush(dataWithVisibility);
      });

      it('should handle nested $values structures', () => {
        const nestedData = {
          Id: 1,
          Topics: { $values: [{ Id: 2, Title: 'Topic' }] }
        };

        service.get<any>('test').subscribe(result => {
          expect(result.topics).toEqual([{ id: 2, title: 'Topic' }]);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
        req.flush(nestedData);
      });

      it('should handle arrays correctly', () => {
        const arrayData = [
          { Id: 1, Title: 'First' },
          { Id: 2, Title: 'Second' }
        ];

        service.get<any[]>('test').subscribe(result => {
          expect(result).toEqual([
            { id: 1, title: 'First' },
            { id: 2, title: 'Second' }
          ]);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
        req.flush(arrayData);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors with detailed logging', () => {
      const consoleSpy = spyOn(console, 'error');
      const errorResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Database connection failed' }
      };

      service.get<any>('test').subscribe({
        error: error => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush('Server Error', errorResponse);

      expect(consoleSpy).toHaveBeenCalledWith('ApiService: Error details', jasmine.any(Object));
      expect(toastrSpy.error).toHaveBeenCalledWith('Database connection failed', 'Error');
    });

    it('should handle network errors', () => {
      const errorEvent = new ProgressEvent('Network error');

      service.get<any>('test').subscribe({
        error: error => {
          expect(error.error).toEqual(errorEvent);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.error(errorEvent);

      expect(toastrSpy.error).toHaveBeenCalled();
    });

    it('should use default error message when none provided', () => {
      const errorResponse = { status: 400, statusText: 'Bad Request' };

      service.get<any>('test').subscribe({
        error: () => {}
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush('', errorResponse);

      expect(toastrSpy.error).toHaveBeenCalledWith('An unexpected error occurred', 'Error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined responses', () => {
      service.get<any>('test').subscribe(result => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush(null);
    });

    it('should handle empty array responses', () => {
      service.get<any[]>('test').subscribe(result => {
        expect(result).toEqual([]);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush([]);
    });

    it('should handle malformed $values structure', () => {
      const malformedData = { $values: null };

      service.get<any>('test').subscribe(result => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush(malformedData);
    });

    it('should handle deeply nested objects', () => {
      const deepData = {
        Level1: {
          Level2: {
            Level3: {
              Id: 1,
              Title: 'Deep Value'
            }
          }
        }
      };

      service.get<any>('test').subscribe(result => {
        expect(result.level1.level2.level3.id).toBe(1);
        expect(result.level1.level2.level3.title).toBe('Deep Value');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush(deepData);
    });
  });
});