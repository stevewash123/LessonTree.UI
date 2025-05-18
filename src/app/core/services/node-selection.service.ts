import { Injectable, signal, computed } from '@angular/core';
import { TreeData } from '../../models/tree-node'; // Fixed import path

// Define selection source types
export type SelectionSource = 'tree' | 'calendar' | 'service' | 'panel' | 'code';

@Injectable({
  providedIn: 'root'
})
export class NodeSelectionService {
  // Main selection signal with source tracking
  private selectionState = signal<{
    node: TreeData | null;
    source: SelectionSource;
  }>({
    node: null,
    source: 'service'
  });
  
  // Computed signals for easy consumption
  readonly selectedNode = computed(() => this.selectionState().node);
  readonly selectionSource = computed(() => this.selectionState().source);
  
  constructor() {}
  
  // Method to select a node with source tracking
  selectNode(node: TreeData | null, source: SelectionSource): void {
    console.log(`[NodeSelectionService] Node selected by ${source}:`, {
      nodeId: node?.nodeId || 'none',
      nodeType: node?.nodeType || 'none',
      timestamp: new Date().toISOString()
    });
    
    // Log the previous state for comparison
    const prevNode = this.selectedNode();
    console.log(`[NodeSelectionService] Previous node:`, {
      nodeId: prevNode?.nodeId || 'none',
      nodeType: prevNode?.nodeType || 'none'
    });
    
    this.selectionState.set({ node, source });
    
    // Verify the state was updated
    console.log(`[NodeSelectionService] State updated, current node:`, {
      nodeId: this.selectedNode()?.nodeId || 'none',
      nodeType: this.selectedNode()?.nodeType || 'none'
    });
  }
  
  // Clear the selection
  clearSelection(source: SelectionSource = 'service'): void {
    console.log(`[NodeSelectionService] Selection cleared by ${source}`, { timestamp: new Date().toISOString() });
    this.selectionState.set({ node: null, source });
  }
  
  // Check if the selection came from a specific source
  isSelectedFrom(source: SelectionSource): boolean {
    return this.selectionSource() === source;
  }
  
  // Get the current node ID, convenience method
  getSelectedNodeId(): string | undefined {
    return this.selectedNode()?.nodeId;
  }
}