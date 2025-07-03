// RESPONSIBILITY: Signal management and service coordination. Pure signal emission for node operations.
// DOES NOT: Handle data storage, mutations, or filtering logic.
// CALLED BY: CourseCrudService, TreeWrapper, Calendar, NodeOperationsService

import { Injectable, signal, effect } from '@angular/core';
import { Course } from '../../../models/course';
import { TreeData } from '../../../models/tree-node';
import { CourseDataStorageService } from './course-data-storage.service';
import { CourseTreeMutationService } from './course-tree-mutation.service';
import { CourseQueryService } from './course-query.service';
import { CourseFilterService } from './course-filter.service';
import { CourseSignalService } from './course-signal.service';

export type OperationType =
  | 'USER_ADD'      // User clicked add button, used form to create
  | 'API_RESPONSE'  // Generic API response (legacy fallback)
  | 'BULK_LOAD'     // Initial load or full refresh from API
  | 'DRAG_MOVE'     // Drag and drop operation completed
  | 'COPY_PASTE'    // Copy/paste operation
  | 'IMPORT'        // Data imported from external source
  | 'UNKNOWN';      // Fallback for unspecified operations

export interface OperationMetadata {
  parentNodeId?: string;
  insertPosition?: number;
  userAction?: 'ADD_LESSON_BUTTON' | 'ADD_TOPIC_BUTTON' | 'ADD_SUBTOPIC_BUTTON' | 'DRAG_DROP' | 'COPY_PASTE' | 'CONTEXT_MENU';
  dragInfo?: {
    sourceParentId: string;
    targetParentId: string;
    dropPosition: 'before' | 'after' | 'inside';
  };
  bulkInfo?: {
    totalNodes: number;
    nodeType: string;
    loadType: 'initial' | 'refresh' | 'filter';
  };
}

export interface NodeSignalPayload<T extends TreeData = TreeData> {
  node: T;
  source: ChangeSource;
  operationType: OperationType;
  metadata?: OperationMetadata;
  timestamp: Date;
}

export interface NodeMoveSignalPayload {
  node: TreeData;
  sourceLocation: string;
  targetLocation: string;
  changeSource: ChangeSource;
  operationType: OperationType;
  metadata?: OperationMetadata;
  timestamp: Date;
}

export type ChangeSource = 'tree' | 'calendar' | 'infopanel' | 'api' | 'initialization';

@Injectable({
  providedIn: 'root'
})
export class CourseDataService {

  // Enhanced signals for node state changes with operation context (CORE RESPONSIBILITY)
  readonly nodeAdded: any;
  readonly nodeEdited: any;
  readonly nodeDeleted: any;
  readonly nodeMoved: any;

  // Delegate core data signals to storage service (initialized in constructor)
  readonly courses: any;
  readonly loading: any;
  readonly lastUpdated: any;
  readonly coursesCount: any;
  readonly hasData: any;
  readonly isEmpty: any;

  // Delegate filter signals to filter service (initialized in constructor)
  readonly courseFilter: any;
  readonly visibilityFilter: any;
  readonly filteredCourses: any;
  readonly activeCourses: any;
  readonly courseStats: any;
  readonly filteredCoursesCount: any;
  readonly hasFilteredData: any;
  readonly isFilteredEmpty: any;

  constructor(
    private readonly storageService: CourseDataStorageService,
    private readonly mutationService: CourseTreeMutationService,
    private readonly queryService: CourseQueryService,
    private readonly filterService: CourseFilterService,
    private readonly signalService: CourseSignalService
  ) {
    console.log('[CourseDataService] Service initialized with specialized service delegation', {
      timestamp: new Date().toISOString()
    });

    // Delegate signals to CourseSignalService
    this.nodeAdded = this.signalService.nodeAdded;
    this.nodeEdited = this.signalService.nodeEdited;
    this.nodeDeleted = this.signalService.nodeDeleted;
    this.nodeMoved = this.signalService.nodeMoved;

    // Initialize other delegated signals
    this.courses = this.storageService.courses;
    this.loading = this.storageService.loading;
    this.lastUpdated = this.storageService.lastUpdated;
    this.coursesCount = this.storageService.coursesCount;
    this.hasData = this.storageService.hasData;
    this.isEmpty = this.storageService.isEmpty;

    this.courseFilter = this.filterService.courseFilter;
    this.visibilityFilter = this.filterService.visibilityFilter;
    this.filteredCourses = this.filterService.filteredCourses;
    this.activeCourses = this.filterService.activeCourses;
    this.courseStats = this.filterService.courseStats;
    this.filteredCoursesCount = this.filterService.filteredCoursesCount;
    this.hasFilteredData = this.filterService.hasFilteredData;
    this.isFilteredEmpty = this.filterService.isFilteredEmpty;

    // ❌ REMOVED: setupSignalSubscriptions() - was causing infinite loop
    // The public methods (addEntity, updateEntity, removeEntity) already handle
    // both storage updates AND signal emission, so the effect subscriptions
    // were duplicating the storage updates
  }

  // === SIGNAL EMISSION METHODS (CORE RESPONSIBILITY) ===
  emitNodeAdded(
    node: TreeData,
    source: ChangeSource = 'api',
    operationType: OperationType = 'API_RESPONSE',
    metadata?: OperationMetadata
  ): void {
    this.signalService.emitNodeAdded(node, source, operationType); // Fix: Remove metadata param
  }

