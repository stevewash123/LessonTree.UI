// node-operations.service.spec.ts
// Comprehensive unit tests for NodeOperationsService - Tree node operations and business logic
// Tests drag/drop operations, move operations, copy operations, drag mode management, and error handling

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NodeOperationsService } from './node-operations.service';
import { ApiService } from '../../../shared/services/api.service';
import { CalendarAwareApiService } from '../../../shared/services/calendar-aware-api.service';
import { CourseDataService } from '../course-data/course-data.service';
import { NodeDragModeService, DragMode } from '../state/node-drag-mode.service';
import { CalendarRefreshService } from '../../../calendar/services/integration/calendar-refresh.service';
import { NodeMovedEvent, TreeData } from '../../../models/tree-node';
import { Lesson } from '../../../models/lesson';

describe('NodeOperationsService', () => {
  let service: NodeOperationsService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let calendarAwareApiSpy: jasmine.SpyObj<CalendarAwareApiService>;
  let courseDataServiceSpy: jasmine.SpyObj<CourseDataService>;
  let nodeDragModeServiceSpy: jasmine.SpyObj<NodeDragModeService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let calendarRefreshSpy: jasmine.SpyObj<CalendarRefreshService>;

  // Test data fixtures
  const mockLesson: Lesson = {
    id: 1,
    title: 'Test Lesson',
    courseId: 1,
    topicId: 2,
    subTopicId: 3,
    visibility: 'Private',
    level: 'Beginner',
    objective: 'Test objective',
    sortOrder: 1,
    archived: false,
    userId: 1
  } as Lesson;

  const mockLessonNode: TreeData = {
    id: 1,
    entityType: 'Lesson',
    entity: mockLesson
  } as TreeData;

  const mockSubTopicNode: TreeData = {
    id: 2,
    entityType: 'SubTopic',
    entity: {
      id: 2,
      title: 'Test SubTopic',
      courseId: 1,
      topicId: 3
    }
  } as TreeData;

  const mockTopicNode: TreeData = {
    id: 3,
    entityType: 'Topic',
    entity: {
      id: 3,
      title: 'Test Topic',
      courseId: 1
    }
  } as TreeData;

  const mockNodeMovedEvent: NodeMovedEvent = {
    node: mockLessonNode,
    targetParentId: 2,
    targetParentType: 'SubTopic',
    targetCourseId: 1,
    sourceParentId: 1,
    sourceParentType: 'Topic',
    sourceCourseId: 1
  };

  const mockApiSuccessResponse = {
    isSuccess: true,
    modifiedEntities: [
      {
        id: 1,
        sortOrder: 2,
        isMovedEntity: true
      }
    ]
  };

  const mockOptimizedApiResponse = {
    isOptimized: true,
    hasPartialGeneration: true,
    partialEventsGenerated: 5
  };

  beforeEach(() => {
    const apiServiceSpyObj = jasmine.createSpyObj('ApiService', [
      'moveSubTopic',
      'moveTopic',
      'copyLesson',
      'copySubTopic',
      'copyTopic'
    ]);

    const calendarAwareApiSpyObj = jasmine.createSpyObj('CalendarAwareApiService', [
      'moveLessonOptimized'
    ]);

    const courseDataServiceSpyObj = jasmine.createSpyObj('CourseDataService', [
      'emitEntityMoved'
    ]);

    const nodeDragModeServiceSpyObj = jasmine.createSpyObj('NodeDragModeService', [
      'toggleDragMode',
      'setDragMode'
    ], {
      dragMode: 'move' as DragMode,
      isDragModeCopy: false
    });

    const toastrServiceSpyObj = jasmine.createSpyObj('ToastrService', [
      'success',
      'error'
    ]);

    const calendarRefreshSpyObj = jasmine.createSpyObj('CalendarRefreshService', [
      'refreshCalendarForCourse'
    ]);

    TestBed.configureTestingModule({
      providers: [
        NodeOperationsService,
        { provide: ApiService, useValue: apiServiceSpyObj },
        { provide: CalendarAwareApiService, useValue: calendarAwareApiSpyObj },
        { provide: CourseDataService, useValue: courseDataServiceSpyObj },
        { provide: NodeDragModeService, useValue: nodeDragModeServiceSpyObj },
        { provide: ToastrService, useValue: toastrServiceSpyObj },
        { provide: CalendarRefreshService, useValue: calendarRefreshSpyObj }
      ]
    });

    service = TestBed.inject(NodeOperationsService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    calendarAwareApiSpy = TestBed.inject(CalendarAwareApiService) as jasmine.SpyObj<CalendarAwareApiService>;
    courseDataServiceSpy = TestBed.inject(CourseDataService) as jasmine.SpyObj<CourseDataService>;
    nodeDragModeServiceSpy = TestBed.inject(NodeDragModeService) as jasmine.SpyObj<NodeDragModeService>;
    toastrSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    calendarRefreshSpy = TestBed.inject(CalendarRefreshService) as jasmine.SpyObj<CalendarRefreshService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      const newService = new NodeOperationsService(
        apiServiceSpy,
        calendarAwareApiSpy,
        courseDataServiceSpy,
        nodeDragModeServiceSpy,
        toastrSpy,
        calendarRefreshSpy
      );
      expect(console.log).toHaveBeenCalledWith(
        '[NodeOperationsService] Simplified sibling-based service initialized with calendar optimization'
      );
    });
  });

  describe('Drag Mode Management', () => {
    it('should get drag mode from NodeDragModeService', () => {
      const result = service.dragMode;
      expect(result).toBe('move');
    });

    it('should get isDragModeCopy from NodeDragModeService', () => {
      const result = service.isDragModeCopy;
      expect(result).toBe(false);
    });

    it('should toggle drag mode', () => {
      service.toggleDragMode();
      expect(nodeDragModeServiceSpy.toggleDragMode).toHaveBeenCalled();
    });

    it('should set drag mode', () => {
      service.setDragMode('copy');
      expect(nodeDragModeServiceSpy.setDragMode).toHaveBeenCalledWith('copy');
    });
  });

  describe('Lesson Move Operations', () => {
    describe('performLessonMove()', () => {
      it('should perform successful lesson move with calendar optimization', () => {
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        service.performLessonMove(
          mockNodeMovedEvent,
          3, // targetSubTopicId
          2, // targetTopicId
          1  // afterSiblingId
        ).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
          1, // lessonId
          3, // targetSubTopicId
          2, // targetTopicId
          1  // afterSiblingId
        );
      });

      it('should perform lesson move to topic (no subtopic)', () => {
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        service.performLessonMove(
          mockNodeMovedEvent,
          undefined, // targetSubTopicId
          2,         // targetTopicId
          null       // afterSiblingId
        ).subscribe();

        expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
          1,         // lessonId
          undefined, // targetSubTopicId
          2,         // targetTopicId
          undefined  // afterSiblingId (null converted to undefined)
        );
      });

      it('should validate lesson move request', () => {
        spyOn(console, 'error');
        const invalidEvent = {
          ...mockNodeMovedEvent,
          node: { ...mockLessonNode, id: 0 } // Invalid lesson ID
        };

        service.performLessonMove(invalidEvent).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          jasmine.stringContaining('Invalid'),
          'Invalid Move'
        );
      });

      it('should handle lesson move errors', () => {
        const error = new Error('Move failed');
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(throwError(() => error));

        service.performLessonMove(mockNodeMovedEvent, 2, 1).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Failed to move lesson (optimized): Move failed',
          'Error'
        );
      });

      it('should log optimized move results', () => {
        spyOn(console, 'log');
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        service.performLessonMove(mockNodeMovedEvent, 2, 1).subscribe();

        expect(console.log).toHaveBeenCalledWith(
          '[NodeOperationsService] ✅ Calendar-optimized lesson move result:',
          {
            lessonId: 1,
            isOptimized: true,
            hasPartialGeneration: true,
            partialEventsGenerated: 5
          }
        );
      });
    });
  });

  describe('SubTopic Move Operations', () => {
    describe('performSubTopicMove()', () => {
      it('should perform successful subtopic move', () => {
        apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicMove(
          subTopicEvent,
          3, // targetTopicId
          2, // afterSiblingId
          'After' // dropPosition
        ).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(apiServiceSpy.moveSubTopic).toHaveBeenCalledWith(
          2, // subTopicId
          3, // targetTopicId
          2, // relativeToId
          'after', // position
          'Lesson' // relativeToType (determined by service)
        );
      });

      it('should handle before drop position', () => {
        apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicMove(
          subTopicEvent,
          3, // targetTopicId
          2, // afterSiblingId
          'Before' // dropPosition
        ).subscribe();

        expect(apiServiceSpy.moveSubTopic).toHaveBeenCalledWith(
          2, // subTopicId
          3, // targetTopicId
          2, // relativeToId
          'before', // position
          'Lesson' // relativeToType
        );
      });

      it('should handle subtopic move without siblings', () => {
        apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicMove(
          subTopicEvent,
          3,    // targetTopicId
          null  // afterSiblingId
        ).subscribe();

        expect(apiServiceSpy.moveSubTopic).toHaveBeenCalledWith(
          2,         // subTopicId
          3,         // targetTopicId
          undefined, // relativeToId
          undefined, // position
          undefined  // relativeToType
        );
      });

      it('should handle subtopic move errors', () => {
        const error = new Error('SubTopic move failed');
        apiServiceSpy.moveSubTopic.and.returnValue(throwError(() => error));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicMove(subTopicEvent, 3, null).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Failed to move subtopic: SubTopic move failed',
          'Error'
        );
      });

      it('should log detailed positioning parameters', () => {
        spyOn(console, 'log');
        apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicMove(subTopicEvent, 3, 2, 'Before');

        expect(console.log).toHaveBeenCalledWith(
          '[NodeOperationsService] 🔍 SUBTOPIC MOVE INPUT PARAMETERS:',
          jasmine.objectContaining({
            'node.id': 2,
            'targetTopicId': 3,
            'afterSiblingId': 2,
            'dropPosition': 'Before'
          })
        );
      });
    });
  });

  describe('Topic Move Operations', () => {
    describe('performTopicMove()', () => {
      it('should perform successful topic move', () => {
        apiServiceSpy.moveTopic.and.returnValue(of(mockApiSuccessResponse));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode
        };

        service.performTopicMove(
          topicEvent,
          2, // targetCourseId
          1  // afterSiblingId
        ).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(apiServiceSpy.moveTopic).toHaveBeenCalledWith(
          3, // topicId
          2, // targetCourseId
          1  // afterSiblingId
        );
      });

      it('should handle topic move without siblings', () => {
        apiServiceSpy.moveTopic.and.returnValue(of(mockApiSuccessResponse));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode
        };

        service.performTopicMove(
          topicEvent,
          2,    // targetCourseId
          null  // afterSiblingId
        ).subscribe();

        expect(apiServiceSpy.moveTopic).toHaveBeenCalledWith(
          3,         // topicId
          2,         // targetCourseId
          undefined  // afterSiblingId (null converted to undefined)
        );
      });

      it('should handle topic move errors', () => {
        const error = new Error('Topic move failed');
        apiServiceSpy.moveTopic.and.returnValue(throwError(() => error));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode
        };

        service.performTopicMove(topicEvent, 2, null).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Failed to move topic: Topic move failed',
          'Error'
        );
      });
    });
  });

  describe('Copy Operations', () => {
    describe('performLessonCopy()', () => {
      it('should perform successful lesson copy to subtopic', () => {
        apiServiceSpy.copyLesson.and.returnValue(of(mockApiSuccessResponse));

        service.performLessonCopy(
          mockNodeMovedEvent,
          3, // targetSubTopicId
          2  // targetTopicId
        ).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(apiServiceSpy.copyLesson).toHaveBeenCalledWith(1, 3, 2);
      });

      it('should perform lesson copy to topic only', () => {
        apiServiceSpy.copyLesson.and.returnValue(of(mockApiSuccessResponse));

        service.performLessonCopy(
          mockNodeMovedEvent,
          undefined, // targetSubTopicId
          2          // targetTopicId
        ).subscribe();

        expect(apiServiceSpy.copyLesson).toHaveBeenCalledWith(1, undefined, 2);
      });

      it('should handle lesson copy errors', () => {
        const error = new Error('Copy failed');
        apiServiceSpy.copyLesson.and.returnValue(throwError(() => error));

        service.performLessonCopy(mockNodeMovedEvent, 3, 2).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Failed to copy lesson: Copy failed',
          'Error'
        );
      });
    });

    describe('performSubTopicCopy()', () => {
      it('should perform successful subtopic copy', () => {
        apiServiceSpy.copySubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicCopy(subTopicEvent, 3).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(apiServiceSpy.copySubTopic).toHaveBeenCalledWith(2, 3);
      });

      it('should handle subtopic copy errors', () => {
        const error = new Error('SubTopic copy failed');
        apiServiceSpy.copySubTopic.and.returnValue(throwError(() => error));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode
        };

        service.performSubTopicCopy(subTopicEvent, 3).subscribe(result => {
          expect(result).toBe(false);
        });
      });
    });

    describe('performTopicCopy()', () => {
      it('should perform successful topic copy', () => {
        apiServiceSpy.copyTopic.and.returnValue(of(mockApiSuccessResponse));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode
        };

        service.performTopicCopy(topicEvent, 2).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(apiServiceSpy.copyTopic).toHaveBeenCalledWith(3, 2);
      });

      it('should handle topic copy errors', () => {
        const error = new Error('Topic copy failed');
        apiServiceSpy.copyTopic.and.returnValue(throwError(() => error));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode
        };

        service.performTopicCopy(topicEvent, 2).subscribe(result => {
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('Legacy Methods', () => {
    describe('performMoveToGroup()', () => {
      it('should handle legacy topic regroup', () => {
        apiServiceSpy.moveTopic.and.returnValue(of(mockApiSuccessResponse));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode,
          targetCourseId: 2
        };

        service.performMoveToGroup(topicEvent).subscribe(result => {
          expect(result).toBe(true);
        });

        expect(apiServiceSpy.moveTopic).toHaveBeenCalledWith(3, 2, undefined);
      });

      it('should handle legacy lesson regroup to subtopic', () => {
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        const lessonEvent = {
          ...mockNodeMovedEvent,
          targetParentType: 'SubTopic',
          targetParentId: 2
        };

        service.performMoveToGroup(lessonEvent).subscribe();

        expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
          1, 2, undefined, undefined
        );
      });

      it('should handle legacy lesson regroup to topic', () => {
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        const lessonEvent = {
          ...mockNodeMovedEvent,
          targetParentType: 'Topic',
          targetParentId: 3
        };

        service.performMoveToGroup(lessonEvent).subscribe();

        expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
          1, undefined, 3, undefined
        );
      });

      it('should handle legacy subtopic regroup', () => {
        apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode,
          targetParentType: 'Topic',
          targetParentId: 3
        };

        service.performMoveToGroup(subTopicEvent).subscribe();

        expect(apiServiceSpy.moveSubTopic).toHaveBeenCalledWith(
          2, 3, undefined, undefined, undefined
        );
      });

      it('should handle unsupported legacy regroup', () => {
        const unsupportedEvent = {
          ...mockNodeMovedEvent,
          node: { ...mockLessonNode, entityType: 'Course' }
        };

        service.performMoveToGroup(unsupportedEvent as any).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Unsupported move operation',
          'Error'
        );
      });
    });

    describe('performMoveToSort()', () => {
      it('should handle legacy lesson sort after position', () => {
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        service.performMoveToSort(
          mockNodeMovedEvent,
          5, // relativeToId
          'after', // relativePosition
          'Lesson' // relativeToType
        ).subscribe();

        expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
          1, 3, 2, 5 // afterSiblingId is relativeToId when position is 'after'
        );
      });

      it('should handle legacy lesson sort before position', () => {
        calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

        service.performMoveToSort(
          mockNodeMovedEvent,
          5, // relativeToId
          'before', // relativePosition
          'Lesson' // relativeToType
        ).subscribe();

        expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
          1, 3, 2, null // afterSiblingId is null when position is 'before'
        );
      });

      it('should handle legacy subtopic sort', () => {
        apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

        const subTopicEvent = {
          ...mockNodeMovedEvent,
          node: mockSubTopicNode,
          targetParentId: 3
        };

        service.performMoveToSort(
          subTopicEvent,
          4, // relativeToId
          'after', // relativePosition
          'SubTopic' // relativeToType
        ).subscribe();

        expect(apiServiceSpy.moveSubTopic).toHaveBeenCalledWith(
          2, 3, 4, undefined, undefined
        );
      });

      it('should handle legacy topic sort', () => {
        apiServiceSpy.moveTopic.and.returnValue(of(mockApiSuccessResponse));

        const topicEvent = {
          ...mockNodeMovedEvent,
          node: mockTopicNode,
          targetCourseId: 2
        };

        service.performMoveToSort(
          topicEvent,
          4, // relativeToId
          'after', // relativePosition
          'Topic' // relativeToType
        ).subscribe();

        expect(apiServiceSpy.moveTopic).toHaveBeenCalledWith(3, 2, 4);
      });

      it('should handle unsupported legacy sort', () => {
        const unsupportedEvent = {
          ...mockNodeMovedEvent,
          node: { ...mockTopicNode, entityType: 'Course' },
          targetCourseId: undefined
        };

        service.performMoveToSort(
          unsupportedEvent as any,
          4,
          'after',
          'Course' as any
        ).subscribe(result => {
          expect(result).toBe(false);
        });

        expect(toastrSpy.error).toHaveBeenCalledWith(
          'Unsupported sort operation',
          'Error'
        );
      });
    });
  });

  describe('Success Handling', () => {
    it('should handle API success with entity moved event', () => {
      calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

      service.performLessonMove(mockNodeMovedEvent, 2, 1).subscribe();

      // Should trigger calendar refresh
      expect(calendarRefreshSpy.refreshCalendarForCourse).toHaveBeenCalledWith(1);
    });

    it('should emit entity moved event on success', () => {
      apiServiceSpy.moveSubTopic.and.returnValue(of(mockApiSuccessResponse));

      const subTopicEvent = {
        ...mockNodeMovedEvent,
        node: mockSubTopicNode
      };

      service.performSubTopicMove(subTopicEvent, 3, null).subscribe();

      expect(courseDataServiceSpy.emitEntityMoved).toHaveBeenCalledWith(
        mockSubTopicNode.entity,
        'SubTopic:2',
        'SubTopic:2',
        'tree',
        'DRAG_MOVE',
        jasmine.objectContaining({
          moveType: 'drag-drop'
        })
      );
    });

    it('should show success toast notification', () => {
      apiServiceSpy.moveTopic.and.returnValue(of(mockApiSuccessResponse));

      const topicEvent = {
        ...mockNodeMovedEvent,
        node: mockTopicNode
      };

      service.performTopicMove(topicEvent, 2, null).subscribe();

      expect(toastrSpy.success).toHaveBeenCalledWith(
        jasmine.stringContaining('TOPIC MOVE: Topic "Test Topic" moved successfully')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      spyOn(console, 'error');
      const error = new Error('Network error');
      apiServiceSpy.copyLesson.and.returnValue(throwError(() => error));

      service.performLessonCopy(mockNodeMovedEvent, 2, 1).subscribe(result => {
        expect(result).toBe(false);
      });

      expect(console.error).toHaveBeenCalledWith(
        '[NodeOperationsService] copy lesson error:',
        error
      );
    });

    it('should handle unexpected API response format', () => {
      const invalidResponse = { unexpectedFormat: true };
      apiServiceSpy.moveSubTopic.and.returnValue(of(invalidResponse));

      const subTopicEvent = {
        ...mockNodeMovedEvent,
        node: mockSubTopicNode
      };

      service.performSubTopicMove(subTopicEvent, 3, null).subscribe();

      expect(toastrSpy.error).toHaveBeenCalledWith(
        'Failed to SUBTOPIC MOVE: Unexpected response format',
        'Error'
      );
    });
  });

  describe('Utility Methods', () => {
    it('should extract course ID from lesson entity', () => {
      const result = (service as any).extractCourseId(mockLessonNode);
      expect(result).toBe(1);
    });

    it('should extract course ID from subtopic entity', () => {
      const result = (service as any).extractCourseId(mockSubTopicNode);
      expect(result).toBe(1);
    });

    it('should extract course ID from topic entity', () => {
      const result = (service as any).extractCourseId(mockTopicNode);
      expect(result).toBe(1);
    });

    it('should use fallback course ID when entity course ID unavailable', () => {
      const nodeWithoutCourseId = {
        ...mockLessonNode,
        entity: { ...mockLesson, courseId: undefined }
      };

      const result = (service as any).extractCourseId(nodeWithoutCourseId, 99);
      expect(result).toBe(99);
    });

    it('should determine relative-to-type as Lesson by default', () => {
      const result = (service as any).determineRelativeToType(123);
      expect(result).toBe('Lesson');
    });

    it('should get node title from entity', () => {
      const result = (service as any).getNodeTitle(mockLessonNode);
      expect(result).toBe('Test Lesson');
    });

    it('should handle node without title', () => {
      const nodeWithoutTitle = {
        ...mockLessonNode,
        entity: { ...mockLesson, title: undefined }
      };

      const result = (service as any).getNodeTitle(nodeWithoutTitle);
      expect(result).toBe('Unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null node in move event', () => {
      const eventWithNullNode = {
        ...mockNodeMovedEvent,
        node: null
      };

      expect(() => {
        service.performLessonMove(eventWithNullNode as any).subscribe();
      }).not.toThrow();
    });

    it('should handle undefined after sibling ID', () => {
      calendarAwareApiSpy.moveLessonOptimized.and.returnValue(of(mockOptimizedApiResponse));

      service.performLessonMove(
        mockNodeMovedEvent,
        2, // targetSubTopicId
        1, // targetTopicId
        undefined // afterSiblingId
      ).subscribe();

      expect(calendarAwareApiSpy.moveLessonOptimized).toHaveBeenCalledWith(
        1, 2, 1, undefined
      );
    });

    it('should handle empty API response', () => {
      apiServiceSpy.moveTopic.and.returnValue(of(null));

      const topicEvent = {
        ...mockNodeMovedEvent,
        node: mockTopicNode
      };

      service.performTopicMove(topicEvent, 2, null).subscribe(result => {
        expect(result).toBe(false);
      });
    });

    it('should handle API response without modifiedEntities', () => {
      const responseWithoutEntities = { isSuccess: true };
      apiServiceSpy.moveSubTopic.and.returnValue(of(responseWithoutEntities));

      const subTopicEvent = {
        ...mockNodeMovedEvent,
        node: mockSubTopicNode
      };

      service.performSubTopicMove(subTopicEvent, 3, null).subscribe();

      expect(courseDataServiceSpy.emitEntityMoved).toHaveBeenCalled();
    });
  });
});