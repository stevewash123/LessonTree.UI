# LessonTree Cypress Test Suite

## 📁 Test Organization

The Cypress tests are organized into logical categories with numbered prefixes for clear execution order:

### Test Categories

| Category | File | Description |
|----------|------|-------------|
| **Authentication** | `01-authentication.cy.ts` | Login, logout, authentication state |
| **Navigation** | `02-course-navigation.cy.ts` | Course expansion, tree navigation |
| **Course CRUD** | `03-course-crud.cy.ts` | Course/Topic/SubTopic selection and InfoPanel verification |
| **Drag & Drop** | `04-drag-drop.cy.ts` | Lesson/SubTopic drag-drop functionality |
| **Legacy** | `drag-drop-suite.cy.ts`, `subtopic-drag-drop.cy.ts` | Original implementations |

## 🚀 Running Tests

### Individual Test Categories

```bash
# Authentication tests
npm run test:auth
npm run test:auth:headless

# Course navigation tests  
npm run test:navigation
npm run test:navigation:headless

# Course CRUD tests
npm run test:crud
npm run test:crud:headless

# Drag and drop tests
npm run test:dragdrop
npm run test:dragdrop:headless

# Legacy tests (original implementations)
npm run test:legacy
npm run test:legacy:headless

# All tests
npm run test:all
npm run test:all:headless
```

### Interactive Test Runner

```bash
# Open Cypress Test Runner UI
npm run cypress:open

# Or use the custom runner
node cypress/scripts/run-tests.js all --open
```

### Direct Commands

```bash
# Run specific test file
npx cypress run --spec "cypress/e2e/01-authentication.cy.ts"

# Run with custom runner and see options
npm run test:help
```

## 🧪 Test Descriptions

### 01-authentication.cy.ts
- **Login Flow**: Valid credentials, token verification, navigation
- **Authentication State**: Redirect when not authenticated, session persistence

### 02-course-navigation.cy.ts  
- **Basic Course Expansion**: Expand/collapse course trees
- **Sequential Deep Expansion**: Course → Topic → SubTopic expansion with anti-collapse logic
- **Menu Navigation Tests**: Top menu bar expansion, Tree + Calendar selection, auto-close verification

### 03-course-crud.cy.ts
- **Selection and InfoPanel Tests**: Course/Topic/SubTopic/Lesson selection verification
- **InfoPanel Content Verification**: Different content for different entity types  
- **State Maintenance**: InfoPanel persistence during navigation
- **ADD Tests**: Create new Topics, SubTopics, and Lessons with form validation

### 04-drag-drop.cy.ts
- **Lesson Drag & Drop**: Within topic, cross-topic movement
- **SubTopic Drag & Drop**: Positioning and movement
- **Error Handling**: Invalid drag operations

### Legacy Tests
- `drag-drop-suite.cy.ts`: Original comprehensive drag-drop suite
- `subtopic-drag-drop.cy.ts`: Original SubTopic-specific tests

## 🛠️ Test Setup Requirements

### Prerequisites
1. **API Running**: `dotnet run` from `LessonTree.Api` directory (port 5046)
2. **UI Running**: `npm start` from `LessonTree_UI` directory (port 4200)
3. **Test Data**: Database should be seeded with test courses

### Custom Commands
- `cy.setupDragDropTest()`: Complete test arrangement (login, navigation, expansion)
- API health checks in all test suites
- Automatic cleanup (cookies, storage) between tests

## 📸 Screenshots & Videos
- Screenshots automatically captured at key test steps
- Videos recorded for failed tests
- Located in `cypress/screenshots/` and `cypress/videos/`

## 🎯 Best Practices

### Running Individual Tests
```bash
# Best for development/debugging
npm run test:auth

# Best for CI/CD
npm run test:all:headless
```

### Anti-Collapse Logic
Navigation tests include sophisticated logic to prevent SyncFusion tree collapse:
- Multiple re-expansion rounds
- Element aliasing to handle re-renders  
- Extended verification waits

### Error Handling
All tests include graceful error handling for:
- API connectivity issues
- Element timing problems
- Dynamic UI updates

## 🔧 Troubleshooting

### Common Issues
1. **Tests fail with "not connected"**: Ensure API is running on port 5046
2. **Element not found**: Check if UI is running on port 4200  
3. **Tree collapse issues**: Navigation tests include anti-collapse logic
4. **Timing issues**: Tests include appropriate waits for dynamic content

### Debug Mode
Use the interactive test runner for debugging:
```bash
npm run cypress:open
```

## 📋 Test Runner Script

The custom test runner (`cypress/scripts/run-tests.js`) provides:
- Category-based test execution
- Headless and interactive modes
- Detailed help and descriptions
- Error handling and exit codes