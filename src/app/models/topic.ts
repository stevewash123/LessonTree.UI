import { Lesson } from "./lesson";
import { createSubTopicNode, SubTopic } from "./subTopic";
import { TreeNode } from "./tree-node";

export interface Topic {
    id: number;
    nodeId: string;
    title: string;
    description: string;
    courseId: number;
    hasSubTopics: boolean;
    hasChildren: boolean;
    subTopics?: SubTopic[];
    lessons?: Lesson[];
  }
  
  export function createTopicNode(topic: Topic): TreeNode {
    return {
      id: topic.nodeId,
      text: topic.title,
      nodeType: 'Topic',
      hasChildren: topic.hasChildren,
      //child: topic.subTopics.map(subTopic => createSubTopicNode(subTopic)),
      original: topic,
      iconCss: 'material-icons topic-icon' // 'school' icon
    };
  }
