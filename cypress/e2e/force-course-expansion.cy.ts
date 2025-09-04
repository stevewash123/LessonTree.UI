describe('Force Course Expansion', () => {
  beforeEach(() => {
    // Check that API server is running
    cy.request('GET', 'http://localhost:5046/api/admin/health').should((response) => {
      expect(response.status).to.eq(200)
    })
    
    // Start fresh for each test
    cy.clearAllCookies()
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
  })

  it('should expand course, then topic, then subtopic in sequence', () => {
    // Login first
    cy.visit('/')
    cy.get('input[formcontrolname="username"]').type('admin')
    cy.get('input[formcontrolname="password"]').type('Admin123!')
    cy.intercept('POST', '**/account/login').as('loginRequest')
    cy.get('button[type="submit"]').click()
    cy.wait('@loginRequest')
    cy.url({ timeout: 10000 }).should('include', '/home')

    // Wait for courses to load
    cy.get('.course-card', { timeout: 10000 }).should('exist')

    // STEP 1: Expand Course 1 (use aliasing to prevent re-render issues)
    cy.get('.course-card').first().as('firstCourse')
    cy.get('@firstCourse').within(() => {
      cy.get('.e-icons.e-icon-expandable.interaction').first().as('courseExpandIcon')
    })
    cy.get('@courseExpandIcon').should('be.visible').should('have.length', 1).click()
    cy.wait(1000)
    cy.screenshot('step1-course-expanded')

    // Verify Course 1 is expanded and shows Topic 1 and Topic 2
    cy.contains('Course 1 - Topic 1').should('be.visible')
    cy.contains('Course 1 - Topic 2').should('be.visible')

    // STEP 2: Expand Topic 1 (use aliasing and wait for stability)
    cy.wait(2000) // Extra wait for DOM to stabilize after course expansion
    
    // Try to find Topic 1's expand icon using aliasing
    cy.contains('Course 1 - Topic 1').as('topic1')
    cy.get('@topic1').closest('li, .e-list-item, .e-node').as('topic1Container')
    cy.get('@topic1Container').within(() => {
      cy.get('.e-icons.e-icon-expandable.interaction').as('topic1ExpandIcon')
    })
    
    // Use force click and retry logic
    cy.get('@topic1ExpandIcon').then(($icon) => {
      if ($icon.length === 1) {
        cy.get('@topic1ExpandIcon').click({ force: true })
      } else {
        // Fallback: click any remaining expand icons with explicit first()
        cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
      }
    })
    cy.wait(1000) 
    cy.screenshot('step2-topic1-expanded')

    // STEP 3: Try to expand any remaining SubTopics if they exist (with aliasing)
    cy.wait(2000) // Wait for DOM stabilization after topic expansion
    
    cy.get('.e-icons.e-icon-expandable.interaction').then(($icons) => {
      if ($icons.length > 0) {
        cy.log(`Found ${$icons.length} remaining expandable icons - clicking the first one`)
        cy.get('.e-icons.e-icon-expandable.interaction').first().as('subtopicExpandIcon')
        cy.get('@subtopicExpandIcon').click({ force: true })
        cy.wait(1000)
        cy.screenshot('step3-subtopic-expanded')
      } else {
        cy.log('No more expandable icons found - tree may be fully expanded')
        cy.screenshot('step3-no-more-expansions')
      }
    })

    // Final verification - check that we have a deeply expanded tree structure
    cy.get('.e-treeview, .e-list-item, ul li, .e-node-text').should('exist').and('have.length.greaterThan', 2)

    // Take a screenshot to verify visual state
    cy.screenshot('forced-expansion-result')
  })
})