// **COMPLETE FILE** - models/lesson.ts - Pure domain entity, no tree concerns

import { Entity, EntityType } from "./entity";
import { Attachment } from './attachment';
import { Note } from './note';
import { Standard } from './standard';

/**
 * Lesson domain entity - pure business logic, no UI concerns
 */
export class Lesson extends Entity {
    readonly entityType: EntityType = 'Lesson';
    courseId: number;
    subTopicId?: number;              // Flexible placement: SubTopic OR Topic
    topicId?: number;                 // Flexible placement: Topic OR SubTopic
    objective: string;

    constructor(data: Partial<Lesson>) {
      super(data);
      this.courseId = data.courseId || 0;
      this.subTopicId = data.subTopicId;
      this.topicId = data.topicId;
      this.objective = data.objective || '';
      // Note: Entity.description unused for Lessons - Lessons use objective instead
    }

    /**
     * Domain logic: Lessons don't have children
     */
    get hasChildren(): boolean {
      return false;
    }

    /**
     * Domain logic: Get parent type
     */
    get parentType(): 'Topic' | 'SubTopic' | null {
      if (this.subTopicId) return 'SubTopic';
      if (this.topicId) return 'Topic';
      return null;
    }

    /**
     * Domain logic: Get parent ID
     */
    get parentId(): number | null {
      return this.subTopicId || this.topicId || null;
    }

    /**
     * Domain logic: Validate lesson placement
     */
    get isValidPlacement(): boolean {
      // Must have exactly one parent (SubTopic XOR Topic)
      // ✅ FIXED: Explicit boolean conversion to handle undefined
      return Boolean(
        (this.subTopicId && !this.topicId) || (!this.subTopicId && this.topicId)
      );
    }

    /**
     * Domain logic: Check if lesson is complete
     */
    get isComplete(): boolean {
      return !!(this.title && this.objective && this.isValidPlacement);
    }

  /**
   * Override clone to handle Lesson-specific properties
   */
  clone(): Lesson {
    return new Lesson({
      ...this.toJSON(),
      courseId: this.courseId,
      subTopicId: this.subTopicId,
      topicId: this.topicId,
      objective: this.objective
    });
  }

  /**
   * Override toJSON to include Lesson-specific properties
   */
  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      courseId: this.courseId,
      subTopicId: this.subTopicId,
      topicId: this.topicId,
      objective: this.objective
    };
  }

}

  /**
   * Extended lesson with detailed properties and relationships - for detailed views
   */
  export class LessonDetail extends Lesson {
    level?: string;
    materials?: string;
    classTime?: string;
    methods?: string;
    specialNeeds?: string;
    assessment?: string;
    standards: Standard[];
    attachments: Attachment[];
    notes: Note[];

    constructor(data: Partial<LessonDetail>) {
      super(data);
      this.level = data.level;
      this.materials = data.materials;
      this.classTime = data.classTime;
      this.methods = data.methods;
      this.specialNeeds = data.specialNeeds;
      this.assessment = data.assessment;
      this.standards = data.standards || [];
      this.attachments = data.attachments || [];
      this.notes = data.notes || [];
    }

    /**
     * Check if lesson has detailed content filled out
     */
    get hasDetailedContent(): boolean {
      return !!(this.level || this.materials || this.methods || this.assessment);
    }

    /**
     * Get completion percentage for lesson details
     */
    get completionPercentage(): number {
      const fields = [this.level, this.materials, this.classTime, this.methods, this.specialNeeds, this.assessment];
      const completed = fields.filter(field => field && field.trim()).length;
      return Math.round((completed / fields.length) * 100);
    }

    /**
     * Override clone to handle LessonDetail-specific properties
     */
    override clone(): LessonDetail {
      return new LessonDetail({
        ...this.toJSON(),
        level: this.level,
        materials: this.materials,
        classTime: this.classTime,
        methods: this.methods,
        specialNeeds: this.specialNeeds,
        assessment: this.assessment,
        standards: this.standards,     // Shallow reference
        attachments: this.attachments, // Shallow reference
        notes: this.notes             // Shallow reference
      });
    }

    /**
     * Override toJSON to include LessonDetail-specific properties
     */
    override toJSON(): Record<string, any> {
      return {
        ...super.toJSON(),
        level: this.level,
        materials: this.materials,
        classTime: this.classTime,
        methods: this.methods,
        specialNeeds: this.specialNeeds,
        assessment: this.assessment,
        standards: this.standards,
        attachments: this.attachments,
        notes: this.notes
      };
    }
  }

  /**
   * Lesson creation payload - for API operations
   */
  export interface LessonCreatePayload {
    title: string;
    subTopicId?: number | null;
    topicId?: number | null;
    visibility: string;
    level?: string | null;
    objective: string;
    materials?: string | null;
    classTime?: string | null;
    methods?: string | null;
    specialNeeds?: string | null;
    assessment?: string | null;
    sortOrder: number;
  }
