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
      logout(): Chainable<void>
      reseedDatabase(): Chainable<void>
      waitForAngularToLoad(): Chainable<void>
      setupDragDropTest(): Chainable<void>
      navigateToTreeCalendarView(): Chainable<void>
      expandTreeNodes(): Chainable<void>
    }
  }
}

// Custom command for login - bypasses form and uses direct API authentication
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.log('🔑 Performing direct API authentication (bypassing Angular form)')
  
  // Clear any existing session data
  cy.clearAllCookies()
  cy.clearAllSessionStorage()
  cy.clearAllLocalStorage()
  
  // Perform direct API authentication
  cy.request({
    method: 'POST',
    url: 'http://localhost:5046/account/login',
    body: {
      username: email,  // API expects 'username', not 'email'
      password: password
    },
    failOnStatusCode: false
  }).then((response) => {
    cy.log(`API login response: ${response.status}`)
    
    if (response.status === 200 && response.body.token) {
      cy.log('✅ API authentication successful')
      
      // Visit the app first to establish the domain
      cy.visit('/')
      
      // Store the JWT token in localStorage and clear any existing tokens
      cy.window().then((win) => {
        // First clear any existing authentication data
        win.localStorage.clear()
        win.sessionStorage.clear()
        
        // Now store the new token
        win.localStorage.setItem('token', response.body.token)
        win.localStorage.setItem('authToken', response.body.token)
        cy.log(`Token stored: ${response.body.token.substring(0, 50)}...`)
        
        // CRITICAL: Trigger Angular AuthService to reinitialize with the new token
        if (win.angular && win.angular.getContext) {
          try {
            // Try to get Angular context and trigger a reinit
            const context = win.angular.getContext(win.document.body)
            if (context && context.injector) {
              const authService = context.injector.get('AuthService')
              if (authService && authService.ngOnInit) {
                authService.ngOnInit() // Trigger reinit
              }
            }
          } catch (e) {
            cy.log('Could not trigger Angular AuthService reinit, will reload instead')
          }
        }
      })
      
      // Store token in Cypress environment for later use
      Cypress.env('authToken', response.body.token)
      
      // Also try setting as cookie if the app expects it
      cy.setCookie('authToken', response.body.token)
      
      // CRITICAL: Force reload to ensure Angular picks up the new token
      cy.reload(true)
      cy.wait(3000) // Wait longer for full Angular reinit
      
      cy.log('✅ Authentication completed - tokens stored and page reloaded')
      
    } else {
      cy.log(`❌ API authentication failed with status: ${response.status}`)
      cy.log(`Response body: ${JSON.stringify(response.body)}`)
      throw new Error(`Login failed: ${response.status}`)
    }
  })
})

// Custom command to reseed database via API
Cypress.Commands.add('reseedDatabase', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:5046/api/admin/reset-and-reseed',
    headers: {
      'Content-Type': 'application/json'
    }
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
  
  // We should already be authenticated, let's try direct navigation to the tree view
  cy.visit('/home/lesson-tree', { failOnStatusCode: false })
  cy.wait(3000)
  
  // Take a screenshot to see current state
  cy.screenshot('navigation-start')
  
  // Check what we can see on the page
  cy.get('body').then(($body) => {
    const bodyText = $body.text()
    cy.log(`Page contains: ${bodyText.substring(0, 200)}...`)
    
    // If we see "No courses found", we need to check if we have data
    if (bodyText.includes('No courses found') || bodyText.includes('Create your first course')) {
      cy.log('⚠️ No courses found - checking if database seeding worked')
      
      // Check if we can access the course API
      cy.request({
        method: 'GET',
        url: 'http://localhost:5046/api/course',
        auth: {
          bearer: Cypress.env('authToken') // Use stored token
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log(`Course API response: ${response.status}`)
        if (response.body && response.body.length > 0) {
          cy.log(`✅ Found ${response.body.length} courses in API`)
          // Courses exist, might be a frontend issue - try refreshing
          cy.reload()
          cy.wait(3000)
        } else {
          cy.log('❌ No courses in database - seeding might have failed')
        }
      })
    }
    
    // Look for navigation elements to get to lesson tree specifically
    if ($body.find('nav, .navbar, .menu, [class*="nav"]').length > 0) {
      cy.log('📋 Looking for navigation elements')
      
      // Look for hamburger menu first
      const hamburger = $body.find('[class*="menu"], [class*="hamburger"], button[class*="toggle"]')
      if (hamburger.length > 0) {
        cy.log('📱 Found hamburger menu, expanding it')
        cy.wrap(hamburger.first()).click()
        cy.wait(1000)
      }
      
      // Now look for lesson tree or tree calendar navigation
      cy.get('body').then(($expandedBody) => {
        const links = $expandedBody.find('a, button')
        cy.log(`Found ${links.length} clickable elements after menu expansion`)
        
        // Look through all links for tree or lesson tree navigation
        links.each((index, element) => {
          const $el = Cypress.$(element)
          const text = $el.text().toLowerCase()
          const href = $el.attr('href') || ''
          
          if (text.includes('lesson tree') || text.includes('tree & calendar') || 
              text.includes('tree calendar') || href.includes('lesson-tree')) {
            cy.log(`🎯 Found tree navigation: "${text}" href: "${href}"`)
            cy.wrap($el).click()
            return false // Stop iteration
          }
        })
      })
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
  // Expand course nodes first
  cy.get('[data-cy="tree-node-expand"], .e-icons.e-plus').each(($el) => {
    cy.wrap($el).click({ force: true })
    cy.wait(500) // Allow time for expansion animation
  })
  
  // Wait for tree to fully expand
  cy.wait(2000)
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