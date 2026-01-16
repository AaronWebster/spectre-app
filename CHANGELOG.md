# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-15

### Changed
- Restructured repository to focus solely on standalone Node.js implementation
- Moved standalone code from `standalone/` directory to repository root
- Removed web application code and dependencies
- Updated documentation for standalone CLI usage only
- Simplified package.json for Node.js-only project

### Added
- Jest configuration file for testing
- ESLint configuration for code quality
- .npmignore for npm package management
- Comprehensive README with usage examples
- npm scripts for linting and testing

### Removed
- TypeScript-based web application
- Vite build configuration
- Pixi.js rendering engine
- Fabrication mode features
- Web UI components and tests

## [0.x.x] - Previous versions
- Interactive web application with TypeScript, Vite, and Pixi.js
- Fabrication mode with DXF export
- Multiple tile visualization modes
