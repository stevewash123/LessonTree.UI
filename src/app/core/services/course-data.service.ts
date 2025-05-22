// src/app/core/services/course-data.service.ts - Phase 2: Pure Data Store
import { Injectable, signal } from '@angular/core';
import { Course } from '../../models/course';
import { TreeData } from '../../models/tree-node';
import { Topic } from '../../models/topic';
import { SubTopic } from '../../models/subTopic';
import { Lesson, LessonDetail } from '../../models/lesson';

@Injectable({
  providedIn: 'root'
})
export class CourseDataService {
  private courses: Course[] = [];
  
  // Signals for node state changes
  readonly nodeAdded = signal<TreeData | null>(null);
  readonly nodeEdited = signal<TreeData | null>(null);
  readonly nodeDeleted = signal<TreeData | null>(null);
  readonly nodeMoved = signal<{node: TreeData, source: string, target: string} | null>(null);

  constructor() {
    console.log('[CourseDataService] Service initialized', { timestamp: new Date().toISOString() });
    // NOTE: No longer loads courses here - CourseCrudService handles that
  }

  // === SIGNAL EMISSION METHODS ===
  emitNodeAdded(node: TreeData): void {
    this.nodeAdded.set(node);
  }

  emitNodeEdited(node: TreeData): void {
    this.nodeEdited.set(node);
  }

  emitNodeDeleted(node: TreeData): void {
    this.nodeDeleted.set(node);
  }

  emitNodeMoved(event: {node: TreeData, source: string, target: string}): void {
    this.nodeMoved.set(event);
  }

  // === DATA ACCESS METHODS ===
  getCourses(): Course[] {
    return [...this.courses];
  }

  getCourseById(id: number): Course | null {
    return this.courses.find(course => course.id === id) ?? null;
  }

  getTopicById(topicId: number): Topic | null {
    for (const course of this.courses) {
      if (course.topics) {
        const topic = course.topics.find(t => t.id === topicId);
        if (topic) return topic;
      }
    }
    return null;
  }

  getSubTopicById(subTopicId: number): SubTopic | null {
    for (const course of this.courses) {
      if (course.topics) {
        for (const topic of course.topics) {
          if (topic.subTopics) {
            const subTopic = topic.subTopics.find(st => st.id === subTopicId);
            if (subTopic) return subTopic;
          }
        }
      }
    }
    return null;
  }

  getLessonById(lessonId: number): Lesson | null {
    for (const course of this.courses) {
      if (course.topics) {
        for (const topic of course.topics) {
          // Check lessons under topic
          if (topic.lessons) {
            const lesson = topic.lessons.find(l => l.id === lessonId);
            if (lesson) return lesson;
          }
          // Check lessons under subtopics
          if (topic.subTopics) {
            for (const subTopic of topic.subTopics) {
              if (subTopic.lessons) {
                const lesson = subTopic.lessons.find(l => l.id === lessonId);
                if (lesson) return lesson;
              }
            }
          }
        }
      }
    }
    return null;
  }

  // === DATA MUTATION METHODS ===
  setCourses(courses: Course[]): void {
    this.courses = courses;
    console.log('[CourseDataService] Courses set:', courses.length, { timestamp: new Date().toISOString() });
  }

  addCourse(course: Course): void {
    this.courses.push(course);
    console.log('[CourseDataService] Course added:', course.title, { timestamp: new Date().toISOString() });
  }

  updateCourse(updatedCourse: Course): void {
    const index = this.courses.findIndex(c => c.id === updatedCourse.id);
    if (index !== -1) {
      this.courses[index] = updatedCourse;
      console.log('[CourseDataService] Course updated:', updatedCourse.title, { timestamp: new Date().toISOString() });
    }
  }

