# Contributing to Vedam Open Source Admin Dashboard

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Vedam Open Admin copy"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your credentials
   ```

4. **Run build script**
   ```bash
   npm run build
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Code Style Guidelines

### JavaScript

- Use ES6+ features (modules, async/await, arrow functions)
- Follow consistent naming conventions:
  - Functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Classes: `PascalCase`
- Add JSDoc comments for all exported functions
- Use centralized error handling (`handleError` from `utils.js`)
- Avoid `console.log` in production code (use `handleError` or remove)

### File Organization

- Keep files focused on a single responsibility
- Use modules for code organization
- Place utilities in `js/utils/`
- Place services in `js/services/`
- Keep functions small and focused

### Error Handling

- Always use try-catch for async operations
- Use `handleError` from `utils.js` for error reporting
- Provide user-friendly error messages
- Log errors with context (module, action, user)

### Performance

- Debounce search inputs (300ms default)
- Use document fragments for batch DOM updates
- Cache DOM queries when possible
- Avoid unnecessary API calls
- Use virtual scrolling for large lists

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add JSDoc comments
   - Update documentation if needed

3. **Test your changes**
   - Test locally with `npm run dev`
   - Run build validation: `npm run build:validate`
   - Check for linting errors

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Wait for CI/CD checks**
   - Security scan
   - Build validation
   - Accessibility check
   - Performance check

## Commit Message Format

Use conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example:
```
feat: add virtual scrolling to members table
fix: resolve GitHub API rate limiting issue
docs: update README with new features
```

## Testing

- Write tests for new features (when testing framework is set up)
- Test error scenarios
- Test edge cases
- Verify accessibility

## Security

- **Never commit secrets or credentials**
- Use environment variables for all sensitive data
- Follow security best practices
- Report security issues privately

## Documentation

- Update README.md for user-facing changes
- Update IMPROVEMENTS.md for significant improvements
- Add JSDoc comments for new functions
- Update type definitions in `js/types.js` if needed

## Questions?

If you have questions, please:
1. Check existing documentation (README.md, SETUP.md)
2. Review existing code for patterns
3. Open an issue for discussion

Thank you for contributing! 🎉
