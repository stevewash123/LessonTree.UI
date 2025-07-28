// **NEW SERVICE** - LessonPositioningService - Lesson Sort Order and Position Calculation
// RESPONSIBILITY: Calculate lesson sort order and position changes within course structure only
// DOES NOT: Handle temporal scheduling, calendar display, Observable coordination, or tree UI operations
// CALLED BY: NodeOperationsService for lesson repositioning after drag/drop operations

import { Injectable } from '@angular/core';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';

export interface LessonMoveContext {
  draggedLessonId: number;
  targetLessonId: number;
  dropPosition: 'before' | 'after';
  sourceParentId: number;
  sourceParentType: 'Topic' | 'SubTopic';
  targetParentId: number;
  targetParentType: 'Topic' | 'SubTopic';
}

export interface LessonOrderUpdate {
  lessonId: number;
  newSortOrder: number;
  newParentId: number;
  newParentType: 'Topic' | 'SubTopic';
  moveType: 'reorder' | 'reparent';
  affectedLessons: Array<{
    lessonId: number;
    oldSortOrder: number;
    newSortOrder: number;
  }>;
}

export interface LessonPositioningValidation {
  isValid: boolean;
  canMove: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LessonPositioningService {

  constructor(private courseDataService: CourseDataService) {
    console.log('[LessonPositioningService] Initialized for lesson position calculations within course structure');
  }

  // === CORE POSITIONING CALCULATION ===

  /**
   * Calculate new sort order for lesson move based on drag/drop context
   */
  calculateNewSortOrder(draggedLessonId: number, targetLessonId: number, dropPosition: 'before' | 'after'): number {
    console.log(`[LessonPositioningService] Calculating sort order: lesson ${draggedLessonId} ${dropPosition} lesson ${targetLessonId}`);

    const targetLesson = this.findLessonInCourses(targetLessonId);
    if (!targetLesson) {
      throw new Error(`Target lesson ${targetLessonId} not found in course structure`);
    }

    const targetSortOrder = targetLesson.sortOrder || 0;
    const siblings = this.getLessonSiblings(targetLesson.parentId, targetLesson.parentType);

    if (dropPosition === 'before') {
      return this.calculateBeforePosition(targetSortOrder, siblings);
    } else {
      return this.calculateAfterPosition(targetSortOrder, siblings);
    }
  }

  /**
   * Update lesson order from complete move context
   */
  updateLessonOrderFromMove(moveDetails: LessonMoveContext): LessonOrderUpdate {
    console.log('[LessonPositioningService] 🎯 LESSON POSITIONING START:', {
      draggedLessonId: moveDetails.draggedLessonId,
      targetLessonId: moveDetails.targetLessonId,
      dropPosition: moveDetails.dropPosition,
      sourceParentId: moveDetails.sourceParentId,
      targetParentId: moveDetails.targetParentId,
      moveType: moveDetails.sourceParentId === moveDetails.targetParentId ? 'reorder' : 'reparent',
      timestamp: new Date().toISOString()
    });

    const newSortOrder = this.calculateNewSortOrder(
      moveDetails.draggedLessonId,
      moveDetails.targetLessonId,
      moveDetails.dropPosition
    );

    const moveType = this.determineMoveType(moveDetails);
    const affectedLessons = this.calculateAffectedLessons(moveDetails, newSortOrder);

    const orderUpdate: LessonOrderUpdate = {
      lessonId: moveDetails.draggedLessonId,
      newSortOrder,
      newParentId: moveDetails.targetParentId,
      newParentType: moveDetails.targetParentType,
      moveType,
      affectedLessons
    };

    // 🔍 CONSISTENCY LOGGING - UI Calculation Result
    console.log('[LessonPositioningService] 🎯 UI CALCULATED:', {
      lessonId: orderUpdate.lessonId,
      newSortOrder: orderUpdate.newSortOrder,
      moveType: orderUpdate.moveType,
      affectedLessonsCount: orderUpdate.affectedLessons.length,
      calculation: 'UI-side (should match API)',
      timestamp: new Date().toISOString()
    });

    // 🔍 Log current state for comparison - get current course context
    const draggedLesson = this.findLessonInCourses(moveDetails.draggedLessonId);
    if (draggedLesson) {
      const targetCourse = this.courseDataService.getCourses().find(c => c.id === draggedLesson.courseId);

      if (targetCourse) {
        const allLessonsInCourse = this.courseDataService.collectLessonsFromCourse(targetCourse);

        console.log('[LessonPositioningService] 📊 CURRENT LESSON STATE:', {
          courseId: draggedLesson.courseId,
          totalLessons: allLessonsInCourse.length,
          sortOrders: allLessonsInCourse.map((l: any) => ({
            id: l.id,
            title: l.title,
            sortOrder: l.sortOrder
          })),
          hasDuplicates: this.detectDuplicateSortOrders(allLessonsInCourse),
          hasGaps: this.detectSortOrderGaps(allLessonsInCourse)
        });
      } else {
        console.warn('[LessonPositioningService] ⚠️ Course not found for lesson:', {
          lessonId: draggedLesson.id,
          courseId: draggedLesson.courseId
        });
      }
    }

    return orderUpdate;
  }

  // Add validation helper methods
  private detectSortOrderGaps(lessons: any[]): boolean {
    const sortOrders = lessons.map((l: any) => l.sortOrder).sort((a: number, b: number) => a - b);
    for (let i = 1; i < sortOrders.length; i++) {
      if (sortOrders[i] - sortOrders[i-1] > 1) {
        console.warn('[LessonPositioningService] ⚠️ Sort order gap detected:', {
          gap: `${sortOrders[i-1]} → ${sortOrders[i]}`,
          missingValues: sortOrders[i] - sortOrders[i-1] - 1
        });
        return true;
      }
    }
    return false;
  }

  private detectDuplicateSortOrders(lessons: any[]): boolean {
    const sortOrders = lessons.map((l: any) => l.sortOrder);
    const duplicates = sortOrders.filter((sort: number, index: number) => sortOrders.indexOf(sort) !== index);

    if (duplicates.length > 0) {
      console.error('[LessonPositioningService] 🚨 Duplicate sort orders detected:', {
        duplicateValues: [...new Set(duplicates)],
        affectedLessons: lessons.filter((l: any) => duplicates.includes(l.sortOrder))
      });
      return true;
    }
    return false;
  }

  // === VALIDATION ===

  /**
   * Validate lesson positioning before move
   */
  validateLessonPositioning(moveContext: LessonMoveContext): LessonPositioningValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate lessons exist
    const draggedLesson = this.findLessonInCourses(moveContext.draggedLessonId);
    const targetLesson = this.findLessonInCourses(moveContext.targetLessonId);

    if (!draggedLesson) {
      errors.push(`Dragged lesson ${moveContext.draggedLessonId} not found`);
    }

    if (!targetLesson) {
      errors.push(`Target lesson ${moveContext.targetLessonId} not found`);
    }

    // Validate parents exist
    if (!this.validateParentExists(moveContext.targetParentId, moveContext.targetParentType)) {
      errors.push(`Target parent ${moveContext.targetParentType}:${moveContext.targetParentId} not found`);
    }

    // Check for same position move
    if (draggedLesson && targetLesson && this.isSamePosition(moveContext, draggedLesson, targetLesson)) {
      warnings.push('Lesson is already in the target position');
    }

    // Validate move is within same course
    if (draggedLesson && targetLesson && draggedLesson.courseId !== targetLesson.courseId) {
      errors.push('Cannot move lessons between different courses');
    }

    const isValid = errors.length === 0;
    const canMove = isValid && warnings.length === 0;

    return {
      isValid,
      canMove,
      errors,
      warnings
    };
  }

