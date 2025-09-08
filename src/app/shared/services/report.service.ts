import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly apiUrl = '/api/reports';

  constructor(private http: HttpClient) { }

  generateWeeklyLessonPlan(weekStart: Date): Observable<Blob> {
    const weekStartISO = weekStart.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
    return this.http.get(`${this.apiUrl}/weekly-lesson-plan/${weekStartISO}`, {
      responseType: 'blob'
    });
  }

  downloadWeeklyReport(weekStart: Date): void {
    this.generateWeeklyLessonPlan(weekStart).subscribe({
      next: (blob) => {
        const fileName = `lesson-plan-${weekStart.toISOString().split('T')[0]}.pdf`;
        this.downloadBlob(blob, fileName);
      },
      error: (error) => {
        console.error('Failed to generate report:', error);
        alert('Failed to generate report. Please try again.');
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private getStartOfWeek(date: Date): Date {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  getCurrentWeekStart(): Date {
    return this.getStartOfWeek(new Date());
  }
}