# Contributing Guide

Thank you for your interest in contributing to ValidateStrategy! This guide provides comprehensive information on how to contribute effectively to the project, including development setup, coding standards, testing requirements, and the pull request process.

## Getting Started

Before contributing, familiarize yourself with the project architecture and codebase by reading the [Developer Documentation](DEVELOPER.md) and [README](../README.md).

### Development Environment Setup

Set up your local development environment following these steps:

**1. Fork and Clone Repository**

Fork the repository on GitHub and clone your fork locally:

```bash
git clone https://github.com/your-username/Bug.git
cd Bug
```

**2. Install Dependencies**

Install all required dependencies using pnpm:

```bash
pnpm install
```

**3. Configure Environment**

Copy the example environment file and configure with your local settings:

```bash
cp .env.example .env
```

Edit `.env` with your local database credentials and API keys. For development, you can use test API keys or mock services.

**4. Setup Database**

Create a local MySQL database and apply migrations:

```bash
mysql -u root -p -e "CREATE DATABASE validatestrategy_dev"
pnpm db:push
```

**5. Start Development Server**

Launch the development server with hot-reload:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Coding Standards

The project follows strict coding standards to maintain consistency and quality across the codebase.

### TypeScript Guidelines

**Use Strict Mode:** All TypeScript files must compile without errors in strict mode. The project uses `strict: true` in `tsconfig.json`.

**Explicit Types:** Prefer explicit type annotations over type inference for function parameters and return types:

```typescript
// Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Avoid
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Avoid Any:** Never use `any` type except in rare cases where type cannot be determined. Use `unknown` instead:

```typescript
// Bad
function processData(data: any) {
  return data.value;
}

// Good
function processData(data: unknown) {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as { value: string }).value;
  }
  throw new Error("Invalid data");
}
```

**Interface vs Type:** Use interfaces for object shapes that may be extended, types for unions and intersections:

```typescript
// Interface for extensible objects
interface User {
  id: string;
  name: string;
}

interface AdminUser extends User {
  role: "admin";
}

// Type for unions
type Status = "pending" | "processing" | "completed" | "failed";
```

### Code Formatting

The project uses Prettier for automatic code formatting. All code must be formatted before committing:

```bash
pnpm format
```

Prettier configuration in `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Naming Conventions

Follow these naming conventions throughout the codebase:

**Variables and Functions:** Use camelCase for variables and functions:

```typescript
const userName = "John";
function calculateTotal() { }
```

**Types and Interfaces:** Use PascalCase for types, interfaces, and classes:

```typescript
interface UserProfile { }
type PaymentStatus = "pending" | "completed";
class PaymentProcessor { }
```

**Constants:** Use UPPER_SNAKE_CASE for constants:

```typescript
const MAX_RETRIES = 3;
const API_BASE_URL = "https://api.example.com";
```

**Files:** Use kebab-case for file names:

```
user-profile.tsx
payment-service.ts
email-templates.ts
```

**Database Tables:** Use snake_case for table and column names:

```typescript
export const analysisSessions = mysqlTable("analysis_sessions", {
  userId: varchar("user_id", { length: 255 }),
  createdAt: timestamp("created_at"),
});
```

### Code Organization

Organize code logically with clear separation of concerns:

**Component Structure:** React components should follow this structure:

```typescript
// 1. Imports
import { useState } from "react";
import { trpc } from "@/lib/trpc";

// 2. Types
interface Props {
  userId: string;
}

// 3. Component
export function UserProfile({ userId }: Props) {
  // 3a. Hooks
  const [isEditing, setIsEditing] = useState(false);
  const { data: user } = trpc.user.getById.useQuery({ userId });
  
  // 3b. Event handlers
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  // 3c. Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

**Service Structure:** Service modules should export pure functions:

```typescript
// server/services/exampleService.ts

// Internal helpers (not exported)
function validateInput(data: unknown): ValidatedData {
  // Validation logic
}

// Exported service functions
export async function processData(input: InputType): Promise<ResultType> {
  const validated = validateInput(input);
  const result = await performOperation(validated);
  return result;
}
```

## Testing Requirements

All new features and bug fixes must include comprehensive tests. The project uses Vitest for testing.

### Test Coverage Requirements

Maintain minimum test coverage levels:

- **Overall Coverage:** 80% minimum
- **Critical Paths:** 100% coverage for payment processing, authentication, and analysis generation
- **New Code:** 90% minimum coverage for all new code

Check coverage with:

```bash
pnpm test:coverage
```

### Writing Tests

Follow these patterns when writing tests:

**Unit Test Pattern:**

```typescript
import { describe, it, expect } from "vitest";
import { functionToTest } from "./module";