  // === PRIVATE CALCULATION METHODS ===

  private calculateBeforePosition(targetSortOrder: number, siblings: any[]): number {
    // Find the lesson immediately before target
    const sortedSiblings = siblings
      .filter(lesson => lesson.sortOrder < targetSortOrder)
      .sort((a, b) => b.sortOrder - a.sortOrder);

    if (sortedSiblings.length === 0) {
      // Target is first, place new lesson before it
      return Math.max(targetSortOrder - 10, 0);
    }

    const previousSortOrder = sortedSiblings[0].sortOrder;
    return this.calculateMidpoint(previousSortOrder, targetSortOrder);
  }

  private calculateAfterPosition(targetSortOrder: number, siblings: any[]): number {
    // Find the lesson immediately after target
    const sortedSiblings = siblings
      .filter(lesson => lesson.sortOrder > targetSortOrder)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (sortedSiblings.length === 0) {
      // Target is last, place new lesson after it
      return targetSortOrder + 10;
    }

    const nextSortOrder = sortedSiblings[0].sortOrder;
    return this.calculateMidpoint(targetSortOrder, nextSortOrder);
  }

  private calculateMidpoint(lower: number, upper: number): number {
    const midpoint = (lower + upper) / 2;

    // If midpoint would be too close, expand the range
    if (upper - lower < 2) {
      console.warn('[LessonPositioningService] Sort orders too close, suggesting rebalancing');
      return upper - 1; // Temporary solution, ideally would trigger rebalancing
    }

    return Math.round(midpoint);
  }

