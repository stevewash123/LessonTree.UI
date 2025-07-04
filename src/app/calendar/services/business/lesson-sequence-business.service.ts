// **FACADE SERVICE** - LessonSequenceBusinessService - Delegates to Split Services
// RESPONSIBILITY: Temporary facade to maintain backward compatibility during migration
// SCOPE: Delegates all operations to analysis, generation, and utility services as appropriate
// RATIONALE: Safe migration path - WILL BE UPDATED after coordination service imports updated

import { Injectable } from '@angular/core';
import { LessonSequenceAnalysisService, SequenceAnalysisResult, ContinuationPoint } from './lesson-sequence-analysis.service';
import { LessonSequenceGenerationService, SequenceContinuationResult } from './lesson-sequence-generation.service';
import { LessonSequenceUtilityService } from './lesson-sequence-utility.service';

// Re-export types for backward compatibility
export type {
  ContinuationPoint,
  SequenceAnalysisResult
} from './lesson-sequence-analysis.service';

export type {
  SequenceContinuationResult
} from './lesson-sequence-generation.service';

@Injectable({
  providedIn: 'root'
})
export class LessonSequenceBusinessService {

  constructor(
    private analysisService: LessonSequenceAnalysisService,
    private generationService: LessonSequenceGenerationService,
    private utilityService: LessonSequenceUtilityService
  ) {
    console.log('[LessonSequenceBusinessService] FACADE PATTERN - Delegating to split services');
    console.log('[LessonSequenceBusinessService] Analysis Service:', !!this.analysisService);
    console.log('[LessonSequenceBusinessService] Generation Service:', !!this.generationService);
    console.log('[LessonSequenceBusinessService] Utility Service:', !!this.utilityService);
  }

  // === ANALYSIS OPERATIONS - Delegate to Analysis Service ===

  analyzeSequenceState(afterDate: Date): SequenceAnalysisResult {
    console.log('[LessonSequenceBusinessService] FACADE: Delegating analyzeSequenceState to analysis service');
    return this.analysisService.analyzeSequenceState(afterDate);
  }

  // === GENERATION OPERATIONS - Delegate to Generation Service ===

  continueSequences(afterDate: Date): SequenceContinuationResult {
    console.log('[LessonSequenceBusinessService] FACADE: Delegating continueSequences to generation service');
    return this.generationService.continueSequences(afterDate);
  }

  // === DEBUG INFORMATION ===

  getDebugInfo(): any {
    return {
      facade: {
        pattern: 'delegation-facade',
        splitServices: {
          analysis: this.analysisService.getDebugInfo(),
          generation: this.generationService.getDebugInfo(),
          utility: this.utilityService.getDebugInfo()
        },
        temporaryStatus: 'Will be updated after coordination service migration'
      }
    };
  }
}
