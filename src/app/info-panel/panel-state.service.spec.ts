// panel-state.service.spec.ts
// Comprehensive unit tests for PanelStateService - Dual signal/observable state management
// Tests panel modes, template creation, observable events, computed signals, and state coordination

import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import {
  PanelStateService,
  PanelMode,
  PanelModeChangeEvent,
  AddModeInitiatedEvent,
  EditModeInitiatedEvent,
  PanelStateResetEvent,
  TemplateCreatedEvent,
  EntityType
} from './panel-state.service';
import { Course } from '../models/course';
import { Topic } from '../models/topic';
import { SubTopic } from '../models/subTopic';
import { Lesson } from '../models/lesson';

describe('PanelStateService', () => {
  let service: PanelStateService;

  // Test data fixtures
  const mockCourse: Course = {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    visibility: 'Private',
    entityType: 'Course',
    topics: []
  };

  const mockTopic: Topic = {
    id: 2,
    title: 'Test Topic',
    description: 'Test Description',
    courseId: 1,
    visibility: 'Private',
    entityType: 'Topic',
    sortOrder: 1,
    subTopics: [],
    lessons: []
  };

  const mockSubTopic: SubTopic = {
    id: 3,
    title: 'Test SubTopic',
    description: 'Test Description',
    courseId: 1,
    topicId: 2,
    visibility: 'Private',
    entityType: 'SubTopic',
    sortOrder: 1,
    isDefault: false,
    lessons: []
  };

  const mockLesson: Lesson = {
    id: 4,
    title: 'Test Lesson',
    topicId: 2,
    subTopicId: 3,
    courseId: 1,
    visibility: 'Private',
    entityType: 'Lesson',
    level: 'Beginner',
    objective: 'Test Objective',
    materials: 'Test Materials',
    classTime: '45 minutes',
    methods: 'Test Methods',
    specialNeeds: 'None',
    assessment: 'Quiz',
    sortOrder: 1,
    attachments: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PanelStateService]
    });

    service = TestBed.inject(PanelStateService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with view mode', () => {
      expect(service.panelMode()).toBe('view');
    });

    it('should initialize with null values', () => {
      expect(service.addEntityType()).toBeNull();
      expect(service.parentEntity()).toBeNull();
      expect(service.courseId()).toBeNull();
      expect(service.nodeTemplate()).toBeNull();
    });

    it('should initialize computed signals correctly', () => {
      expect(service.isOverlayActive()).toBe(false);
      expect(service.isViewMode()).toBe(true);
      expect(service.isEditMode()).toBe(false);
      expect(service.isAddMode()).toBe(false);
      expect(service.addModeContext()).toBeNull();
      expect(service.hasValidAddContext()).toBe(false);
    });

    it('should expose observable streams', () => {
      expect(service.panelModeChanged$).toBeDefined();
      expect(service.addModeInitiated$).toBeDefined();
      expect(service.editModeInitiated$).toBeDefined();
      expect(service.panelStateReset$).toBeDefined();
      expect(service.templateCreated$).toBeDefined();
    });
  });

  describe('Panel Mode Management', () => {
    describe('setMode()', () => {
      it('should set panel mode and emit event', (done) => {
        service.panelModeChanged$.subscribe((event: PanelModeChangeEvent) => {
          expect(event.previousMode).toBe('view');
          expect(event.newMode).toBe('edit');
          expect(event.trigger).toBe('user-action');
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        });

        service.setMode('edit');

        expect(service.panelMode()).toBe('edit');
        expect(service.isEditMode()).toBe(true);
        expect(service.isOverlayActive()).toBe(true);
      });

      it('should handle multiple mode changes', () => {
        const events: PanelModeChangeEvent[] = [];
        service.panelModeChanged$.subscribe(event => events.push(event));

        service.setMode('edit');
        service.setMode('add');
        service.setMode('view');

        expect(events).toHaveLength(3);
        expect(events[0].newMode).toBe('edit');
        expect(events[1].newMode).toBe('add');
        expect(events[2].newMode).toBe('view');
      });

      it('should update computed signals correctly', () => {
        service.setMode('add');

        expect(service.isAddMode()).toBe(true);
        expect(service.isViewMode()).toBe(false);
        expect(service.isEditMode()).toBe(false);
        expect(service.isOverlayActive()).toBe(true);
      });

      it('should handle setting same mode multiple times', () => {
        const events: PanelModeChangeEvent[] = [];
        service.panelModeChanged$.subscribe(event => events.push(event));

        service.setMode('edit');
        service.setMode('edit');

        expect(events).toHaveLength(2);
        expect(events[1].previousMode).toBe('edit');
        expect(events[1].newMode).toBe('edit');
      });
    });
  });

  describe('Add Mode Management', () => {
    describe('initiateAddMode()', () => {
      it('should initiate add mode for Course with explicit courseId', (done) => {
        let eventCount = 0;
        const expectedEvents = 3;

        service.addModeInitiated$.subscribe((event: AddModeInitiatedEvent) => {
          expect(event.entityType).toBe('Course');
          expect(event.parentEntity).toBeNull();
          expect(event.courseId).toBe(1);
          expect(event.template).toBeDefined();
          expect(event.timestamp).toBeInstanceOf(Date);
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.panelModeChanged$.subscribe((event: PanelModeChangeEvent) => {
          expect(event.newMode).toBe('add');
          expect(event.trigger).toBe('programmatic');
          expect(event.entityType).toBe('Course');
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.templateCreated$.subscribe((event: TemplateCreatedEvent) => {
          expect(event.entityType).toBe('Course');
          expect(event.courseId).toBe(1);
          expect(event.template).toBeDefined();
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.initiateAddMode('Course', null, 1);

        expect(service.panelMode()).toBe('add');
        expect(service.addEntityType()).toBe('Course');
        expect(service.courseId()).toBe(1);
        expect(service.hasValidAddContext()).toBe(true);
      });

      it('should initiate add mode for Topic with parent Course', (done) => {
        service.addModeInitiated$.subscribe((event: AddModeInitiatedEvent) => {
          expect(event.entityType).toBe('Topic');
          expect(event.parentEntity).toBe(mockCourse);
          expect(event.courseId).toBe(1);
          done();
        });

        service.initiateAddMode('Topic', mockCourse);

        expect(service.addEntityType()).toBe('Topic');
        expect(service.parentEntity()).toBe(mockCourse);
        expect(service.courseId()).toBe(1);
      });

      it('should initiate add mode for SubTopic with parent Topic', (done) => {
        service.addModeInitiated$.subscribe((event: AddModeInitiatedEvent) => {
          expect(event.entityType).toBe('SubTopic');
          expect(event.parentEntity).toBe(mockTopic);
          expect(event.courseId).toBe(1);
          done();
        });

        service.initiateAddMode('SubTopic', mockTopic);

        expect(service.addEntityType()).toBe('SubTopic');
        expect(service.parentEntity()).toBe(mockTopic);
        expect(service.courseId()).toBe(1);
      });

      it('should initiate add mode for Lesson with parent SubTopic', (done) => {
        service.addModeInitiated$.subscribe((event: AddModeInitiatedEvent) => {
          expect(event.entityType).toBe('Lesson');
          expect(event.parentEntity).toBe(mockSubTopic);
          expect(event.courseId).toBe(1);
          done();
        });

        service.initiateAddMode('Lesson', mockSubTopic);

        expect(service.addEntityType()).toBe('Lesson');
        expect(service.parentEntity()).toBe(mockSubTopic);
        expect(service.courseId()).toBe(1);
      });

      it('should handle add mode without courseId and no parent', () => {
        const consoleSpy = spyOn(console, 'error');

        service.initiateAddMode('Course', null);

        expect(consoleSpy).toHaveBeenCalledWith('[PanelStateService] Cannot determine course ID for add operation');
        expect(service.panelMode()).toBe('view'); // Should not change mode
      });

      it('should extract courseId from parent entity', () => {
        service.initiateAddMode('Topic', mockCourse);

        expect(service.courseId()).toBe(1);
      });

      it('should handle parent entity without courseId', () => {
        const invalidParent = { id: 1, title: 'Invalid' } as any;
        const consoleSpy = spyOn(console, 'error');

        service.initiateAddMode('Topic', invalidParent);

        expect(consoleSpy).toHaveBeenCalledWith('[PanelStateService] Cannot determine course ID for add operation');
      });
    });

    describe('setAddMode() - Legacy Method', () => {
      it('should delegate to initiateAddMode', () => {
        spyOn(service, 'initiateAddMode');

        service.setAddMode('Course', mockCourse);

        expect(service.initiateAddMode).toHaveBeenCalledWith('Course', mockCourse, 1);
      });

      it('should handle null parent entity', () => {
        spyOn(service, 'initiateAddMode');

        service.setAddMode('Course', null);

        expect(service.initiateAddMode).toHaveBeenCalledWith('Course', null, undefined);
      });
    });

    describe('Template Creation', () => {
      it('should create Course template', () => {
        service.initiateAddMode('Course', null, 1);

        const template = service.nodeTemplate();
        expect(template).toEqual({
          id: 0,
          title: '',
          description: '',
          archived: false,
          visibility: 'Private',
          courseId: 1,
          entityType: 'Course'
        });
      });

      it('should create Topic template', () => {
        service.initiateAddMode('Topic', mockCourse);

        const template = service.nodeTemplate();
        expect(template).toEqual({
          id: 0,
          title: '',
          description: '',
          archived: false,
          visibility: 'Private',
          courseId: 1,
          entityType: 'Topic'
        });
      });

      it('should create SubTopic template', () => {
        service.initiateAddMode('SubTopic', mockTopic);

        const template = service.nodeTemplate();
        expect(template).toEqual({
          id: 0,
          title: '',
          description: '',
          archived: false,
          visibility: 'Private',
          courseId: 1,
          entityType: 'SubTopic',
          topicId: 2,
          isDefault: false
        });
      });

      it('should create Lesson template', () => {
        service.initiateAddMode('Lesson', mockSubTopic);

        const template = service.nodeTemplate();
        expect(template).toEqual({
          id: 0,
          title: '',
          description: '',
          archived: false,
          visibility: 'Private',
          courseId: 1,
          entityType: 'Lesson',
          topicId: undefined,
          subTopicId: 3,
          objective: '',
          methods: '',
          assessment: '',
          notes: [],
          attachments: [],
          standards: []
        });
      });

      it('should create Lesson template with Topic parent', () => {
        service.initiateAddMode('Lesson', mockTopic);

        const template = service.nodeTemplate();
        expect(template.topicId).toBe(2);
        expect(template.subTopicId).toBeUndefined();
      });

      it('should handle unknown entity type', () => {
        service.initiateAddMode('UnknownType' as EntityType, null, 1);

        const template = service.nodeTemplate();
        expect(template.entityType).toBe('UnknownType');
        expect(template.id).toBe(0);
      });
    });
  });

  describe('Edit Mode Management', () => {
    describe('setEditMode()', () => {
      it('should set edit mode for Course and emit events', (done) => {
        let eventCount = 0;
        const expectedEvents = 2;

        service.panelModeChanged$.subscribe((event: PanelModeChangeEvent) => {
          expect(event.previousMode).toBe('view');
          expect(event.newMode).toBe('edit');
          expect(event.trigger).toBe('user-action');
          expect(event.entityType).toBe('Course');
          expect(event.entityId).toBe(1);
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.editModeInitiated$.subscribe((event: EditModeInitiatedEvent) => {
          expect(event.entity).toBe(mockCourse);
          expect(event.entityType).toBe('Course');
          expect(event.entityId).toBe(1);
          expect(event.courseId).toBe(1);
          expect(event.timestamp).toBeInstanceOf(Date);
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.setEditMode(mockCourse);

        expect(service.panelMode()).toBe('edit');
        expect(service.isEditMode()).toBe(true);
        expect(service.courseId()).toBe(1);
      });

      it('should set edit mode for Topic', (done) => {
        service.editModeInitiated$.subscribe((event: EditModeInitiatedEvent) => {
          expect(event.entity).toBe(mockTopic);
          expect(event.entityType).toBe('Topic');
          expect(event.entityId).toBe(2);
          expect(event.courseId).toBe(1);
          done();
        });

        service.setEditMode(mockTopic);

        expect(service.panelMode()).toBe('edit');
        expect(service.courseId()).toBe(1);
      });

      it('should set edit mode for SubTopic', (done) => {
        service.editModeInitiated$.subscribe((event: EditModeInitiatedEvent) => {
          expect(event.entity).toBe(mockSubTopic);
          expect(event.entityType).toBe('SubTopic');
          expect(event.entityId).toBe(3);
          done();
        });

        service.setEditMode(mockSubTopic);

        expect(service.panelMode()).toBe('edit');
      });

      it('should set edit mode for Lesson', (done) => {
        service.editModeInitiated$.subscribe((event: EditModeInitiatedEvent) => {
          expect(event.entity).toBe(mockLesson);
          expect(event.entityType).toBe('Lesson');
          expect(event.entityId).toBe(4);
          done();
        });

        service.setEditMode(mockLesson);

        expect(service.panelMode()).toBe('edit');
      });

      it('should clear add mode state when setting edit mode', () => {
        service.initiateAddMode('Course', null, 1);
        expect(service.addEntityType()).toBe('Course');

        service.setEditMode(mockTopic);

        expect(service.addEntityType()).toBeNull();
        expect(service.parentEntity()).toBeNull();
      });

      it('should handle entity without courseId', () => {
        const entityWithoutCourseId = { ...mockTopic, courseId: undefined } as any;

        service.setEditMode(entityWithoutCourseId);

        expect(service.courseId()).toBeNull();
      });
    });
  });

  describe('State Reset Management', () => {
    describe('resetToView()', () => {
      it('should reset to view mode and emit events', (done) => {
        let eventCount = 0;
        const expectedEvents = 2;

        service.initiateAddMode('Course', null, 1); // Set to add mode first

        service.panelModeChanged$.subscribe((event: PanelModeChangeEvent) => {
          if (event.newMode === 'view') {
            expect(event.previousMode).toBe('add');
            expect(event.trigger).toBe('reset');
            eventCount++;
            if (eventCount === expectedEvents) done();
          }
        });

        service.panelStateReset$.subscribe((event: PanelStateResetEvent) => {
          expect(event.previousMode).toBe('add');
          expect(event.resetType).toBe('to-view');
          expect(event.timestamp).toBeInstanceOf(Date);
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.resetToView();

        expect(service.panelMode()).toBe('view');
        expect(service.addEntityType()).toBeNull();
        expect(service.parentEntity()).toBeNull();
        expect(service.isViewMode()).toBe(true);
        expect(service.isOverlayActive()).toBe(false);
      });

      it('should handle reset from edit mode', () => {
        service.setEditMode(mockCourse);
        expect(service.isEditMode()).toBe(true);

        service.resetToView();

        expect(service.isViewMode()).toBe(true);
        expect(service.isEditMode()).toBe(false);
      });

      it('should handle reset when already in view mode', (done) => {
        service.panelModeChanged$.subscribe((event: PanelModeChangeEvent) => {
          expect(event.previousMode).toBe('view');
          expect(event.newMode).toBe('view');
          done();
        });

        service.resetToView();

        expect(service.panelMode()).toBe('view');
      });
    });

    describe('clearState()', () => {
      it('should clear all state and emit events', (done) => {
        let eventCount = 0;
        const expectedEvents = 2;

        service.initiateAddMode('Course', null, 1); // Set state first

        service.panelModeChanged$.subscribe((event: PanelModeChangeEvent) => {
          if (event.newMode === 'view') {
            expect(event.previousMode).toBe('add');
            expect(event.trigger).toBe('reset');
            eventCount++;
            if (eventCount === expectedEvents) done();
          }
        });

        service.panelStateReset$.subscribe((event: PanelStateResetEvent) => {
          expect(event.previousMode).toBe('add');
          expect(event.resetType).toBe('clear-all');
          expect(event.timestamp).toBeInstanceOf(Date);
          eventCount++;
          if (eventCount === expectedEvents) done();
        });

        service.clearState();

        expect(service.panelMode()).toBe('view');
        expect(service.addEntityType()).toBeNull();
        expect(service.parentEntity()).toBeNull();
        expect(service.courseId()).toBeNull();
        expect(service.nodeTemplate()).toBeNull();
      });

      it('should not emit mode change event when already in view mode', () => {
        const events: PanelModeChangeEvent[] = [];
        service.panelModeChanged$.subscribe(event => events.push(event));

        service.clearState();

        // Should only emit reset event, not mode change since already in view
        const modeChangeEvents = events.filter(e => e.newMode === 'view');
        expect(modeChangeEvents).toHaveLength(0);
      });

      it('should always emit reset event', (done) => {
        service.panelStateReset$.subscribe((event: PanelStateResetEvent) => {
          expect(event.resetType).toBe('clear-all');
          done();
        });

        service.clearState();
      });
    });
  });

  describe('Computed Signals', () => {
    describe('isOverlayActive', () => {
      it('should return true when in edit mode', () => {
        service.setMode('edit');

        expect(service.isOverlayActive()).toBe(true);
      });

      it('should return true when in add mode', () => {
        service.setMode('add');

        expect(service.isOverlayActive()).toBe(true);
      });

      it('should return false when in view mode', () => {
        service.setMode('view');

        expect(service.isOverlayActive()).toBe(false);
      });
    });

    describe('Mode check signals', () => {
      it('should correctly identify view mode', () => {
        service.setMode('view');

        expect(service.isViewMode()).toBe(true);
        expect(service.isEditMode()).toBe(false);
        expect(service.isAddMode()).toBe(false);
      });

      it('should correctly identify edit mode', () => {
        service.setMode('edit');

        expect(service.isViewMode()).toBe(false);
        expect(service.isEditMode()).toBe(true);
        expect(service.isAddMode()).toBe(false);
      });

      it('should correctly identify add mode', () => {
        service.setMode('add');

        expect(service.isViewMode()).toBe(false);
        expect(service.isEditMode()).toBe(false);
        expect(service.isAddMode()).toBe(true);
      });
    });

    describe('addModeContext', () => {
      it('should return null when not in add mode', () => {
        service.setMode('view');

        expect(service.addModeContext()).toBeNull();
      });

      it('should return null when in edit mode', () => {
        service.setMode('edit');

        expect(service.addModeContext()).toBeNull();
      });

      it('should return context when in add mode', () => {
        service.initiateAddMode('Course', null, 1);

        const context = service.addModeContext();
        expect(context).toEqual({
          entityType: 'Course',
          parentNode: null,
          courseId: 1,
          template: jasmine.any(Object)
        });
      });

      it('should return context with parent entity', () => {
        service.initiateAddMode('Topic', mockCourse);

        const context = service.addModeContext();
        expect(context?.entityType).toBe('Topic');
        expect(context?.parentNode).toBe(mockCourse);
        expect(context?.courseId).toBe(1);
      });
    });

    describe('hasValidAddContext', () => {
      it('should return false when not in add mode', () => {
        service.setMode('view');

        expect(service.hasValidAddContext()).toBe(false);
      });

      it('should return true when in add mode with valid context', () => {
        service.initiateAddMode('Course', null, 1);

        expect(service.hasValidAddContext()).toBe(true);
      });

      it('should return false when in add mode but missing entityType', () => {
        service.setMode('add');
        // Don't set other required properties

        expect(service.hasValidAddContext()).toBe(false);
      });

      it('should return false when in add mode but missing courseId', () => {
        service.setMode('add');
        // Only set entityType, not courseId

        expect(service.hasValidAddContext()).toBe(false);
      });
    });
  });

  describe('CourseId Extraction', () => {
    it('should extract courseId from entity with courseId property', () => {
      const entity = { courseId: 123 } as any;

      service.initiateAddMode('Topic', entity, undefined);

      expect(service.courseId()).toBe(123);
    });

    it('should extract courseId from Course entity using id', () => {
      const courseEntity = { id: 456 } as any;

      service.initiateAddMode('Topic', courseEntity, undefined);

      expect(service.courseId()).toBe(456);
    });

    it('should return null for entity without courseId or id', () => {
      const entity = { title: 'No ID' } as any;
      const consoleSpy = spyOn(console, 'error');

      service.initiateAddMode('Topic', entity, undefined);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should prefer explicit courseId over extracted value', () => {
      const entity = { courseId: 123 } as any;

      service.initiateAddMode('Topic', entity, 456);

      expect(service.courseId()).toBe(456);
    });
  });

  describe('Observable Event Patterns', () => {
    it('should emit events in correct sequence for add mode', () => {
      const events: string[] = [];

      service.panelModeChanged$.subscribe(() => events.push('mode-changed'));
      service.addModeInitiated$.subscribe(() => events.push('add-initiated'));
      service.templateCreated$.subscribe(() => events.push('template-created'));

      service.initiateAddMode('Course', null, 1);

      expect(events).toEqual(['mode-changed', 'add-initiated', 'template-created']);
    });

    it('should emit events in correct sequence for edit mode', () => {
      const events: string[] = [];

      service.panelModeChanged$.subscribe(() => events.push('mode-changed'));
      service.editModeInitiated$.subscribe(() => events.push('edit-initiated'));

      service.setEditMode(mockCourse);

      expect(events).toEqual(['mode-changed', 'edit-initiated']);
    });

    it('should emit multiple events for mode changes', () => {
      const modeEvents: PanelModeChangeEvent[] = [];
      service.panelModeChanged$.subscribe(event => modeEvents.push(event));

      service.setMode('edit');
      service.setMode('add');
      service.resetToView();

      expect(modeEvents).toHaveLength(3);
      expect(modeEvents[0].newMode).toBe('edit');
      expect(modeEvents[1].newMode).toBe('add');
      expect(modeEvents[2].newMode).toBe('view');
    });

    it('should include timestamps in all events', () => {
      const now = Date.now();

      service.panelModeChanged$.subscribe(event => {
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(now);
      });

      service.addModeInitiated$.subscribe(event => {
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(now);
      });

      service.setMode('edit');
      service.initiateAddMode('Course', null, 1);
    });
  });

  describe('Signal Reactivity', () => {
    it('should trigger signal updates when mode changes', () => {
      let modeUpdateCount = 0;
      let overlayUpdateCount = 0;

      // Create effects to track signal updates
      const modeEffect = () => {
        service.panelMode();
        modeUpdateCount++;
      };

      const overlayEffect = () => {
        service.isOverlayActive();
        overlayUpdateCount++;
      };

      // Initial calls
      modeEffect();
      overlayEffect();

      // Change mode
      service.setMode('edit');

      // Effects should be called again
      modeEffect();
      overlayEffect();

      expect(modeUpdateCount).toBe(2);
      expect(overlayUpdateCount).toBe(2);
    });

    it('should maintain signal consistency across state changes', () => {
      service.initiateAddMode('Course', null, 1);
      expect(service.isAddMode()).toBe(true);
      expect(service.hasValidAddContext()).toBe(true);

      service.setEditMode(mockTopic);
      expect(service.isEditMode()).toBe(true);
      expect(service.isAddMode()).toBe(false);
      expect(service.hasValidAddContext()).toBe(false);

      service.resetToView();
      expect(service.isViewMode()).toBe(true);
      expect(service.isEditMode()).toBe(false);
      expect(service.isOverlayActive()).toBe(false);
    });

    it('should update computed signals when underlying state changes', () => {
      expect(service.addModeContext()).toBeNull();

      service.initiateAddMode('Topic', mockCourse);

      const context = service.addModeContext();
      expect(context?.entityType).toBe('Topic');
      expect(context?.courseId).toBe(1);

      service.clearState();

      expect(service.addModeContext()).toBeNull();
    });
  });

  describe('Cleanup', () => {
    describe('ngOnDestroy()', () => {
      it('should complete observable subjects', () => {
        const subscription = service.panelModeChanged$.subscribe();

        expect(() => service.ngOnDestroy()).not.toThrow();

        subscription.unsubscribe();
      });

      it('should handle destroy with active subscriptions', () => {
        const sub1 = service.panelModeChanged$.subscribe();
        const sub2 = service.addModeInitiated$.subscribe();
        const sub3 = service.editModeInitiated$.subscribe();

        expect(() => service.ngOnDestroy()).not.toThrow();

        sub1.unsubscribe();
        sub2.unsubscribe();
        sub3.unsubscribe();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid mode changes', () => {
      for (let i = 0; i < 100; i++) {
        service.setMode('edit');
        service.setMode('add');
        service.setMode('view');
      }

      expect(service.panelMode()).toBe('view');
    });

    it('should handle add mode with null parent and explicit courseId', () => {
      service.initiateAddMode('Course', null, 42);

      expect(service.courseId()).toBe(42);
      expect(service.parentEntity()).toBeNull();
      expect(service.hasValidAddContext()).toBe(true);
    });

    it('should handle edit mode with entity missing properties', () => {
      const minimalEntity = { id: 1, entityType: 'Course' } as any;

      service.setEditMode(minimalEntity);

      expect(service.panelMode()).toBe('edit');
      expect(service.courseId()).toBeNull();
    });

    it('should handle template creation for entity types without special properties', () => {
      service.initiateAddMode('Course', null, 1);

      const template = service.nodeTemplate();
      expect(template.entityType).toBe('Course');
      expect(template.id).toBe(0);
      expect(template.courseId).toBe(1);
    });

    it('should handle multiple reset operations', () => {
      service.initiateAddMode('Course', null, 1);

      service.resetToView();
      service.clearState();
      service.resetToView();

      expect(service.panelMode()).toBe('view');
      expect(service.addEntityType()).toBeNull();
    });

    it('should handle complex parent entity hierarchies', () => {
      const deepNestedEntity = {
        id: 1,
        courseId: 123,
        parentId: 456,
        entityType: 'ComplexEntity'
      } as any;

      service.initiateAddMode('Lesson', deepNestedEntity);

      expect(service.courseId()).toBe(123);
      expect(service.parentEntity()).toBe(deepNestedEntity);
    });

    it('should handle concurrent observable subscriptions', () => {
      const events: any[] = [];

      // Create multiple subscriptions
      service.panelModeChanged$.subscribe(e => events.push({ type: 'mode', event: e }));
      service.addModeInitiated$.subscribe(e => events.push({ type: 'add', event: e }));
      service.editModeInitiated$.subscribe(e => events.push({ type: 'edit', event: e }));

      service.initiateAddMode('Course', null, 1);
      service.setEditMode(mockTopic);
      service.resetToView();

      expect(events.length).toBeGreaterThan(5);
      expect(events.some(e => e.type === 'mode')).toBe(true);
      expect(events.some(e => e.type === 'add')).toBe(true);
      expect(events.some(e => e.type === 'edit')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with repeated state changes', () => {
      for (let i = 0; i < 1000; i++) {
        service.initiateAddMode('Course', null, i);
        service.setEditMode({ ...mockCourse, id: i });
        service.clearState();
      }

      expect(service.panelMode()).toBe('view');
      expect(service.courseId()).toBeNull();
    });

    it('should handle large template objects efficiently', () => {
      const largeParent = {
        ...mockCourse,
        largeProperty: 'x'.repeat(10000)
      };

      service.initiateAddMode('Topic', largeParent);

      expect(service.parentEntity()).toBe(largeParent);
      expect(service.courseId()).toBe(1);
    });

    it('should maintain performance with many entity types', () => {
      const entityTypes: EntityType[] = ['Course', 'Topic', 'SubTopic', 'Lesson'];

      entityTypes.forEach((type, index) => {
        service.initiateAddMode(type, null, index + 1);
        expect(service.addEntityType()).toBe(type);
        expect(service.courseId()).toBe(index + 1);
      });
    });
  });
});