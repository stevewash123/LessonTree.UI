#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test categories and their corresponding file patterns
const testCategories = {
  master: {
    name: 'Master Test Suite',
    pattern: '**/00-master-suite.cy.ts',
    description: 'Complete test suite running all categories in sequence'
  },
  auth: {
    name: 'Authentication Tests',
    pattern: '**/01-authentication.cy.ts',
    description: 'Login, logout, and authentication state tests'
  },
  navigation: {
    name: 'Course Navigation Tests', 
    pattern: '**/02-course-navigation.cy.ts',
    description: 'Course expansion, tree navigation tests'
  },
  crud: {
    name: 'Course CRUD Tests',
    pattern: '**/03-course-crud.cy.ts',
    description: 'Course, Topic, SubTopic selection and InfoPanel verification'
  },
  dragdrop: {
    name: 'Drag and Drop Tests',
    pattern: '**/04-drag-drop.cy.ts',
    description: 'Lesson and SubTopic drag-drop functionality'
  },
  legacy: {
    name: 'Legacy Tests',
    pattern: '**/drag-drop-suite.cy.ts,**/subtopic-drag-drop.cy.ts',
    description: 'Original drag-drop test implementations'
  },
  all: {
    name: 'All Tests',
    pattern: '**/*.cy.ts',
    description: 'Run all test files'
  }
};

function showHelp() {
  console.log('\n🧪 LessonTree Cypress Test Runner\n');
  console.log('Usage: node run-tests.js [category] [options]\n');
  console.log('Available test categories:');
  
  Object.entries(testCategories).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} - ${config.description}`);
  });
  
  console.log('\nOptions:');
  console.log('  --headless   - Run tests in headless mode (faster)');
  console.log('  --open       - Open Cypress Test Runner UI');
  console.log('  --help       - Show this help message\n');
  
  console.log('Examples:');
  console.log('  node run-tests.js auth           # Run authentication tests');
  console.log('  node run-tests.js dragdrop --headless  # Run drag-drop tests headless');
  console.log('  node run-tests.js all --open    # Open test runner with all tests');
}

function runTests(category, options = {}) {
  const testConfig = testCategories[category];
  
  if (!testConfig) {
    console.error(`❌ Unknown test category: ${category}`);
    console.error(`Available categories: ${Object.keys(testCategories).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`\n🚀 Running ${testConfig.name}`);
  console.log(`📁 Pattern: ${testConfig.pattern}\n`);
  
  let cypressCmd;
  let cypressArgs = [];
  
  if (options.open) {
    cypressCmd = 'cypress';
    cypressArgs = ['open'];
  } else {
    cypressCmd = 'cypress';
    cypressArgs = ['run'];
    
    if (options.headless) {
      cypressArgs.push('--headless');
    }
    
    // Add spec pattern for specific categories
    if (category !== 'all') {
      cypressArgs.push('--spec', `cypress/e2e/${testConfig.pattern}`);
    }
  }
  
  console.log(`Executing: npx ${cypressCmd} ${cypressArgs.join(' ')}\n`);
  
  const cypressProcess = spawn('npx', [cypressCmd, ...cypressArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true
  });
  
  cypressProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ ${testConfig.name} completed successfully!`);
    } else {
      console.log(`\n❌ ${testConfig.name} failed with exit code ${code}`);
    }
    process.exit(code);
  });
  
  cypressProcess.on('error', (error) => {
    console.error(`❌ Error running tests: ${error.message}`);
    process.exit(1);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showHelp();
  process.exit(0);
}

const category = args[0];
const options = {
  headless: args.includes('--headless'),
  open: args.includes('--open')
};

runTests(category, options);