  removeCourse(courseId: number): void {
    const index = this.courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
      const deletedCourse = this.courses[index];
      this.courses.splice(index, 1);
      console.log('[CourseDataService] Course removed:', deletedCourse.title, { timestamp: new Date().toISOString() });
    }
  }

  addTopicToCourse(topic: Topic): void {
    const course = this.courses.find(c => c.id === topic.courseId);
    if (course) {
      if (!course.topics) course.topics = [];
      course.topics.push(topic);
      console.log('[CourseDataService] Topic added to course:', topic.title, { timestamp: new Date().toISOString() });
    }
  }

  updateTopicInCourse(updatedTopic: Topic): void {
    const course = this.courses.find(c => c.id === updatedTopic.courseId);
    if (course && course.topics) {
      const index = course.topics.findIndex(t => t.id === updatedTopic.id);
      if (index !== -1) {
        course.topics[index] = updatedTopic;
        console.log('[CourseDataService] Topic updated in course:', updatedTopic.title, { timestamp: new Date().toISOString() });
      }
    }
  }

  removeTopicFromCourse(topicId: number): void {
    for (const course of this.courses) {
      if (course.topics) {
        const index = course.topics.findIndex(t => t.id === topicId);
        if (index !== -1) {
          const deletedTopic = course.topics[index];
          course.topics.splice(index, 1);
          console.log('[CourseDataService] Topic removed from course:', deletedTopic.title, { timestamp: new Date().toISOString() });
          return;
        }
      }
    }
  }

  addSubTopicToTopic(subTopic: SubTopic): void {
    const topic = this.getTopicById(subTopic.topicId);
    if (topic) {
      if (!topic.subTopics) topic.subTopics = [];
      topic.subTopics.push(subTopic);
      console.log('[CourseDataService] SubTopic added to topic:', subTopic.title, { timestamp: new Date().toISOString() });
    }
  }

  updateSubTopicInTopic(updatedSubTopic: SubTopic): void {
    const topic = this.getTopicById(updatedSubTopic.topicId);
    if (topic && topic.subTopics) {
      const index = topic.subTopics.findIndex(st => st.id === updatedSubTopic.id);
      if (index !== -1) {
        topic.subTopics[index] = updatedSubTopic;
        console.log('[CourseDataService] SubTopic updated in topic:', updatedSubTopic.title, { timestamp: new Date().toISOString() });
      }
    }
  }

  removeSubTopicFromTopic(subTopicId: number): void {
    for (const course of this.courses) {
      if (course.topics) {
        for (const topic of course.topics) {
          if (topic.subTopics) {
            const index = topic.subTopics.findIndex(st => st.id === subTopicId);
            if (index !== -1) {
              const deletedSubTopic = topic.subTopics[index];
              topic.subTopics.splice(index, 1);
              console.log('[CourseDataService] SubTopic removed from topic:', deletedSubTopic.title, { timestamp: new Date().toISOString() });
              return;
            }
          }
        }
      }
    }
  }

  addLessonToParent(lesson: LessonDetail): void {
    if (lesson.subTopicId) {
      const subTopic = this.getSubTopicById(lesson.subTopicId);
      if (subTopic) {
        if (!subTopic.lessons) subTopic.lessons = [];
        subTopic.lessons.push(lesson);
        console.log('[CourseDataService] Lesson added to subtopic:', lesson.title, { timestamp: new Date().toISOString() });
      }
    } else if (lesson.topicId) {
      const topic = this.getTopicById(lesson.topicId);
      if (topic) {
        if (!topic.lessons) topic.lessons = [];
        topic.lessons.push(lesson);
        console.log('[CourseDataService] Lesson added to topic:', lesson.title, { timestamp: new Date().toISOString() });
      }
    }
  }

  updateLessonInParent(updatedLesson: LessonDetail): void {
    if (updatedLesson.subTopicId) {
      const subTopic = this.getSubTopicById(updatedLesson.subTopicId);
      if (subTopic && subTopic.lessons) {
        const index = subTopic.lessons.findIndex(l => l.id === updatedLesson.id);
        if (index !== -1) {
          subTopic.lessons[index] = updatedLesson;
          console.log('[CourseDataService] Lesson updated in subtopic:', updatedLesson.title, { timestamp: new Date().toISOString() });
        }
      }
    } else if (updatedLesson.topicId) {
      const topic = this.getTopicById(updatedLesson.topicId);
      if (topic && topic.lessons) {
        const index = topic.lessons.findIndex(l => l.id === updatedLesson.id);
        if (index !== -1) {
          topic.lessons[index] = updatedLesson;
          console.log('[CourseDataService] Lesson updated in topic:', updatedLesson.title, { timestamp: new Date().toISOString() });
        }
      }
    }
  }

  removeLessonFromParent(lessonId: number): void {
    for (const course of this.courses) {
      if (course.topics) {
        for (const topic of course.topics) {
          // Check lessons under topic
          if (topic.lessons) {
            const index = topic.lessons.findIndex(l => l.id === lessonId);
            if (index !== -1) {
              const deletedLesson = topic.lessons[index];
              topic.lessons.splice(index, 1);
              console.log('[CourseDataService] Lesson removed from topic:', deletedLesson.title, { timestamp: new Date().toISOString() });
              return;
            }
          }
          // Check lessons under subtopics
          if (topic.subTopics) {
            for (const subTopic of topic.subTopics) {
              if (subTopic.lessons) {
                const index = subTopic.lessons.findIndex(l => l.id === lessonId);
                if (index !== -1) {
                  const deletedLesson = subTopic.lessons[index];
                  subTopic.lessons.splice(index, 1);
                  console.log('[CourseDataService] Lesson removed from subtopic:', deletedLesson.title, { timestamp: new Date().toISOString() });
                  return;
                }
              }
            }
          }
        }
      }
    }
  }
}