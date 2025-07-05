import { Entity, EntityType } from "./entity";
import { Lesson } from "./lesson";


export class SubTopic extends Entity {
    readonly entityType: EntityType = 'SubTopic';
    topicId: number;
    courseId: number;
    lessons?: Lesson[];               // Domain relationships

    constructor(data: Partial<SubTopic>) {
      super(data);
      this.topicId = data.topicId || 0;
      this.courseId = data.courseId || 0;
      this.lessons = data.lessons;
    }

    /**
     * Domain logic: SubTopic has children if it has lessons
     */
    get hasChildren(): boolean {
      return (this.lessons?.length ?? 0) > 0;
    }

    /**
     * Domain logic: Count lessons in subtopic
     */
    get totalLessons(): number {
      return this.lessons?.length ?? 0;
    }

    /**
     * Domain logic: Check if subtopic is empty
     */
    get isEmpty(): boolean {
      return this.totalLessons === 0;
    }

  /**
   * Clone method to handle SubTopic-specific properties
   */
  clone(): SubTopic {
    return new SubTopic({
      ...this.toJSON(),
      topicId: this.topicId,
      courseId: this.courseId,
      lessons: this.lessons         // Shallow reference
    });
  }

  /**
   * Override toJSON to include SubTopic-specific properties
   */
  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      topicId: this.topicId,
      courseId: this.courseId,
      lessons: this.lessons
    };
  }
  }
