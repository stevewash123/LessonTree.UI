// **COMPLETE FILE** - models/course.ts - Pure domain entity, no tree concerns

import { Entity, EntityType } from './entity';
import { Topic } from './topic';
import { Standard } from './standard';

/**
 * Course domain entity - pure business logic, no UI concerns
 */
export class Course extends Entity {
  readonly entityType: EntityType = 'Course';
  topics?: Topic[];                    // Domain relationships
  standards?: Standard[];              // Domain relationships

  constructor(data: Partial<Course>) {
    super(data);
    this.topics = data.topics;
    this.standards = data.standards;
  }

  /**
   * Domain logic: Course has children if it has topics
   */
  get hasChildren(): boolean {
    return (this.topics?.length ?? 0) > 0;
  }

  /**
   * Domain logic: Get all lessons across all topics
   */
  getAllLessons(): any[] {
    if (!this.topics) return [];

    return this.topics.flatMap(topic => {
      const directLessons = topic.lessons || [];
      const subTopicLessons = topic.subTopics?.flatMap(st => st.lessons || []) || [];
      return [...directLessons, ...subTopicLessons];
    });
  }

  /**
   * Domain logic: Count total lessons in course
   */
  get totalLessons(): number {
    return this.getAllLessons().length;
  }

  /**
   * Domain logic: Check if course is empty
   */
  get isEmpty(): boolean {
    return this.totalLessons === 0;
  }

  /**
   * Override clone to handle Course-specific collections
   */
  clone(): Course {
    return new Course({
      ...this.toJSON(),
      topics: this.topics,      // Shallow reference for editing scenarios
      standards: this.standards // Shallow reference for editing scenarios
    });
  }

  /**
   * Override toJSON to include Course-specific properties
   */
  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      topics: this.topics,
      standards: this.standards
    };
  }
}
