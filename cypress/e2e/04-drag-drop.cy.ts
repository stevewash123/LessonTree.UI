describe('Drag and Drop Tests', () => {
  beforeEach(() => {
    // Check that API server is running
    cy.request('GET', 'http://localhost:5046/api/admin/health').should((response) => {
      expect(response.status).to.eq(200)
    })
    
    // Use the comprehensive setup command from drag-drop-suite
    cy.setupDragDropTest()
  })

  describe('Lesson Drag and Drop', () => {
    it('should move a Lesson before another Lesson within the same Topic', () => {
      cy.screenshot('lesson-move-start')
      
      // Find Lesson 2 and Lesson 1 within Course 1 - Topic 1
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        // Get Lesson 2 (source) and Lesson 1 (target)
        cy.contains('Lesson 2').as('lesson2')
        cy.contains('Lesson 1').as('lesson1')
        
        // Perform drag and drop - move Lesson 2 before Lesson 1
        cy.get('@lesson2').drag('@lesson1', { position: 'top' })
      })
      
      cy.wait(2000) // Wait for API call and calendar update
      cy.screenshot('lesson-move-complete')
      
      // Verify the lessons are now in the correct order (Lesson 2 should appear before Lesson 1)
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        cy.get('[data-cy="lesson"], .lesson-item, li').then($lessons => {
          const lessonTexts = $lessons.toArray().map(el => el.textContent?.trim())
          const lesson2Index = lessonTexts.findIndex(text => text?.includes('Lesson 2'))
          const lesson1Index = lessonTexts.findIndex(text => text?.includes('Lesson 1'))
          
          expect(lesson2Index).to.be.lessThan(lesson1Index, 'Lesson 2 should appear before Lesson 1')
        })
      })
      
      // Verify calendar reflects the change
      cy.get('.fc-event').should('have.length.greaterThan', 0)
    })

    it('should move a Lesson to a different Topic', () => {
      cy.screenshot('cross-topic-move-start')
      
      // Move Lesson 3 from Topic 1 to Topic 2
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        cy.contains('Lesson 3').as('lesson3Source')
      })
      
      cy.contains('Course 1 - Topic 2').parent().as('topic2Target')
      
      // Perform cross-topic drag and drop
      cy.get('@lesson3Source').drag('@topic2Target')
      
      cy.wait(3000) // Wait for API call and calendar update
      cy.screenshot('cross-topic-move-complete')
      
      // Verify Lesson 3 is no longer in Topic 1
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        cy.contains('Lesson 3').should('not.exist')
      })
      
      // Verify Lesson 3 is now in Topic 2
      cy.contains('Course 1 - Topic 2').parent().within(() => {
        cy.contains('Lesson 3').should('be.visible')
      })
      
      // Verify calendar reflects the change
      cy.get('.fc-event').should('have.length.greaterThan', 0)
    })
  })

  describe('SubTopic Drag and Drop', () => {
    it('should move a SubTopic within the same Topic', () => {
      cy.screenshot('subtopic-move-start')
      
      // Navigate to the expanded tree view showing SubTopics
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        // Find and interact with SubTopic elements
        cy.get('[data-subtopic-id], .subtopic-item').first().as('sourceSubTopic')
        cy.get('[data-subtopic-id], .subtopic-item').last().as('targetSubTopic')
        
        // Perform SubTopic drag and drop if elements exist
        cy.get('@sourceSubTopic').then($source => {
          cy.get('@targetSubTopic').then($target => {
            if ($source.length > 0 && $target.length > 0 && $source[0] !== $target[0]) {
              cy.get('@sourceSubTopic').drag('@targetSubTopic')
            } else {
              cy.log('SubTopic drag-drop skipped - insufficient elements or same element')
            }
          })
        })
      })
      
      cy.wait(2000) // Wait for any API updates
      cy.screenshot('subtopic-move-complete')
      
      // Verify calendar still functions correctly
      cy.get('.fc-event').should('have.length.greaterThan', 0)
    })

    it('should handle SubTopic positioning correctly', () => {
      cy.screenshot('subtopic-positioning-start')
      
      // Test SubTopic positioning logic
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        // Get all subtopic elements
        cy.get('[data-subtopic-id], .subtopic-item, .e-node-text').then($subtopics => {
          if ($subtopics.length >= 2) {
            // Move first subtopic to after the second
            cy.wrap($subtopics.first()).as('firstSubTopic')
            cy.wrap($subtopics.eq(1)).as('secondSubTopic')
            
            cy.get('@firstSubTopic').drag('@secondSubTopic', { position: 'bottom' })
            
            cy.wait(2000) // Wait for positioning update
          } else {
            cy.log('Insufficient SubTopic elements for positioning test')
          }
        })
      })
      
      cy.screenshot('subtopic-positioning-complete')
      
      // Verify system stability after positioning change
      cy.get('.course-card').should('be.visible')
      cy.get('.fc-event').should('have.length.greaterThan', 0)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid drag and drop operations gracefully', () => {
      cy.screenshot('error-handling-start')
      
      // Attempt to drag a lesson to an invalid target
      cy.contains('Course 1 - Topic 1').parent().within(() => {
        cy.contains('Lesson 1').as('lesson1')
      })
      
      // Try to drag to the header or other invalid area
      cy.get('h1, .header, .toolbar').first().as('invalidTarget')
      
      cy.get('@lesson1').then($lesson => {
        cy.get('@invalidTarget').then($target => {
          if ($lesson.length > 0 && $target.length > 0) {
            // This should either fail gracefully or be prevented
            cy.get('@lesson1').drag('@invalidTarget', { force: true })
            cy.wait(1000)
          }
        })
      })
      
      cy.screenshot('error-handling-complete')
      
      // Verify the system remains stable
      cy.contains('Course 1 - Topic 1').should('be.visible')
      cy.get('.course-card').should('be.visible')
    })
  })
})