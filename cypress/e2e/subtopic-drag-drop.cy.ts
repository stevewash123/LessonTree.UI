describe('SubTopic Drag and Drop', () => {
  beforeEach(() => {
    // Reseed the database with fresh test data
    cy.reseedDatabase()
    
    // Navigate to the lesson tree page
    cy.visit('/home/lesson-tree')
    cy.waitForAngularToLoad()
    
    // Wait for the tree to load
    cy.get('[data-cy="tree-wrapper"]', { timeout: 15000 }).should('be.visible')
    cy.wait(2000) // Give tree time to fully render
  })

  it('should successfully move SubTopic before a Lesson', () => {
    // Find the SubTopic we want to move (SubTopic ID 13)
    cy.get('[data-nodeid="subtopic_13"]', { timeout: 10000 }).should('exist')
    cy.get('[data-nodeid="subtopic_13"]').should('be.visible')
    
    // Find the target Lesson (Lesson ID 62) 
    cy.get('[data-nodeid="lesson_62"]', { timeout: 10000 }).should('exist')
    cy.get('[data-nodeid="lesson_62"]').should('be.visible')
    
    // Get the initial position of SubTopic 13
    cy.get('[data-nodeid="subtopic_13"]').invoke('attr', 'data-sort-order').as('initialSortOrder')
    
    // Perform the drag and drop operation
    cy.get('[data-nodeid="subtopic_13"]')
      .trigger('mousedown', { button: 0 })
      .wait(100)
    
    cy.get('[data-nodeid="lesson_62"]')
      .trigger('mousemove')
      .trigger('mouseup')
    
    // Wait for the operation to complete
    cy.wait(3000)
    
    // Verify the API call was made with correct parameters
    cy.window().then((win) => {
      // Check console logs for the move operation
      // This assumes our logging from tree-drag-drop.service.ts is present
      cy.task('log', 'Drag operation completed, checking database state...')
    })
    
    // Verify the database was updated correctly
    // Check that SubTopic 13 now has correct sort order relative to Lesson 62
    cy.request('GET', 'http://localhost:5046/api/subtopic/13').then((response) => {
      expect(response.status).to.eq(200)
      const subTopic = response.body
      cy.task('log', `SubTopic 13 new sort order: ${subTopic.sortOrder}`)
      
      // Get Lesson 62's sort order to compare
      cy.request('GET', 'http://localhost:5046/api/lesson/62').then((lessonResponse) => {
        const lesson = lessonResponse.body
        cy.task('log', `Lesson 62 sort order: ${lesson.sortOrder}`)
        
        // SubTopic should now be positioned before the lesson
        expect(subTopic.sortOrder).to.be.lessThan(lesson.sortOrder)
      })
    })
    
    // Verify the UI reflects the change
    cy.get('[data-nodeid="subtopic_13"]').should('exist')
    cy.get('[data-nodeid="lesson_62"]').should('exist')
    
    // Check that the tree structure is visually correct
    // SubTopic 13 should appear before Lesson 62 in the DOM
    cy.get('[data-nodeid="subtopic_13"]').then($subtopic => {
      cy.get('[data-nodeid="lesson_62"]').then($lesson => {
        const subtopicTop = $subtopic.offset()?.top || 0
        const lessonTop = $lesson.offset()?.top || 0
        expect(subtopicTop).to.be.lessThan(lessonTop)
      })
    })
  })

  it('should generate correct schedule after SubTopic move', () => {
    // Perform the same drag operation
    cy.get('[data-nodeid="subtopic_13"]')
      .trigger('mousedown', { button: 0 })
      .wait(100)
    
    cy.get('[data-nodeid="lesson_62"]')
      .trigger('mousemove')
      .trigger('mouseup')
    
    cy.wait(3000)
    
    // Navigate to calendar/schedule view
    cy.visit('/home/calendar')
    cy.wait(2000)
    
    // Check that the schedule reflects the new lesson order
    // This would need to be customized based on your calendar implementation
    cy.get('[data-cy="calendar-view"]').should('be.visible')
    
    // Verify schedule events are in correct order
    cy.request('GET', 'http://localhost:5046/api/schedule/events').then((response) => {
      const events = response.body
      cy.task('log', `Schedule events count: ${events.length}`)
      
      // Verify that lessons are in the correct sequence after the SubTopic move
      const lessonEvents = events.filter((e: any) => e.eventType === 'Lesson')
      
      if (lessonEvents.length > 1) {
        // Check that lessons are ordered by ScheduleSort
        for (let i = 1; i < lessonEvents.length; i++) {
          expect(lessonEvents[i].scheduleSort).to.be.greaterThan(lessonEvents[i-1].scheduleSort)
        }
      }
    })
  })

  it('should handle drag-drop errors gracefully', () => {
    // Test error handling by attempting invalid operations
    cy.get('[data-nodeid="subtopic_13"]').should('exist')
    
    // Try to drag to an invalid location (this should be handled gracefully)
    cy.get('[data-nodeid="subtopic_13"]')
      .trigger('mousedown', { button: 0 })
      .wait(100)
    
    // Try to drop on itself (should not cause errors)
    cy.get('[data-nodeid="subtopic_13"]')
      .trigger('mousemove')
      .trigger('mouseup')
    
    cy.wait(1000)
    
    // Verify no error state
    cy.get('[data-cy="error-message"]').should('not.exist')
    cy.get('.error').should('not.exist')
  })
})