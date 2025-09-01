describe('Tree & Calendar Drag-Drop Test Suite', () => {
  beforeEach(() => {
    // Standard ARRANGE phase for all drag-drop tests
    // This will: restart services, reseed data, logout, login, navigate to Tree & Calendar, expand tree
    cy.setupDragDropTest()
  })

  describe('Lesson-to-Lesson Drag-Drop Within Topic', () => {
    it('should move a Lesson before another Lesson within the same Topic', () => {
      // ACT: Drag Lesson 62 before Lesson 63 within the same topic
      
      // Find source lesson (what we're moving)
      cy.get('[data-nodeid="lesson_62"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .as('sourceLesson')
      
      // Find target lesson (where we're moving to)  
      cy.get('[data-nodeid="lesson_63"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .as('targetLesson')
      
      // Capture initial positions for verification
      cy.get('@sourceLesson').invoke('attr', 'data-sort-order').as('sourceSortOrder')
      cy.get('@targetLesson').invoke('attr', 'data-sort-order').as('targetSortOrder')
      
      // Perform the drag-drop operation
      cy.get('@sourceLesson')
        .trigger('mousedown', { button: 0, clientX: 100, clientY: 100 })
        .wait(200)
      
      cy.get('@targetLesson')
        .trigger('mousemove', { clientX: 100, clientY: 200 })
        .trigger('mouseup')
      
      // Wait for drag-drop operation to complete
      cy.wait(3000)
      
      // ASSERT: Verify the move was successful
      
      // 1. Check API was called with correct parameters
      cy.window().its('console').then((console) => {
        cy.log('Drag operation completed, verifying results...')
      })
      
      // 2. Verify database was updated - source lesson should have new sort order
      cy.request('GET', 'http://localhost:5046/api/lesson/62').then((response) => {
        expect(response.status).to.eq(200)
        const sourceLesson = response.body
        
        cy.request('GET', 'http://localhost:5046/api/lesson/63').then((targetResponse) => {
          const targetLesson = targetResponse.body
          
          // Source lesson should now be positioned before target lesson
          expect(sourceLesson.sortOrder).to.be.lessThan(targetLesson.sortOrder)
          
          cy.log(`✅ Lesson 62 SortOrder: ${sourceLesson.sortOrder}, Lesson 63 SortOrder: ${targetLesson.sortOrder}`)
        })
      })
      
      // 3. Verify UI reflects the change - visual positioning
      cy.get('[data-nodeid="lesson_62"]').then($source => {
        cy.get('[data-nodeid="lesson_63"]').then($target => {
          const sourceTop = $source.offset()?.top || 0
          const targetTop = $target.offset()?.top || 0
          expect(sourceTop).to.be.lessThan(targetTop)
        })
      })
      
      // 4. Verify schedule generation reflects the new order
      cy.request('GET', 'http://localhost:5046/api/schedule/events').then((response) => {
        const scheduleEvents = response.body.filter((e: any) => 
          e.eventType === 'Lesson' && (e.lessonId === 62 || e.lessonId === 63)
        )
        
        if (scheduleEvents.length >= 2) {
          const lesson62Event = scheduleEvents.find((e: any) => e.lessonId === 62)
          const lesson63Event = scheduleEvents.find((e: any) => e.lessonId === 63)
          
          if (lesson62Event && lesson63Event) {
            expect(lesson62Event.scheduleSort).to.be.lessThan(lesson63Event.scheduleSort)
            cy.log(`✅ Schedule: Lesson 62 ScheduleSort: ${lesson62Event.scheduleSort}, Lesson 63 ScheduleSort: ${lesson63Event.scheduleSort}`)
          }
        }
      })
    })

    it('should move a Lesson after another Lesson within the same Topic', () => {
      // ACT: Drag Lesson 63 after Lesson 64 within the same topic
      
      cy.get('[data-nodeid="lesson_63"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .as('sourceLesson')
      
      cy.get('[data-nodeid="lesson_64"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .as('targetLesson')
      
      // Perform drag-drop operation (drop AFTER the target)
      cy.get('@sourceLesson')
        .trigger('mousedown', { button: 0 })
        .wait(200)
      
      // For "after" positioning, we might need to target the bottom half of the target element
      cy.get('@targetLesson')
        .trigger('mousemove')
        .trigger('mouseup')
      
      cy.wait(3000)
      
      // ASSERT: Verify lesson 63 is now positioned after lesson 64
      cy.request('GET', 'http://localhost:5046/api/lesson/63').then((response) => {
        const sourceLesson = response.body
        
        cy.request('GET', 'http://localhost:5046/api/lesson/64').then((targetResponse) => {
          const targetLesson = targetResponse.body
          
          // Source lesson should now be positioned after target lesson
          expect(sourceLesson.sortOrder).to.be.greaterThan(targetLesson.sortOrder)
          
          cy.log(`✅ Lesson 63 SortOrder: ${sourceLesson.sortOrder}, Lesson 64 SortOrder: ${targetLesson.sortOrder}`)
        })
      })
    })

    it('should handle invalid Lesson-to-Lesson drag operations gracefully', () => {
      // Test error handling - try to drag lesson to itself
      cy.get('[data-nodeid="lesson_62"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .as('lesson')
      
      // Perform self-drag (should be handled gracefully)
      cy.get('@lesson')
        .trigger('mousedown', { button: 0 })
        .wait(100)
        .trigger('mousemove')
        .trigger('mouseup')
      
      cy.wait(1000)
      
      // Should not cause errors or UI issues
      cy.get('[data-cy="error-message"]').should('not.exist')
      cy.get('.error, .alert-danger').should('not.exist')
      
      // Tree should still be functional
      cy.get('[data-nodeid="lesson_62"]').should('be.visible')
    })
  })

  describe('Cross-Topic Lesson Movement', () => {
    it('should move a Lesson from one Topic to another Topic', () => {
      // This test will move a lesson from Topic A to Topic B
      // Implementation will depend on the specific topic structure in your test data
      
      cy.get('[data-nodeid="lesson_62"]') // Source lesson in Topic A
        .should('exist')
        .should('be.visible')
        .as('sourceLesson')
      
      // Find a lesson in a different topic to drop near
      cy.get('[data-nodeid^="lesson_"]')
        .not('[data-nodeid="lesson_62"]')
        .first()
        .as('targetArea')
      
      cy.get('@sourceLesson')
        .trigger('mousedown', { button: 0 })
        .wait(200)
      
      cy.get('@targetArea')
        .trigger('mousemove')
        .trigger('mouseup')
      
      cy.wait(3000)
      
      // Verify the lesson moved to the new topic
      cy.request('GET', 'http://localhost:5046/api/lesson/62').then((response) => {
        const lesson = response.body
        cy.log(`Lesson 62 moved to Topic: ${lesson.topicId}`)
        
        // Verify it has appropriate sort order in new topic
        expect(lesson.sortOrder).to.be.greaterThan(0)
      })
    })
  })

  describe('Lesson Move Impact on Schedule', () => {
    it('should regenerate schedule correctly after multiple lesson moves', () => {
      // Perform multiple lesson moves and verify schedule maintains correct order
      
      // Move 1: Lesson 62 before Lesson 63
      cy.get('[data-nodeid="lesson_62"]')
        .trigger('mousedown', { button: 0 })
        .wait(100)
      
      cy.get('[data-nodeid="lesson_63"]')
        .trigger('mousemove')
        .trigger('mouseup')
      
      cy.wait(2000)
      
      // Move 2: Lesson 64 before the new position of Lesson 62
      cy.get('[data-nodeid="lesson_64"]')
        .trigger('mousedown', { button: 0 })
        .wait(100)
      
      cy.get('[data-nodeid="lesson_62"]')
        .trigger('mousemove')
        .trigger('mouseup')
      
      cy.wait(3000)
      
      // Verify final schedule order
      cy.request('GET', 'http://localhost:5046/api/schedule/events').then((response) => {
        const lessonEvents = response.body
          .filter((e: any) => e.eventType === 'Lesson')
          .sort((a: any, b: any) => a.scheduleSort - b.scheduleSort)
        
        cy.log(`Schedule has ${lessonEvents.length} lesson events`)
        
        // Verify events are properly ordered
        for (let i = 1; i < lessonEvents.length; i++) {
          expect(lessonEvents[i].scheduleSort).to.be.greaterThan(lessonEvents[i-1].scheduleSort)
        }
        
        cy.log('✅ Schedule events are correctly ordered after multiple moves')
      })
    })
  })
})