import { Injectable } from "@angular/core";
import { OperationType } from "../course-data/course-data.service";


@Injectable({
    providedIn: 'root'
  })
  export class NodeOperationClassifierService {

    isUserInitiatedOperation(operationType: OperationType): boolean {
      return ['USER_ADD', 'DRAG_MOVE', 'COPY_PASTE'].includes(operationType);
    }

    isBulkOperation(operationType: OperationType): boolean {
      return ['BULK_LOAD', 'IMPORT'].includes(operationType);
    }

    shouldUseIncrementalUpdate(operationType: OperationType, entityType: string): boolean {
    // Only use incremental updates for user-initiated single node operations
    if (!this.isUserInitiatedOperation(operationType)) {
      return false;
    }

    // ✅ EXISTING: Lesson incremental support
    if (operationType === 'USER_ADD' && entityType === 'Lesson') {
      return true;
    }

    // ✅ NEW: Topic incremental support
    if (operationType === 'USER_ADD' && entityType === 'Topic') {
      return true;
    }

    // ✅ NEW: SubTopic incremental support
    if (operationType === 'USER_ADD' && entityType === 'SubTopic') {
      return true;
    }

    // Default to full sync for safety
    return false;
  }

    getOperationDescription(operationType: OperationType, entityType : string): string {
      switch (operationType) {
        case 'USER_ADD':
          return `User added ${entityType }`;
        case 'BULK_LOAD':
          return `Bulk loading ${entityType }s`;
        case 'DRAG_MOVE':
          return `Dragged ${entityType }`;
        case 'COPY_PASTE':
          return `Copied ${entityType }`;
        case 'IMPORT':
          return `Imported ${entityType }`;
        case 'API_RESPONSE':
          return `API response for ${entityType }`;
        default:
          return `Unknown operation on ${entityType }`;
      }
    }
  }
