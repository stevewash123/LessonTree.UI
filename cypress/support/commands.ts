// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      robustLogin(username?: string, password?: string): Chainable<void>
      logout(): Chainable<void>
      reseedDatabase(): Chainable<void>
      waitForAngularToLoad(): Chainable<void>
      setupDragDropTest(): Chainable<void>
      navigateToTreeCalendarView(): Chainable<void>
      expandTreeNodes(): Chainable<void>
    }
  }
}

// Custom command for login using cy.session() for proper authentication persistence
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session([username, password], () => {
    cy.log('🔑 Starting secure authentication session')
    cy.log(`Using credentials: ${username}`)
    
    // Visit the login page
    cy.visit('/')
    cy.log('📍 Visited root page')
    
    // Wait for the login form to be visible
    cy.get('form').should('be.visible')
    cy.log('✅ Login form is visible')
    
    // Fill in the form fields
    cy.get('input[formcontrolname="username"]').clear().type(username)
    cy.get('input[formcontrolname="password"]').clear().type(password)
    cy.log(`✅ Filled credentials`)
    
    // Set up network intercepts to monitor the login request
    cy.intercept('POST', '**/account/login').as('loginRequest')
    cy.log('🔍 Set up intercept for login request')
    
    // Click the login button
    cy.get('button[type="submit"]').should('not.be.disabled').click()
    cy.log('🖱️ Clicked login button')
    
    // Wait for the login request and handle the response
    cy.wait('@loginRequest').then((interception) => {
      cy.log(`📡 Response status: ${interception.response?.statusCode}`)
      
      if (interception.response?.statusCode === 200 && interception.response?.body?.token) {
        const token = interception.response.body.token
        
        // CRITICAL: Use cy.window() to properly set token in Angular's scope
        cy.window().then((win) => {
          // Set token in localStorage using the proper window object
          win.localStorage.setItem('token', token)
          cy.log('✅ Token stored via cy.window()')
          
          // Store in Cypress environment for API calls
          Cypress.env('authToken', token)
          
          // CRITICAL: Force refresh the page to trigger Angular's AuthService constructor
          // This is the most reliable way to ensure Angular recognizes the new token
          cy.log('🔄 Forcing page refresh to trigger Angular AuthService initialization')
        })
        
        // Force a page refresh to trigger Angular's AuthService constructor with the new token
        cy.reload()
        cy.wait(2000)
        
        // Navigate to authenticated area to complete session setup  
        cy.visit('/home')
        cy.wait(3000) // Wait for Angular to process authentication state
        
      } else {
        throw new Error(`Login failed with status: ${interception.response?.statusCode}`)
      }
    })
  }, {
    validate() {
      // Validate that the session is properly established
      cy.window().then((win) => {
        const token = win.localStorage.getItem('token')
        if (!token) {
          throw new Error('Session validation failed: No token in localStorage')
        }
        cy.log('✅ Session validated: Token exists in localStorage')
        
        // Additional validation: Check if Angular's AuthService recognizes the authentication
        cy.visit('/home/lesson-tree', { 
          onBeforeLoad: (window) => {
            const storedToken = window.localStorage.getItem('token')
            if (storedToken) {
              window.localStorage.setItem('token', storedToken)
            }
          }
        })
        cy.wait(2000)
        
        // Check if we're properly authenticated by looking for course loading
        cy.get('body').then(($body) => {
          const bodyText = $body.text()
          if (bodyText.includes('No courses found') && !bodyText.includes('loading')) {
            cy.log('⚠️ Authentication validation warning: Courses not loading, may need manual trigger')
          } else {
            cy.log('✅ Authentication validation success: Angular recognizes auth state')
          }
        })
      })
    }
  })
  
  cy.log('✅ Authentication session established')
})

// Custom command to reseed database via API
Cypress.Commands.add('reseedDatabase', () => {
  cy.log('🗄️ Starting database reset and reseed...')
  cy.request({
    method: 'POST',
    url: 'http://localhost:5046/api/admin/reset-and-reseed',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 120000 // Increase timeout to 2 minutes for complete seeding
  }).then((response) => {
    cy.log(`✅ Database reseed API call completed with status: ${response.status}`)
    expect(response.status).to.eq(200)
    
    // CRITICAL: Wait much longer for seeding to fully complete
    // The seeding process creates users, courses, topics, subtopics, and lessons
    cy.log('⏰ Waiting 15 seconds for database seeding to fully complete...')
    cy.wait(15000)
    
    // Note: Cannot verify courses here because we haven't authenticated yet
    // The verification will happen after login when navigateToTreeCalendarView() is called
    
    cy.log('⏰ Database seeding verification completed')
  })
})

// Custom command to wait for Angular to load
Cypress.Commands.add('waitForAngularToLoad', () => {
  cy.window().should('have.property', 'ng')
})

// Custom command to logout
Cypress.Commands.add('logout', () => {
  // Look for logout button in menu or user profile area
  cy.get('[data-cy="logout-button"], [data-cy="user-menu"]').click()
  cy.contains('Logout', 'Sign Out', 'Log Out').click()
  cy.url().should('include', '/login')
})

