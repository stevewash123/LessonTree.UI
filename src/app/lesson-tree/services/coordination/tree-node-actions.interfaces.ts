// Observable Event Interfaces for TreeNodeActionsService
// RESPONSIBILITY: Type definitions for node action coordination events


import {entityType } from '../../../models/shared';

export interface NodeActionResult {
  success: boolean;
  action: 'select' | 'add' | 'delete' | 'auto-select';
  nodeId?: string;
  entityType ?: entityType ;
  error?: string;
}

export interface NodeActionEvent {
  action: 'select' | 'add' | 'delete' | 'auto-select';
  nodeId: string;
  entityType : entityType ;
  success: boolean;
  metadata?: {
    parentId?: string;
    childType?: entityType ;
    selectionSource?: string;
    userAction?: string;
    entityId?: number;
  };
  error?: string;
  timestamp: Date;
}

export interface SelectionCoordinationEvent {
  selectedNodeId: string;
  selectedentityType : entityType ;
  selectionSource: 'tree' | 'external';
  previousSelection?: {
    nodeId: string;
    entityType : entityType ;
  };
  timestamp: Date;
}

export interface NodeActionInitiationEvent {
  action: 'add' | 'delete';
  targetNodeId: string;
  targetentityType : entityType ;
  childType?: entityType ;
  userTrigger: 'context-menu' | 'button' | 'keyboard';
  timestamp: Date;
}
