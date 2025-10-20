// report.service.spec.ts
// Comprehensive unit tests for ReportService - Reporting and data export functionality
// Tests PDF generation, blob handling, file downloads, date utilities, and error scenarios

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let httpMock: HttpTestingController;

  // Mock data fixtures
  const mockPdfBlob = new Blob(['fake-pdf-content'], { type: 'application/pdf' });
  const testDate = new Date('2024-01-15T10:30:00Z'); // Monday, January 15, 2024
  const expectedWeekStart = new Date('2024-01-15T00:00:00.000Z'); // Same Monday
  const sundayDate = new Date('2024-01-14T10:30:00Z'); // Sunday, January 14, 2024
  const expectedSundayWeekStart = new Date('2024-01-08T00:00:00.000Z'); // Previous Monday

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReportService]
    });

    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have correct API URL', () => {
      expect((service as any).apiUrl).toBe('/api/reports');
    });
  });

  describe('Weekly Lesson Plan Generation', () => {
    describe('generateWeeklyLessonPlan()', () => {
      it('should generate weekly lesson plan with correct API call', () => {
        const weekStart = new Date('2024-01-15');
        const expectedUrl = '/api/reports/weekly-lesson-plan/2024-01-15';

        service.generateWeeklyLessonPlan(weekStart).subscribe(blob => {
          expect(blob).toEqual(mockPdfBlob);
        });

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');
        expect(req.request.responseType).toBe('blob');
        req.flush(mockPdfBlob);
      });

      it('should handle different date formats correctly', () => {
        const weekStart = new Date('2024-12-25T15:30:45.123Z');
        const expectedUrl = '/api/reports/weekly-lesson-plan/2024-12-25';

        service.generateWeeklyLessonPlan(weekStart).subscribe();

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockPdfBlob);
      });

      it('should handle leap year dates', () => {
        const leapYearDate = new Date('2024-02-29');
        const expectedUrl = '/api/reports/weekly-lesson-plan/2024-02-29';

        service.generateWeeklyLessonPlan(leapYearDate).subscribe();

        const req = httpMock.expectOne(expectedUrl);
        req.flush(mockPdfBlob);
      });

      it('should handle end of year dates', () => {
        const endOfYearDate = new Date('2024-12-31');
        const expectedUrl = '/api/reports/weekly-lesson-plan/2024-12-31';

        service.generateWeeklyLessonPlan(endOfYearDate).subscribe();

        const req = httpMock.expectOne(expectedUrl);
        req.flush(mockPdfBlob);
      });

      it('should handle beginning of year dates', () => {
        const beginningOfYearDate = new Date('2024-01-01');
        const expectedUrl = '/api/reports/weekly-lesson-plan/2024-01-01';

        service.generateWeeklyLessonPlan(beginningOfYearDate).subscribe();

        const req = httpMock.expectOne(expectedUrl);
        req.flush(mockPdfBlob);
      });

      it('should handle API errors gracefully', () => {
        const weekStart = new Date('2024-01-15');
        const errorResponse = { status: 500, statusText: 'Internal Server Error' };

        service.generateWeeklyLessonPlan(weekStart).subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          }
        });

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.flush('Server Error', errorResponse);
      });

      it('should handle network errors', () => {
        const weekStart = new Date('2024-01-15');

        service.generateWeeklyLessonPlan(weekStart).subscribe({
          error: (error) => {
            expect(error.error instanceof ProgressEvent).toBeTruthy();
          }
        });

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.error(new ProgressEvent('Network error'));
      });

      it('should handle empty blob response', () => {
        const weekStart = new Date('2024-01-15');
        const emptyBlob = new Blob([], { type: 'application/pdf' });

        service.generateWeeklyLessonPlan(weekStart).subscribe(blob => {
          expect(blob.size).toBe(0);
          expect(blob.type).toBe('application/pdf');
        });

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.flush(emptyBlob);
      });
    });
  });

  describe('Weekly Report Download', () => {
    describe('downloadWeeklyReport()', () => {
      let mockLink: HTMLAnchorElement;
      let createElementSpy: jasmine.Spy;
      let createObjectURLSpy: jasmine.Spy;
      let revokeObjectURLSpy: jasmine.Spy;
      let appendChildSpy: jasmine.Spy;
      let removeChildSpy: jasmine.Spy;
      let clickSpy: jasmine.Spy;

      beforeEach(() => {
        // Create mock anchor element
        mockLink = {
          href: '',
          download: '',
          click: jasmine.createSpy('click')
        } as any;

        // Setup DOM spies
        createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink);
        appendChildSpy = spyOn(document.body, 'appendChild');
        removeChildSpy = spyOn(document.body, 'removeChild');
        clickSpy = mockLink.click as jasmine.Spy;

        // Setup URL spies
        createObjectURLSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
        revokeObjectURLSpy = spyOn(window.URL, 'revokeObjectURL');

        // Setup console spy for error handling tests
        spyOn(console, 'error');
        spyOn(window, 'alert');
      });

      it('should download weekly report successfully', () => {
        const weekStart = new Date('2024-01-15');

        service.downloadWeeklyReport(weekStart);

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.flush(mockPdfBlob);

        expect(createObjectURLSpy).toHaveBeenCalledWith(mockPdfBlob);
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(mockLink.href).toBe('blob:mock-url');
        expect(mockLink.download).toBe('lesson-plan-2024-01-15.pdf');
        expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
        expect(clickSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      });

      it('should generate correct filename for different dates', () => {
        const weekStart = new Date('2024-12-25');

        service.downloadWeeklyReport(weekStart);

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-12-25');
        req.flush(mockPdfBlob);

        expect(mockLink.download).toBe('lesson-plan-2024-12-25.pdf');
      });

      it('should handle download errors with user feedback', () => {
        const weekStart = new Date('2024-01-15');
        const errorResponse = { status: 404, statusText: 'Not Found' };

        service.downloadWeeklyReport(weekStart);

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.flush('Not Found', errorResponse);

        expect(console.error).toHaveBeenCalledWith('Failed to generate report:', jasmine.any(Object));
        expect(window.alert).toHaveBeenCalledWith('Failed to generate report. Please try again.');
        expect(createObjectURLSpy).not.toHaveBeenCalled();
        expect(clickSpy).not.toHaveBeenCalled();
      });

      it('should handle network errors during download', () => {
        const weekStart = new Date('2024-01-15');

        service.downloadWeeklyReport(weekStart);

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.error(new ProgressEvent('Network error'));

        expect(console.error).toHaveBeenCalledWith('Failed to generate report:', jasmine.any(Object));
        expect(window.alert).toHaveBeenCalledWith('Failed to generate report. Please try again.');
      });

      it('should handle empty blob download', () => {
        const weekStart = new Date('2024-01-15');
        const emptyBlob = new Blob([], { type: 'application/pdf' });

        service.downloadWeeklyReport(weekStart);

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.flush(emptyBlob);

        expect(createObjectURLSpy).toHaveBeenCalledWith(emptyBlob);
        expect(clickSpy).toHaveBeenCalled();
      });

      it('should handle different blob types', () => {
        const weekStart = new Date('2024-01-15');
        const xlsxBlob = new Blob(['fake-excel-content'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        service.downloadWeeklyReport(weekStart);

        const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
        req.flush(xlsxBlob);

        expect(createObjectURLSpy).toHaveBeenCalledWith(xlsxBlob);
        expect(mockLink.download).toBe('lesson-plan-2024-01-15.pdf'); // Still uses PDF extension
      });
    });
  });

  describe('Blob Download Utility', () => {
    describe('downloadBlob()', () => {
      let mockLink: HTMLAnchorElement;
      let createElementSpy: jasmine.Spy;
      let createObjectURLSpy: jasmine.Spy;
      let revokeObjectURLSpy: jasmine.Spy;
      let appendChildSpy: jasmine.Spy;
      let removeChildSpy: jasmine.Spy;
      let clickSpy: jasmine.Spy;

      beforeEach(() => {
        // Create mock anchor element
        mockLink = {
          href: '',
          download: '',
          click: jasmine.createSpy('click')
        } as any;

        // Setup DOM spies
        createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink);
        appendChildSpy = spyOn(document.body, 'appendChild');
        removeChildSpy = spyOn(document.body, 'removeChild');
        clickSpy = mockLink.click as jasmine.Spy;

        // Setup URL spies
        createObjectURLSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
        revokeObjectURLSpy = spyOn(window.URL, 'revokeObjectURL');
      });

      it('should download blob with custom filename', () => {
        const customBlob = new Blob(['custom content'], { type: 'text/plain' });
        const customFilename = 'custom-report.txt';

        (service as any).downloadBlob(customBlob, customFilename);

        expect(createObjectURLSpy).toHaveBeenCalledWith(customBlob);
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(mockLink.href).toBe('blob:mock-url');
        expect(mockLink.download).toBe(customFilename);
        expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
        expect(clickSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      });

      it('should handle special characters in filename', () => {
        const specialBlob = new Blob(['content'], { type: 'application/pdf' });
        const specialFilename = 'report with spaces & symbols!.pdf';

        (service as any).downloadBlob(specialBlob, specialFilename);

        expect(mockLink.download).toBe(specialFilename);
      });

      it('should handle unicode characters in filename', () => {
        const unicodeBlob = new Blob(['content'], { type: 'application/pdf' });
        const unicodeFilename = 'отчет-报告-レポート.pdf';

        (service as any).downloadBlob(unicodeBlob, unicodeFilename);

        expect(mockLink.download).toBe(unicodeFilename);
      });

      it('should handle empty filename', () => {
        const emptyFilenameBlob = new Blob(['content'], { type: 'application/pdf' });
        const emptyFilename = '';

        (service as any).downloadBlob(emptyFilenameBlob, emptyFilename);

        expect(mockLink.download).toBe('');
        expect(clickSpy).toHaveBeenCalled();
      });

      it('should handle large blob download', () => {
        const largeContent = 'x'.repeat(1024 * 1024); // 1MB of content
        const largeBlob = new Blob([largeContent], { type: 'application/pdf' });
        const filename = 'large-report.pdf';

        (service as any).downloadBlob(largeBlob, filename);

        expect(createObjectURLSpy).toHaveBeenCalledWith(largeBlob);
        expect(clickSpy).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      });
    });
  });

  describe('Date Utilities', () => {
    describe('getStartOfWeek()', () => {
      it('should return start of week for Monday', () => {
        const monday = new Date('2024-01-15T10:30:00Z'); // Monday

        const result = (service as any).getStartOfWeek(monday);

        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(15); // Same Monday
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('should return start of week for Tuesday', () => {
        const tuesday = new Date('2024-01-16T15:45:30Z'); // Tuesday

        const result = (service as any).getStartOfWeek(tuesday);

        expect(result.getDate()).toBe(15); // Previous Monday
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('should return start of week for Wednesday', () => {
        const wednesday = new Date('2024-01-17T08:20:15Z'); // Wednesday

        const result = (service as any).getStartOfWeek(wednesday);

        expect(result.getDate()).toBe(15); // Previous Monday
      });

      it('should return start of week for Thursday', () => {
        const thursday = new Date('2024-01-18T12:00:00Z'); // Thursday

        const result = (service as any).getStartOfWeek(thursday);

        expect(result.getDate()).toBe(15); // Previous Monday
      });

      it('should return start of week for Friday', () => {
        const friday = new Date('2024-01-19T18:30:45Z'); // Friday

        const result = (service as any).getStartOfWeek(friday);

        expect(result.getDate()).toBe(15); // Previous Monday
      });

      it('should return start of week for Saturday', () => {
        const saturday = new Date('2024-01-20T22:15:30Z'); // Saturday

        const result = (service as any).getStartOfWeek(saturday);

        expect(result.getDate()).toBe(15); // Previous Monday
      });

      it('should return start of week for Sunday (special case)', () => {
        const sunday = new Date('2024-01-21T09:00:00Z'); // Sunday

        const result = (service as any).getStartOfWeek(sunday);

        expect(result.getDate()).toBe(15); // Previous Monday (6 days earlier)
      });

      it('should handle month boundary correctly', () => {
        const endOfMonth = new Date('2024-01-31T23:59:59Z'); // Wednesday, end of January

        const result = (service as any).getStartOfWeek(endOfMonth);

        expect(result.getDate()).toBe(29); // Monday of the same week
        expect(result.getMonth()).toBe(0); // Still January
      });

      it('should handle year boundary correctly', () => {
        const newYearSunday = new Date('2024-01-07T12:00:00Z'); // Sunday, first week of year

        const result = (service as any).getStartOfWeek(newYearSunday);

        expect(result.getDate()).toBe(1); // Monday, January 1st
        expect(result.getMonth()).toBe(0); // January
        expect(result.getFullYear()).toBe(2024);
      });

      it('should handle leap year February correctly', () => {
        const leapYearDate = new Date('2024-02-29T10:00:00Z'); // Thursday, leap day

        const result = (service as any).getStartOfWeek(leapYearDate);

        expect(result.getDate()).toBe(26); // Monday of that week
        expect(result.getMonth()).toBe(1); // February
      });

      it('should preserve timezone independence', () => {
        const date1 = new Date('2024-01-15T23:59:59Z'); // Monday, end of day UTC
        const date2 = new Date('2024-01-15T00:00:00Z'); // Monday, start of day UTC

        const result1 = (service as any).getStartOfWeek(date1);
        const result2 = (service as any).getStartOfWeek(date2);

        expect(result1.getTime()).toBe(result2.getTime());
      });
    });

    describe('getCurrentWeekStart()', () => {
      it('should return start of current week', () => {
        const mockCurrentDate = new Date('2024-01-18T14:30:00Z'); // Thursday
        spyOn(window, 'Date').and.returnValue(mockCurrentDate as any);

        const result = service.getCurrentWeekStart();

        expect(result.getDate()).toBe(15); // Monday of that week
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('should handle current date on Sunday', () => {
        const mockCurrentDate = new Date('2024-01-21T16:45:30Z'); // Sunday
        spyOn(window, 'Date').and.returnValue(mockCurrentDate as any);

        const result = service.getCurrentWeekStart();

        expect(result.getDate()).toBe(15); // Previous Monday
      });

      it('should handle current date on Monday', () => {
        const mockCurrentDate = new Date('2024-01-15T08:00:00Z'); // Monday
        spyOn(window, 'Date').and.returnValue(mockCurrentDate as any);

        const result = service.getCurrentWeekStart();

        expect(result.getDate()).toBe(15); // Same Monday
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid date input gracefully', () => {
      const invalidDate = new Date('invalid-date');

      expect(() => {
        service.generateWeeklyLessonPlan(invalidDate).subscribe();
      }).not.toThrow();

      // Should still make HTTP request with invalid date string
      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/Invalid Date');
      req.flush(mockPdfBlob);
    });

    it('should handle null date input', () => {
      expect(() => {
        service.generateWeeklyLessonPlan(null as any).subscribe();
      }).not.toThrow();
    });

    it('should handle undefined date input', () => {
      expect(() => {
        service.generateWeeklyLessonPlan(undefined as any).subscribe();
      }).not.toThrow();
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');

      service.generateWeeklyLessonPlan(oldDate).subscribe();

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/1900-01-01');
      expect(req.request.method).toBe('GET');
      req.flush(mockPdfBlob);
    });

    it('should handle far future dates', () => {
      const futureDate = new Date('2099-12-31');

      service.generateWeeklyLessonPlan(futureDate).subscribe();

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2099-12-31');
      expect(req.request.method).toBe('GET');
      req.flush(mockPdfBlob);
    });

    it('should handle blob with null content', () => {
      const nullBlob = new Blob([null as any], { type: 'application/pdf' });

      service.generateWeeklyLessonPlan(testDate).subscribe(blob => {
        expect(blob).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      req.flush(nullBlob);
    });

    it('should handle blob with undefined content', () => {
      const undefinedBlob = new Blob([undefined as any], { type: 'application/pdf' });

      service.generateWeeklyLessonPlan(testDate).subscribe(blob => {
        expect(blob).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      req.flush(undefinedBlob);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete weekly report workflow', () => {
      // Setup download mocks
      const mockLink = {
        href: '',
        download: '',
        click: jasmine.createSpy('click')
      } as any;

      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');

      const weekStart = new Date('2024-01-15');

      // Execute download
      service.downloadWeeklyReport(weekStart);

      // Verify API call
      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      // Complete the request
      req.flush(mockPdfBlob);

      // Verify download process
      expect(mockLink.download).toBe('lesson-plan-2024-01-15.pdf');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle week calculation and report generation', () => {
      // Test with a Friday date
      const fridayDate = new Date('2024-01-19T15:30:00Z'); // Friday

      // Calculate expected Monday
      const expectedMonday = service.getCurrentWeekStart();

      // Should still work with any date
      service.generateWeeklyLessonPlan(fridayDate).subscribe();

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-19');
      req.flush(mockPdfBlob);
    });

    it('should handle multiple concurrent download requests', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-22');

      // Start both downloads
      service.generateWeeklyLessonPlan(date1).subscribe();
      service.generateWeeklyLessonPlan(date2).subscribe();

      // Verify both requests are made
      const req1 = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      const req2 = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-22');

      // Complete both requests
      req1.flush(mockPdfBlob);
      req2.flush(mockPdfBlob);
    });

    it('should handle API timeout scenarios', () => {
      const weekStart = new Date('2024-01-15');

      service.generateWeeklyLessonPlan(weekStart).subscribe({
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
        }
      });

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      req.error(new ProgressEvent('timeout'), { status: 0, statusText: 'Timeout' });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should properly clean up blob URLs after download', () => {
      const mockLink = {
        href: '',
        download: '',
        click: jasmine.createSpy('click')
      } as any;

      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      const createObjectURLSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      const revokeObjectURLSpy = spyOn(window.URL, 'revokeObjectURL');

      service.downloadWeeklyReport(new Date('2024-01-15'));

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      req.flush(mockPdfBlob);

      expect(createObjectURLSpy).toHaveBeenCalledWith(mockPdfBlob);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle large blob downloads efficiently', () => {
      const largeContent = new Array(1024 * 1024).fill('x').join(''); // 1MB string
      const largeBlob = new Blob([largeContent], { type: 'application/pdf' });

      service.generateWeeklyLessonPlan(testDate).subscribe(blob => {
        expect(blob.size).toBeGreaterThan(1024 * 1024);
      });

      const req = httpMock.expectOne('/api/reports/weekly-lesson-plan/2024-01-15');
      req.flush(largeBlob);
    });
  });
});