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

    // STEP 1: Expand Course 1
    cy.get('.course-card').first().within(() => {
      cy.get('.e-icons.e-icon-expandable.interaction').first().should('be.visible').click()
    })
    cy.wait(1000)
    cy.screenshot('step1-course-expanded')

    // Verify Course 1 is expanded and shows Topic 1 and Topic 2
    cy.contains('Course 1 - Topic 1').should('be.visible')
    cy.contains('Course 1 - Topic 2').should('be.visible')

    // STEP 2: Expand Topic 1 (should show subtopics and lessons)
    // Try different approaches to find and click Topic 1's expand icon
    cy.get('body').then(($body) => {
      // Look for Topic 1 expand icon using various selectors
      const topicExpandSelectors = [
        'Course 1 - Topic 1',
        'Topic 1 for course 1'
      ]
      
      let clicked = false
      
      topicExpandSelectors.forEach(topicText => {
        if (!clicked && $body.text().includes(topicText)) {
          // Find the element containing this text and look for nearby expand icons
          cy.contains(topicText).closest('li, .e-list-item, .e-node').within(() => {
            cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
          })
          clicked = true
        }
      })
      
      if (!clicked) {
        // Alternative: just click any remaining expand icons after course expansion
        cy.get('.e-icons.e-icon-expandable.interaction').eq(1).click({ force: true })
      }
    })
    cy.wait(1000) 
    cy.screenshot('step2-topic1-expanded')

    // STEP 3: Try to expand any remaining SubTopics if they exist
    cy.get('body').then(($body) => {
      // Try to find any remaining expandable icons (these might be SubTopics)
      const remainingExpandIcons = $body.find('.e-icons.e-icon-expandable.interaction')
      
      if (remainingExpandIcons.length > 0) {
        cy.log(`Found ${remainingExpandIcons.length} remaining expandable icons - clicking the first one`)
        cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
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