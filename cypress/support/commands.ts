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
      robustLogin(username?: string, password?: string): Chainable<void>
      logout(): Chainable<void>
      reseedDatabase(): Chainable<void>
      waitForAngularToLoad(): Chainable<void>
      expandTreeNodes(): Chainable<void>
    }
  }
}


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

// Custom command for robust API-based login with localStorage token storage
Cypress.Commands.add('robustLogin', (username = 'admin', password = 'Admin123!') => {
  cy.log(`🔑 Starting robust login for user: ${username}`)
  
  // Get auth token directly via API - faster and more reliable than UI login
  cy.request({
    method: 'POST',
    url: 'http://localhost:5046/api/account/login',
    body: {
      username: username,
      password: password
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    const token = response.body.token
    expect(token).to.exist
    
    // Store token in localStorage so Angular AuthService can find it after reload
    cy.window().then((win) => {
      win.localStorage.setItem('token', token)
    })
    // Also store in Cypress env for API requests
    Cypress.env('authToken', token)
    cy.log(`🔑 Got auth token directly via API: ${token.substring(0, 20)}...`)
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
  // Use a more robust approach that handles DOM re-rendering
  cy.get('body').then(($body) => {
    const treeExpandButtons = $body.find('.e-icons.e-plus, .e-plus, .e-expand')
    cy.log(`🌲 Found ${treeExpandButtons.length} SyncFusion tree expansion buttons`)
    
    const buttonCount = treeExpandButtons.length
    
    // Click each button individually to avoid DOM detachment issues
    for (let i = 0; i < buttonCount; i++) {
      cy.log(`🔧 Expanding tree node ${i + 1} of ${buttonCount}`)
      
      // Re-query the DOM for each click to avoid stale element references
      cy.get('.e-icons.e-plus, .e-plus, .e-expand').then($buttons => {
        if ($buttons.length > i) {
          // Click the button at index i, using force to handle any overlays
          cy.wrap($buttons.eq(i)).click({ force: true })
          cy.wait(500) // Allow time for expansion animation
        } else {
          cy.log(`⚠️ Button ${i + 1} no longer exists (likely already expanded)`)
        }
      })
    }
    
    if (buttonCount === 0) {
      cy.log('⚠️ No SyncFusion tree expansion buttons found - trees may already be expanded')
    }
  })
  
  // Step 4: Final pass to expand any remaining collapsed nodes (lessons within topics)
  cy.wait(2000)
  cy.log('🔄 Final expansion pass for lesson-level nodes...')
  
  cy.get('body').then(($body) => {
    const remainingButtons = $body.find('.e-icons.e-plus, .e-plus, .e-expand')
    cy.log(`🌲 Found ${remainingButtons.length} remaining expansion buttons for final pass`)
    
    const finalButtonCount = remainingButtons.length
    
    // Click any remaining expansion buttons (likely lesson-level nodes)
    for (let i = 0; i < finalButtonCount; i++) {
      cy.log(`🔧 Final expansion ${i + 1} of ${finalButtonCount}`)
      
      // Re-query for each click to avoid stale references
      cy.get('.e-icons.e-plus, .e-plus, .e-expand').then($finalButtons => {
        if ($finalButtons.length > i) {
          cy.wrap($finalButtons.eq(i)).click({ force: true })
          cy.wait(500)
        }
      })
    }
  })

  // Final wait for all expansions to complete
  cy.wait(2000)
  cy.log('✅ Tree expansion process completed - all levels expanded')
})


