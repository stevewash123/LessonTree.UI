import { Lesson } from "../../models/lesson";
import { SubTopic } from "../../models/subTopic";
import { Topic } from "../../models/topic";

export interface TreeNode {
    id: string;
    type?: 'Topic' | 'SubTopic' | 'Lesson';
    text: string;
    expanded?: boolean;
    child?: TreeNode[];
    original?: Topic | SubTopic | Lesson;
    iconCss?: string; // Add for Syncfusion icon support
  }