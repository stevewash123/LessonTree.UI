# LessonTree UI

A modern Angular 19 application providing an intuitive interface for educational content management with advanced drag-and-drop functionality, dynamic calendar integration, and real-time lesson organization.

> **🔗 Related Repository**: This frontend connects to the [LessonTree API](https://github.com/stevewash123/LessonTree.API) - a robust .NET 8 Web API with comprehensive unit testing and clean architecture.

## 🚀 Features

### User Interface Highlights
- **Interactive Lesson Tree**: Hierarchical course/topic/lesson navigation with SyncFusion TreeView
- **Advanced Drag-and-Drop**: Seamless lesson reordering with visual feedback and automatic sort management
- **Dynamic Calendar Integration**: FullCalendar integration with real-time schedule updates
- **Responsive Design**: Angular Material components with mobile-friendly layouts
- **Real-time Updates**: Instant UI refresh after lesson moves and schedule changes

### Technical Features
- **Type-Safe Development**: TypeScript with strict null checks and comprehensive type definitions
- **Reactive Programming**: RxJS observables for state management and API integration
- **Component Architecture**: Modular design with separation of concerns
- **Service-Oriented**: Clean service layer with dependency injection
- **Error Handling**: Comprehensive error boundaries with user-friendly notifications

## 🛠️ Technology Stack

- **Angular 19**: Latest framework with standalone components and improved performance
- **TypeScript**: Strict type checking with modern ES2022+ features
- **Angular Material**: Google's Material Design components
- **SyncFusion**: Enterprise-grade TreeView and data visualization components
- **FullCalendar**: Comprehensive calendar component with drag-and-drop support
- **RxJS**: Reactive programming with observables and operators
- **Cypress**: End-to-end testing framework with visual test runner

## 📦 Dependencies

### Core Framework
```json
{
  "@angular/core": "^19.0.0",
  "@angular/common": "^19.0.0",
  "@angular/router": "^19.0.0",
  "@angular/forms": "^19.0.0"
}
```

### UI Components
```json
{
  "@angular/material": "^19.0.0",
  "@syncfusion/ej2-angular-navigations": "^27.1.48",
  "@fullcalendar/angular": "^6.1.15",
  "@fullcalendar/core": "^6.1.15"
}
```

### State Management & HTTP
```json
{
  "rxjs": "^7.8.0",
  "@angular/common/http": "^19.0.0"
}
```

## 🏗️ Architecture

### Project Structure
```
src/
├── app/
│   ├── calendar/                    # Calendar feature module
│   │   ├── components/             # Calendar display components
│   │   ├── services/               # Calendar state and API services
│   │   └── models/                 # Calendar-specific models
│   ├── lesson-tree/                # Lesson management feature
│   │   ├── components/             # Tree and lesson components
│   │   ├── services/               # Tree operations and drag-drop
│   │   └── models/                 # Lesson and tree models
│   ├── shared/                     # Shared utilities and components
│   ├── core/                       # Core services and guards
│   └── models/                     # Global type definitions
├── assets/                         # Static assets and styles
├── environments/                   # Environment configurations
└── styles/                         # Global SCSS styles
```

### Key Services

#### Calendar Services
- **CalendarEventLoaderService**: Efficient event loading with caching
- **ScheduleApiService**: RESTful API integration for schedule data
- **ScheduleStateService**: Centralized schedule state management

#### Lesson Tree Services
- **TreeDragDropService**: Complex drag-and-drop operation handling
- **NodeOperationsService**: CRUD operations for tree nodes
- **TreeDataService**: Tree structure management and API coordination

#### Core Services
- **ApiService**: HTTP client wrapper with error handling
- **AuthService**: JWT authentication and session management
- **NotificationService**: User feedback and error messaging

### Component Architecture

#### Smart Components
- **CalendarComponent**: Calendar display with event integration
- **LessonTreeComponent**: Main tree interface with drag-and-drop
- **CourseListComponent**: Course navigation and selection

#### Dumb Components
- **LessonNodeComponent**: Individual lesson display
- **TopicNodeComponent**: Topic container with expansion
- **InfoPanelComponent**: Detailed entity information display

## 🎨 UI/UX Features

### Material Design Integration
- Consistent color schemes with Angular Material palette
- Responsive breakpoints for mobile and tablet devices
- Accessibility compliance with ARIA labels and keyboard navigation
- Loading states and progress indicators

### Advanced Interactions
- **Drag-and-Drop**: Visual feedback with drop zones and invalid drop indicators
- **Tree Expansion**: Smooth animations with state persistence
- **Calendar Navigation**: Month/week view switching with smooth transitions
- **Context Menus**: Right-click operations for advanced users

### Performance Optimizations
- **OnPush Change Detection**: Optimized component updates
- **Lazy Loading**: Feature modules loaded on demand
- **Virtual Scrolling**: Efficient rendering of large lesson lists
- **Caching**: Strategic caching of frequently accessed data

## 🧪 Testing Strategy

### End-to-End Testing with Cypress
```
cypress/e2e/
├── 01-authentication.cy.ts        # Login/logout workflows
├── 02-course-navigation.cy.ts     # Tree expansion and navigation
├── 03-course-crud.cy.ts           # Entity selection and CRUD operations
├── 04-drag-drop.cy.ts             # Drag-and-drop functionality
└── 05-calendar-integration.cy.ts  # Calendar updates and synchronization
```

### Custom Cypress Commands
```typescript
// Reusable test utilities
cy.robustLogin()              // Login with backdrop handling
cy.expandTreeNodes()          // Expand SyncFusion tree nodes
cy.setupDragDropTest()        // Complete test environment setup
cy.reseedDatabase()           // Reset test data via API
```

### Test Coverage
- **Authentication Flows**: Complete login/logout testing
- **Tree Operations**: Expansion, selection, and navigation
- **Drag-and-Drop**: All lesson move scenarios with validation
- **Calendar Integration**: Schedule updates and event display
- **Error Handling**: API error scenarios and user feedback

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Angular CLI 19+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Clone repository
git clone https://github.com/stevewash123/LessonTree.UI.git
cd LessonTree.UI

# Install dependencies
npm install

# Start development server
npm start
# Application available at http://localhost:4200
```

### Environment Configuration
Update `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5046/api',
  enableLogging: true
};
```

## 🔧 Development Commands

### Development Server
```bash
npm start                    # Start development server
npm run build               # Production build
npm run build:dev           # Development build
npm run lint                # ESLint code analysis
npm run test                # Unit tests (when available)
```

### Cypress Testing
```bash
npm run cypress:open        # Interactive test runner
npm run test:auth          # Authentication tests
npm run test:navigation    # Navigation tests
npm run test:dragdrop      # Drag-drop tests
npm run test:master        # Complete test suite
```

## 📱 Responsive Design

### Breakpoint Strategy
- **Mobile**: < 768px - Stacked layout with collapsible navigation
- **Tablet**: 768px - 1024px - Adaptive sidebar with main content
- **Desktop**: > 1024px - Full layout with dual-pane interface

### Mobile Optimizations
- Touch-friendly drag-and-drop with larger hit targets
- Collapsible tree navigation for small screens
- Optimized calendar view for mobile interaction
- Progressive enhancement for advanced features

## 🔍 State Management

### Service-Based State
```typescript
// Example state service pattern
@Injectable({ providedIn: 'root' })
export class ScheduleStateService {
  private scheduleSubject = new BehaviorSubject<Schedule | null>(null);
  public schedule$ = this.scheduleSubject.asObservable();