describe("functionToTest", () => {
  it("should handle valid input", () => {
    const result = functionToTest("valid input");
    expect(result).toBe("expected output");
  });
  
  it("should throw error for invalid input", () => {
    expect(() => functionToTest("invalid")).toThrow("Expected error message");
  });
  
  it("should handle edge cases", () => {
    expect(functionToTest("")).toBe("");
    expect(functionToTest(null)).toBe(null);
  });
});
```

**Integration Test Pattern:**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createCaller } from "./routers";

describe("session.create", () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
  });
  
  it("should create analysis session", async () => {
    const caller = createCaller({ user: null });
    const result = await caller.session.create({
      problemStatement: "Test problem",
      tier: "standard",
      email: "test@example.com"
    });
    
    expect(result.sessionId).toBeDefined();
    expect(result.tier).toBe("standard");
  });
  
  it("should reject invalid tier", async () => {
    const caller = createCaller({ user: null });
    await expect(
      caller.session.create({
        problemStatement: "Test",
        tier: "invalid" as any,
        email: "test@example.com"
      })
    ).rejects.toThrow();
  });
});
```

**Test Organization:**

- Colocate tests with source files using `*.test.ts` naming
- Group related tests using `describe` blocks
- Use descriptive test names that explain what is being tested
- Test both success and failure cases
- Include edge cases and boundary conditions

### Running Tests

Run tests during development:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test server/db.test.ts

# Run tests matching pattern
pnpm test --grep "payment"
```

## Pull Request Process

Follow this process when contributing code changes:

### 1. Create Feature Branch

Create a new branch from `main` with a descriptive name:

```bash
git checkout main
git pull origin main
git checkout -b feature/add-analysis-export
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

### 2. Make Changes

Implement your changes following the coding standards and testing requirements outlined in this guide.

**Commit Frequently:** Make small, logical commits with clear messages:

```bash
git add .
git commit -m "feat: add PDF export for analysis results"
```

**Commit Message Format:** Use conventional commit format:

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test additions or updates
- `chore` - Build process or auxiliary tool changes

Examples:

```
feat: add email export functionality

Implement email export feature allowing users to send analysis
results to their email address. Includes rate limiting to prevent
abuse.

Closes #123
```

```
fix: resolve payment webhook signature verification

Webhook signature verification was failing due to incorrect
encoding of request body. Now using raw body for verification.

Fixes #456
```

### 3. Update Tests

Add or update tests to cover your changes:

```bash
# Run tests to ensure they pass
pnpm test

# Check coverage
pnpm test:coverage
```

### 4. Update Documentation

Update relevant documentation if your changes affect:
- API endpoints
- Configuration options
- User-facing features
- Development setup

### 5. Run Quality Checks

Ensure all quality checks pass before submitting:

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Formatting
pnpm format

# Tests
pnpm test
```

### 6. Push Changes

Push your branch to your fork:

```bash
git push origin feature/add-analysis-export
```

### 7. Create Pull Request

Create a pull request on GitHub with:

**Title:** Clear, concise description of changes

**Description:** Detailed explanation including:
- What changes were made
- Why changes were necessary
- How changes were tested
- Any breaking changes
- Related issues

**Example PR Description:**

```markdown
## Description
Adds PDF export functionality for analysis results, allowing users to download
their analysis as a formatted PDF document.

## Changes
- Added PDF generation service using PDFKit
- Created export button in analysis result page
- Implemented rate limiting (5 exports per hour per user)
- Added tests for PDF generation

## Testing
- Unit tests for PDF generation service
- Integration tests for export endpoint
- Manual testing of PDF output quality

## Breaking Changes
None

## Related Issues
Closes #123
```

### 8. Code Review

Respond to code review feedback promptly:

- Address all comments and suggestions
- Make requested changes in new commits
- Explain decisions if you disagree with feedback
- Request re-review after making changes

### 9. Merge

Once approved, the pull request will be merged by a maintainer. Delete your feature branch after merge:

```bash
git checkout main
git pull origin main
git branch -d feature/add-analysis-export
```

## Code Review Guidelines

When reviewing code, consider these aspects:

**Correctness:** Does the code work as intended? Are there any bugs or edge cases not handled?

**Tests:** Are there adequate tests? Do tests cover success and failure cases?

**Performance:** Are there any performance concerns? Could the code be optimized?

**Security:** Are there any security vulnerabilities? Is user input properly validated?

**Maintainability:** Is the code readable and well-organized? Are there clear comments where needed?

**Documentation:** Is documentation updated if needed?

## Issue Reporting

Report bugs and request features through GitHub Issues.

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node Version: [e.g., 22.0.0]
- Browser: [e.g., Chrome 120]

## Additional Context
Screenshots, logs, or other relevant information
```

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What other approaches were considered?

## Additional Context
Mockups, examples, or other relevant information
```

## Community Guidelines

Follow these guidelines when interacting with the community:

**Be Respectful:** Treat all contributors with respect and kindness. Harassment and discrimination are not tolerated.

**Be Constructive:** Provide constructive feedback in code reviews. Focus on the code, not the person.

**Be Patient:** Remember that contributors may be working in different time zones or have varying levels of experience.

**Be Helpful:** Help new contributors get started. Answer questions and provide guidance.

**Be Professional:** Maintain a professional tone in all communications.

## Recognition

Contributors who make significant contributions will be recognized in the project README and release notes.

## Questions

If you have questions about contributing, please:
- Check existing documentation
- Search closed issues for similar questions
- Open a new issue with the "question" label
- Contact maintainers directly for sensitive matters

---

**Thank you for contributing to ValidateStrategy!**

**Last Updated:** January 6, 2025  
**Version:** 1.0.0
