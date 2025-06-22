// **COMPLETE FILE** - Replace existing node-positioning.service.ts

// RESPONSIBILITY: Sort order calculations and delegates to proper API endpoints
// DOES NOT: Orchestrate multiple API calls or handle frontend sort order fixes
// CALLED BY: NodeOperationsService for position-based moves

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from '../../shared/services/api.service';
import { TreeData, NodeMovedEvent } from '../../models/tree-node';

@Injectable({
  providedIn: 'root'
})
export class NodePositioningService {

  constructor(private apiService: ApiService) {
    console.log('[NodePositioningService] Service initialized');
  }

  /**
   * Perform positional move using enhanced moveLesson API
   */
  performPositionalMove(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Lesson' | 'SubTopic'
  ): Observable<{ success: boolean; sortOrder?: number }> {
    const { node, targetParentId, targetParentType } = event;
    
    console.log(`[NodePositioningService] Using enhanced moveLesson API:`, {
      nodeId: node.id,
      nodeType: node.nodeType,
      targetParentId,
      targetParentType,
      relativeToId,
      relativePosition,
      relativeToType
    });

    if (node.nodeType === 'Lesson') {
      if (targetParentType !== 'SubTopic' && targetParentType !== 'Topic') {
        console.error(`[NodePositioningService] Invalid parent type: ${targetParentType}`);
        return of({ success: false });
      }

      const targetSubTopicId = targetParentType === 'SubTopic' ? targetParentId : undefined;
      const targetTopicId = targetParentType === 'Topic' ? targetParentId : undefined;

      // Use the enhanced moveLesson API with positioning parameters
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

    // For other node types, no special positioning logic implemented yet
    console.log(`[NodePositioningService] Positional move not implemented for ${node.nodeType}`);
    return of({ success: false });
  }

  /**
   * Check if positional moves are supported for this node type
   */
  supportsPositionalMove(nodeType: string): boolean {
    return nodeType === 'Lesson';
  }
}