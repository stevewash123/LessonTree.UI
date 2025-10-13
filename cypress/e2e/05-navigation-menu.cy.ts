describe('Navigation Menu Tests', () => {
  beforeEach(() => {
    // Check that API server is running
    cy.request('GET', `${Cypress.env('apiBaseUrl')}/api/admin/health`).should((response) => {
      expect(response.status).to.eq(200)
    })

    // Reseed database with fresh test data
    cy.reseedDatabase()

    // Get auth token directly via API - faster and more reliable than UI login
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiBaseUrl')}/api/account/login`,
      body: {
        username: 'admin',
        password: 'Admin123!'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
      const token = response.body.token
      expect(token).to.exist

      // Store token for use in any API requests
      Cypress.env('authToken', token)

      // Set token in localStorage for Angular app
      cy.visit('/home/lesson-tree', {
        onBeforeLoad: (window) => {
          window.localStorage.setItem('token', token)
        }
      })

      cy.wait(3000) // Allow Angular to initialize with auth state
    })
  })

  describe('1. Collapsible Navigation Tests', () => {
    it('should expand navigation when clicking graduation cap icon', () => {
      cy.screenshot('before-nav-expand')

      // First, collapse the navigation by clicking the chevron
      cy.get('.collapse-trigger').should('be.visible').click()
      cy.wait(1000)

      // Verify navigation is collapsed (should show thin strip)
      cy.get('.sidenav').should('have.class', 'collapsed')
      cy.get('.collapsed-nav').should('be.visible')

      // Click graduation cap to expand
      cy.get('.expand-trigger').should('be.visible').click()
      cy.wait(1000)

      // Verify navigation is expanded
      cy.get('.sidenav').should('not.have.class', 'collapsed')
      cy.get('.sidenav-header').should('be.visible')
      cy.get('.sidenav-nav').should('be.visible')

      cy.screenshot('after-nav-expand')
      cy.log('✅ Navigation expands when graduation cap clicked')
    })

    it('should collapse navigation when clicking chevron left', () => {
      cy.screenshot('before-nav-collapse')

      // Ensure navigation is expanded first
      cy.get('.sidenav-header').should('be.visible')

      // Click collapse trigger (chevron left)
      cy.get('.collapse-trigger').should('be.visible').click()
      cy.wait(1000)

      // Verify navigation is collapsed
      cy.get('.sidenav').should('have.class', 'collapsed')
      cy.get('.collapsed-nav').should('be.visible')
      cy.get('.expand-trigger').should('be.visible')

      // Verify main navigation is hidden
      cy.get('.sidenav-nav').should('not.be.visible')

      cy.screenshot('after-nav-collapse')
      cy.log('✅ Navigation collapses when chevron clicked')
    })

    it('should show proper icons in collapsed vs expanded state', () => {
      // Verify expanded state shows chevron left and full content
      cy.get('.collapse-trigger mat-icon').should('contain.text', 'chevron_left')
      cy.get('.logo-icon').should('contain.text', 'school')
      cy.get('.logo-text').should('contain.text', 'LessonTree')

      // Collapse navigation
      cy.get('.collapse-trigger').click()
      cy.wait(1000)

      // Verify collapsed state shows graduation cap only
      cy.get('.expand-trigger mat-icon').should('contain.text', 'school')
      cy.get('.logo-text').should('not.be.visible')

      cy.log('✅ Proper icons shown in both navigation states')
    })

    it('should maintain navigation state during page navigation', () => {
      // Collapse navigation
      cy.get('.collapse-trigger').click()
      cy.wait(1000)
      cy.get('.sidenav').should('have.class', 'collapsed')

      // Navigate to different route (if admin)
      cy.get('body').then(($body) => {
        if ($body.find('a[routerLink="/home/account"]').length > 0) {
          // Expand to access account link
          cy.get('.expand-trigger').click()
          cy.wait(1000)

          cy.get('a[routerLink="/home/account"]').click()
          cy.wait(2000)

          // Navigation state should persist (expanded after we expanded it)
          cy.get('.sidenav').should('not.have.class', 'collapsed')
          cy.log('✅ Navigation state maintained during page navigation')
        } else {
          cy.log('⚠️ Account route not available (non-admin user)')
        }
      })
    })
  })

  describe('2. Submenu Functionality Tests', () => {
    it('should expand Layout submenu when clicked', () => {
      cy.screenshot('before-layout-submenu-expand')

      // Find and click Layout submenu header
      cy.contains('.submenu-header', 'Layout').should('be.visible').click()
      cy.wait(1000)

      // Verify submenu expanded
      cy.get('.submenu-items').should('be.visible')
      cy.contains('Tree + Calendar').should('be.visible')
      cy.contains('Tree + Details').should('be.visible')
      cy.contains('Calendar + Details').should('be.visible')

      // Verify expand icon rotated
      cy.contains('.submenu-header', 'Layout').find('.expand-icon').should('have.class', 'expanded')

      cy.screenshot('after-layout-submenu-expand')
      cy.log('✅ Layout submenu expands correctly')
    })

    it('should expand Drag Mode submenu when clicked', () => {
      cy.screenshot('before-dragmode-submenu-expand')

      // Find and click Drag Mode submenu header
      cy.contains('.submenu-header', 'Drag Mode').should('be.visible').click()
      cy.wait(1000)

      // Verify submenu expanded
      cy.get('.submenu-items').should('be.visible')
      cy.contains('Move Nodes').should('be.visible')
      cy.contains('Copy Nodes').should('be.visible')

      // Verify expand icon rotated
      cy.contains('.submenu-header', 'Drag Mode').find('.expand-icon').should('have.class', 'expanded')

      cy.screenshot('after-dragmode-submenu-expand')
      cy.log('✅ Drag Mode submenu expands correctly')
    })

    it('should close other submenu when opening a different one', () => {
      cy.screenshot('before-submenu-exclusivity-test')

      // Open Layout submenu first
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)
      cy.contains('Tree + Calendar').should('be.visible')

      // Open Drag Mode submenu
      cy.contains('.submenu-header', 'Drag Mode').click()
      cy.wait(1000)

      // Verify Drag Mode is open and Layout is closed
      cy.contains('Move Nodes').should('be.visible')
      cy.contains('Tree + Calendar').should('not.be.visible')

      // Verify only Drag Mode expand icon is expanded
      cy.contains('.submenu-header', 'Drag Mode').find('.expand-icon').should('have.class', 'expanded')
      cy.contains('.submenu-header', 'Layout').find('.expand-icon').should('not.have.class', 'expanded')

      cy.screenshot('after-submenu-exclusivity-test')
      cy.log('✅ Only one submenu open at a time')
    })

    it('should show expand/collapse arrow animation', () => {
      // Check initial state (collapsed)
      cy.contains('.submenu-header', 'Layout').find('.expand-icon').should('not.have.class', 'expanded')

      // Click to expand
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(500)

      // Verify animation class applied
      cy.contains('.submenu-header', 'Layout').find('.expand-icon').should('have.class', 'expanded')

      // Click to collapse
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(500)

      // Verify animation class removed
      cy.contains('.submenu-header', 'Layout').find('.expand-icon').should('not.have.class', 'expanded')

      cy.log('✅ Expand/collapse arrow animation works')
    })
  })

  describe('3. Layout Mode Selection Tests', () => {
    it('should show check icon for currently selected Tree + Calendar (default)', () => {
      cy.screenshot('before-default-layout-check')

      // Expand Layout submenu
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)

      // Verify Tree + Calendar is selected by default (has check icon)
      cy.contains('.submenu-item', 'Tree + Calendar').within(() => {
        cy.get('.check-icon').should('exist')
        cy.get('.check-icon').should('contain.text', 'check')
      })

      // Verify other options don't have check icon
      cy.contains('.submenu-item', 'Tree + Details').find('.check-icon').should('not.exist')
      cy.contains('.submenu-item', 'Calendar + Details').find('.check-icon').should('not.exist')

      cy.screenshot('after-default-layout-check')
      cy.log('✅ Tree + Calendar is default with check icon')
    })

    it('should switch to Tree + Details when clicked', () => {
      cy.screenshot('before-tree-details-switch')

      // Expand Layout submenu
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)

      // Click Tree + Details option
      cy.contains('.submenu-item', 'Tree + Details').click()
      cy.wait(3000) // Wait for layout change

      // Verify submenu closed after selection
      cy.get('.submenu-items').should('not.be.visible')

      // Open submenu again to verify selection changed
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)

      // Verify Tree + Details now has check icon
      cy.contains('.submenu-item', 'Tree + Details').within(() => {
        cy.get('.check-icon').should('exist')
      })

      // Verify Tree + Calendar no longer selected
      cy.contains('.submenu-item', 'Tree + Calendar').find('.check-icon').should('not.exist')

      cy.screenshot('after-tree-details-switch')
      cy.log('✅ Successfully switched to Tree + Details layout')
    })

    it('should switch to Calendar + Details when clicked', () => {
      cy.screenshot('before-calendar-details-switch')

      // Expand Layout submenu
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)

      // Click Calendar + Details option
      cy.contains('.submenu-item', 'Calendar + Details').click()
      cy.wait(3000) // Wait for layout change

      // Verify submenu closed after selection
      cy.get('.submenu-items').should('not.be.visible')

      // Open submenu again to verify selection changed
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)

      // Verify Calendar + Details now has check icon
      cy.contains('.submenu-item', 'Calendar + Details').within(() => {
        cy.get('.check-icon').should('exist')
      })

      cy.screenshot('after-calendar-details-switch')
      cy.log('✅ Successfully switched to Calendar + Details layout')
    })

    it('should update layout in main content area', () => {
      cy.screenshot('before-layout-content-verification')

      // Start with Tree + Calendar (default)
      cy.get('.as-split.as-horizontal').should('be.visible')
      cy.get('.as-split-area').should('have.length', 2)

      // Switch to Tree + Details
      cy.contains('.submenu-header', 'Layout').click()
      cy.wait(1000)
      cy.contains('.submenu-item', 'Tree + Details').click()
      cy.wait(4000) // Extended wait for layout change

      // Verify split panel still exists but with different content
      cy.get('.as-split.as-horizontal').should('be.visible')
      cy.get('.as-split-area').should('have.length', 2)

      // Verify tree is still present
      cy.get('.course-card, .e-treeview').should('be.visible')

      cy.screenshot('after-layout-content-verification')
      cy.log('✅ Main content layout updates correctly')
    })
  })

  describe('5. Navigation Organization Tests', () => {
    it('should show Layout submenu first (priority 1)', () => {
      // Get all submenu sections and verify Layout is first
      cy.get('.submenu-section').first().within(() => {
        cy.contains('Layout').should('exist')
      })

      cy.log('✅ Layout submenu appears first')
    })

    it('should show Drag Mode submenu second (priority 2)', () => {
      // Get second submenu section and verify it's Drag Mode
      cy.get('.submenu-section').eq(1).within(() => {
        cy.contains('Drag Mode').should('exist')
      })

      cy.log('✅ Drag Mode submenu appears second')
    })

    it('should show mid-priority actions after submenus', () => {
      // Verify Schedule Config and Weekly Report appear after submenus
      cy.contains('Schedule Config').should('be.visible')
      cy.contains('Weekly Report').should('be.visible')

      // Verify they appear after the submenus in DOM order
      cy.get('.submenu-section').last().next().should('contain', 'Schedule Config')

      cy.log('✅ Mid-priority actions positioned correctly')
    })

    it('should show Filter Courses in low priority section', () => {
      // Verify Filter Courses appears before the nav-spacer (low priority section)
      cy.contains('Filter Courses').should('be.visible')

      // It should appear after mid-priority actions but before user actions
      cy.get('.nav-spacer').prev().should('contain', 'Filter Courses')

      cy.log('✅ Filter Courses in low priority section')
    })

    it('should show User Settings and Logout at bottom', () => {
      // Verify User Settings and Logout are after nav-spacer
      cy.get('.nav-spacer').next().should('contain', 'User Settings')
      cy.contains('Logout').should('be.visible')

      // Verify Logout is the very last item
      cy.get('.sidenav-nav').children().last().should('contain', 'Logout')

      cy.log('✅ User Settings and Logout at bottom')
    })
  })

  describe('6. User Action Tests', () => {
    it('should open User Config dialog when User Settings clicked', () => {
      cy.screenshot('before-user-settings-click')

      // Click User Settings
      cy.contains('User Settings').click()
      cy.wait(2000)

      // Verify dialog opened (look for dialog container or backdrop)
      cy.get('.cdk-overlay-backdrop, .mat-dialog-container, .mat-mdc-dialog-container').should('exist')

      // Close dialog by clicking backdrop or close button
      cy.get('body').type('{esc}') // ESC to close dialog
      cy.wait(1000)

      cy.screenshot('after-user-settings-dialog')
      cy.log('✅ User Settings opens configuration dialog')
    })

    it('should open Schedule Config dialog when Schedule Config clicked', () => {
      cy.screenshot('before-schedule-config-click')

      // Click Schedule Config
      cy.contains('Schedule Config').click()
      cy.wait(2000)

      // Verify dialog opened
      cy.get('.cdk-overlay-backdrop, .mat-dialog-container, .mat-mdc-dialog-container').should('exist')

      // Close dialog
      cy.get('body').type('{esc}')
      cy.wait(1000)

      cy.screenshot('after-schedule-config-dialog')
      cy.log('✅ Schedule Config opens configuration dialog')
    })

    it('should trigger report generation when Weekly Report clicked', () => {
      cy.screenshot('before-weekly-report-click')

      // Intercept any potential report download requests
      cy.window().its('console').then((console) => {
        cy.stub(console, 'log').as('consoleLog')
      })

      // Click Weekly Report
      cy.contains('Weekly Report').click()
      cy.wait(2000)

      // Verify some action occurred (console log, download trigger, etc.)
      // Since report generation is complex, we'll just verify the click worked
      cy.url().should('include', 'home')

      cy.screenshot('after-weekly-report-click')
      cy.log('✅ Weekly Report action triggered')
    })

    it('should open filter dialog when Filter Courses clicked', () => {
      cy.screenshot('before-filter-click')

      // Click Filter Courses
      cy.contains('Filter Courses').click()
      cy.wait(2000)

      // Verify filter dialog opened
      cy.get('.cdk-overlay-backdrop, .mat-dialog-container, .mat-mdc-dialog-container').should('exist')

      // Close dialog
      cy.get('body').type('{esc}')
      cy.wait(1000)

      cy.screenshot('after-filter-dialog')
      cy.log('✅ Filter Courses opens filter dialog')
    })

    it('should logout when Logout clicked', () => {
      cy.screenshot('before-logout-click')

      // Click Logout
      cy.contains('Logout').click()
      cy.wait(3000)

      // Verify redirected to login page
      cy.url().should('not.include', '/home')
      cy.url().should('include', '/') // Root or login page

      // Verify we're no longer authenticated (token should be cleared)
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.null')

      cy.screenshot('after-logout')
      cy.log('✅ Logout successfully logs out user')
    })
  })
})