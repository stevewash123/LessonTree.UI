import { createLessonNode, Lesson } from "./lesson";
import { TreeData, TreeNode} from "./tree-node";

export interface SubTopic extends TreeData {
    topicId: number;
    courseId: number;
    lessons: Lesson[];
    entityType: 'SubTopic';
  }

export function createSubTopicNode(subTopic: SubTopic): TreeNode {
    return {
        id: subTopic.nodeId,
        text: subTopic.title,
        nodeType: 'SubTopic',
        hasChildren: subTopic.hasChildren,
        original: subTopic,
        iconCss: 'material-icons subtopic-icon' // 'book' icon
    };
}