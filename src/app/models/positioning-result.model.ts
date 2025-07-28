// **COMPLETE FILE** - models/positioning-result.ts
// UPDATED: Result types matching EntityPositioningService API responses (PositioningModels.cs)

/**
 * Entity state information from API EntityStateInfo
 */
export interface EntityStateInfo {
  id: number;
  type: string;              // "Lesson", "SubTopic", "Topic"
  title: string;
  sortOrder: number;
  topicId?: number | null;
  subTopicId?: number | null;
  isMovedEntity: boolean;    // Identifies the entity that was dragged
}

/**
 * Main API response type matching EntityPositionResult
 */
export interface EntityPositionResult {
  isSuccess: boolean;
  errorMessage: string;
  modifiedEntities: EntityStateInfo[];  // All entities affected by the move
}

/**
 * Legacy interfaces for backward compatibility
 * TODO: Remove after full migration to EntityPositionResult
 */
export interface BasePositioningResult {
  success: boolean;
  message: string;
  affectedEntities: number[];
}

export interface LessonPositioningResult extends BasePositioningResult {
  lessonId: number;
  newSortOrder: number;
  newParentId: number;
  newParentType: 'Topic' | 'SubTopic';
}

export interface SubTopicPositioningResult extends BasePositioningResult {
  subTopicId: number;
  newSortOrder: number;
  newTopicId: number;
}

export interface TopicPositioningResult extends BasePositioningResult {
  topicId: number;
  newSortOrder: number;
  newCourseId: number;
}

/**
 * Union type for legacy positioning results
 */
export type PositioningResult =
  | LessonPositioningResult
  | SubTopicPositioningResult
  | TopicPositioningResult;