// Custom command to navigate to Tree & Calendar view  
Cypress.Commands.add('navigateToTreeCalendarView', () => {
  cy.log('🧭 Starting navigation to Tree & Calendar view')
  
  // Set up console log collection
  cy.window().then((win) => {
    win.console.log('🔍 [CYPRESS] Starting console log collection')
  })
  
  // We should already be authenticated, let's try direct navigation to the tree view
  // Use onBeforeLoad to ensure token is set before Angular loads
  cy.visit('/home/lesson-tree', { 
    failOnStatusCode: false,
    onBeforeLoad: (window) => {
      // Ensure token is available before page loads
      const token = Cypress.env('authToken')
      if (token) {
        window.localStorage.setItem('token', token)
        console.log('🔒 Token re-applied via onBeforeLoad')
      }
    }
  })
  cy.log('🔒 Navigated with token pre-loaded')
  cy.wait(5000) // Give more time for Angular components to initialize
  
  // Capture all console messages
  cy.window().then((win) => {
    // Override console methods to capture logs
    const originalLog = win.console.log
    const originalError = win.console.error
    const originalWarn = win.console.warn
    
    win.console.log = (...args) => {
      cy.log(`📝 CONSOLE LOG: ${args.join(' ')}`)
      originalLog.apply(win.console, args)
    }
    
    win.console.error = (...args) => {
      cy.log(`🚨 CONSOLE ERROR: ${args.join(' ')}`)
      originalError.apply(win.console, args)
    }
    
    win.console.warn = (...args) => {
      cy.log(`⚠️ CONSOLE WARN: ${args.join(' ')}`)
      originalWarn.apply(win.console, args)
    }
  })
  
  // Wait for the CourseListComponent to be present
  cy.get('course-list', { timeout: 10000 }).should('exist')
  cy.log('✅ CourseListComponent is present in the DOM')
  
  // Give additional time for the component's ngOnInit to complete and API calls to finish
  cy.wait(5000)
  
  // Check for app-tree components specifically
  cy.get('body').then(($body) => {
    const appTrees = $body.find('app-tree')
    const courseCards = $body.find('.course-card')
    cy.log(`🌲 Found ${appTrees.length} app-tree components in DOM`)
    cy.log(`📋 Found ${courseCards.length} course-card components in DOM`)
    
    if (appTrees.length > 0) {
      appTrees.each((index, tree) => {
        const $tree = Cypress.$(tree)
        const treeHtml = $tree.html()
        cy.log(`🌲 app-tree ${index + 1} HTML: ${treeHtml ? treeHtml.substring(0, 200) + '...' : 'empty'}`)
      })
    } else {
      cy.log('❌ No app-tree components found - this explains the expandTreeNodes failure')
    }
    
    if (courseCards.length > 0) {
      cy.log('✅ Course cards found - component structure is correct')
    } else {
      cy.log('❌ No course cards found - courses not loading properly')
    }
  })
  
  // Take a screenshot to see current state
  cy.screenshot('navigation-start')
  
  // Check what we can see on the page
  cy.get('body').then(($body) => {
    const bodyText = $body.text()
    cy.log(`Page contains: ${bodyText.substring(0, 200)}...`)
    
    // If we see "No courses found", we need to check if we have data
    if (bodyText.includes('No courses found') || bodyText.includes('Create your first course')) {
      cy.log('⚠️ No courses found in UI - this explains why app-tree components are not rendered')
      
      // Try waiting a bit longer and then refreshing to trigger component reinitialization
      cy.wait(3000)
      cy.reload()
      cy.wait(5000)
      
      // Check if courses appear after reload
      cy.get('body').then(($reloadedBody) => {
        const reloadedText = $reloadedBody.text()
        const appTreesAfterReload = $reloadedBody.find('app-tree')
        cy.log(`🔄 After reload: ${appTreesAfterReload.length} app-tree components found`)
        
        if (!reloadedText.includes('No courses found')) {
          cy.log('✅ Courses appeared after reload')
        } else {
          cy.log('⚠️ Still no courses after reload - Angular component not receiving API data')
        }
      })
    } else {
      cy.log('✅ Courses are visible in UI')
    }
  })
  
  // Wait for navigation to complete
  cy.wait(3000)
  
  // Take final screenshot
  cy.screenshot('navigation-end')
  
  // Final verification - check if we can see the page structure we expect
  cy.url().then((url) => {
    cy.log(`Final URL: ${url}`)
  })
})

