import { Entity, EntityType } from "./entity";
import { Lesson } from "./lesson";
import { SubTopic } from "./subTopic";

export class Topic extends Entity {
    readonly entityType: EntityType = 'Topic';
    courseId: number;
    subTopics?: SubTopic[];           // Domain relationships
    lessons?: Lesson[];               // Direct lessons (no SubTopic)

    constructor(data: Partial<Topic>) {
      super(data);
      this.courseId = data.courseId || 0;
      this.subTopics = data.subTopics;
      this.lessons = data.lessons;
    }

    /**
     * Domain logic: Topic has children if it has subtopics or direct lessons
     */
    get hasChildren(): boolean {
      return (this.subTopics?.length ?? 0) > 0 || (this.lessons?.length ?? 0) > 0;
    }

    /**
     * Domain logic: Get all lessons (direct + from subtopics)
     */
    getAllLessons(): Lesson[] {
      const directLessons = this.lessons || [];
      const subTopicLessons = this.subTopics?.flatMap(st => st.lessons || []) || [];
      return [...directLessons, ...subTopicLessons];
    }

    /**
     * Domain logic: Count total lessons in topic
     */
    get totalLessons(): number {
      return this.getAllLessons().length;
    }


    /**
     * Clone method to handle Topic-specific properties
     */
    override clone(): this {
      return new Topic({
        ...this.toJSON(),
        courseId: this.courseId,
        subTopics: this.subTopics,    // Shallow reference
        lessons: this.lessons         // Shallow reference
      }) as this;
    }

    /**
     * Override toJSON to include Topic-specific properties
     */
    override toJSON(): Record<string, any> {
      return {
        ...super.toJSON(),
        courseId: this.courseId,
        subTopics: this.subTopics,
        lessons: this.lessons
      };
    }
  }


/**
 * Simplified Topic move resource - cross-course moves deferred
 * Matches API DTO structure after EntityPositioningService refactor
 */
export interface TopicMoveResource {
  topicId: number;
  newCourseId: number;                        // ✅ MATCH API: Required course target
  relativeToId?: number | null;               // ✅ MATCH API: Optional positioning
  position?: 'before' | 'after' | null;      // ✅ MATCH API: Optional positioning
  relativeToType?: 'Topic' | null;            // ✅ MATCH API: Optional positioning
}
