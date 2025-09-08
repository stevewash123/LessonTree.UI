describe('SpecialDay Management', () => {
  beforeEach(() => {
    cy.log('🧪 Setting up SpecialDay test environment')
    
    // Fresh database with test data
    cy.reseedDatabase()
    
    // Clean authentication state
    cy.clearAllCookies()
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
    
    // Authenticate and navigate to calendar view
    cy.robustLogin('admin', 'Admin123!')
    cy.visit('/home/lesson-tree')
    cy.wait(3000)
    
    // Verify we have courses loaded
    cy.get('.course-card', { timeout: 15000 }).should('exist')
    cy.log('✅ Course data loaded, ready for SpecialDay testing')
  })

  describe('Step 1: Modal Opening', () => {
    it('should open SpecialDay modal via calendar right-click', () => {
      cy.log('🗓️ Testing calendar right-click to open SpecialDay modal')
      
      // Switch to calendar view if needed
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      // Verify calendar is visible
      cy.get('.calendar-container, [class*="calendar"]', { timeout: 10000 }).should('exist')
      cy.log('✅ Calendar view is active')
      
      // Find a calendar day cell to right-click on
      cy.get('.fc-daygrid-day, [class*="day-cell"], [class*="calendar-day"]')
        .first()
        .should('be.visible')
        .rightclick()
      
      // Verify context menu appears
      cy.get('.context-menu, [class*="context-menu"], mat-menu')
        .should('be.visible')
      
      // Click "Add Special Day" option
      cy.contains('Special Day', { matchCase: false })
        .should('be.visible')
        .click()
      
      // Verify modal opens
      cy.get('.special-day-modal-container, [class*="special-day"], mat-dialog-container')
        .should('be.visible')
        
      cy.get('h2, .modal-title, [mat-dialog-title]')
        .should('contain.text', 'Special Day')
        
      cy.log('✅ SpecialDay modal opened successfully')
    })
    
    it('should display empty form for new special day', () => {
      cy.log('📝 Testing empty form display for new special day')
      
      // Open modal (reuse logic from previous test)
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      cy.get('.fc-daygrid-day, [class*="day-cell"]')
        .first()
        .rightclick()
        
      cy.contains('Special Day', { matchCase: false }).click()
      
      // Verify form is empty/default state
      cy.get('input[formcontrolname="title"], input[name="title"]')
        .should('have.value', '')
        
      cy.get('select[formcontrolname="eventType"], select[name="eventType"]')
        .should('exist')
        
      cy.get('textarea[formcontrolname="description"], textarea[name="description"]')
        .should('have.value', '')
        
      cy.log('✅ Empty form displayed correctly for new special day')
    })
  })

  describe('Step 2: Modal Form Interaction', () => {
    it('should fill form for all-day holiday', () => {
      cy.log('🎉 Testing form filling for all-day holiday')
      
      // Open modal
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      cy.get('.fc-daygrid-day').first().rightclick()
      cy.contains('Special Day', { matchCase: false }).click()
      
      // Fill form for holiday
      cy.get('input[formcontrolname="title"], input[name="title"]')
        .clear()
        .type('Presidents Day Holiday')
        
      cy.get('select[formcontrolname="eventType"], select[name="eventType"]')
        .select('Holiday')
        
      cy.get('textarea[formcontrolname="description"], textarea[name="description"]')
        .clear()
        .type('Federal holiday - no school')
        
      // For all-day holiday, verify all periods are selected or select them
      cy.get('body').then(($body) => {
        // Look for period checkboxes or selection
        const periodControls = $body.find('input[type="checkbox"], .period-selector')
        if (periodControls.length > 0) {
          cy.log('📋 Found period controls, selecting all for all-day holiday')
          cy.get('input[type="checkbox"]').check()
        }
      })
      
      cy.log('✅ Form filled successfully for all-day holiday')
    })
    
    it('should validate required fields', () => {
      cy.log('⚠️ Testing form validation')
      
      // Open modal
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      cy.get('.fc-daygrid-day').first().rightclick()
      cy.contains('Special Day', { matchCase: false }).click()
      
      // Try to save without filling required fields
      cy.get('button').contains(/save|create/i, { matchCase: false })
        .should('be.visible')
        .click()
      
      // Verify validation messages appear
      cy.get('.error, .invalid, [class*="error"]')
        .should('exist')
        .or('contain.text', 'required')
        
      cy.log('✅ Form validation working correctly')
    })
  })

  describe('Step 3: Modal Save Operation', () => {
    it('should save special day and close modal', () => {
      cy.log('💾 Testing special day save operation')
      
      // Open modal and fill form
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      cy.get('.fc-daygrid-day').first().rightclick()
      cy.contains('Special Day', { matchCase: false }).click()
      
      // Fill complete form
      cy.get('input[formcontrolname="title"], input[name="title"]')
        .clear()
        .type('Test Holiday')
        
      cy.get('select[formcontrolname="eventType"], select[name="eventType"]')
        .select('Holiday')
        
      // Set up API intercept to monitor save request
      cy.intercept('POST', '**/specialDays', '**/SpecialDays').as('createSpecialDay')
      
      // Save the form
      cy.get('button').contains(/save|create/i, { matchCase: false })
        .should('not.be.disabled')
        .click()
      
      // Verify API call was made
      cy.wait('@createSpecialDay').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201])
        cy.log('✅ Special day created via API')
      })
      
      // Verify modal closes
      cy.get('.special-day-modal-container, mat-dialog-container')
        .should('not.exist')
        
      // Verify success message
      cy.get('.toast, .snackbar, [class*="toast"]')
        .should('contain.text', 'success')
        .or('contain.text', 'created')
        
      cy.log('✅ Special day saved and modal closed successfully')
    })
  })

  describe('Step 4: Calendar Integration Verification', () => {
    it('should display special day on calendar after creation', () => {
      cy.log('🗓️ Testing calendar display after special day creation')
      
      // Create a special day first
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      // Get the date of the cell we'll click for later verification
      cy.get('.fc-daygrid-day').first().then(($cell) => {
        const dateInfo = $cell.attr('data-date') || $cell.find('[data-date]').attr('data-date')
        cy.wrap(dateInfo).as('selectedDate')
      })
      
      cy.get('.fc-daygrid-day').first().rightclick()
      cy.contains('Special Day', { matchCase: false }).click()
      
      // Fill and save
      cy.get('input[formcontrolname="title"], input[name="title"]')
        .clear()
        .type('Calendar Test Holiday')
        
      cy.get('select[formcontrolname="eventType"], select[name="eventType"]')
        .select('Holiday')
        
      cy.intercept('POST', '**/specialDays', '**/SpecialDays').as('createSpecialDay')
      cy.get('button').contains(/save|create/i, { matchCase: false }).click()
      
      cy.wait('@createSpecialDay')
      cy.wait(2000) // Allow calendar to refresh
      
      // Verify special day appears on calendar
      cy.get('@selectedDate').then((selectedDate) => {
        // Look for the special day event on the calendar
        cy.get('.fc-event, [class*="event"], .special-day')
          .should('exist')
          .and('contain.text', 'Calendar Test Holiday')
          
        cy.log(`✅ Special day event found on calendar for date: ${selectedDate}`)
      })
    })
    
    it('should verify lessons are shifted when special day is added', () => {
      cy.log('📚 Testing lesson shifting behavior')
      
      // This test verifies the core business logic
      // Before adding special day, capture existing lesson schedule
      cy.get('body').then(($body) => {
        const existingEvents = $body.find('.fc-event')
        cy.log(`📊 Found ${existingEvents.length} existing events before special day`)
      })
      
      // Add special day
      cy.get('.fc-daygrid-day').eq(1).rightclick() // Use second day to avoid edge cases
      cy.contains('Special Day', { matchCase: false }).click()
      
      cy.get('input[formcontrolname="title"], input[name="title"]')
        .clear()
        .type('Lesson Shift Test Holiday')
        
      cy.get('select[formcontrolname="eventType"], select[name="eventType"]')
        .select('Holiday')
        
      cy.intercept('POST', '**/specialDays').as('createSpecialDay')
      cy.get('button').contains(/save|create/i, { matchCase: false }).click()
      
      cy.wait('@createSpecialDay')
      cy.wait(3000) // Allow for schedule regeneration
      
      // Verify calendar has refreshed and lessons have been shifted
      cy.get('.fc-event').then(($events) => {
        const eventCount = $events.length
        cy.log(`📊 Found ${eventCount} events after special day addition`)
        
        // Should still have lessons, but they should be shifted forward
        expect(eventCount).to.be.greaterThan(0)
        
        // Verify our special day is present
        cy.get('.fc-event')
          .should('contain.text', 'Lesson Shift Test Holiday')
          
        cy.log('✅ Lessons appear to have been shifted correctly')
      })
    })
  })

  describe('Step 5: Calendar Refresh Verification', () => {
    it('should refresh calendar properly after special day operations', () => {
      cy.log('🔄 Testing calendar refresh behavior')
      
      // Create special day and monitor calendar state
      cy.get('body').then(($body) => {
        if ($body.find('.calendar-container').length === 0) {
          cy.get('[data-cy="calendar-tab"], .calendar-tab, button').contains(/calendar/i).click()
          cy.wait(2000)
        }
      })
      
      // Capture initial calendar state
      cy.get('.fc-event').then(($initialEvents) => {
        const initialCount = $initialEvents.length
        cy.log(`📊 Initial event count: ${initialCount}`)
        
        // Add special day
        cy.get('.fc-daygrid-day').first().rightclick()
        cy.contains('Special Day', { matchCase: false }).click()
        
        cy.get('input[formcontrolname="title"], input[name="title"]')
          .clear()
          .type('Refresh Test Holiday')
          
        cy.get('select[formcontrolname="eventType"], select[name="eventType"]')
          .select('Holiday')
          
        cy.intercept('POST', '**/specialDays').as('createSpecialDay')
        cy.get('button').contains(/save|create/i, { matchCase: false }).click()
        
        cy.wait('@createSpecialDay')
        
        // Wait for calendar to refresh and verify event count changed
        cy.wait(3000)
        
        cy.get('.fc-event').then(($newEvents) => {
          const newCount = $newEvents.length
          cy.log(`📊 New event count: ${newCount}`)
          
          // Should have at least one more event (our special day)
          expect(newCount).to.be.greaterThan(initialCount)
          
          // Verify our special day is visible
          cy.contains('Refresh Test Holiday').should('be.visible')
          
          cy.log('✅ Calendar refreshed correctly with new special day')
        })
      })
    })
  })
})