  private calculateAffectedLessons(moveContext: LessonMoveContext, newSortOrder: number): Array<{lessonId: number; oldSortOrder: number; newSortOrder: number}> {
    // For now, only the moved lesson is affected
    // This could be expanded to handle rebalancing if needed
    const draggedLesson = this.findLessonInCourses(moveContext.draggedLessonId);

    if (!draggedLesson) {
      return [];
    }

    return [{
      lessonId: moveContext.draggedLessonId,
      oldSortOrder: draggedLesson.sortOrder || 0,
      newSortOrder
    }];
  }

  // === HELPER METHODS ===

  private findLessonInCourses(lessonId: number): any | null {
    const courses = this.courseDataService.getCourses();

    for (const course of courses) {
      const lesson = this.courseDataService.collectLessonsFromCourse(course)
        .find(l => l.id === lessonId);

      if (lesson) {
        // Enhance with parent information
        const parentInfo = this.findLessonParent(lesson, course);
        return {
          ...lesson,
          courseId: course.id,
          parentId: parentInfo.parentId,
          parentType: parentInfo.parentType
        };
      }
    }

    return null;
  }

  private findLessonParent(lesson: any, course: any): {parentId: number; parentType: 'Topic' | 'SubTopic'} {
    // Search topics
    for (const topic of course.topics || []) {
      if (topic.lessons?.some((l: any) => l.id === lesson.id)) {
        return { parentId: topic.id, parentType: 'Topic' };
      }

      // Search subtopics
      for (const subtopic of topic.subTopics || []) {
        if (subtopic.lessons?.some((l: any) => l.id === lesson.id)) {
          return { parentId: subtopic.id, parentType: 'SubTopic' };
        }
      }
    }

    throw new Error(`Could not find parent for lesson ${lesson.id}`);
  }

  private getLessonSiblings(parentId: number, parentType: 'Topic' | 'SubTopic'): any[] {
    const courses = this.courseDataService.getCourses();

    for (const course of courses) {
      if (parentType === 'Topic') {
        const topic = course.topics?.find((t: any) => t.id === parentId);
        return topic?.lessons || [];
      } else {
        for (const topic of course.topics || []) {
          const subtopic = topic.subTopics?.find((st: any) => st.id === parentId);
          if (subtopic) {
            return subtopic.lessons || [];
          }
        }
      }
    }

    return [];
  }

  private validateParentExists(parentId: number, parentType: 'Topic' | 'SubTopic'): boolean {
    const courses = this.courseDataService.getCourses();

    for (const course of courses) {
      if (parentType === 'Topic') {
        if (course.topics?.some((t: any) => t.id === parentId)) {
          return true;
        }
      } else {
        for (const topic of course.topics || []) {
          if (topic.subTopics?.some((st: any) => st.id === parentId)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isSamePosition(moveContext: LessonMoveContext, draggedLesson: any, targetLesson: any): boolean {
    if (draggedLesson.parentId !== moveContext.targetParentId) {
      return false; // Different parents
    }

    const siblings = this.getLessonSiblings(draggedLesson.parentId, draggedLesson.parentType);
    const draggedIndex = siblings.findIndex(l => l.id === draggedLesson.id);
    const targetIndex = siblings.findIndex(l => l.id === targetLesson.id);

    if (moveContext.dropPosition === 'before') {
      return draggedIndex === targetIndex - 1;
    } else {
      return draggedIndex === targetIndex + 1;
    }
  }

  private determineMoveType(moveContext: LessonMoveContext): 'reorder' | 'reparent' {
    return moveContext.sourceParentId === moveContext.targetParentId ? 'reorder' : 'reparent';
  }

  // === DEBUG UTILITIES ===

  /**
   * Get debug information about positioning calculations
   */
  getDebugInfo(): any {
    return {
      positioningService: {
        initialized: true,
        canCalculatePositions: true,
        supportedOperations: [
          'calculateNewSortOrder',
          'updateLessonOrderFromMove',
          'validateLessonPositioning'
        ],
        responsibilities: [
          'Lesson sort order calculation',
          'Position validation within course structure',
          'Move context processing'
        ],
        doesNot: [
          'Handle temporal scheduling',
          'Manage calendar display',
          'Observable coordination',
          'Tree UI operations'
        ]
      }
    };
  }
}
