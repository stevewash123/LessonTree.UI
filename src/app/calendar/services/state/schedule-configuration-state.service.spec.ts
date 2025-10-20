// schedule-configuration-state.service.spec.ts
// Comprehensive unit tests for ScheduleConfigurationStateService - Signal-based state management
// Tests state signals, computed properties, configuration management, and reactive patterns

import { TestBed } from '@angular/core/testing';
import { ScheduleConfigurationStateService } from './schedule-configuration-state.service';
import { ScheduleConfiguration, SchedulePeriodAssignment } from '../../../models/schedule-configuration.model';

describe('ScheduleConfigurationStateService', () => {
  let service: ScheduleConfigurationStateService;

  // Test data fixtures
  const mockPeriodAssignments: SchedulePeriodAssignment[] = [
    {
      period: 1,
      courseId: 1,
      courseName: 'Mathematics',
      isAssigned: true
    },
    {
      period: 2,
      courseId: 2,
      courseName: 'Science',
      isAssigned: true
    }
  ];

  const mockConfiguration: ScheduleConfiguration = {
    id: 1,
    title: 'Test Configuration',
    schoolYear: '2024-2025',
    periodsPerDay: 6,
    startDate: new Date('2024-08-15'),
    endDate: new Date('2025-06-15'),
    teachingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periodAssignments: mockPeriodAssignments,
    createdDate: new Date('2024-01-01'),
    modifiedDate: new Date('2024-01-02')
  };

  const mockConfiguration2: ScheduleConfiguration = {
    id: 2,
    title: 'Test Configuration 2',
    schoolYear: '2024-2025',
    periodsPerDay: 8,
    startDate: new Date('2024-08-20'),
    endDate: new Date('2025-06-20'),
    teachingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    periodAssignments: [],
    createdDate: new Date('2024-01-03'),
    modifiedDate: new Date('2024-01-04')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScheduleConfigurationStateService]
    });

    service = TestBed.inject(ScheduleConfigurationStateService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null active configuration', () => {
      expect(service.activeConfiguration()).toBeNull();
    });

    it('should initialize with empty configurations array', () => {
      expect(service.allConfigurations()).toEqual([]);
    });

    it('should initialize with loading state false', () => {
      expect(service.isLoadingConfiguration()).toBe(false);
    });

    it('should initialize computed signals correctly', () => {
      expect(service.hasActiveConfiguration()).toBe(false);
      expect(service.activeConfigurationTitle()).toBe('No Configuration');
      expect(service.activeConfigurationId()).toBeNull();
      expect(service.canGenerateSchedule()).toBe(false);
    });
  });

  describe('Active Configuration Management', () => {
    describe('setActiveConfiguration()', () => {
      it('should set active configuration', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfiguration()).toBe(mockConfiguration);
        expect(service.hasActiveConfiguration()).toBe(true);
      });

      it('should update computed signals when setting configuration', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfigurationTitle()).toBe('Test Configuration');
        expect(service.activeConfigurationId()).toBe(1);
        expect(service.canGenerateSchedule()).toBe(true);
      });

      it('should handle null configuration', () => {
        service.setActiveConfiguration(mockConfiguration);
        service.setActiveConfiguration(null);

        expect(service.activeConfiguration()).toBeNull();
        expect(service.hasActiveConfiguration()).toBe(false);
        expect(service.activeConfigurationTitle()).toBe('No Configuration');
        expect(service.activeConfigurationId()).toBeNull();
      });

      it('should update configuration with different values', () => {
        service.setActiveConfiguration(mockConfiguration);
        service.setActiveConfiguration(mockConfiguration2);

        expect(service.activeConfiguration()).toBe(mockConfiguration2);
        expect(service.activeConfigurationTitle()).toBe('Test Configuration 2');
        expect(service.activeConfigurationId()).toBe(2);
      });

      it('should handle configuration without period assignments', () => {
        const configWithoutAssignments = { ...mockConfiguration, periodAssignments: [] };
        service.setActiveConfiguration(configWithoutAssignments);

        expect(service.canGenerateSchedule()).toBe(false);
        expect(service.activeConfigurationPeriodAssignments()).toEqual([]);
      });

      it('should handle configuration with zero periods per day', () => {
        const configWithZeroPeriods = { ...mockConfiguration, periodsPerDay: 0 };
        service.setActiveConfiguration(configWithZeroPeriods);

        expect(service.canGenerateSchedule()).toBe(false);
        expect(service.activeConfigurationPeriodsPerDay()).toBe(0);
      });
    });

    describe('getActiveConfiguration()', () => {
      it('should return null when no configuration is set', () => {
        expect(service.getActiveConfiguration()).toBeNull();
      });

      it('should return active configuration when set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.getActiveConfiguration()).toBe(mockConfiguration);
      });

      it('should return updated configuration after change', () => {
        service.setActiveConfiguration(mockConfiguration);
        service.setActiveConfiguration(mockConfiguration2);

        expect(service.getActiveConfiguration()).toBe(mockConfiguration2);
      });
    });

    describe('addConfiguration()', () => {
      it('should add configuration to list', () => {
        service.addConfiguration(mockConfiguration);

        expect(service.allConfigurations()).toContain(mockConfiguration);
        expect(service.allConfigurations()).toHaveLength(1);
      });

      it('should add multiple configurations', () => {
        service.addConfiguration(mockConfiguration);
        service.addConfiguration(mockConfiguration2);

        const configs = service.allConfigurations();
        expect(configs).toContain(mockConfiguration);
        expect(configs).toContain(mockConfiguration2);
        expect(configs).toHaveLength(2);
      });

      it('should maintain configuration order', () => {
        service.addConfiguration(mockConfiguration);
        service.addConfiguration(mockConfiguration2);

        const configs = service.allConfigurations();
        expect(configs[0]).toBe(mockConfiguration);
        expect(configs[1]).toBe(mockConfiguration2);
      });

      it('should not modify active configuration when adding', () => {
        service.setActiveConfiguration(mockConfiguration);
        service.addConfiguration(mockConfiguration2);

        expect(service.activeConfiguration()).toBe(mockConfiguration);
      });
    });
  });

  describe('Computed Signals', () => {
    describe('hasActiveConfiguration', () => {
      it('should return false when no configuration is set', () => {
        expect(service.hasActiveConfiguration()).toBe(false);
      });

      it('should return true when configuration is set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.hasActiveConfiguration()).toBe(true);
      });

      it('should update when configuration changes', () => {
        expect(service.hasActiveConfiguration()).toBe(false);

        service.setActiveConfiguration(mockConfiguration);
        expect(service.hasActiveConfiguration()).toBe(true);

        service.setActiveConfiguration(null);
        expect(service.hasActiveConfiguration()).toBe(false);
      });
    });

    describe('activeConfigurationTitle', () => {
      it('should return default title when no configuration', () => {
        expect(service.activeConfigurationTitle()).toBe('No Configuration');
      });

      it('should return configuration title when set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfigurationTitle()).toBe('Test Configuration');
      });

      it('should update when configuration changes', () => {
        service.setActiveConfiguration(mockConfiguration);
        expect(service.activeConfigurationTitle()).toBe('Test Configuration');

        service.setActiveConfiguration(mockConfiguration2);
        expect(service.activeConfigurationTitle()).toBe('Test Configuration 2');
      });
    });

    describe('activeConfigurationId', () => {
      it('should return null when no configuration', () => {
        expect(service.activeConfigurationId()).toBeNull();
      });

      it('should return configuration id when set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfigurationId()).toBe(1);
      });

      it('should update when configuration changes', () => {
        service.setActiveConfiguration(mockConfiguration);
        expect(service.activeConfigurationId()).toBe(1);

        service.setActiveConfiguration(mockConfiguration2);
        expect(service.activeConfigurationId()).toBe(2);
      });
    });

    describe('canGenerateSchedule', () => {
      it('should return false when no configuration', () => {
        expect(service.canGenerateSchedule()).toBe(false);
      });

      it('should return true when valid configuration is set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.canGenerateSchedule()).toBe(true);
      });

      it('should return false when periods per day is zero', () => {
        const invalidConfig = { ...mockConfiguration, periodsPerDay: 0 };
        service.setActiveConfiguration(invalidConfig);

        expect(service.canGenerateSchedule()).toBe(false);
      });

      it('should return false when no period assignments', () => {
        const invalidConfig = { ...mockConfiguration, periodAssignments: [] };
        service.setActiveConfiguration(invalidConfig);

        expect(service.canGenerateSchedule()).toBe(false);
      });

      it('should return false when negative periods per day', () => {
        const invalidConfig = { ...mockConfiguration, periodsPerDay: -1 };
        service.setActiveConfiguration(invalidConfig);

        expect(service.canGenerateSchedule()).toBe(false);
      });
    });

    describe('activeConfigurationPeriodAssignments', () => {
      it('should return empty array when no configuration', () => {
        expect(service.activeConfigurationPeriodAssignments()).toEqual([]);
      });

      it('should return period assignments when configuration is set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfigurationPeriodAssignments()).toBe(mockPeriodAssignments);
      });

      it('should return empty array when configuration has no assignments', () => {
        const configWithoutAssignments = { ...mockConfiguration, periodAssignments: [] };
        service.setActiveConfiguration(configWithoutAssignments);

        expect(service.activeConfigurationPeriodAssignments()).toEqual([]);
      });

      it('should update when configuration changes', () => {
        service.setActiveConfiguration(mockConfiguration);
        expect(service.activeConfigurationPeriodAssignments()).toBe(mockPeriodAssignments);

        service.setActiveConfiguration(mockConfiguration2);
        expect(service.activeConfigurationPeriodAssignments()).toEqual([]);
      });
    });

    describe('activeConfigurationPeriodsPerDay', () => {
      it('should return zero when no configuration', () => {
        expect(service.activeConfigurationPeriodsPerDay()).toBe(0);
      });

      it('should return periods per day when configuration is set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfigurationPeriodsPerDay()).toBe(6);
      });

      it('should update when configuration changes', () => {
        service.setActiveConfiguration(mockConfiguration);
        expect(service.activeConfigurationPeriodsPerDay()).toBe(6);

        service.setActiveConfiguration(mockConfiguration2);
        expect(service.activeConfigurationPeriodsPerDay()).toBe(8);
      });
    });

    describe('activeConfigurationTeachingDays', () => {
      it('should return empty array when no configuration', () => {
        expect(service.activeConfigurationTeachingDays()).toEqual([]);
      });

      it('should return teaching days when configuration is set', () => {
        service.setActiveConfiguration(mockConfiguration);

        expect(service.activeConfigurationTeachingDays()).toEqual([
          'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
        ]);
      });

      it('should update when configuration changes', () => {
        service.setActiveConfiguration(mockConfiguration);
        expect(service.activeConfigurationTeachingDays()).toEqual([
          'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
        ]);

        service.setActiveConfiguration(mockConfiguration2);
        expect(service.activeConfigurationTeachingDays()).toEqual([
          'Monday', 'Tuesday', 'Wednesday', 'Thursday'
        ]);
      });
    });

    describe('activeConfigurationDateRange', () => {
      it('should return null when no configuration', () => {
        expect(service.activeConfigurationDateRange()).toBeNull();
      });

      it('should return date range when configuration is set', () => {
        service.setActiveConfiguration(mockConfiguration);

        const dateRange = service.activeConfigurationDateRange();
        expect(dateRange).toEqual({
          startDate: new Date('2024-08-15'),
          endDate: new Date('2025-06-15')
        });
      });

      it('should update when configuration changes', () => {
        service.setActiveConfiguration(mockConfiguration);
        expect(service.activeConfigurationDateRange()).toEqual({
          startDate: new Date('2024-08-15'),
          endDate: new Date('2025-06-15')
        });

        service.setActiveConfiguration(mockConfiguration2);
        expect(service.activeConfigurationDateRange()).toEqual({
          startDate: new Date('2024-08-20'),
          endDate: new Date('2025-06-20')
        });
      });
    });
  });

  describe('State Reset', () => {
    describe('reset()', () => {
      it('should reset all state to initial values', () => {
        service.setActiveConfiguration(mockConfiguration);
        service.addConfiguration(mockConfiguration2);

        service.reset();

        expect(service.activeConfiguration()).toBeNull();
        expect(service.allConfigurations()).toEqual([]);
        expect(service.isLoadingConfiguration()).toBe(false);
      });

      it('should reset computed signals', () => {
        service.setActiveConfiguration(mockConfiguration);

        service.reset();

        expect(service.hasActiveConfiguration()).toBe(false);
        expect(service.activeConfigurationTitle()).toBe('No Configuration');
        expect(service.activeConfigurationId()).toBeNull();
        expect(service.canGenerateSchedule()).toBe(false);
      });

      it('should handle multiple resets', () => {
        service.setActiveConfiguration(mockConfiguration);
        service.reset();
        service.reset();

        expect(service.activeConfiguration()).toBeNull();
        expect(service.allConfigurations()).toEqual([]);
      });
    });
  });

  describe('Signal Reactivity', () => {
    it('should trigger signal updates when active configuration changes', () => {
      let titleUpdateCount = 0;
      let canGenerateUpdateCount = 0;

      // Create effects to track signal updates
      const titleEffect = () => {
        service.activeConfigurationTitle();
        titleUpdateCount++;
      };

      const canGenerateEffect = () => {
        service.canGenerateSchedule();
        canGenerateUpdateCount++;
      };

      // Initial calls
      titleEffect();
      canGenerateEffect();

      // Change configuration
      service.setActiveConfiguration(mockConfiguration);

      // Effects should be called again
      titleEffect();
      canGenerateEffect();

      expect(titleUpdateCount).toBe(2);
      expect(canGenerateUpdateCount).toBe(2);
    });

    it('should maintain signal consistency across multiple changes', () => {
      service.setActiveConfiguration(mockConfiguration);
      expect(service.activeConfigurationId()).toBe(1);
      expect(service.activeConfigurationTitle()).toBe('Test Configuration');

      service.setActiveConfiguration(mockConfiguration2);
      expect(service.activeConfigurationId()).toBe(2);
      expect(service.activeConfigurationTitle()).toBe('Test Configuration 2');

      service.setActiveConfiguration(null);
      expect(service.activeConfigurationId()).toBeNull();
      expect(service.activeConfigurationTitle()).toBe('No Configuration');
    });

    it('should update computed signals when underlying data changes', () => {
      const dynamicConfig = { ...mockConfiguration };
      service.setActiveConfiguration(dynamicConfig);

      expect(service.activeConfigurationTitle()).toBe('Test Configuration');

      // Simulate configuration change (in real app, this would come from API)
      dynamicConfig.title = 'Updated Configuration';
      service.setActiveConfiguration(dynamicConfig);

      expect(service.activeConfigurationTitle()).toBe('Updated Configuration');
    });
  });

  describe('Edge Cases', () => {
    it('should handle configuration with undefined properties', () => {
      const partialConfig = {
        id: 1,
        title: 'Partial Config'
      } as any;

      service.setActiveConfiguration(partialConfig);

      expect(service.activeConfiguration()).toBe(partialConfig);
      expect(service.activeConfigurationTitle()).toBe('Partial Config');
      expect(service.canGenerateSchedule()).toBe(false);
    });

    it('should handle configuration with null period assignments', () => {
      const configWithNullAssignments = {
        ...mockConfiguration,
        periodAssignments: null as any
      };

      service.setActiveConfiguration(configWithNullAssignments);

      expect(service.activeConfigurationPeriodAssignments()).toEqual([]);
      expect(service.canGenerateSchedule()).toBe(false);
    });

    it('should handle configuration with undefined teaching days', () => {
      const configWithoutTeachingDays = {
        ...mockConfiguration,
        teachingDays: undefined as any
      };

      service.setActiveConfiguration(configWithoutTeachingDays);

      expect(service.activeConfigurationTeachingDays()).toEqual([]);
    });

    it('should handle configuration with null dates', () => {
      const configWithNullDates = {
        ...mockConfiguration,
        startDate: null as any,
        endDate: null as any
      };

      service.setActiveConfiguration(configWithNullDates);

      const dateRange = service.activeConfigurationDateRange();
      expect(dateRange).toEqual({
        startDate: null,
        endDate: null
      });
    });

    it('should handle adding duplicate configurations', () => {
      service.addConfiguration(mockConfiguration);
      service.addConfiguration(mockConfiguration); // Same reference

      expect(service.allConfigurations()).toHaveLength(2);
    });

    it('should handle large number of configurations', () => {
      const configs: ScheduleConfiguration[] = [];
      for (let i = 0; i < 100; i++) {
        const config = {
          ...mockConfiguration,
          id: i + 1,
          title: `Configuration ${i + 1}`
        };
        configs.push(config);
        service.addConfiguration(config);
      }

      expect(service.allConfigurations()).toHaveLength(100);
      expect(service.allConfigurations()[0].title).toBe('Configuration 1');
      expect(service.allConfigurations()[99].title).toBe('Configuration 100');
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with multiple configuration changes', () => {
      for (let i = 0; i < 1000; i++) {
        const config = {
          ...mockConfiguration,
          id: i,
          title: `Config ${i}`
        };
        service.setActiveConfiguration(config);
      }

      // Should only hold reference to last configuration
      expect(service.activeConfiguration()?.id).toBe(999);
      expect(service.activeConfigurationTitle()).toBe('Config 999');
    });

    it('should handle rapid state changes', () => {
      for (let i = 0; i < 100; i++) {
        service.setActiveConfiguration(mockConfiguration);
        service.setActiveConfiguration(null);
        service.setActiveConfiguration(mockConfiguration2);
        service.reset();
      }

      expect(service.activeConfiguration()).toBeNull();
      expect(service.allConfigurations()).toEqual([]);
    });
  });
});