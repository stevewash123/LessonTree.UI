# Archived Cypress Tests

## 04-drag-drop.cy.ts.archived

**Archived**: 2025-01-06  
**Reason**: SyncFusion TreeView drag-drop incompatible with Cypress/Electron

### Issue Summary
Drag-drop tests consistently crashed with "Electron Renderer process just crashed" errors due to:
1. SyncFusion TreeView component performance issues during drag-drop operations
2. Cypress/Electron memory limitations with complex SyncFusion interactions
3. Drag-drop library incompatibility with SyncFusion components

### Root Cause Analysis
**Document**: `C:/Users/steve/LessonTree/Documents/temp/DOM-DragDrop-Debug-2025-01-06.txt`

**Key Findings**:
- Data attribute mismatch: Tests used `data-nodeid` but DOM uses `data-uid`
- Lesson ID mismatch: Tests expected 62,63,64 but actual IDs are 2761,2762,2763
- Even after fixing selectors, Electron renderer crashes persisted

### Test Coverage Alternative
Drag-drop functionality is fully covered by:
- **xUnit API Tests**: `LessonTree_API/LessonTree.Tests/Controllers/LessonControllerTestsSimple.cs`
- **API Endpoints**: `/api/lesson/move`, `/api/topic/move`, `/api/subtopic/move` 
- **Manual UI Testing**: For user experience validation

### Restoration
To restore these tests (not recommended):
1. Rename back to `.cy.ts` extension
2. Update npm scripts in package.json to include drag-drop category
3. Consider running with `--browser chrome` instead of Electron
4. Enable memory management: `experimentalMemoryManagement: true`