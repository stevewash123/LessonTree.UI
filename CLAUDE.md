# LessonTree UI (Angular)

## Repository Context
- **This is the UI repository** - separate from API
- **GitHub**: https://github.com/stevewash123/LessonTree.UI.git
- **Working Directory**: `C:/Users/steve/LessonTree/LessonTree_UI/`
- **Framework**: Angular with Angular Material + SyncFusion components
- **TypeScript**: Strict null checks enabled - handle null/undefined explicitly

## Quick Commands
```bash
npm start                      # Start UI (port 4200)
npm run build                  # Build for production

# Cypress Testing
npm run test:master           # Run master test suite
npm run test:auth            # Run authentication tests
npm run test:navigation      # Run navigation tests
npm run test:crud            # Run CRUD tests
npm run test:dragdrop        # Run drag-drop tests

npm run cypress:open         # Open Cypress Test Runner
```

## Key Components
- **Home Component**: Main layout with menu auto-close
- **Course List**: SyncFusion TreeView with drag-drop
- **Auth Service**: JWT authentication with localStorage
- **Tree Components**: Expandable course/topic/lesson hierarchy

## Cypress Test Structure
```
cypress/e2e/
├── 00-master-suite.cy.ts     (Sequential execution of all tests)
├── 01-authentication.cy.ts   (Login/logout tests)
├── 02-course-navigation.cy.ts (Menu, tree expansion tests)
├── 03-course-crud.cy.ts      (Entity selection, InfoPanel tests)
└── 04-drag-drop.cy.ts        (Drag-drop functionality tests)
```

## Custom Commands (Reusable Code)
- `cy.robustLogin()` - Login with backdrop handling
- `cy.expandTreeNodes()` - Expand SyncFusion trees
- `cy.setupDragDropTest()` - Complete test environment setup
- `cy.reseedDatabase()` - Reset database via API

## Testing Philosophy
**CRITICAL**: Always use reusable custom commands instead of duplicating test logic.
- Write once in `cypress/support/commands.ts`
- Use everywhere with `cy.commandName()`
- Maintain consistency across all test files