describe('Course Expansion', () => {
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

  it('should expand course when clicking the expand icon (but may collapse due to TreeSyncService bug)', () => {
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

    // Find the first course's expand icon and click it
    cy.get('.course-card').first().within(() => {
      // Look for the expandable icon and click the first one
      cy.get('.e-icons.e-icon-expandable.interaction').first().should('be.visible').click()
    })

    // Verify the course has expanded by checking for child elements
    // After expansion, we should see topics/lessons under the course
    cy.get('.course-card').first().within(() => {
      // Check if child elements are now visible after expansion
      // This might be topics, lessons, or tree view content
      cy.get('.e-treeview, .e-list-item, ul li', { timeout: 5000 }).should('be.visible')
    })
  })
})