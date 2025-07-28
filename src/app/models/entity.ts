// **COMPLETE FILE** - models/entity.ts - Pure domain entity (Tree UI pollution removed)
// RESPONSIBILITY: Base class for all domain entities - pure business concerns only
// DOES NOT: Contain tree UI properties, tree state, or UI formatting concerns
// CALLED BY: Domain models and business services only

export type EntityType = 'Course' | 'Topic' | 'SubTopic' | 'Lesson';

/**
 * Base class for all domain entities
 * Pure domain concerns - NO UI pollution
 */
export abstract class Entity {
  id: number;
  title: string;
  description?: string;
  sortOrder: number;
  visibility: string;
  archived: boolean;
  userId: number;
  abstract readonly entityType: EntityType;

  constructor(data: Partial<Entity>) {
    this.id = data.id || 0;
    this.title = data.title || '';
    this.description = data.description;
    this.sortOrder = data.sortOrder || 0;
    this.visibility = data.visibility || 'Public';
    this.archived = data.archived || false;
    this.userId = data.userId || 0;
  }

  /**
   * Check if entity has child entities (override in subclasses)
   */
  abstract get hasChildren(): boolean;

  /**
   * Get display name for business logic (not UI formatting)
   */
  get displayName(): string {
    return this.title || `Untitled ${this.entityType}`;
  }

  /**
   * Check if entity is valid (has required fields)
   */
  get isValid(): boolean {
    return !!(this.title && this.id > 0);
  }

  /**
   * Get entity as plain object (for serialization)
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      sortOrder: this.sortOrder,
      visibility: this.visibility,
      archived: this.archived,
      userId: this.userId,
      entityType: this.entityType
    };
  }

  /**
   * Create a shallow clone of the entity
   * Subclasses should override for deep cloning of collections
   */
  clone(): this {
    // Use the constructor of the actual class (Course, Topic, etc.)
    const constructor = this.constructor as new (data: any) => this;
    return new constructor(this.toJSON());
  }
}
