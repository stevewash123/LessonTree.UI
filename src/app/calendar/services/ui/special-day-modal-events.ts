// RESPONSIBILITY: Observable event interfaces for special day modal operations
// DOES NOT: Contain any business logic - pure type definitions
// CALLED BY: SpecialDayModalService and other services that subscribe to modal events

// Observable event for modal lifecycle operations
export interface SpecialDayModalOperationEvent {
  operationType: 'opened' | 'closed' | 'saved' | 'deleted' | 'cancelled';
  mode: 'add' | 'edit' | null;
  date: Date | null;
  periods: number[] | null;
  eventType: string | null;
  title: string | null;
  success: boolean;
  source: 'modal-operation';
  timestamp: Date;
}

// Observable event for quick actions (context menu operations)
export interface SpecialDayQuickActionEvent {
  actionType: 'quick-delete' | 'direct-edit' | 'error-info';
  scheduleEventId: number | null;
  period: number | null;
  date: Date | null;
  eventType: string | null;
  success: boolean;
  errorMessage: string | null;
  source: 'quick-action';
  timestamp: Date;
}
