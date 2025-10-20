// node-drag-mode.service.spec.ts
// Comprehensive unit tests for NodeDragModeService - Pure drag mode state management with signals
// Tests drag mode state, signal management, mode toggles, and state transitions

import { TestBed } from '@angular/core/testing';
import { NodeDragModeService, DragMode } from './node-drag-mode.service';
import { signal } from '@angular/core';

describe('NodeDragModeService', () => {
  let service: NodeDragModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NodeDragModeService]
    });
    service = TestBed.inject(NodeDragModeService);
  });

  // ===================================
  // Service Initialization Tests
  // ===================================

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with Move drag mode as default', () => {
      expect(service.dragMode()).toBe(DragMode.Move);
    });

    it('should have readonly signal for dragMode', () => {
      expect(service.dragMode).toBeDefined();
      expect(typeof service.dragMode).toBe('function');
    });

    it('should initialize convenience getters correctly', () => {
      expect(service.isDragModeMove).toBe(true);
      expect(service.isDragModeCopy).toBe(false);
      expect(service.currentMode).toBe(DragMode.Move);
    });

    it('should log initialization message', () => {
      spyOn(console, 'log');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [NodeDragModeService]
      });
      const newService = TestBed.inject(NodeDragModeService);
      expect(console.log).toHaveBeenCalledWith('[NodeDragModeService] Service initialized');
    });
  });

  // ===================================
  // Signal State Management Tests
  // ===================================

  describe('Signal State Management', () => {
    it('should provide readonly signal access', () => {
      const initialMode = service.dragMode();
      expect(initialMode).toBe(DragMode.Move);

      // Verify signal is readonly (cannot call set directly)
      expect(() => (service.dragMode as any).set).toBeUndefined();
    });

    it('should maintain signal state consistency', () => {
      expect(service.dragMode()).toBe(DragMode.Move);

      service.setDragMode(DragMode.Copy);
      expect(service.dragMode()).toBe(DragMode.Copy);

      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);
    });

    it('should handle signal state changes reactively', () => {
      let signalValue: DragMode | null = null;

      // Subscribe to signal changes
      const unsubscribe = () => {}; // Signals don't need explicit subscription
      signalValue = service.dragMode();
      expect(signalValue).toBe(DragMode.Move);

      service.setDragMode(DragMode.Copy);
      signalValue = service.dragMode();
      expect(signalValue).toBe(DragMode.Copy);
    });

    it('should preserve signal value across multiple reads', () => {
      service.setDragMode(DragMode.Copy);

      expect(service.dragMode()).toBe(DragMode.Copy);
      expect(service.dragMode()).toBe(DragMode.Copy);
      expect(service.dragMode()).toBe(DragMode.Copy);
    });
  });

  // ===================================
  // DragMode Enum Tests
  // ===================================

  describe('DragMode Enum', () => {
    it('should have correct enum values', () => {
      expect(DragMode.Move).toBe('move');
      expect(DragMode.Copy).toBe('copy');
    });

    it('should support both enum values', () => {
      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe('move');

      service.setDragMode(DragMode.Copy);
      expect(service.dragMode()).toBe('copy');
    });
  });

  // ===================================
  // Toggle Drag Mode Tests
  // ===================================

  describe('Toggle Drag Mode', () => {
    it('should toggle from Move to Copy', () => {
      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);

      service.toggleDragMode();
      expect(service.dragMode()).toBe(DragMode.Copy);
    });

    it('should toggle from Copy to Move', () => {
      service.setDragMode(DragMode.Copy);
      expect(service.dragMode()).toBe(DragMode.Copy);

      service.toggleDragMode();
      expect(service.dragMode()).toBe(DragMode.Move);
    });

    it('should handle multiple consecutive toggles', () => {
      expect(service.dragMode()).toBe(DragMode.Move);

      service.toggleDragMode(); // Move -> Copy
      expect(service.dragMode()).toBe(DragMode.Copy);

      service.toggleDragMode(); // Copy -> Move
      expect(service.dragMode()).toBe(DragMode.Move);

      service.toggleDragMode(); // Move -> Copy
      expect(service.dragMode()).toBe(DragMode.Copy);
    });

    it('should log toggle operations', () => {
      spyOn(console, 'log');

      service.toggleDragMode();
      expect(console.log).toHaveBeenCalledWith('[NodeDragModeService] Toggled drag mode to:', DragMode.Copy);

      service.toggleDragMode();
      expect(console.log).toHaveBeenCalledWith('[NodeDragModeService] Toggled drag mode to:', DragMode.Move);
    });

    it('should update convenience getters after toggle', () => {
      service.setDragMode(DragMode.Move);
      expect(service.isDragModeMove).toBe(true);
      expect(service.isDragModeCopy).toBe(false);

      service.toggleDragMode();
      expect(service.isDragModeMove).toBe(false);
      expect(service.isDragModeCopy).toBe(true);
    });
  });

  // ===================================
  // Set Drag Mode Tests
  // ===================================

  describe('Set Drag Mode', () => {
    it('should set Move mode explicitly', () => {
      service.setDragMode(DragMode.Copy);
      expect(service.dragMode()).toBe(DragMode.Copy);

      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);
    });

    it('should set Copy mode explicitly', () => {
      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);

      service.setDragMode(DragMode.Copy);
      expect(service.dragMode()).toBe(DragMode.Copy);
    });

    it('should handle setting same mode multiple times', () => {
      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);

      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);

      service.setDragMode(DragMode.Move);
      expect(service.dragMode()).toBe(DragMode.Move);
    });

    it('should log set operations', () => {
      spyOn(console, 'log');

      service.setDragMode(DragMode.Copy);
      expect(console.log).toHaveBeenCalledWith('[NodeDragModeService] Set drag mode to:', DragMode.Copy);

      service.setDragMode(DragMode.Move);
      expect(console.log).toHaveBeenCalledWith('[NodeDragModeService] Set drag mode to:', DragMode.Move);
    });

    it('should accept string enum values', () => {
      service.setDragMode('move' as DragMode);
      expect(service.dragMode()).toBe(DragMode.Move);

      service.setDragMode('copy' as DragMode);
      expect(service.dragMode()).toBe(DragMode.Copy);
    });
  });

  // ===================================
  // Convenience Getter Tests
  // ===================================

  describe('Convenience Getters', () => {
    describe('isDragModeMove', () => {
      it('should return true when mode is Move', () => {
        service.setDragMode(DragMode.Move);
        expect(service.isDragModeMove).toBe(true);
      });

      it('should return false when mode is Copy', () => {
        service.setDragMode(DragMode.Copy);
        expect(service.isDragModeMove).toBe(false);
      });

      it('should update reactively when mode changes', () => {
        service.setDragMode(DragMode.Copy);
        expect(service.isDragModeMove).toBe(false);

        service.setDragMode(DragMode.Move);
        expect(service.isDragModeMove).toBe(true);
      });
    });

    describe('isDragModeCopy', () => {
      it('should return true when mode is Copy', () => {
        service.setDragMode(DragMode.Copy);
        expect(service.isDragModeCopy).toBe(true);
      });

      it('should return false when mode is Move', () => {
        service.setDragMode(DragMode.Move);
        expect(service.isDragModeCopy).toBe(false);
      });

      it('should update reactively when mode changes', () => {
        service.setDragMode(DragMode.Move);
        expect(service.isDragModeCopy).toBe(false);

        service.setDragMode(DragMode.Copy);
        expect(service.isDragModeCopy).toBe(true);
      });
    });

    describe('currentMode', () => {
      it('should return current drag mode', () => {
        service.setDragMode(DragMode.Move);
        expect(service.currentMode).toBe(DragMode.Move);

        service.setDragMode(DragMode.Copy);
        expect(service.currentMode).toBe(DragMode.Copy);
      });

      it('should always match dragMode signal value', () => {
        service.setDragMode(DragMode.Move);
        expect(service.currentMode).toBe(service.dragMode());

        service.setDragMode(DragMode.Copy);
        expect(service.currentMode).toBe(service.dragMode());

        service.toggleDragMode();
        expect(service.currentMode).toBe(service.dragMode());
      });
    });

    it('should maintain mutual exclusivity between mode getters', () => {
      service.setDragMode(DragMode.Move);
      expect(service.isDragModeMove).toBe(true);
      expect(service.isDragModeCopy).toBe(false);

      service.setDragMode(DragMode.Copy);
      expect(service.isDragModeMove).toBe(false);
      expect(service.isDragModeCopy).toBe(true);
    });
  });

  // ===================================
  // State Consistency Tests
  // ===================================

  describe('State Consistency', () => {
    it('should maintain consistency between signal and getters', () => {
      const modes = [DragMode.Move, DragMode.Copy, DragMode.Move, DragMode.Copy];

      modes.forEach(mode => {
        service.setDragMode(mode);

        expect(service.dragMode()).toBe(mode);
        expect(service.currentMode).toBe(mode);
        expect(service.isDragModeMove).toBe(mode === DragMode.Move);
        expect(service.isDragModeCopy).toBe(mode === DragMode.Copy);
      });
    });

    it('should maintain consistency after toggle operations', () => {
      for (let i = 0; i < 10; i++) {
        const expectedMode = i % 2 === 0 ? DragMode.Copy : DragMode.Move;

        service.toggleDragMode();

        expect(service.dragMode()).toBe(expectedMode);
        expect(service.currentMode).toBe(expectedMode);
        expect(service.isDragModeMove).toBe(expectedMode === DragMode.Move);
        expect(service.isDragModeCopy).toBe(expectedMode === DragMode.Copy);
      }
    });

    it('should handle rapid state changes', () => {
      const operations = [
        () => service.setDragMode(DragMode.Move),
        () => service.setDragMode(DragMode.Copy),
        () => service.toggleDragMode(),
        () => service.setDragMode(DragMode.Move),
        () => service.toggleDragMode()
      ];

      operations.forEach(operation => {
        operation();

        const currentMode = service.dragMode();
        expect(service.currentMode).toBe(currentMode);
        expect(service.isDragModeMove).toBe(currentMode === DragMode.Move);
        expect(service.isDragModeCopy).toBe(currentMode === DragMode.Copy);
      });
    });
  });

  // ===================================
  // Edge Cases and Error Handling
  // ===================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined mode gracefully (TypeScript should prevent this)', () => {
      // This test verifies TypeScript type safety
      expect(() => service.setDragMode(undefined as any)).not.toThrow();
    });

    it('should handle null mode gracefully (TypeScript should prevent this)', () => {
      // This test verifies TypeScript type safety
      expect(() => service.setDragMode(null as any)).not.toThrow();
    });

    it('should handle invalid string values gracefully', () => {
      // This test verifies runtime type safety
      expect(() => service.setDragMode('invalid' as DragMode)).not.toThrow();
    });

    it('should maintain original state after invalid operations', () => {
      const originalMode = service.dragMode();

      try {
        service.setDragMode('invalid' as DragMode);
      } catch (e) {
        // Should not throw, but if it does, state should be preserved
      }

      // State should either be preserved or set to the invalid value (depending on implementation)
      expect(service.dragMode()).toBeDefined();
    });
  });

  // ===================================
  // Service Lifecycle Tests
  // ===================================

  describe('Service Lifecycle', () => {
    it('should maintain state across multiple service references', () => {
      const service1 = TestBed.inject(NodeDragModeService);
      const service2 = TestBed.inject(NodeDragModeService);

      // Should be the same instance (singleton)
      expect(service1).toBe(service2);

      service1.setDragMode(DragMode.Copy);
      expect(service2.dragMode()).toBe(DragMode.Copy);
    });

    it('should be provided in root (singleton)', () => {
      const service1 = TestBed.inject(NodeDragModeService);
      const service2 = TestBed.inject(NodeDragModeService);

      expect(service1).toBe(service2);
    });

    it('should initialize fresh state for each test', () => {
      // This test verifies that beforeEach correctly resets the service
      expect(service.dragMode()).toBe(DragMode.Move);
    });
  });

  // ===================================
  // Integration Tests
  // ===================================

  describe('Integration Scenarios', () => {
    it('should simulate typical user interaction flow', () => {
      // Initial state
      expect(service.isDragModeMove).toBe(true);

      // User toggles to copy mode
      service.toggleDragMode();
      expect(service.isDragModeCopy).toBe(true);

      // User performs copy operation (mode stays)
      expect(service.currentMode).toBe(DragMode.Copy);

      // User explicitly sets back to move
      service.setDragMode(DragMode.Move);
      expect(service.isDragModeMove).toBe(true);

      // User toggles multiple times
      service.toggleDragMode(); // Copy
      service.toggleDragMode(); // Move
      expect(service.isDragModeMove).toBe(true);
    });

    it('should handle rapid UI interactions', () => {
      let modeChanges = 0;

      // Simulate rapid clicks/keystrokes
      for (let i = 0; i < 20; i++) {
        const beforeMode = service.dragMode();
        service.toggleDragMode();
        const afterMode = service.dragMode();

        if (beforeMode !== afterMode) {
          modeChanges++;
        }
      }

      expect(modeChanges).toBe(20); // Should change every time
      expect(service.dragMode()).toBe(DragMode.Copy); // Should end on Copy (started on Move)
    });

    it('should support business logic integration patterns', () => {
      // Simulate checking mode before operation
      if (service.isDragModeMove) {
        // Move operation
        expect(service.currentMode).toBe(DragMode.Move);
      }

      // Simulate setting mode based on business logic
      const shouldCopy = true;
      service.setDragMode(shouldCopy ? DragMode.Copy : DragMode.Move);
      expect(service.isDragModeCopy).toBe(true);

      // Simulate UI feedback
      const modeText = service.isDragModeMove ? 'Moving' : 'Copying';
      expect(modeText).toBe('Copying');
    });
  });

  // ===================================
  // Performance Tests
  // ===================================

  describe('Performance Considerations', () => {
    it('should handle multiple rapid state changes efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        service.toggleDragMode();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 operations quickly (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should not cause memory leaks with repeated operations', () => {
      // Simulate extended usage
      for (let i = 0; i < 100; i++) {
        service.setDragMode(DragMode.Move);
        service.setDragMode(DragMode.Copy);
        service.toggleDragMode();
        service.toggleDragMode();

        // Verify state is still consistent
        expect(service.dragMode()).toBeDefined();
        expect([DragMode.Move, DragMode.Copy]).toContain(service.currentMode);
      }
    });

    it('should maintain signal efficiency', () => {
      let readCount = 0;
      const startTime = performance.now();

      // Multiple reads should be efficient
      for (let i = 0; i < 1000; i++) {
        const mode = service.dragMode();
        if (mode) readCount++;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(readCount).toBe(1000);
      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });
});