  emitNodeEdited(
    node: TreeData,
    source: ChangeSource = 'api',
    operationType: OperationType = 'API_RESPONSE',
    metadata?: OperationMetadata
  ): void {
    this.signalService.emitNodeEdited(node, source, operationType); // Fix: Remove metadata param
  }

  emitNodeDeleted(
    node: TreeData,
    source: ChangeSource = 'api',
    operationType: OperationType = 'API_RESPONSE',
    metadata?: OperationMetadata
  ): void {
    this.signalService.emitNodeDeleted(node, source, operationType); // Fix: Remove metadata param
  }

  emitNodeMoved(
    event: {node: TreeData, sourceLocation: string, targetLocation: string},
    changeSource: ChangeSource = 'api',
    operationType: OperationType = 'DRAG_MOVE'
  ): void {
    this.signalService.emitNodeMoved(event.node, event.sourceLocation, event.targetLocation, changeSource); // Fix: Match expected signature
  }

  setCourses(courses: Course[], source: ChangeSource = 'initialization'): void {
    console.log('[CourseDataService] Delegating setCourses to storage service', {
      count: courses.length,
      source,
      timestamp: new Date().toISOString()
    });
    this.storageService.setCourses(courses, source);
  }

  // Filter service delegation
  setFilters(courseFilter: 'active' | 'archived' | 'both', visibilityFilter: 'private' | 'team'): void {
    console.log('[CourseDataService] Delegating setFilters to filter service', {
      courseFilter,
      visibilityFilter,
      timestamp: new Date().toISOString()
    });
    this.filterService.setFilters(courseFilter, visibilityFilter);
  }

  setCourseFilter(filter: 'active' | 'archived' | 'both'): void {
    this.filterService.setCourseFilter(filter);
  }

  setVisibilityFilter(filter: 'private' | 'team'): void {
    this.filterService.setVisibilityFilter(filter);
  }

  // === DATA ACCESS DELEGATION (Query Service) ===

  getCourses(): Course[] {
    return this.queryService.getCourses();
  }

  getCourseById(id: number): Course | null {
    const course = this.queryService.getCourseById(id);
    return course;
  }

  getTopicById(topicId: number) {
    return this.queryService.getTopicById(topicId);
  }

  getSubTopicById(subTopicId: number) {
    return this.queryService.getSubTopicById(subTopicId);
  }

  getLessonById(lessonId: number) {
    return this.queryService.getLessonById(lessonId);
  }

  getLessonDetailById(lessonId: number) {
    return this.queryService.getLessonDetailById(lessonId);
  }

  collectLessonsFromCourse(course: Course) {
    return this.queryService.collectLessonsFromCourse(course);
  }

  getLessonCountForCourse(courseId: number): number {
    return this.queryService.getLessonCountForCourse(courseId);
  }

  validateCourseForScheduling(courseId: number) {
    return this.queryService.validateCourseForScheduling(courseId);
  }

  // === PUBLIC MUTATION METHODS (Delegation with Signal Emission) ===

  /**
   * Add entity with storage update and event emission
   */
  addEntity(
    entity: any,
    source: string,
    operationType: OperationType = 'USER_ADD',
    metadata?: OperationMetadata
  ): void {
    console.log(`[CourseDataService] Adding entity with operation context`, {
      entityType: entity.nodeType,
      entityId: entity.id,
      source,
      operationType,
      metadata,
      timestamp: new Date().toISOString()
    });

    // Update storage first
    this.mutationService.addEntity(entity);

    // ✅ UPDATED: Use entity-based method names
    this.signalService.emitEntityAdded(entity, source, operationType);

    // 🔄 LEGACY: Also emit signal for backward compatibility during migration
    this.signalService.emitNodeAdded(entity, source, operationType);
  }

  /**
   * Update entity with storage update and event emission
   */
  updateEntity(entity: any, source: string): void {
    console.log(`[CourseDataService] Updating entity`, {
      entityType: entity.nodeType,
      entityId: entity.id,
      source,
      timestamp: new Date().toISOString()
    });

    // Update storage first
    this.mutationService.updateEntity(entity);

    // ✅ UPDATED: Use entity-based method names
    this.signalService.emitEntityEdited(entity, source, 'USER_EDIT' as OperationType);

    // 🔄 LEGACY: Also emit signal for backward compatibility
    this.signalService.emitNodeEdited(entity, source, 'USER_EDIT' as OperationType);
  }

  /**
   * Remove entity with storage update and event emission
   */
  removeEntity(entity: any, source: string): void {
    console.log(`[CourseDataService] Removing entity`, {
      entityType: entity.nodeType,
      entityId: entity.id,
      source,
      timestamp: new Date().toISOString()
    });

    // Update storage first
    this.mutationService.removeEntity(entity);

    // ✅ UPDATED: Use entity-based method names
    this.signalService.emitEntityDeleted(entity, source, 'USER_DELETE' as OperationType);

    // 🔄 LEGACY: Also emit signal for backward compatibility
    this.signalService.emitNodeDeleted(entity, source, 'USER_DELETE' as OperationType);
  }
}
