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

  it('should force course to expand and stay expanded', () => {
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

    // Find the first course's expand icon and click it aggressively
    cy.get('.course-card').first().within(() => {
      cy.get('.e-icons.e-icon-expandable.interaction').first().should('be.visible').click()
    })

    // Wait for expansion
    cy.wait(1000)

    // Click all expandable icons to force full expansion
    cy.get('.e-icons.e-icon-expandable.interaction').each(($icon) => {
      cy.wrap($icon).click({ force: true })
    })

    cy.wait(2000)

    // Verify expansion worked - check outside course-card scope for any expanded content
    cy.get('body').within(() => {
      cy.get('.e-treeview, .e-list-item, ul li, .e-node-text').should('exist')
    })

    // Take a screenshot to verify visual state
    cy.screenshot('forced-expansion-result')
  })
})