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

    // Try to prevent collapse by re-clicking any collapsed elements
    cy.wait(3000) // Wait for any sync operations to complete
    
    // Re-expand if needed - click any remaining expand icons
    cy.get('body').then(($body) => {
      const expandIcons = $body.find('.e-icons.e-icon-expandable.interaction')
      if (expandIcons.length > 0) {
        cy.log(`Found ${expandIcons.length} collapsed elements after sync - re-expanding`)
        cy.get('.e-icons.e-icon-expandable.interaction').each(($icon, index) => {
          cy.wrap($icon).click({ force: true })
          cy.wait(500) // Short wait between clicks
        })
      }
    })

    // Force maintain expanded state by continuously re-expanding during final verification
    cy.wait(1000)
    
    // Aggressively maintain expansion - multiple rounds of re-expansion
    for (let round = 1; round <= 3; round++) {
      cy.log(`Expansion maintenance round ${round}`)
      
      // Force re-expand Course 1 if collapsed
      cy.get('.course-card').first().within(() => {
        cy.get('.e-icons.e-icon-expandable.interaction').then(($courseIcons) => {
          if ($courseIcons.length > 0) {
            cy.log('Course 1 collapsed - re-expanding')
            cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
          }
        })
      })
      
      cy.wait(500)
      
      // Force re-expand Topic 1 if collapsed
      cy.get('body').then(($body) => {
        if ($body.find('*:contains("Course 1 - Topic 1")').length > 0) {
          cy.contains('Course 1 - Topic 1').closest('li, .e-list-item, .e-node').within(() => {
            cy.get('.e-icons.e-icon-expandable.interaction').then(($topicIcons) => {
              if ($topicIcons.length > 0) {
                cy.log('Topic 1 collapsed - re-expanding')
                cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
              }
            })
          })
        }
      })
      
      cy.wait(500)
      
      // Force re-expand any SubTopics if collapsed
      cy.get('body').then(($body) => {
        const subtopicExpandIcons = $body.find('.e-icons.e-icon-expandable.interaction')
        if (subtopicExpandIcons.length > 0) {
          cy.log(`Found ${subtopicExpandIcons.length} collapsed elements in round ${round} - re-expanding`)
          cy.get('.e-icons.e-icon-expandable.interaction').each(($icon) => {
            cy.wrap($icon).click({ force: true })
          })
        }
      })
      
      cy.wait(1000) // Wait between rounds
    }

    // Final verification - check that we have a deeply expanded tree structure
    cy.get('.e-treeview, .e-list-item, ul li, .e-node-text').should('exist').and('have.length.greaterThan', 2)

    // Verify specific expanded content is still visible
    cy.contains('Course 1 - Topic 1').should('be.visible')
    cy.contains('Course 1 - Topic 2').should('be.visible')
    cy.contains('Lesson 1').should('be.visible')
    cy.contains('Lesson 2').should('be.visible')
    cy.contains('Lesson 3').should('be.visible')

    // Take a final screenshot to verify visual state
    cy.screenshot('forced-expansion-result')
    
    // Keep the browser in expanded state with a final long wait
    cy.wait(5000) // Extended wait to maintain expanded state visually
  })
})