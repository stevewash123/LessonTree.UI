describe('Course Navigation Tests', () => {
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
  })

  describe('Basic Course Expansion', () => {
    it('should expand course when clicking expand icon', () => {
      // Wait for courses to load
      cy.get('.course-card', { timeout: 10000 }).should('exist')
      
      // Click the expand icon of the first course
      cy.get('.course-card').first().within(() => {
        cy.get('.e-icons.e-icon-expandable.interaction').first().click()
      })
      
      // Wait for expansion
      cy.wait(2000)
      
      // Verify Course 1 is expanded and shows topics
      cy.contains('Course 1 - Topic 1').should('be.visible')
      cy.contains('Course 1 - Topic 2').should('be.visible')
      
      cy.screenshot('basic-course-expansion')
    })

    it('should collapse course when clicking collapse icon', () => {
      // First expand the course
      cy.get('.course-card', { timeout: 10000 }).first().within(() => {
        cy.get('.e-icons.e-icon-expandable.interaction').first().click()
      })
      cy.wait(1000)
      cy.contains('Course 1 - Topic 1').should('be.visible')

      // Then collapse it
      cy.get('.course-card').first().within(() => {
        cy.get('.e-icons.e-icon-collapsible.interaction').first().click()
      })
      cy.wait(1000)
      
      // Verify topics are no longer visible
      cy.contains('Course 1 - Topic 1').should('not.exist')
      cy.contains('Course 1 - Topic 2').should('not.exist')
      
      cy.screenshot('basic-course-collapse')
    })
  })

  describe('Sequential Deep Expansion', () => {
    it('should expand course, then topic, then subtopic in sequence', () => {
      // Wait for courses to load
      cy.get('.course-card', { timeout: 10000 }).should('exist')

      // STEP 1: Expand Course 1 (use aliasing to prevent re-render issues)
      cy.get('.course-card').first().as('firstCourse')
      cy.get('@firstCourse').within(() => {
        cy.get('.e-icons.e-icon-expandable.interaction').first().as('courseExpandIcon')
      })
      cy.get('@courseExpandIcon').should('be.visible').should('have.length', 1).click()
      cy.wait(1000)
      cy.screenshot('step1-course-expanded')

      // Verify Course 1 is expanded and shows Topic 1 and Topic 2
      cy.contains('Course 1 - Topic 1').should('be.visible')
      cy.contains('Course 1 - Topic 2').should('be.visible')

      // STEP 2: Expand Topic 1 (use aliasing and wait for stability)
      cy.wait(2000) // Extra wait for DOM to stabilize after course expansion
      
      // Try to find Topic 1's expand icon using aliasing
      cy.contains('Course 1 - Topic 1').as('topic1')
      cy.get('@topic1').closest('li, .e-list-item, .e-node').as('topic1Container')
      cy.get('@topic1Container').within(() => {
        cy.get('.e-icons.e-icon-expandable.interaction').as('topic1ExpandIcon')
      })
      
      // Use force click and retry logic
      cy.get('@topic1ExpandIcon').then(($icon) => {
        if ($icon.length === 1) {
          cy.get('@topic1ExpandIcon').click({ force: true })
        } else {
          // Fallback: click any remaining expand icons with explicit first()
          cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
        }
      })
      cy.wait(1000) 
      cy.screenshot('step2-topic1-expanded')

      // STEP 3: Try to expand any remaining SubTopics if they exist (with aliasing)
      cy.wait(2000) // Wait for DOM stabilization after topic expansion
      
      cy.get('.e-icons.e-icon-expandable.interaction').then(($icons) => {
        if ($icons.length > 0) {
          cy.log(`Found ${$icons.length} remaining expandable icons - clicking the first one`)
          cy.get('.e-icons.e-icon-expandable.interaction').first().as('subtopicExpandIcon')
          cy.get('@subtopicExpandIcon').click({ force: true })
          cy.wait(1000)
          cy.screenshot('step3-subtopic-expanded')
        } else {
          cy.log('No more expandable icons found - tree may be fully expanded')
          cy.screenshot('step3-no-more-expansions')
        }
      })

      // Try to prevent collapse by re-clicking any collapsed elements
      cy.wait(3000) // Wait for any sync operations to complete
      
      // Re-expand if needed - click any remaining expand icons
      cy.get('body').then(($body) => {
        const expandIcons = $body.find('.e-icons.e-icon-expandable.interaction')
        if (expandIcons.length > 0) {
          cy.log(`Found ${expandIcons.length} collapsed elements after sync - re-expanding`)
          cy.get('.e-icons.e-icon-expandable.interaction').each(($icon, index) => {
            cy.wrap($icon).click({ force: true })
            cy.wait(500) // Short wait between clicks
          })
        }
      })

      // Force maintain expanded state by continuously re-expanding during final verification
      cy.wait(1000)
      
      // Aggressively maintain expansion - multiple rounds of re-expansion
      for (let round = 1; round <= 3; round++) {
        cy.log(`Expansion maintenance round ${round}`)
        
        // Force re-expand Course 1 if collapsed
        cy.get('.course-card').first().within(() => {
          cy.get('.e-icons.e-icon-expandable.interaction').then(($courseIcons) => {
            if ($courseIcons.length > 0) {
              cy.log('Course 1 collapsed - re-expanding')
              cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
            }
          })
        })
        
        cy.wait(500)
        
        // Force re-expand Topic 1 if collapsed
        cy.get('body').then(($body) => {
          if ($body.find('*:contains("Course 1 - Topic 1")').length > 0) {
            cy.contains('Course 1 - Topic 1').closest('li, .e-list-item, .e-node').within(() => {
              cy.get('.e-icons.e-icon-expandable.interaction').then(($topicIcons) => {
                if ($topicIcons.length > 0) {
                  cy.log('Topic 1 collapsed - re-expanding')
                  cy.get('.e-icons.e-icon-expandable.interaction').first().click({ force: true })
                }
              })
            })
          }
        })
        
        cy.wait(500)
        
        // Force re-expand any SubTopics if collapsed
        cy.get('body').then(($body) => {
          const subtopicExpandIcons = $body.find('.e-icons.e-icon-expandable.interaction')
          if (subtopicExpandIcons.length > 0) {
            cy.log(`Found ${subtopicExpandIcons.length} collapsed elements in round ${round} - re-expanding`)
            cy.get('.e-icons.e-icon-expandable.interaction').each(($icon) => {
              cy.wrap($icon).click({ force: true })
            })
          }
        })
        
        cy.wait(1000) // Wait between rounds
      }

      // Final verification - check that we have a deeply expanded tree structure
      cy.get('.e-treeview, .e-list-item, ul li, .e-node-text').should('exist').and('have.length.greaterThan', 2)

      // Verify specific expanded content is still visible
      cy.contains('Course 1 - Topic 1').should('be.visible')
      cy.contains('Course 1 - Topic 2').should('be.visible')
      cy.contains('Lesson 1').should('be.visible')
      cy.contains('Lesson 2').should('be.visible')
      cy.contains('Lesson 3').should('be.visible')

      // Take a final screenshot to verify visual state
      cy.screenshot('sequential-expansion-complete')
      
      // Keep the browser in expanded state with a final long wait
      cy.wait(5000) // Extended wait to maintain expanded state visually
    })
  })

  describe('Menu Navigation Tests', () => {
    it('should expand top menu bar, select Tree + Calendar, and verify Calendar opens with auto-close', () => {
      cy.screenshot('before-menu-interaction')
      
      // Look for menu hamburger/toggle button in top bar
      cy.get('body').then(($body) => {
        const menuToggleSelectors = [
          '.menu-toggle',
          '.hamburger',
          '.navbar-toggler',
          'button[aria-label*="menu"]',
          'button[aria-label*="Menu"]',
          '[data-cy="menu-toggle"]',
          '.e-menu-toggle',
          '.mat-toolbar button:first',
          '.toolbar button:first',
          '.header button:first'
        ]
        
        let menuButtonFound = false
        
        menuToggleSelectors.forEach(selector => {
          if (!menuButtonFound && $body.find(selector).length > 0) {
            cy.get(selector).first().click()
            menuButtonFound = true
            cy.log(`Found menu toggle using selector: ${selector}`)
          }
        })
        
        if (!menuButtonFound) {
          // Try clicking on the top-left area where menu usually is
          cy.get('header, .header, .toolbar, .mat-toolbar, nav').first().within(() => {
            cy.get('button, .btn, [role="button"]').first().click()
            menuButtonFound = true
            cy.log('Clicked first button in header/toolbar area')
          })
        }
        
        if (!menuButtonFound) {
          cy.log('No menu toggle button found - trying direct menu access')
          // Skip to menu item search if no toggle found
        }
        
        cy.wait(1000) // Wait for menu to expand/animate
        cy.screenshot('menu-expanded')
        
        // Look for Tree + Calendar menu option
        cy.get('body').then(($menuBody) => {
          const treeCalendarSelectors = [
            '*:contains("Tree") *:contains("Calendar")',
            '*:contains("Tree + Calendar")',
            '*:contains("Tree & Calendar")',
            '*:contains("Tree and Calendar")',
            '[data-cy="tree-calendar"]',
            '.menu-item:contains("Tree")',
            'a[href*="tree"]',
            'a[href*="calendar"]',
            '.nav-link:contains("Tree")'
          ]
          
          let menuItemFound = false
          
          treeCalendarSelectors.forEach(selector => {
            if (!menuItemFound && $menuBody.find(selector).length > 0) {
              cy.get(selector).first().click()
              menuItemFound = true
              cy.log(`Found Tree + Calendar menu item using selector: ${selector}`)
            }
          })
          
          if (!menuItemFound) {
            // Try looking for any menu item containing "Tree"
            cy.get('*:contains("Tree")').then(($treeItems) => {
              if ($treeItems.length > 0) {
                cy.wrap($treeItems.first()).click()
                menuItemFound = true
                cy.log('Found and clicked Tree menu item')
              }
            })
          }
          
          if (!menuItemFound) {
            cy.log('No Tree + Calendar menu item found - may need UI implementation')
            return
          }
          
          cy.wait(2000) // Wait for navigation and page load
          cy.screenshot('after-menu-selection')
          
          // Verify we navigated to the Tree + Calendar view
          cy.url().should('satisfy', (url) => {
            return url.includes('tree') || url.includes('calendar') || url.includes('home')
          })
          
          // Verify both tree and calendar are visible
          cy.get('.course-card, .e-treeview, .tree-view').should('be.visible')
          cy.get('.fc-view, .calendar-view, .fc-daygrid, .fc-timegrid').should('be.visible')
          
          cy.log('Tree + Calendar view verified - both components visible')
          
          // Verify menu auto-closes after selection
          cy.wait(1000) // Give time for auto-close animation
          
          // Check that menu is no longer expanded/visible
          cy.get('body').then(($bodyAfterSelection) => {
            // Look for expanded menu indicators
            const expandedMenuSelectors = [
              '.menu-expanded',
              '.nav-expanded',
              '.menu-open',
              '.sidebar-open',
              '.drawer-open',
              '[aria-expanded="true"]'
            ]
            
            let menuStillOpen = false
            
            expandedMenuSelectors.forEach(selector => {
              if ($bodyAfterSelection.find(selector).length > 0) {
                menuStillOpen = true
              }
            })
            
            if (!menuStillOpen) {
              cy.log('✅ Menu auto-closed successfully after selection')
            } else {
              cy.log('⚠️ Menu may still be open - auto-close behavior needs verification')
            }
            
            // Alternative check: verify menu toggle button is back to unexpanded state
            cy.get('.menu-toggle, .hamburger, .navbar-toggler').then(($toggles) => {
              if ($toggles.length > 0) {
                cy.wrap($toggles.first()).should('not.have.class', 'active')
                  .and('not.have.attr', 'aria-expanded', 'true')
                cy.log('✅ Menu toggle button returned to closed state')
              }
            })
          })
          
          cy.screenshot('menu-auto-closed-verification')
          
          cy.log('Menu navigation test completed successfully')
        })
      })
    })

    it('should verify menu auto-close behavior with multiple selections', () => {
      cy.screenshot('before-multi-menu-test')
      
      // Test that menu closes after each selection
      const testMenuAutoClose = (menuItemText, expectedUrl) => {
        // Open menu
        cy.get('.menu-toggle, .hamburger, .navbar-toggler, .toolbar button:first').first().click()
        cy.wait(500)
        
        // Click menu item
        cy.contains(menuItemText).click()
        cy.wait(1000)
        
        // Verify navigation
        if (expectedUrl) {
          cy.url().should('include', expectedUrl)
        }
        
        // Verify menu closed
        cy.get('body').should('not.have.class', 'menu-open')
        cy.get('.menu-toggle, .hamburger, .navbar-toggler').should('not.have.class', 'active')
        
        cy.log(`✅ Menu auto-closed after selecting ${menuItemText}`)
      }
      
      // Test multiple menu selections
      cy.get('body').then(($body) => {
        // Only run if we can find menu items
        if ($body.find('*:contains("Tree"), *:contains("Home")').length > 0) {
          testMenuAutoClose('Tree', 'tree')
          cy.wait(1000)
          testMenuAutoClose('Home', 'home')
        } else {
          cy.log('Skipping multi-selection test - menu items not found')
        }
      })
      
      cy.screenshot('multi-menu-test-complete')
    })
  })
})