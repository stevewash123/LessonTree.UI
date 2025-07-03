// **TEMPORARY FACADE** - SpecialDayManagementService - Delegates to Split Services
// RESPONSIBILITY: Temporary facade to maintain backward compatibility during migration
// SCOPE: Delegates all operations to business or coordination services as appropriate
// RATIONALE: Safe migration path - WILL BE DELETED after component imports updated

import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';

import { SpecialDayCoordinationService } from '../coordination/special-day-coordination.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import {SpecialDayBusinessService, SpecialDayData, SpecialDayValidationResult} from './special-day-buisness.service';

// Re-export types for backward compatibility
export type {
  SpecialDayData,
  SpecialDayValidationResult
} from './special-day-buisness.service'

export type {
  SpecialDayOperationEvent,
  SpecialDayCoordinationEvent
} from '../coordination/special-day-coordination.service';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayManagementService implements OnDestroy {

  constructor(
    private business: SpecialDayBusinessService,
    private coordination: SpecialDayCoordinationService
  ) {
    console.log('[SpecialDayManagementService] FACADE PATTERN - Delegating to split services');
    console.log('[SpecialDayManagementService] Business Service:', !!this.business);
    console.log('[SpecialDayManagementService] Coordination Service:', !!this.coordination);
  }

  // === OBSERVABLE STREAMS - Delegate to Coordination Service ===

  get specialDayOperation$() {
    return this.coordination.specialDayOperation$;
  }

  get specialDayCoordinated$() {
    return this.coordination.specialDayCoordinated$;
  }

  // === PRIMARY OPERATIONS - Delegate to Coordination Service (includes lesson integration) ===

  createSpecialDay(data: SpecialDayData): Observable<ScheduleEvent[]> {
    console.log('[SpecialDayManagementService] FACADE: Delegating createSpecialDay to coordination service');
    return this.coordination.createSpecialDayWithCoordination(data);
  }

  updateSpecialDay(data: SpecialDayData, originalScheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    console.log('[SpecialDayManagementService] FACADE: Delegating updateSpecialDay to coordination service');
    return this.coordination.updateSpecialDayWithCoordination(data, originalScheduleEvent);
  }

  deleteSpecialDay(scheduleEvent: ScheduleEvent): Observable<void> {
    console.log('[SpecialDayManagementService] FACADE: Delegating deleteSpecialDay to coordination service');
    return this.coordination.deleteSpecialDayWithCoordination(scheduleEvent);
  }

  // === DATA OPERATIONS - Delegate to Business Service ===

  extractSpecialDayData(scheduleEvent: ScheduleEvent): SpecialDayData | null {
    console.log('[SpecialDayManagementService] FACADE: Delegating extractSpecialDayData to business service');
    return this.business.extractSpecialDayData(scheduleEvent);
  }

  findSpecialDayById(scheduleEventId: number): ScheduleEvent | null {
    console.log('[SpecialDayManagementService] FACADE: Delegating findSpecialDayById to business service');
    return this.business.findSpecialDayById(scheduleEventId);
  }

  getSpecialDaysForDate(date: Date): ScheduleEvent[] {
    console.log('[SpecialDayManagementService] FACADE: Delegating getSpecialDaysForDate to business service');
    return this.business.getSpecialDaysForDate(date);
  }

  // === VALIDATION - Delegate to Business Service ===

  validateSpecialDayData(data: SpecialDayData): SpecialDayValidationResult {
    console.log('[SpecialDayManagementService] FACADE: Delegating validateSpecialDayData to business service');
    return this.business.validateSpecialDayData(data);
  }

  // === CLEANUP - Delegate to Coordination Service ===

  ngOnDestroy(): void {
    console.log('[SpecialDayManagementService] FACADE: Delegating cleanup to coordination service');
    // Only coordination service has subscriptions to clean up
    this.coordination.ngOnDestroy();
  }
}
