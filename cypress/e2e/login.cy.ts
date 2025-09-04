describe('Login Happy Path', () => {
  beforeEach(() => {
    // Check that API server is running
    cy.request('GET', 'http://localhost:5046/api/admin/health').should((response) => {
      expect(response.status).to.eq(200)
    })
    
    // Start fresh for each test
    cy.clearAllCookies()
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
    
    // Ensure database has test data
    cy.reseedDatabase()
  })

  it('should successfully log in with valid credentials', () => {
    // Visit the login page
    cy.visit('/')
    
    // Verify login form is present
    cy.get('form').should('be.visible')
    cy.get('input[formcontrolname="username"]').should('be.visible')
    cy.get('input[formcontrolname="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
    
    // Fill in login credentials
    cy.get('input[formcontrolname="username"]').type('admin')
    cy.get('input[formcontrolname="password"]').type('Admin123!')
    
    // Submit the form
    cy.intercept('POST', '**/account/login').as('loginRequest')
    cy.get('button[type="submit"]').click()
    
    // Wait for login request and verify success
    cy.wait('@loginRequest').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200)
      expect(interception.response?.body).to.have.property('token')
    })
    
    // Verify successful redirect to home page (with timeout)
    cy.url({ timeout: 10000 }).should('include', '/home')
    
    // Verify that two courses are visible after login
    cy.get('.course-card', { timeout: 10000 }).should('have.length', 2)
    cy.contains('Course 1').should('be.visible')
    cy.contains('Course 2').should('be.visible')
  })

  it('should expand course when clicking the expand icon', () => {
    // Login first (reuse the login logic)
    cy.visit('/')
    cy.get('input[formcontrolname="username"]').type('admin')
    cy.get('input[formcontrolname="password"]').type('Admin123!')
    cy.intercept('POST', '**/account/login').as('loginRequest')
    cy.get('button[type="submit"]').click()
    cy.wait('@loginRequest')
    cy.url({ timeout: 10000 }).should('include', '/home')

    // Wait for courses to load
    cy.get('.course-card', { timeout: 10000 }).should('have.length', 2)

    // Find the first course's expand icon and click it
    cy.get('.course-card').first().within(() => {
      // Look for the expandable icon and click the first one
      cy.get('.e-icons.e-icon-expandable.interaction').first().should('be.visible').click()
    })

    // Verify the course has expanded by checking for child elements
    // After expansion, we should see topics/lessons under the course
    cy.get('.course-card').first().within(() => {
      // Check if the expand icon has changed or if child elements are now visible
      // This might be topics, lessons, or other course content
      cy.get('.e-treeview', { timeout: 5000 }).should('be.visible')
    })
  })
})