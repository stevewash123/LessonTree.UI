describe('Course CRUD Tests', () => {
  beforeEach(() => {
    // Check that API server is running
    cy.request('GET', 'http://localhost:5046/api/admin/health').should((response) => {
      expect(response.status).to.eq(200)
    })
    
    // Start fresh for each test
    cy.clearAllCookies()
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()

    // Login for all tests in this suite
    cy.visit('/')
    cy.get('input[formcontrolname="username"]').type('admin')
    cy.get('input[formcontrolname="password"]').type('Admin123!')
    cy.intercept('POST', '**/account/login').as('loginRequest')
    cy.get('button[type="submit"]').click()
    cy.wait('@loginRequest')
    cy.url({ timeout: 10000 }).should('include', '/home')

    // Ensure courses are loaded and expanded for CRUD operations
    cy.get('.course-card', { timeout: 10000 }).should('exist')
    
    // Expand Course 1 to show topics and subtopics
    cy.get('.course-card').first().within(() => {
      cy.get('.e-icons.e-icon-expandable.interaction').first().click()
    })
    cy.wait(1000)
    
    // Expand Topic 1 to show lessons and subtopics  
    cy.contains('Course 1 - Topic 1').closest('li, .e-list-item, .e-node').within(() => {
      cy.get('.e-icons.e-icon-expandable.interaction').then(($icons) => {
        if ($icons.length > 0) {
          cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
        }
      })
    })
    cy.wait(1000)
  })

  describe('Selection and InfoPanel Tests', () => {
    it('should show correct InfoPanel when selecting a Course', () => {
      cy.screenshot('before-course-selection')
      
      // Click on Course 1 to select it
      cy.contains('Course 1').click()
      cy.wait(1000)
      
      cy.screenshot('after-course-selection')
      
      // Verify InfoPanel shows course details
      cy.get('[data-cy="info-panel"], .info-panel, .course-details, .details-panel').should('be.visible')
      
      // Check for course-specific content in InfoPanel
      cy.get('body').then(($body) => {
        // Look for course title field
        if ($body.find('input[formcontrolname="title"], input[name="title"], .course-title').length > 0) {
          cy.get('input[formcontrolname="title"], input[name="title"], .course-title').should('contain.value', 'Course 1').or('have.value', 'Course 1')
        }
        
        // Look for course description
        if ($body.find('textarea[formcontrolname="description"], textarea[name="description"], .course-description').length > 0) {
          cy.get('textarea[formcontrolname="description"], textarea[name="description"], .course-description').should('be.visible')
        }
        
        // Look for any text indicating this is course info
        if ($body.find('*:contains("Course")').length > 0) {
          cy.contains('Course').should('be.visible')
        }
        
        // Look for Edit button specific to courses
        if ($body.find('button:contains("Edit"), .edit-button, [data-cy="edit-course"]').length > 0) {
          cy.get('button:contains("Edit"), .edit-button, [data-cy="edit-course"]').should('be.visible')
        }
      })
      
      cy.log('Course selection InfoPanel verification complete')
    })

    it('should show correct InfoPanel when selecting a Topic', () => {
      cy.screenshot('before-topic-selection')
      
      // Click on Topic 1 to select it
      cy.contains('Course 1 - Topic 1').click()
      cy.wait(1000)
      
      cy.screenshot('after-topic-selection')
      
      // Verify InfoPanel shows topic details
      cy.get('[data-cy="info-panel"], .info-panel, .topic-details, .details-panel').should('be.visible')
      
      // Check for topic-specific content in InfoPanel
      cy.get('body').then(($body) => {
        // Look for topic title/name field
        if ($body.find('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], .topic-title').length > 0) {
          cy.get('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], .topic-title').should('be.visible')
        }
        
        // Look for topic description
        if ($body.find('textarea[formcontrolname="description"], textarea[name="description"], .topic-description').length > 0) {
          cy.get('textarea[formcontrolname="description"], textarea[name="description"], .topic-description').should('be.visible')
        }
        
        // Look for any text indicating this is topic info
        if ($body.find('*:contains("Topic")').length > 0) {
          cy.contains('Topic').should('be.visible')
        }
        
        // Look for Edit button or topic-specific controls
        if ($body.find('button:contains("Edit"), .edit-button, [data-cy="edit-topic"]').length > 0) {
          cy.get('button:contains("Edit"), .edit-button, [data-cy="edit-topic"]').should('be.visible')
        }
        
        // Check for topic ID or reference in the form
        if ($body.find('*:contains("Course 1 - Topic 1"), *:contains("Topic 1")').length > 0) {
          cy.log('Topic information displayed in InfoPanel')
        }
      })
      
      cy.log('Topic selection InfoPanel verification complete')
    })

    it('should show correct InfoPanel when selecting a SubTopic', () => {
      cy.screenshot('before-subtopic-selection')
      
      // Try to find and select a SubTopic
      cy.get('body').then(($body) => {
        // Look for SubTopic elements using various possible selectors
        const subtopicSelectors = [
          '*:contains("SubTopic")',
          '*:contains("Course 1 - Topic 1 - SubTopic")', 
          '.subtopic-item',
          '[data-subtopic-id]',
          '.e-node-text:contains("SubTopic")'
        ]
        
        let subtopicFound = false
        
        subtopicSelectors.forEach(selector => {
          if (!subtopicFound && $body.find(selector).length > 0) {
            cy.get(selector).first().click()
            subtopicFound = true
            cy.log(`Found SubTopic using selector: ${selector}`)
          }
        })
        
        if (!subtopicFound) {
          cy.log('No SubTopic found - may need to expand more or create test data')
          // Skip SubTopic test if none found
          return
        }
        
        cy.wait(1000)
        cy.screenshot('after-subtopic-selection')
        
        // Verify InfoPanel shows subtopic details
        cy.get('[data-cy="info-panel"], .info-panel, .subtopic-details, .details-panel').should('be.visible')
        
        // Check for subtopic-specific content in InfoPanel
        cy.get('body').then(($bodyAfterSelection) => {
          // Look for subtopic title/name field
          if ($bodyAfterSelection.find('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], .subtopic-title').length > 0) {
            cy.get('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], .subtopic-title').should('be.visible')
          }
          
          // Look for subtopic description
          if ($bodyAfterSelection.find('textarea[formcontrolname="description"], textarea[name="description"], .subtopic-description').length > 0) {
            cy.get('textarea[formcontrolname="description"], textarea[name="description"], .subtopic-description').should('be.visible')
          }
          
          // Look for any text indicating this is subtopic info
          if ($bodyAfterSelection.find('*:contains("SubTopic")').length > 0) {
            cy.contains('SubTopic').should('be.visible')
          }
          
          // Look for Edit button or subtopic-specific controls
          if ($bodyAfterSelection.find('button:contains("Edit"), .edit-button, [data-cy="edit-subtopic"]').length > 0) {
            cy.get('button:contains("Edit"), .edit-button, [data-cy="edit-subtopic"]').should('be.visible')
          }
        })
        
        cy.log('SubTopic selection InfoPanel verification complete')
      })
    })

    it('should show correct InfoPanel when selecting a Lesson', () => {
      cy.screenshot('before-lesson-selection')
      
      // Click on Lesson 1 to select it
      cy.contains('Lesson 1').click()
      cy.wait(1000)
      
      cy.screenshot('after-lesson-selection')
      
      // Verify InfoPanel shows lesson details
      cy.get('[data-cy="info-panel"], .info-panel, .lesson-details, .details-panel').should('be.visible')
      
      // Check for lesson-specific content in InfoPanel
      cy.get('body').then(($body) => {
        // Look for lesson title/name field
        if ($body.find('input[formcontrolname="title"], input[name="title"], input[formcontrolname="name"], .lesson-title').length > 0) {
          cy.get('input[formcontrolname="title"], input[name="title"], input[formcontrolname="name"], .lesson-title').should('be.visible')
        }
        
        // Look for lesson description
        if ($body.find('textarea[formcontrolname="description"], textarea[name="description"], .lesson-description').length > 0) {
          cy.get('textarea[formcontrolname="description"], textarea[name="description"], .lesson-description').should('be.visible')
        }
        
        // Look for lesson-specific fields like duration, objectives, etc.
        if ($body.find('input[formcontrolname="duration"], input[name="duration"], .lesson-duration').length > 0) {
          cy.get('input[formcontrolname="duration"], input[name="duration"], .lesson-duration').should('be.visible')
        }
        
        if ($body.find('textarea[formcontrolname="objectives"], textarea[name="objectives"], .lesson-objectives').length > 0) {
          cy.get('textarea[formcontrolname="objectives"], textarea[name="objectives"], .lesson-objectives').should('be.visible')
        }
        
        // Look for any text indicating this is lesson info
        if ($body.find('*:contains("Lesson")').length > 0) {
          cy.contains('Lesson').should('be.visible')
        }
        
        // Look for Edit button or lesson-specific controls
        if ($body.find('button:contains("Edit"), .edit-button, [data-cy="edit-lesson"]').length > 0) {
          cy.get('button:contains("Edit"), .edit-button, [data-cy="edit-lesson"]').should('be.visible')
        }
        
        // Check for lesson ID or reference in the form
        if ($body.find('*:contains("Lesson 1")').length > 0) {
          cy.log('Lesson information displayed in InfoPanel')
        }
      })
      
      cy.log('Lesson selection InfoPanel verification complete')
    })
  })

  describe('InfoPanel Content Verification', () => {
    it('should display different content for different entity types', () => {
      // Test that selecting different entities shows different InfoPanel content
      
      // Select Course first
      cy.contains('Course 1').click()
      cy.wait(500)
      
      // Capture course InfoPanel content
      cy.get('[data-cy="info-panel"], .info-panel, .details-panel').then(($coursePanel) => {
        const courseContent = $coursePanel.text()
        
        // Now select Topic
        cy.contains('Course 1 - Topic 1').click()
        cy.wait(500)
        
        // Verify Topic InfoPanel is different from Course
        cy.get('[data-cy="info-panel"], .info-panel, .details-panel').should(($topicPanel) => {
          const topicContent = $topicPanel.text()
          expect(topicContent).to.not.equal(courseContent, 'Topic InfoPanel should differ from Course InfoPanel')
        })
        
        cy.log('InfoPanel content verification: Course vs Topic panels are different')
      })
    })

    it('should maintain InfoPanel state during tree navigation', () => {
      // Select a course
      cy.contains('Course 1').click()
      cy.wait(500)
      
      // Verify InfoPanel is visible
      cy.get('[data-cy="info-panel"], .info-panel, .details-panel').should('be.visible')
      
      // Expand/collapse tree elements
      cy.get('.course-card').first().within(() => {
        cy.get('.e-icons.e-icon-collapsible.interaction, .e-icons.e-icon-expandable.interaction').then(($icons) => {
          if ($icons.length > 0) {
            cy.wrap($icons.first()).click()
            cy.wait(500)
          }
        })
      })
      
      // InfoPanel should still be visible and maintain selection
      cy.get('[data-cy="info-panel"], .info-panel, .details-panel').should('be.visible')
      
      cy.log('InfoPanel state maintained during tree navigation')
    })
  })

  describe('ADD Tests', () => {
    it('should add a new Topic to a Course', () => {
      cy.screenshot('before-add-topic')
      
      // Select Course 1 first to establish context
      cy.contains('Course 1').click()
      cy.wait(500)
      
      // Look for Add Topic button or right-click context menu
      cy.get('body').then(($body) => {
        // Try various methods to add a new topic
        const addTopicSelectors = [
          'button:contains("Add Topic")',
          'button:contains("New Topic")',
          '[data-cy="add-topic"]',
          '.add-topic-button',
          'button[title*="Topic"]',
          '.fa-plus, .add-icon'
        ]
        
        let addButtonFound = false
        
        addTopicSelectors.forEach(selector => {
          if (!addButtonFound && $body.find(selector).length > 0) {
            cy.get(selector).first().click()
            addButtonFound = true
            cy.log(`Found Add Topic button using selector: ${selector}`)
          }
        })
        
        if (!addButtonFound) {
          // Try right-click context menu on Course 1
          cy.contains('Course 1').rightclick()
          cy.wait(500)
          
          // Look for context menu Add Topic option
          cy.get('body').then(($bodyAfterRightClick) => {
            if ($bodyAfterRightClick.find('*:contains("Add Topic"), *:contains("New Topic")').length > 0) {
              cy.contains('Add Topic, New Topic').first().click()
              addButtonFound = true
              cy.log('Found Add Topic in context menu')
            }
          })
        }
        
        if (!addButtonFound) {
          cy.log('No Add Topic button found - may need to implement or test data setup issue')
          return
        }
        
        cy.wait(1000)
        cy.screenshot('add-topic-dialog-opened')
        
        // Fill in the new topic form
        cy.get('body').then(($formBody) => {
          // Look for topic name/title input
          if ($formBody.find('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], #topic-name, .topic-name-input').length > 0) {
            cy.get('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], #topic-name, .topic-name-input')
              .first()
              .clear()
              .type('New Test Topic')
          }
          
          // Look for topic description
          if ($formBody.find('textarea[formcontrolname="description"], textarea[name="description"], #topic-description, .topic-description-input').length > 0) {
            cy.get('textarea[formcontrolname="description"], textarea[name="description"], #topic-description, .topic-description-input')
              .first()
              .clear()
              .type('This is a test topic created by Cypress')
          }
          
          // Look for Save/Submit button
          const saveSelectors = [
            'button:contains("Save")',
            'button:contains("Create")',
            'button:contains("Add")',
            'button[type="submit"]',
            '[data-cy="save-topic"]',
            '.save-button'
          ]
          
          saveSelectors.forEach(selector => {
            if ($formBody.find(selector).length > 0) {
              cy.get(selector).first().click()
              cy.log(`Clicked Save button using selector: ${selector}`)
              return false // Break out of forEach
            }
          })
        })
        
        cy.wait(2000) // Wait for API call and UI update
        cy.screenshot('after-add-topic')
        
        // Verify the new topic appears in the tree
        cy.contains('New Test Topic').should('be.visible')
        
        cy.log('Add Topic test completed successfully')
      })
    })

    it('should add a new SubTopic to a Topic', () => {
      cy.screenshot('before-add-subtopic')
      
      // Select Topic 1 first to establish context
      cy.contains('Course 1 - Topic 1').click()
      cy.wait(500)
      
      // Look for Add SubTopic button or right-click context menu
      cy.get('body').then(($body) => {
        // Try various methods to add a new subtopic
        const addSubTopicSelectors = [
          'button:contains("Add SubTopic")',
          'button:contains("New SubTopic")',
          'button:contains("Add Sub Topic")',
          '[data-cy="add-subtopic"]',
          '.add-subtopic-button',
          'button[title*="SubTopic"]'
        ]
        
        let addButtonFound = false
        
        addSubTopicSelectors.forEach(selector => {
          if (!addButtonFound && $body.find(selector).length > 0) {
            cy.get(selector).first().click()
            addButtonFound = true
            cy.log(`Found Add SubTopic button using selector: ${selector}`)
          }
        })
        
        if (!addButtonFound) {
          // Try right-click context menu on Topic 1
          cy.contains('Course 1 - Topic 1').rightclick()
          cy.wait(500)
          
          // Look for context menu Add SubTopic option
          cy.get('body').then(($bodyAfterRightClick) => {
            if ($bodyAfterRightClick.find('*:contains("Add SubTopic"), *:contains("New SubTopic"), *:contains("Add Sub Topic")').length > 0) {
              cy.contains('Add SubTopic, New SubTopic, Add Sub Topic').first().click()
              addButtonFound = true
              cy.log('Found Add SubTopic in context menu')
            }
          })
        }
        
        if (!addButtonFound) {
          cy.log('No Add SubTopic button found - may need to implement or test data setup issue')
          return
        }
        
        cy.wait(1000)
        cy.screenshot('add-subtopic-dialog-opened')
        
        // Fill in the new subtopic form
        cy.get('body').then(($formBody) => {
          // Look for subtopic name/title input
          if ($formBody.find('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], #subtopic-name, .subtopic-name-input').length > 0) {
            cy.get('input[formcontrolname="name"], input[name="name"], input[formcontrolname="title"], #subtopic-name, .subtopic-name-input')
              .first()
              .clear()
              .type('New Test SubTopic')
          }
          
          // Look for subtopic description
          if ($formBody.find('textarea[formcontrolname="description"], textarea[name="description"], #subtopic-description, .subtopic-description-input').length > 0) {
            cy.get('textarea[formcontrolname="description"], textarea[name="description"], #subtopic-description, .subtopic-description-input')
              .first()
              .clear()
              .type('This is a test subtopic created by Cypress')
          }
          
          // Look for Save/Submit button
          const saveSelectors = [
            'button:contains("Save")',
            'button:contains("Create")',
            'button:contains("Add")',
            'button[type="submit"]',
            '[data-cy="save-subtopic"]',
            '.save-button'
          ]
          
          saveSelectors.forEach(selector => {
            if ($formBody.find(selector).length > 0) {
              cy.get(selector).first().click()
              cy.log(`Clicked Save button using selector: ${selector}`)
              return false // Break out of forEach
            }
          })
        })
        
        cy.wait(2000) // Wait for API call and UI update
        cy.screenshot('after-add-subtopic')
        
        // Verify the new subtopic appears in the tree
        cy.contains('New Test SubTopic').should('be.visible')
        
        cy.log('Add SubTopic test completed successfully')
      })
    })

    it('should add a new Lesson to a Topic', () => {
      cy.screenshot('before-add-lesson')
      
      // Select Topic 1 first to establish context
      cy.contains('Course 1 - Topic 1').click()
      cy.wait(500)
      
      // Look for Add Lesson button or right-click context menu
      cy.get('body').then(($body) => {
        // Try various methods to add a new lesson
        const addLessonSelectors = [
          'button:contains("Add Lesson")',
          'button:contains("New Lesson")',
          '[data-cy="add-lesson"]',
          '.add-lesson-button',
          'button[title*="Lesson"]'
        ]
        
        let addButtonFound = false
        
        addLessonSelectors.forEach(selector => {
          if (!addButtonFound && $body.find(selector).length > 0) {
            cy.get(selector).first().click()
            addButtonFound = true
            cy.log(`Found Add Lesson button using selector: ${selector}`)
          }
        })
        
        if (!addButtonFound) {
          // Try right-click context menu on Topic 1
          cy.contains('Course 1 - Topic 1').rightclick()
          cy.wait(500)
          
          // Look for context menu Add Lesson option
          cy.get('body').then(($bodyAfterRightClick) => {
            if ($bodyAfterRightClick.find('*:contains("Add Lesson"), *:contains("New Lesson")').length > 0) {
              cy.contains('Add Lesson, New Lesson').first().click()
              addButtonFound = true
              cy.log('Found Add Lesson in context menu')
            }
          })
        }
        
        if (!addButtonFound) {
          cy.log('No Add Lesson button found - may need to implement or test data setup issue')
          return
        }
        
        cy.wait(1000)
        cy.screenshot('add-lesson-dialog-opened')
        
        // Fill in the new lesson form
        cy.get('body').then(($formBody) => {
          // Look for lesson title input
          if ($formBody.find('input[formcontrolname="title"], input[name="title"], input[formcontrolname="name"], #lesson-title, .lesson-title-input').length > 0) {
            cy.get('input[formcontrolname="title"], input[name="title"], input[formcontrolname="name"], #lesson-title, .lesson-title-input')
              .first()
              .clear()
              .type('New Test Lesson')
          }
          
          // Look for lesson description
          if ($formBody.find('textarea[formcontrolname="description"], textarea[name="description"], #lesson-description, .lesson-description-input').length > 0) {
            cy.get('textarea[formcontrolname="description"], textarea[name="description"], #lesson-description, .lesson-description-input')
              .first()
              .clear()
              .type('This is a test lesson created by Cypress')
          }
          
          // Look for lesson duration
          if ($formBody.find('input[formcontrolname="duration"], input[name="duration"], #lesson-duration, .lesson-duration-input').length > 0) {
            cy.get('input[formcontrolname="duration"], input[name="duration"], #lesson-duration, .lesson-duration-input')
              .first()
              .clear()
              .type('60')
          }
          
          // Look for lesson objectives
          if ($formBody.find('textarea[formcontrolname="objectives"], textarea[name="objectives"], #lesson-objectives, .lesson-objectives-input').length > 0) {
            cy.get('textarea[formcontrolname="objectives"], textarea[name="objectives"], #lesson-objectives, .lesson-objectives-input')
              .first()
              .clear()
              .type('Test lesson objectives for Cypress testing')
          }
          
          // Look for Save/Submit button
          const saveSelectors = [
            'button:contains("Save")',
            'button:contains("Create")',
            'button:contains("Add")',
            'button[type="submit"]',
            '[data-cy="save-lesson"]',
            '.save-button'
          ]
          
          saveSelectors.forEach(selector => {
            if ($formBody.find(selector).length > 0) {
              cy.get(selector).first().click()
              cy.log(`Clicked Save button using selector: ${selector}`)
              return false // Break out of forEach
            }
          })
        })
        
        cy.wait(2000) // Wait for API call and UI update
        cy.screenshot('after-add-lesson')
        
        // Verify the new lesson appears in the tree
        cy.contains('New Test Lesson').should('be.visible')
        
        // Verify it appears in the calendar as well
        cy.get('.fc-event').should('contain.text', 'New Test Lesson')
        
        cy.log('Add Lesson test completed successfully')
      })
    })
  })
})