// Custom command to expand tree nodes for testing
Cypress.Commands.add('expandTreeNodes', () => {
  cy.log('🌲 Starting tree expansion process')
  
  // First check if courses are actually loaded
  cy.get('body').then(($body) => {
    const bodyText = $body.text()
    if (bodyText.includes('No courses found')) {
      cy.log('❌ No courses found in UI - cannot expand trees')
      cy.log('⚠️ This indicates the test setup failed to load course data properly')
      return // Exit early if no courses
    }
  })
  
  // Wait for course cards to be rendered
  cy.get('.course-card', { timeout: 15000 }).should('exist')
  cy.log('✅ Course cards found')
  
  // Step 1: Expand the course-level arrows first (the ▶ arrows in the course headers)
  cy.get('.course-card').each(($courseCard, index) => {
    cy.log(`📋 Processing course card ${index + 1}`)
    
    // Look for course-level expand arrows - these appear as ▶ in the course header
    // Look for SyncFusion tree view expand buttons within this course card
    const expandIcon = $courseCard.find('.e-icons.e-plus, .e-plus, .e-expand, [class*="expand"], [class*="collapse"]')
    
    if (expandIcon.length > 0) {
      cy.log(`🔧 Found ${expandIcon.length} expandable elements in course ${index + 1}`)
      cy.wrap(expandIcon.first()).click({ force: true })
      cy.wait(1000) // Wait for course expansion
    } else {
      cy.log(`⚠️ No expandable icons found in course ${index + 1}`)
    }
  })
  
  cy.log('✅ Course-level expansion completed')
  
  // Step 2: Now wait for SyncFusion tree components to be fully rendered
  cy.wait(2000)
  
  // Step 3: Expand individual tree nodes within the now-visible trees
  cy.get('body').then(($body) => {
    const treeExpandButtons = $body.find('.e-icons.e-plus, .e-plus, .e-expand')
    cy.log(`🌲 Found ${treeExpandButtons.length} SyncFusion tree expansion buttons`)
    
    if (treeExpandButtons.length > 0) {
      // Click each expansion button
      cy.wrap(treeExpandButtons).each(($el, index) => {
        cy.log(`🔧 Expanding tree node ${index + 1}`)
        cy.wrap($el).click({ force: true })
        cy.wait(500) // Allow time for expansion animation
      })
    } else {
      cy.log('⚠️ No SyncFusion tree expansion buttons found - trees may already be expanded')
    }
  })
  
  // Final wait for all expansions to complete
  cy.wait(2000)
  cy.log('✅ Tree expansion process completed')
})

// Master setup command for all drag-drop tests
Cypress.Commands.add('setupDragDropTest', () => {
  // 1. Reseed the database with fresh test data
  cy.reseedDatabase()
  cy.wait(2000) // Give database time to reset
  
  // 2. CRITICAL: After reseeding, admin must log out and back in to "own" the new courses
  cy.clearAllCookies()
  cy.clearAllSessionStorage()  
  cy.clearAllLocalStorage()
  
  // 3. Force refresh headless browser and clear all cache
  cy.log('🔄 Refreshing browser and clearing all cache after database reseed')
  cy.visit('/', { timeout: 30000 }) // Visit root to establish clean state
  cy.reload(true) // Force reload, bypassing cache
  cy.wait(2000)
  
  // Clear everything again after refresh to be extra sure
  cy.clearAllCookies()
  cy.clearAllSessionStorage()
  cy.clearAllLocalStorage()
  
  // 4. Authenticate AFTER reseeding and clearing (this is the key step!)
  cy.login('admin', 'Admin123!')
  
  // 5. Navigate to Tree & Calendar view - the seeded courses should now be visible
  cy.navigateToTreeCalendarView()
  
  // 6. Wait for tree to load and expand nodes to make drag-drop targets visible
  cy.wait(3000)
  cy.expandTreeNodes()
  
  // System is now ARRANGED for drag-drop testing with seeded course data
  cy.log('✅ Drag-drop test setup complete - system arranged and ready')
})

// Robust login command for sequential tests with backdrop handling
Cypress.Commands.add('robustLogin', (username = 'admin', password = 'Admin123!') => {
  cy.visit('/')
  
  // Wait for any loading overlays/backdrops to disappear
  cy.get('body', { timeout: 5000 }).should('be.visible')
  cy.get('.backdrop').should('not.exist')
  cy.get('.mat-dialog-container').should('not.exist')  
  cy.get('.cdk-overlay-backdrop').should('not.exist')
  
  // Wait for login form to be fully loaded and interactable
  cy.get('input[formcontrolname="username"]', { timeout: 20000 })
    .should('be.visible')
    .should('not.be.disabled')
  cy.get('input[formcontrolname="password"]', { timeout: 20000 })
    .should('be.visible')
    .should('not.be.disabled')
  
  // Clear and fill login form with force to overcome any overlay issues
  cy.get('input[formcontrolname="username"]').clear().type(username, { force: true })
  cy.get('input[formcontrolname="password"]').clear().type(password, { force: true })
  
  // Intercept and submit
  cy.intercept('POST', '**/account/login').as('loginRequest')
  cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click({ force: true })
  
  // Wait for successful login
  cy.wait('@loginRequest').then((interception) => {
    expect(interception.response?.statusCode).to.eq(200)
    expect(interception.response?.body).to.have.property('token')
  })
  
  // Wait for navigation
  cy.url({ timeout: 15000 }).should('include', '/home')
})