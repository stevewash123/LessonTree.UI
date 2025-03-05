import { TreeNode } from "../course/tree/tree-node.interface";
import { Topic } from "./topic";


export interface Course {
  id: number;
  nodeId: string;
  title: string;
  description: string;
  topics: Topic[];
}
