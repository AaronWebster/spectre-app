# Contributing to Spectre Tiling

Thank you for your interest in contributing to this project! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (Node.js version, OS)

### Suggesting Features

Feature suggestions are welcome! Please:
- Check if the feature has already been suggested
- Provide a clear use case
- Explain how it aligns with the project goals

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Add or update tests as needed
5. Run the test suite (`npm test`)
6. Run linting (`npm run lint`)
7. Commit your changes with clear messages
8. Push to your fork
9. Open a pull request

### Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Run `npm run lint:fix` before committing

### Testing

- All new features should include tests
- Maintain or improve code coverage
- Run `npm test` before submitting PRs
- Test with different tile types and dimensions

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Reference issue numbers when applicable

Example:
```
Add support for custom color schemes

- Add color configuration option
- Update tests for color handling
- Update documentation

Fixes #123
```

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/spectre-app.git
cd spectre-app

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint
```

## Questions?

Feel free to open an issue for any questions about contributing!
