// **COMPLETE FILE** - schedule-configuration-api.service.ts
// RESPONSIBILITY: HTTP API operations for schedule configurations only
// DOES NOT: Handle business logic, form management, or schedule generation
// CALLED BY: ScheduleConfigurationService for persistence operations

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ScheduleConfiguration, 
  ScheduleConfigurationCreateResource,
  ScheduleConfigUpdateResource,
  ScheduleConfigValidationResult 
} from '../../models/schedule-configuration.model';
import { environment } from '../../../environments/environment';

export interface ScheduleConfigurationSummary {
  id: number;
  title: string;
  schoolYear: string;
  isActive: boolean;
  isTemplate: boolean;
  lastUpdated: Date;
}

export interface CopyConfigurationRequest {
  newTitle: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleConfigurationApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/ScheduleConfiguration';

  constructor() {
    console.log('[ScheduleConfigurationApiService] Initialized for ScheduleConfiguration API operations');
  }

  /**
   * Get all schedule configurations for current user
   */
  getAllConfigurations(): Observable<ScheduleConfiguration[]> {
    console.log('[ScheduleConfigurationApiService] Fetching all configurations');
    return this.http.get<ScheduleConfiguration[]>(this.baseUrl);
  }

  /**
   * Get configuration summaries for listing
   */
  getConfigurationSummaries(): Observable<ScheduleConfigurationSummary[]> {
    console.log('[ScheduleConfigurationApiService] Fetching configuration summaries');
    return this.http.get<ScheduleConfigurationSummary[]>(`${this.baseUrl}/summaries`);
  }

  /**
   * Get specific configuration by ID
   */
  getConfigurationById(id: number): Observable<ScheduleConfiguration> {
    console.log(`[ScheduleConfigurationApiService] Fetching configuration ID ${id}`);
    return this.http.get<ScheduleConfiguration>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get user's active configuration
   */
  getActiveConfiguration(): Observable<ScheduleConfiguration> {
    console.log('[ScheduleConfigurationApiService] Fetching active configuration');
    return this.http.get<ScheduleConfiguration>(`${this.baseUrl}/active`);
  }

  /**
   * Get configuration by school year
   */
  getConfigurationBySchoolYear(schoolYear: string): Observable<ScheduleConfiguration> {
    console.log(`[ScheduleConfigurationApiService] Fetching configuration for school year ${schoolYear}`);
    return this.http.get<ScheduleConfiguration>(`${this.baseUrl}/schoolYear/${schoolYear}`);
  }

  /**
   * Get user's template configurations
   */
  getTemplateConfigurations(): Observable<ScheduleConfiguration[]> {
    console.log('[ScheduleConfigurationApiService] Fetching template configurations');
    return this.http.get<ScheduleConfiguration[]>(`${this.baseUrl}/templates`);
  }

  /**
   * Create new schedule configuration
   */
  createConfiguration(configuration: ScheduleConfigurationCreateResource): Observable<ScheduleConfiguration> {
    console.log('[ScheduleConfigurationApiService] Creating new configuration', {
      title: configuration.title,
      schoolYear: configuration.schoolYear,
      periodsPerDay: configuration.periodsPerDay
    });
    return this.http.post<ScheduleConfiguration>(this.baseUrl, configuration);
  }

  /**
   * Update existing schedule configuration
   */
  updateConfiguration(id: number, configuration: ScheduleConfigUpdateResource): Observable<ScheduleConfiguration> {
    console.log(`[ScheduleConfigurationApiService] Updating configuration ID ${id}`, {
      id: configuration.id,
      title: configuration.title,
      schoolYear: configuration.schoolYear,
      periodsPerDay: configuration.periodsPerDay
    });
    return this.http.put<ScheduleConfiguration>(`${this.baseUrl}/${id}`, configuration);
  }

  /**
   * Delete schedule configuration
   */
  deleteConfiguration(id: number): Observable<void> {
    console.log(`[ScheduleConfigurationApiService] Deleting configuration ID ${id}`);
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Set configuration as active (deactivates others)
   */
  activateConfiguration(id: number): Observable<ScheduleConfiguration> {
    console.log(`[ScheduleConfigurationApiService] Activating configuration ID ${id}`);
    return this.http.post<ScheduleConfiguration>(`${this.baseUrl}/${id}/activate`, {});
  }

  /**
   * Copy configuration as new template
   */
  copyAsTemplate(id: number, request: CopyConfigurationRequest): Observable<ScheduleConfiguration> {
    console.log(`[ScheduleConfigurationApiService] Copying configuration ID ${id} as template`, {
      newTitle: request.newTitle
    });
    return this.http.post<ScheduleConfiguration>(`${this.baseUrl}/${id}/copy`, request);
  }

  /**
   * Validate configuration completeness and rules
   */
  validateConfiguration(id: number): Observable<ScheduleConfigValidationResult> {
    console.log(`[ScheduleConfigurationApiService] Validating configuration ID ${id}`);
    return this.http.get<ScheduleConfigValidationResult>(`${this.baseUrl}/${id}/validate`);
  }

  /**
   * Get debug information about API endpoints
   */
  getDebugInfo(): any {
    return {
      baseUrl: this.baseUrl,
      endpointsAvailable: [
        'ScheduleConfiguration CRUD',
        'Active Configuration Management',
        'Template Operations',
        'Configuration Validation',
        'School Year Queries'
      ]
    };
  }
}