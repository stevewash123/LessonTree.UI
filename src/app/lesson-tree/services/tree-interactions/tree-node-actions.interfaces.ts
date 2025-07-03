// Observable Event Interfaces for TreeNodeActionsService
// RESPONSIBILITY: Type definitions for node action coordination events

import { NodeType } from '../node-operations/node-selection.service';

export interface NodeActionResult {
  success: boolean;
  action: 'select' | 'add' | 'delete' | 'auto-select';
  nodeId?: string;
  nodeType?: NodeType;
  error?: string;
}

export interface NodeActionEvent {
  action: 'select' | 'add' | 'delete' | 'auto-select';
  nodeId: string;
  nodeType: NodeType;
  success: boolean;
  metadata?: {
    parentId?: string;
    childType?: NodeType;
    selectionSource?: string;
    userAction?: string;
    entityId?: number;
  };
  error?: string;
  timestamp: Date;
}

export interface SelectionCoordinationEvent {
  selectedNodeId: string;
  selectedNodeType: NodeType;
  selectionSource: 'tree' | 'external';
  previousSelection?: {
    nodeId: string;
    nodeType: NodeType;
  };
  timestamp: Date;
}

export interface NodeActionInitiationEvent {
  action: 'add' | 'delete';
  targetNodeId: string;
  targetNodeType: NodeType;
  childType?: NodeType;
  userTrigger: 'context-menu' | 'button' | 'keyboard';
  timestamp: Date;
}
