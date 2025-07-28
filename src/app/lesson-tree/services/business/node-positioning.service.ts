// **COMPLETE FILE** - Replace existing node-positioning.service.ts

// RESPONSIBILITY: Sort order calculations and delegates to proper API endpoints
// DOES NOT: Orchestrate multiple API calls or handle frontend sort order fixes
// CALLED BY: NodeOperationsService for position-based moves

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { TreeData, NodeMovedEvent } from '../../../models/tree-node';

@Injectable({
  providedIn: 'root'
})
export class NodePositioningService {

  constructor(private apiService: ApiService) {
    console.log('[NodePositioningService] Service initialized');
  }

  /**
   * Perform positional move using enhanced API with positioning parameters
   * ✅ UNIVERSAL: All entity types support positioning
   */
  performPositionalMove(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Topic' | 'SubTopic' | 'Lesson'
  ): Observable<{ success: boolean; sortOrder?: number }> {
    const { node, targetParentId, targetParentType } = event;

    // ✅ Type guard: Ensure targetParentId is defined
    if (targetParentId === undefined) {
      console.error(`[NodePositioningService] targetParentId is undefined for ${node.entityType} positioning`);
      return of({ success: false });
    }

    console.log(`[NodePositioningService] Using enhanced positioning API:`, {
      nodeId: node.id,
      entityType: node.entityType,
      targetParentId,
      targetParentType,
      relativeToId,
      relativePosition,
      relativeToType
    });

    // Handle Lesson positioning
    if (node.entityType === 'Lesson') {
      if (targetParentType !== 'SubTopic' && targetParentType !== 'Topic') {
        console.error(`[NodePositioningService] Invalid parent type for Lesson: ${targetParentType}`);
        return of({ success: false });
      }

      const targetSubTopicId = targetParentType === 'SubTopic' ? targetParentId : undefined;
      const targetTopicId = targetParentType === 'Topic' ? targetParentId : undefined;

      // ✅ Filter relativeToType for moveLesson API (only accepts 'Lesson' | 'SubTopic')
      if (relativeToType !== 'Lesson' && relativeToType !== 'SubTopic') {
        console.error(`[NodePositioningService] Invalid relativeToType for Lesson: ${relativeToType}`);
        return of({ success: false });
      }

      return this.apiService.moveLesson(
        node.id,
        targetSubTopicId,
        targetTopicId,
        relativeToId,
        relativePosition,
        relativeToType
      ).pipe(
        tap(() => {
          console.log(`[NodePositioningService] Enhanced moveLesson API successfully handled position move for lesson ${node.id}`);
        }),
        map(() => ({ success: true })),
        catchError(err => {
          console.error('[NodePositioningService] Enhanced moveLesson API position move failed:', err);
          return of({ success: false });
        })
      );
    }

    // Handle SubTopic positioning
    if (node.entityType === 'SubTopic') {
      if (targetParentType !== 'Topic') {
        console.error(`[NodePositioningService] Invalid parent type for SubTopic: ${targetParentType}`);
        return of({ success: false });
      }

      // ✅ Filter relativeToType for moveSubTopic API (only accepts 'SubTopic' | 'Lesson')
      if (relativeToType !== 'SubTopic' && relativeToType !== 'Lesson') {
        console.error(`[NodePositioningService] Invalid relativeToType for SubTopic: ${relativeToType}`);
        return of({ success: false });
      }

      return this.apiService.moveSubTopic(
        node.id,
        targetParentId,
        relativeToId,
        relativePosition,
        relativeToType
      ).pipe(
        tap(() => {
          console.log(`[NodePositioningService] Enhanced moveSubTopic API successfully handled position move for subtopic ${node.id}`);
        }),
        map(() => ({ success: true })),
        catchError(err => {
          console.error('[NodePositioningService] Enhanced moveSubTopic API position move failed:', err);
          return of({ success: false });
        })
      );
    }

    // ✅ Handle Topic positioning
    if (node.entityType === 'Topic') {
      if (targetParentType !== 'Course') {
        console.error(`[NodePositioningService] Invalid parent type for Topic: ${targetParentType}`);
        return of({ success: false });
      }

      // ✅ FIX: Type constraint - moveTopic only accepts 'Topic' relativeToType
      if (relativeToType !== 'Topic') {
        console.error(`[NodePositioningService] moveTopic only accepts 'Topic' relativeToType, got: ${relativeToType}`);
        return of({ success: false });
      }

      return this.apiService.moveTopic(
        node.id,
        targetParentId,
        relativeToId,
        relativePosition,
        relativeToType as 'Topic'  // ✅ Type assertion - we validated above
      ).pipe(
        tap(() => {
          console.log(`[NodePositioningService] Enhanced moveTopic API successfully handled position move for topic ${node.id}`);
        }),
        map(() => ({ success: true })),
        catchError(err => {
          console.error('[NodePositioningService] Enhanced moveTopic API position move failed:', err);
          return of({ success: false });
        })
      );
    }

    // ❌ This should never happen - all entity types support positioning
    console.error(`[NodePositioningService] Unsupported entity type for positioning: ${node.entityType}`);
    return of({ success: false });
  }
}
