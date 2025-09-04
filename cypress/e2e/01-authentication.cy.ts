describe('Authentication Tests', () => {
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

  describe('Login Flow', () => {
    it('should successfully log in with valid credentials', () => {
      cy.visit('/')
      
      // Fill in login form
      cy.get('input[formcontrolname="username"]').type('admin')
      cy.get('input[formcontrolname="password"]').type('Admin123!')
      
      // Intercept login request
      cy.intercept('POST', '**/account/login').as('loginRequest')
      
      // Submit login form
      cy.get('button[type="submit"]').click()
      
      // Wait for login response and verify
      cy.wait('@loginRequest').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
        expect(interception.response?.body).to.have.property('token')
      })
      
      // Verify navigation to home page
      cy.url({ timeout: 10000 }).should('include', '/home')
    })

    it('should display two courses after successful login', () => {
      cy.visit('/')
      cy.get('input[formcontrolname="username"]').type('admin')
      cy.get('input[formcontrolname="password"]').type('Admin123!')
      cy.intercept('POST', '**/account/login').as('loginRequest')
      cy.get('button[type="submit"]').click()
      cy.wait('@loginRequest')
      cy.url({ timeout: 10000 }).should('include', '/home')

      // Wait for courses to load and verify count
      cy.get('.course-card', { timeout: 10000 }).should('have.length', 2)
      
      // Verify specific courses are visible
      cy.contains('Course 1').should('be.visible')
      cy.contains('Course 2').should('be.visible')
    })
  })

  describe('Authentication State', () => {
    it('should redirect to login when not authenticated', () => {
      cy.visit('/home')
      cy.url().should('include', '/')
      cy.url().should('not.include', '/home')
    })

    it('should maintain session after page reload', () => {
      // Login first
      cy.visit('/')
      cy.get('input[formcontrolname="username"]').type('admin')
      cy.get('input[formcontrolname="password"]').type('Admin123!')
      cy.intercept('POST', '**/account/login').as('loginRequest')
      cy.get('button[type="submit"]').click()
      cy.wait('@loginRequest')
      cy.url({ timeout: 10000 }).should('include', '/home')

      // Reload page and verify still authenticated
      cy.reload()
      cy.url({ timeout: 10000 }).should('include', '/home')
      cy.get('.course-card', { timeout: 10000 }).should('exist')
    })
  })
})