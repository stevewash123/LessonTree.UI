export interface TreeNode {  
  id: string;
  type?: string;
  text: string;
  expanded?: boolean;
  child?: TreeNode[];
}