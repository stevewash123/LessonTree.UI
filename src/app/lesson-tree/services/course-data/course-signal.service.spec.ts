// course-signal.service.spec.ts
// Comprehensive unit tests for CourseSignalService - Hybrid signal emission service
// Tests Observable events, Signal state, entity lifecycle events, and hybrid architecture

import { TestBed } from '@angular/core/testing';
import { CourseSignalService, EntitySignalPayload, EntityMoveSignalPayload } from './course-signal.service';
import { Entity, EntityType } from '../../../models/entity';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { Lesson } from '../../../models/lesson';
import { OperationType } from './course-data.service';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';

describe('CourseSignalService', () => {
  let service: CourseSignalService;

  // Test data fixtures
  const mockCourse: Course = new Course({
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    visibility: 'Private',
    sortOrder: 0,
    archived: false,
    userId: 1,
    topics: [],
    standards: []
  });

  const mockTopic: Topic = new Topic({
    id: 2,
    title: 'Test Topic',
    description: 'Test Description',
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockSubTopic: SubTopic = new SubTopic({
    id: 3,
    title: 'Test SubTopic',
    description: 'Test Description',
    topicId: 2,
    courseId: 1,
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  const mockLesson: Lesson = new Lesson({
    id: 4,
    title: 'Test Lesson',
    description: 'Test Description',
    courseId: 1,
    objective: 'Test Objective',
    visibility: 'Private',
    sortOrder: 1,
    archived: false,
    userId: 1
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CourseSignalService]
    });
    service = TestBed.inject(CourseSignalService);
  });

  // ===================================
  // Service Initialization Tests
  // ===================================

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with hybrid Subject-Signal architecture', () => {
      expect(service.entityAdded$).toBeDefined();
      expect(service.entityEdited$).toBeDefined();
      expect(service.entityDeleted$).toBeDefined();
      expect(service.entityMoved$).toBeDefined();

      expect(service.entityAdded).toBeDefined();
      expect(service.entityEdited).toBeDefined();
      expect(service.entityDeleted).toBeDefined();
      expect(service.entityMoved).toBeDefined();
    });

    it('should initialize signals with null values', () => {
      expect(service.entityAdded()).toBeNull();
      expect(service.entityEdited()).toBeNull();
      expect(service.entityDeleted()).toBeNull();
      expect(service.entityMoved()).toBeNull();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [CourseSignalService]
      });
      const newService = TestBed.inject(CourseSignalService);
      expect(console.log).toHaveBeenCalledWith(
        '[CourseSignalService] Service initialized with hybrid Subject-Signal architecture'
      );
    });

    it('should bridge Observable events to Signal state', () => {
      expect(service.entityAdded$).toBeDefined();
      expect(service.entityAdded).toBeDefined();
      expect(typeof service.entityAdded).toBe('function');
    });
  });

  // ===================================
  // Observable Interface Tests
  // ===================================

  describe('Observable Interface', () => {
    it('should provide Observable streams for all entity events', () => {
      expect(service.entityAdded$).toBeDefined();
      expect(service.entityEdited$).toBeDefined();
      expect(service.entityDeleted$).toBeDefined();
      expect(service.entityMoved$).toBeDefined();
    });

    it('should emit entityAdded$ Observable events', (done) => {
      service.entityAdded$.subscribe(payload => {
        expect(payload.entity).toBe(mockCourse);
        expect(payload.source).toBe('test-source');
        expect(payload.operationType).toBe('USER_ADD');
        expect(payload.timestamp).toBeInstanceOf(Date);
        done();
      });

      service.emitEntityAdded(mockCourse, 'test-source', 'USER_ADD');
    });

    it('should emit entityEdited$ Observable events', (done) => {
      service.entityEdited$.subscribe(payload => {
        expect(payload.entity).toBe(mockTopic);
        expect(payload.source).toBe('edit-source');
        expect(payload.operationType).toBe('API_RESPONSE');
        done();
      });

      service.emitEntityEdited(mockTopic, 'edit-source', 'API_RESPONSE');
    });

    it('should emit entityDeleted$ Observable events', (done) => {
      service.entityDeleted$.subscribe(payload => {
        expect(payload.entity).toBe(mockSubTopic);
        expect(payload.source).toBe('delete-source');
        expect(payload.operationType).toBe('API_RESPONSE');
        done();
      });

      service.emitEntityDeleted(mockSubTopic, 'delete-source');
    });

    it('should emit entityMoved$ Observable events', (done) => {
      service.entityMoved$.subscribe(payload => {
        expect(payload.entity).toBe(mockLesson);
        expect(payload.sourceLocation).toBe('source-loc');
        expect(payload.targetLocation).toBe('target-loc');
        expect(payload.source).toBe('move-source');
        done();
      });

      service.emitEntityMoved(mockLesson, 'source-loc', 'target-loc', 'move-source');
    });

    it('should handle multiple Observable subscribers', () => {
      let subscriber1Called = false;
      let subscriber2Called = false;

      service.entityAdded$.subscribe(() => subscriber1Called = true);
      service.entityAdded$.subscribe(() => subscriber2Called = true);

      service.emitEntityAdded(mockCourse, 'test-source');

      expect(subscriber1Called).toBe(true);
      expect(subscriber2Called).toBe(true);
    });
  });

  // ===================================
  // Signal Interface Tests
  // ===================================

  describe('Signal Interface', () => {
    it('should provide readonly signals for all entity events', () => {
      expect(service.entityAdded).toBeDefined();
      expect(service.entityEdited).toBeDefined();
      expect(service.entityDeleted).toBeDefined();
      expect(service.entityMoved).toBeDefined();

      expect(typeof service.entityAdded).toBe('function');
      expect(typeof service.entityEdited).toBe('function');
      expect(typeof service.entityDeleted).toBe('function');
      expect(typeof service.entityMoved).toBe('function');
    });

    it('should update entityAdded signal when event is emitted', () => {
      expect(service.entityAdded()).toBeNull();

      service.emitEntityAdded(mockCourse, 'test-source', 'USER_ADD');

      const signalValue = service.entityAdded();
      expect(signalValue).not.toBeNull();
      expect(signalValue!.entity).toBe(mockCourse);
      expect(signalValue!.source).toBe('test-source');
      expect(signalValue!.operationType).toBe('USER_ADD');
    });

    it('should update entityEdited signal when event is emitted', () => {
      expect(service.entityEdited()).toBeNull();

      service.emitEntityEdited(mockTopic, 'edit-source');

      const signalValue = service.entityEdited();
      expect(signalValue).not.toBeNull();
      expect(signalValue!.entity).toBe(mockTopic);
      expect(signalValue!.source).toBe('edit-source');
    });

    it('should update entityDeleted signal when event is emitted', () => {
      expect(service.entityDeleted()).toBeNull();

      service.emitEntityDeleted(mockSubTopic, 'delete-source');

      const signalValue = service.entityDeleted();
      expect(signalValue).not.toBeNull();
      expect(signalValue!.entity).toBe(mockSubTopic);
      expect(signalValue!.source).toBe('delete-source');
    });

    it('should update entityMoved signal when event is emitted', () => {
      expect(service.entityMoved()).toBeNull();

      service.emitEntityMoved(mockLesson, 'source', 'target', 'move-source');

      const signalValue = service.entityMoved();
      expect(signalValue).not.toBeNull();
      expect(signalValue!.entity).toBe(mockLesson);
      expect(signalValue!.sourceLocation).toBe('source');
      expect(signalValue!.targetLocation).toBe('target');
    });

    it('should maintain signal values until next emission', () => {
      service.emitEntityAdded(mockCourse, 'test-source');

      const value1 = service.entityAdded();
      const value2 = service.entityAdded();
      const value3 = service.entityAdded();

      expect(value1).toBe(value2);
      expect(value2).toBe(value3);
      expect(value1!.entity).toBe(mockCourse);
    });

    it('should update signal values with new emissions', () => {
      service.emitEntityAdded(mockCourse, 'source1');
      const firstValue = service.entityAdded();

      service.emitEntityAdded(mockTopic, 'source2');
      const secondValue = service.entityAdded();

      expect(firstValue).not.toBe(secondValue);
      expect(firstValue!.entity).toBe(mockCourse);
      expect(secondValue!.entity).toBe(mockTopic);
    });
  });

  // ===================================
  // Entity Added Event Tests
  // ===================================

  describe('Entity Added Events', () => {
    it('should emit entity added event with all required fields', () => {
      spyOn(console, 'log');

      service.emitEntityAdded(mockCourse, 'test-source', 'USER_ADD', { custom: 'metadata' });

      expect(console.log).toHaveBeenCalledWith(
        '📡 [CourseSignalService] Entity added emitted (hybrid)',
        jasmine.objectContaining({
          entityType: 'Course',
          entityId: 1,
          entityTitle: 'Test Course',
          source: 'test-source',
          operationType: 'USER_ADD'
        })
      );
    });

    it('should default to USER_ADD operation type', () => {
      service.emitEntityAdded(mockCourse, 'test-source');

      const signalValue = service.entityAdded();
      expect(signalValue!.operationType).toBe('USER_ADD');
    });

    it('should include metadata in payload', () => {
      const metadata = { parentId: 123, sortOrder: 5 };

      service.emitEntityAdded(mockCourse, 'test-source', 'USER_ADD', metadata);

      const signalValue = service.entityAdded();
      expect(signalValue!.metadata).toEqual(metadata);
    });

    it('should include timestamp in payload', () => {
      const beforeTime = new Date();
      service.emitEntityAdded(mockCourse, 'test-source');
      const afterTime = new Date();

      const signalValue = service.entityAdded();
      expect(signalValue!.timestamp).toBeInstanceOf(Date);
      expect(signalValue!.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(signalValue!.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle different entity types', () => {
      const entities = [mockCourse, mockTopic, mockSubTopic, mockLesson];

      entities.forEach(entity => {
        service.emitEntityAdded(entity, 'test-source');
        const signalValue = service.entityAdded();
        expect(signalValue!.entity).toBe(entity);
        expect(signalValue!.entity.entityType).toBe(entity.entityType);
      });
    });

    it('should support all operation types', () => {
      const operationTypes: OperationType[] = ['USER_ADD', 'API_RESPONSE', 'BULK_LOAD', 'DRAG_MOVE'];

      operationTypes.forEach(opType => {
        service.emitEntityAdded(mockCourse, 'test-source', opType);
        const signalValue = service.entityAdded();
        expect(signalValue!.operationType).toBe(opType);
      });
    });
  });

  // ===================================
  // Entity Edited Event Tests
  // ===================================

  describe('Entity Edited Events', () => {
    it('should emit entity edited event with all required fields', () => {
      spyOn(console, 'log');

      service.emitEntityEdited(mockTopic, 'edit-source', 'API_RESPONSE', { updated: 'metadata' });

      expect(console.log).toHaveBeenCalledWith(
        '📡 [CourseSignalService] Entity edited emitted (hybrid)',
        jasmine.objectContaining({
          entityType: 'Topic',
          entityId: 2,
          entityTitle: 'Test Topic',
          source: 'edit-source',
          operationType: 'API_RESPONSE'
        })
      );
    });

    it('should default to API_RESPONSE operation type', () => {
      service.emitEntityEdited(mockTopic, 'edit-source');

      const signalValue = service.entityEdited();
      expect(signalValue!.operationType).toBe('API_RESPONSE');
    });

    it('should handle entity edits with metadata', () => {
      const metadata = { parentId: 123, userAction: 'CONTEXT_MENU' };

      service.emitEntityEdited(mockTopic, 'edit-source', 'API_RESPONSE', metadata);

      const signalValue = service.entityEdited();
      expect(signalValue!.metadata).toEqual(metadata);
    });

    it('should update Observable and Signal simultaneously', (done) => {
      let observableEmitted = false;

      service.entityEdited$.subscribe(() => {
        observableEmitted = true;
        const signalValue = service.entityEdited();
        expect(signalValue).not.toBeNull();
        expect(signalValue!.entity).toBe(mockTopic);
        expect(observableEmitted).toBe(true);
        done();
      });

      service.emitEntityEdited(mockTopic, 'edit-source');
    });
  });

  // ===================================
  // Entity Deleted Event Tests
  // ===================================

  describe('Entity Deleted Events', () => {
    it('should emit entity deleted event with all required fields', () => {
      spyOn(console, 'log');

      service.emitEntityDeleted(mockSubTopic, 'delete-source', 'API_RESPONSE', { reason: 'user-request' });

      expect(console.log).toHaveBeenCalledWith(
        '📡 [CourseSignalService] Entity deleted emitted (hybrid)',
        jasmine.objectContaining({
          entityType: 'SubTopic',
          entityId: 3,
          entityTitle: 'Test SubTopic',
          source: 'delete-source',
          operationType: 'API_RESPONSE'
        })
      );
    });

    it('should default to API_RESPONSE operation type', () => {
      service.emitEntityDeleted(mockSubTopic, 'delete-source');

      const signalValue = service.entityDeleted();
      expect(signalValue!.operationType).toBe('API_RESPONSE');
    });

    it('should handle cascading delete metadata', () => {
      const metadata = {
        parentId: 2,
        userAction: 'CONTEXT_MENU' as const
      };

      service.emitEntityDeleted(mockSubTopic, 'delete-source', 'API_RESPONSE', metadata);

      const signalValue = service.entityDeleted();
      expect(signalValue!.metadata).toEqual(metadata);
    });
  });

  // ===================================
  // Entity Moved Event Tests
  // ===================================

  describe('Entity Moved Events', () => {
    it('should emit entity moved event with all required fields', () => {
      spyOn(console, 'log');

      const metadata = { oldSortOrder: 1, newSortOrder: 3, moveType: 'drag-drop' as const };
      service.emitEntityMoved(mockLesson, 'source-location', 'target-location', 'move-source', metadata);

      expect(console.log).toHaveBeenCalledWith(
        '📡 [CourseSignalService] Entity moved emitted (hybrid)',
        jasmine.objectContaining({
          entityType: 'Lesson',
          entityId: 4,
          entityTitle: 'Test Lesson',
          sourceLocation: 'source-location',
          targetLocation: 'target-location',
          source: 'move-source',
          metadata: metadata
        })
      );
    });

    it('should handle move metadata with sort orders', () => {
      const metadata = {
        oldSortOrder: 2,
        newSortOrder: 5,
        moveType: 'api-move' as const,
        apiResponse: { success: true }
      };

      service.emitEntityMoved(mockLesson, 'source', 'target', 'api-source', metadata);

      const signalValue = service.entityMoved();
      expect(signalValue!.metadata).toEqual(metadata);
      expect(signalValue!.metadata!.oldSortOrder).toBe(2);
      expect(signalValue!.metadata!.newSortOrder).toBe(5);
    });

    it('should support different move types', () => {
      const moveTypes = ['drag-drop', 'api-move', 'bulk-operation'] as const;

      moveTypes.forEach(moveType => {
        const metadata = { moveType };
        service.emitEntityMoved(mockLesson, 'source', 'target', 'test', metadata);

        const signalValue = service.entityMoved();
        expect(signalValue!.metadata!.moveType).toBe(moveType);
      });
    });

    it('should handle moves without metadata', () => {
      service.emitEntityMoved(mockLesson, 'source', 'target', 'test');

      const signalValue = service.entityMoved();
      expect(signalValue!.sourceLocation).toBe('source');
      expect(signalValue!.targetLocation).toBe('target');
      expect(signalValue!.metadata).toBeUndefined();
    });
  });

  // ===================================
  // Legacy Support Tests
  // ===================================

  describe('Legacy Support', () => {
    it('should support legacy emitNodeAdded method', () => {
      spyOn(console, 'log');
      spyOn(service, 'emitEntityAdded');

      service.emitNodeAdded(mockCourse, 'legacy-source', 'USER_ADD');

      expect(console.log).toHaveBeenCalledWith(
        '[CourseSignalService] Legacy emitNodeAdded - delegating to emitEntityAdded'
      );
      expect(service.emitEntityAdded).toHaveBeenCalledWith(mockCourse, 'legacy-source', 'USER_ADD');
    });

    it('should support legacy emitNodeEdited method', () => {
      spyOn(console, 'log');
      spyOn(service, 'emitEntityEdited');

      service.emitNodeEdited(mockTopic, 'legacy-source', 'API_RESPONSE');

      expect(console.log).toHaveBeenCalledWith(
        '[CourseSignalService] Legacy emitNodeEdited - delegating to emitEntityEdited'
      );
      expect(service.emitEntityEdited).toHaveBeenCalledWith(mockTopic, 'legacy-source', 'API_RESPONSE');
    });

    it('should support legacy emitNodeDeleted method', () => {
      spyOn(console, 'log');
      spyOn(service, 'emitEntityDeleted');

      service.emitNodeDeleted(mockSubTopic, 'legacy-source', 'API_RESPONSE');

      expect(console.log).toHaveBeenCalledWith(
        '[CourseSignalService] Legacy emitNodeDeleted - delegating to emitEntityDeleted'
      );
      expect(service.emitEntityDeleted).toHaveBeenCalledWith(mockSubTopic, 'legacy-source', 'API_RESPONSE');
    });

    it('should support legacy emitNodeMoved method', () => {
      spyOn(console, 'log');
      spyOn(service, 'emitEntityMoved');

      service.emitNodeMoved(mockLesson, 'source', 'target', 'legacy-source');

      expect(console.log).toHaveBeenCalledWith(
        '[CourseSignalService] Legacy emitNodeMoved - delegating to emitEntityMoved'
      );
      expect(service.emitEntityMoved).toHaveBeenCalledWith(mockLesson, 'source', 'target', 'legacy-source');
    });

    it('should default legacy methods with appropriate operation types', () => {
      service.emitNodeAdded(mockCourse, 'source');
      expect(service.entityAdded()!.operationType).toBe('USER_ADD');

      service.emitNodeEdited(mockTopic, 'source');
      expect(service.entityEdited()!.operationType).toBe('API_RESPONSE');

      service.emitNodeDeleted(mockSubTopic, 'source');
      expect(service.entityDeleted()!.operationType).toBe('API_RESPONSE');
    });
  });

  // ===================================
  // Utility Methods Tests
  // ===================================

  describe('Utility Methods', () => {
    describe('resetAllSignals', () => {
      it('should reset all signals to null', () => {
        // Emit some events first
        service.emitEntityAdded(mockCourse, 'source');
        service.emitEntityEdited(mockTopic, 'source');
        service.emitEntityDeleted(mockSubTopic, 'source');
        service.emitEntityMoved(mockLesson, 'source', 'target', 'source');

        expect(service.entityAdded()).not.toBeNull();
        expect(service.entityEdited()).not.toBeNull();
        expect(service.entityDeleted()).not.toBeNull();
        expect(service.entityMoved()).not.toBeNull();

        service.resetAllSignals();

        expect(service.entityAdded()).toBeNull();
        expect(service.entityEdited()).toBeNull();
        expect(service.entityDeleted()).toBeNull();
        expect(service.entityMoved()).toBeNull();
      });

      it('should log reset operation', () => {
        spyOn(console, 'log');

        service.resetAllSignals();

        expect(console.log).toHaveBeenCalledWith('[CourseSignalService] Resetting all signals to null');
      });
    });

    describe('hasActiveSignals', () => {
      it('should return false when no signals are active', () => {
        expect(service.hasActiveSignals()).toBe(false);

        service.resetAllSignals();
        expect(service.hasActiveSignals()).toBe(false);
      });

      it('should return true when entityAdded signal is active', () => {
        service.emitEntityAdded(mockCourse, 'source');
        expect(service.hasActiveSignals()).toBe(true);
      });

      it('should return true when entityEdited signal is active', () => {
        service.emitEntityEdited(mockTopic, 'source');
        expect(service.hasActiveSignals()).toBe(true);
      });

      it('should return true when entityDeleted signal is active', () => {
        service.emitEntityDeleted(mockSubTopic, 'source');
        expect(service.hasActiveSignals()).toBe(true);
      });

      it('should return true when entityMoved signal is active', () => {
        service.emitEntityMoved(mockLesson, 'source', 'target', 'source');
        expect(service.hasActiveSignals()).toBe(true);
      });

      it('should return true when multiple signals are active', () => {
        service.emitEntityAdded(mockCourse, 'source');
        service.emitEntityEdited(mockTopic, 'source');
        expect(service.hasActiveSignals()).toBe(true);
      });

      it('should return false after reset', () => {
        service.emitEntityAdded(mockCourse, 'source');
        expect(service.hasActiveSignals()).toBe(true);

        service.resetAllSignals();
        expect(service.hasActiveSignals()).toBe(false);
      });
    });

    describe('getDebugInfo', () => {
      it('should return comprehensive debug information', () => {
        const debugInfo = service.getDebugInfo();

        expect(debugInfo.signalService).toBeDefined();
        expect(debugInfo.signalService.initialized).toBe(true);
        expect(debugInfo.signalService.architecture).toBe('Subject-Signal Hybrid');

        expect(debugInfo.currentSignalValues).toBeDefined();
        expect(debugInfo.serviceArchitecture).toBeDefined();
        expect(debugInfo.serviceArchitecture.pattern).toBe('Hybrid Subject-Signal Architecture');
      });

      it('should reflect active signal state in debug info', () => {
        service.emitEntityAdded(mockCourse, 'source');

        const debugInfo = service.getDebugInfo();
        expect(debugInfo.signalService.hasActiveSignals).toBe(true);
        expect(debugInfo.currentSignalValues.nodeAdded).toBe(true);
        expect(debugInfo.currentSignalValues.nodeEdited).toBe(false);
      });

      it('should include architecture information', () => {
        const debugInfo = service.getDebugInfo();

        expect(debugInfo.serviceArchitecture.observableStreams).toContain('nodeAdded$');
        expect(debugInfo.serviceArchitecture.observableStreams).toContain('nodeEdited$');
        expect(debugInfo.serviceArchitecture.signalState).toContain('entityAdded');
        expect(debugInfo.serviceArchitecture.hasObservableEvents).toBe(true);
        expect(debugInfo.serviceArchitecture.hasSignalState).toBe(true);
      });

      it('should list expected consumers', () => {
        const debugInfo = service.getDebugInfo();

        expect(debugInfo.serviceArchitecture.consumers).toContain('TreeEffectsService');
        expect(debugInfo.serviceArchitecture.consumers).toContain('TreeWrapper');
        expect(debugInfo.serviceArchitecture.dependencies).toContain('rxjs/Subject');
      });
    });
  });

  // ===================================
  // Hybrid Architecture Tests
  // ===================================

  describe('Hybrid Architecture', () => {
    it('should emit to both Observable and Signal simultaneously', (done) => {
      let observableEmitted = false;
      let signalUpdated = false;

      service.entityAdded$.subscribe(() => {
        observableEmitted = true;
        checkCompletion();
      });

      // Check signal update
      const checkSignal = () => {
        if (service.entityAdded() !== null) {
          signalUpdated = true;
          checkCompletion();
        }
      };

      const checkCompletion = () => {
        if (observableEmitted && signalUpdated) {
          expect(observableEmitted).toBe(true);
          expect(signalUpdated).toBe(true);
          done();
        }
      };

      service.emitEntityAdded(mockCourse, 'source');
      checkSignal();
    });

    it('should maintain separate Observable streams', () => {
      let addedCalled = false;
      let editedCalled = false;
      let deletedCalled = false;
      let movedCalled = false;

      service.entityAdded$.subscribe(() => addedCalled = true);
      service.entityEdited$.subscribe(() => editedCalled = true);
      service.entityDeleted$.subscribe(() => deletedCalled = true);
      service.entityMoved$.subscribe(() => movedCalled = true);

      service.emitEntityAdded(mockCourse, 'source');
      expect(addedCalled).toBe(true);
      expect(editedCalled).toBe(false);
      expect(deletedCalled).toBe(false);
      expect(movedCalled).toBe(false);
    });

    it('should maintain separate Signal states', () => {
      service.emitEntityAdded(mockCourse, 'source');

      expect(service.entityAdded()).not.toBeNull();
      expect(service.entityEdited()).toBeNull();
      expect(service.entityDeleted()).toBeNull();
      expect(service.entityMoved()).toBeNull();

      service.emitEntityEdited(mockTopic, 'source');

      expect(service.entityAdded()).not.toBeNull(); // Should still be there
      expect(service.entityEdited()).not.toBeNull();
      expect(service.entityDeleted()).toBeNull();
      expect(service.entityMoved()).toBeNull();
    });

    it('should support concurrent Observable and Signal consumption', (done) => {
      let observablePayload: EntitySignalPayload | null = null;
      let signalPayload: EntitySignalPayload | null = null;

      service.entityAdded$.subscribe(payload => {
        observablePayload = payload;
        checkCompletion();
      });

      const checkCompletion = () => {
        signalPayload = service.entityAdded();
        if (observablePayload && signalPayload) {
          expect(observablePayload).toBe(signalPayload);
          expect(observablePayload.entity).toBe(mockCourse);
          expect(signalPayload.entity).toBe(mockCourse);
          done();
        }
      };

      service.emitEntityAdded(mockCourse, 'source');
    });
  });

  // ===================================
  // Service Lifecycle Tests
  // ===================================

  describe('Service Lifecycle', () => {
    it('should be provided in root (singleton)', () => {
      const service1 = TestBed.inject(CourseSignalService);
      const service2 = TestBed.inject(CourseSignalService);

      expect(service1).toBe(service2);
    });

    it('should maintain state across multiple references', () => {
      const service1 = TestBed.inject(CourseSignalService);
      const service2 = TestBed.inject(CourseSignalService);

      service1.emitEntityAdded(mockCourse, 'source');
      expect(service2.entityAdded()).not.toBeNull();
    });

    it('should complete all Subject streams on destroy', () => {
      spyOn(console, 'log');

      service.ngOnDestroy();

      expect(console.log).toHaveBeenCalledWith('[CourseSignalService] Completing all Subject streams');
    });

    it('should handle ngOnDestroy gracefully', () => {
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });

  // ===================================
  // Edge Cases and Error Handling
  // ===================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle null entity gracefully', () => {
      expect(() => service.emitEntityAdded(null as any, 'source')).not.toThrow();
    });

    it('should handle undefined source gracefully', () => {
      expect(() => service.emitEntityAdded(mockCourse, undefined as any)).not.toThrow();
    });

    it('should handle empty string source', () => {
      service.emitEntityAdded(mockCourse, '');
      const signalValue = service.entityAdded();
      expect(signalValue!.source).toBe('');
    });

    it('should handle very long source strings', () => {
      const longSource = 'a'.repeat(1000);
      service.emitEntityAdded(mockCourse, longSource);
      const signalValue = service.entityAdded();
      expect(signalValue!.source).toBe(longSource);
    });

    it('should handle undefined metadata', () => {
      service.emitEntityAdded(mockCourse, 'source', 'USER_ADD', undefined);
      const signalValue = service.entityAdded();
      expect(signalValue!.metadata).toBeUndefined();
    });

    it('should handle invalid operation types gracefully', () => {
      expect(() => service.emitEntityAdded(mockCourse, 'source', 'INVALID' as any)).not.toThrow();
    });

    it('should handle large metadata objects', () => {
      const largeMetadata = {
        parentId: 123,
        sortOrder: 5,
        userAction: 'ADD_LESSON_BUTTON' as const
      };

      service.emitEntityAdded(mockCourse, 'source', 'USER_ADD', largeMetadata);
      const signalValue = service.entityAdded();
      expect(signalValue!.metadata).toEqual(largeMetadata);
    });
  });

  // ===================================
  // Performance Tests
  // ===================================

  describe('Performance Considerations', () => {
    it('should handle rapid consecutive emissions efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        service.emitEntityAdded(mockCourse, `source-${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(service.entityAdded()).not.toBeNull();
    });

    it('should not cause memory leaks with multiple subscriptions', () => {
      const subscriptions = [];

      for (let i = 0; i < 50; i++) {
        const subscription = service.entityAdded$.subscribe(() => {});
        subscriptions.push(subscription);
      }

      service.emitEntityAdded(mockCourse, 'source');

      // Cleanup
      subscriptions.forEach(sub => sub.unsubscribe());
      expect(subscriptions.length).toBe(50);
    });

    it('should handle signal reads efficiently', () => {
      service.emitEntityAdded(mockCourse, 'source');

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const value = service.entityAdded();
        expect(value).not.toBeNull();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Signal reads should be very fast
    });

    it('should maintain performance with large payloads', () => {
      const largeEntity = new Course({
        id: 1,
        title: 'A'.repeat(10000),
        description: 'B'.repeat(10000),
        visibility: 'Private',
        sortOrder: 0,
        archived: false,
        userId: 1,
        topics: new Array(100).fill(mockTopic),
        standards: new Array(100).fill('standard')
      });

      const startTime = performance.now();
      service.emitEntityAdded(largeEntity, 'source');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(service.entityAdded()!.entity).toBe(largeEntity);
    });
  });

  // ===================================
  // Integration Scenarios
  // ===================================

  describe('Integration Scenarios', () => {
    it('should support typical CRUD workflow', () => {
      // Create
      service.emitEntityAdded(mockCourse, 'api', 'USER_ADD');
      expect(service.entityAdded()!.entity).toBe(mockCourse);

      // Update
      service.emitEntityEdited(mockCourse, 'form', 'API_RESPONSE');
      expect(service.entityEdited()!.entity).toBe(mockCourse);

      // Move
      service.emitEntityMoved(mockCourse, 'source', 'target', 'drag');
      expect(service.entityMoved()!.entity).toBe(mockCourse);

      // Delete
      service.emitEntityDeleted(mockCourse, 'api', 'API_RESPONSE');
      expect(service.entityDeleted()!.entity).toBe(mockCourse);
    });

    it('should support complex event coordination patterns', (done) => {
      let eventCount = 0;
      const expectedEvents = 4;

      const checkCompletion = () => {
        eventCount++;
        if (eventCount === expectedEvents) {
          expect(service.hasActiveSignals()).toBe(true);
          done();
        }
      };

      service.entityAdded$.subscribe(() => checkCompletion());
      service.entityEdited$.subscribe(() => checkCompletion());
      service.entityDeleted$.subscribe(() => checkCompletion());
      service.entityMoved$.subscribe(() => checkCompletion());

      // Emit all events
      service.emitEntityAdded(mockCourse, 'source');
      service.emitEntityEdited(mockTopic, 'source');
      service.emitEntityDeleted(mockSubTopic, 'source');
      service.emitEntityMoved(mockLesson, 'src', 'dst', 'source');
    });

    it('should support reset and cleanup workflows', () => {
      // Generate some activity
      service.emitEntityAdded(mockCourse, 'source');
      service.emitEntityEdited(mockTopic, 'source');
      expect(service.hasActiveSignals()).toBe(true);

      // Reset all
      service.resetAllSignals();
      expect(service.hasActiveSignals()).toBe(false);

      // Should work normally after reset
      service.emitEntityAdded(mockLesson, 'source');
      expect(service.hasActiveSignals()).toBe(true);
      expect(service.entityAdded()!.entity).toBe(mockLesson);
    });
  });
});