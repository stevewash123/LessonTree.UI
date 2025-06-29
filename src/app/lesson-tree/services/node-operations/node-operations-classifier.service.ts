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
  
    shouldUseIncrementalUpdate(operationType: OperationType, nodeType: string): boolean {
      // Only use incremental updates for user-initiated single node operations
      if (!this.isUserInitiatedOperation(operationType)) {
        return false;
      }
      
      // Only for specific operation types that we've validated work with incremental updates
      if (operationType === 'USER_ADD' && nodeType === 'Lesson') {
        return true;
      }
      
      // Default to full sync for safety
      return false;
    }
  
    getOperationDescription(operationType: OperationType, nodeType: string): string {
      switch (operationType) {
        case 'USER_ADD':
          return `User added ${nodeType}`;
        case 'BULK_LOAD':
          return `Bulk loading ${nodeType}s`;
        case 'DRAG_MOVE':
          return `Dragged ${nodeType}`;
        case 'COPY_PASTE':
          return `Copied ${nodeType}`;
        case 'IMPORT':
          return `Imported ${nodeType}`;
        case 'API_RESPONSE':
          return `API response for ${nodeType}`;
        default:
          return `Unknown operation on ${nodeType}`;
      }
    }
  }