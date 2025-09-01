#!/usr/bin/env node

/**
 * Create miojo App
 */

const { createProject } = require('./miojo.js');

const projectName = process.argv[2];

if (!projectName) {
    console.log('❌ Error: Name is mandatory!');
    console.log('💡 Use: npx create-miojo-app project-name');
    process.exit(1);
}

createProject(projectName);