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

// Custom command for login - uses form-based authentication like a real user
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.log('🔑 Performing form-based authentication (clicking login button like a user)')
  
  // Clear any existing session data
  cy.clearAllCookies()
  cy.clearAllSessionStorage()
  cy.clearAllLocalStorage()
  
  // Visit the login page
  cy.visit('/')
  
  // Wait for the login form to be visible
  cy.get('form').should('be.visible')
  cy.get('input[formcontrolname="username"]').should('be.visible')
  cy.get('input[formcontrolname="password"]').should('be.visible')
  
  // Fill in the form fields
  cy.get('input[formcontrolname="username"]').clear().type(username)
  cy.get('input[formcontrolname="password"]').clear().type(password)
  
  // Click the login button - this triggers Angular's natural authentication flow
  cy.get('button[type="submit"]').should('not.be.disabled').click()
  
  // Wait for authentication to complete - look for redirect or URL change
  cy.url({ timeout: 10000 }).should('not.include', '/')
  
  // Alternative: wait for successful navigation away from login page
  cy.get('body').should('not.contain', 'Welcome to LessonTree')
  
  cy.log('✅ Form-based authentication successful - navigated away from login')
  
  cy.log('✅ Authentication completed using form submission')
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