  setSchedule(schedule: Schedule): void {
    this.scheduleSubject.next(schedule);
  }
}
```

### Reactive Patterns
- **Observable Chains**: Complex data transformations with RxJS operators
- **Error Boundaries**: Centralized error handling with user-friendly messaging
- **Loading States**: Consistent loading indicators across all components
- **Cache Management**: Intelligent caching with automatic invalidation

## 🎯 Key Features Deep Dive

### Drag-and-Drop Implementation
```typescript
// Advanced drag-drop with validation
onDrop(event: CdkDragDrop<any[]>) {
  if (this.isValidDrop(event)) {
    this.treeDragDropService.handleLessonMove(
      event.item.data,
      event.container.data,
      event.currentIndex
    ).subscribe({
      next: () => this.refreshTreeAndCalendar(),
      error: (error) => this.handleMoveError(error)
    });
  }
}
```

### Calendar Integration
```typescript
// Real-time calendar updates
this.calendarEventLoader.loadEventsForCurrentView(
  this.scheduleId,
  this.activeDate,
  this.viewMode
).subscribe(events => {
  this.calendarComponent.updateEvents(events);
});
```

## 🔐 Security Considerations

### Authentication
- JWT token management with automatic refresh
- Secure localStorage usage with fallback strategies
- Route guards for protected resources
- CSRF protection for state-changing operations

### Data Validation
- Client-side validation with server-side verification
- Type-safe API responses with runtime validation
- Sanitization of user inputs
- Error message sanitization to prevent information leakage

## 🤝 Contributing

### Code Standards
- Follow Angular style guide and conventions
- Use TypeScript strict mode with comprehensive typing
- Implement comprehensive error handling
- Write reusable Cypress commands for test utilities

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with proper typing
3. Add Cypress tests for new functionality
4. Ensure all tests pass (`npm run test:master`)
5. Submit pull request with detailed description

## 📈 Performance Metrics

### Bundle Size Optimization
- Lazy loading reduces initial bundle size
- Tree shaking eliminates unused code
- Efficient imports from large libraries (Material, SyncFusion)
- Strategic use of OnPush change detection

### Runtime Performance
- Virtual scrolling for large datasets
- Debounced user inputs to reduce API calls
- Efficient tree rendering with minimal DOM updates
- Smart caching strategies for frequently accessed data

## 🎨 Theming and Customization

### Material Design Theming
```scss
// Custom theme configuration
@use '@angular/material' as mat;

$primary-palette: mat.define-palette(mat.$blue-palette, 600);
$accent-palette: mat.define-palette(mat.$orange-palette, 500);
$theme: mat.define-light-theme((
  color: (
    primary: $primary-palette,
    accent: $accent-palette
  )
));
```

### SyncFusion Theming
- Custom CSS variables for consistent branding
- Dark mode support with theme switching
- Responsive component sizing
- Accessibility-compliant color contrasts

## 📝 License

This project is part of a portfolio demonstration showcasing modern Angular development practices, reactive programming patterns, and comprehensive testing strategies.

## 🔗 Complete Solution

This frontend is part of a full-stack educational management system:

- **Frontend**: [LessonTree UI](https://github.com/stevewash123/LessonTree.UI) (this repository)
- **Backend**: [LessonTree API](https://github.com/stevewash123/LessonTree.API) - .NET 8 Web API
- **Integration**: RESTful API communication with reactive RxJS patterns
- **Testing**: Cypress E2E tests (UI) + comprehensive unit tests (API)

## 🎯 Future Enhancements

- **Unit Testing**: Jest-based unit testing framework
- **PWA Features**: Service workers and offline capability
- **Internationalization**: Multi-language support with Angular i18n
- **Advanced State Management**: NgRx for complex state scenarios
- **Real-time Features**: WebSocket integration for live updates

---

*Built with ❤️ using Angular 19 and modern frontend development practices*
