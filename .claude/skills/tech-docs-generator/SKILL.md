---
name: "Tech Docs Generator"
description: "This skill should be used when generating, updating, or maintaining technical documentation for a codebase. Includes API documentation, README files, component documentation, architecture diagrams, user stories (Gherkin format), changelogs, and ensuring comprehensive documentation coverage. Use after significant code changes, before releases, or when documentation gaps are identified."
---

# Tech Docs Generator

## Core Responsibilities

Generate and maintain comprehensive technical documentation:

1. **Function/Method Documentation** - Docstrings with parameters, return values, examples
2. **API Documentation** - OpenAPI/Swagger specs, request/response schemas
3. **Component Documentation** - Props, events, usage examples, accessibility notes
4. **Architecture Documentation** - System diagrams, data flows, decision records
5. **Project Documentation** - README files, setup guides, contribution guidelines
6. **Release Documentation** - Changelogs, migration guides, release notes
7. **User Stories** - Gherkin format (Given/When/Then) acceptance criteria

---

## Documentation Process

When activated:

1. **Scan the Codebase** - Identify source files, config, existing docs
2. **Detect Gaps** - Find undocumented functions, missing API specs, outdated README
3. **Analyze Context** - Understand framework, patterns, conventions
4. **Check CLAUDE.md** - Incorporate project-specific instructions
5. **Generate Plan** - Prioritized list of documentation tasks

---

## Quality Standards

### For Functions and Methods
```typescript
/**
 * @description Clear, concise description of what the function does
 * @param {Type} paramName - Description of the parameter
 * @returns {Type} Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * const result = functionName(param1, param2);
 * @since version
 * @see RelatedFunction
 */
```

### For API Endpoints
- OpenAPI 3.0 specifications
- Authentication requirements
- All status codes and error responses
- Request/response examples
- Rate limiting information

### For Components
- All props with types and defaults
- Usage examples with common patterns
- Events and callbacks
- Accessibility considerations
- Styling and theming info

### For Architecture
- Mermaid diagrams for system architecture
- Sequence diagrams for complex flows
- Database schemas and relationships
- Deployment architecture

---

## User Story Generation (Gherkin Format)

Transform natural language descriptions into formalized acceptance criteria.

### Input
Any feature description in natural language.

### Output
```gherkin
Funcionalidad: [Clear feature name]

Escenario: [Primary scenario]
  Given [Initial context/preconditions]
  And [Additional context if needed]
  When [User action or trigger]
  And [Additional actions if needed]
  Then [Expected outcome]
  And [Additional outcomes/validations]

Escenario: [Alternative/Edge case]
  Given [Different initial context]
  When [Different action]
  Then [Different expected outcome]
```

### Generation Guidelines
- **Context Awareness** - Recognize domain entities (workouts, clients, exercises)
- **Scenario Coverage** - Primary path, alternatives, edge cases, errors
- **Testable Criteria** - Each Given/When/Then must be specific and verifiable
- **Language** - Default to Spanish for this project

---

## Framework Detection

Automatically adapt documentation to:
- **Next.js 15** - App Router, Server Components, API routes
- **React 19** - Components, hooks, Server Actions
- **Supabase** - Auth, RLS, Database, Storage
- **TypeScript** - Types, Interfaces, Generics
- **Tailwind CSS 4** - Utilities, themes
- **Playwright** - E2E testing patterns

---

## When to Use This Skill

### Perfect for:
- Documenting new features after implementation
- Creating API documentation from code
- Generating user stories from requirements
- Updating changelogs before releases
- Creating component usage guides
- Architecture decision records
- README updates

### Do NOT use for:
- Writing actual code (use web-quality-enforcer)
- Database schema changes (use supabase-database-specialist)
- UI/UX design work (use ui-ux-designer)
- Fixing TypeScript/ESLint errors (use typescript-eslint-fixer)

---

## Quick Commands

Invoke specific documentation tasks with:

- **User Stories**: "Genera historia de usuario para [feature]"
- **API Docs**: "Document API endpoint /api/path"
- **Component Docs**: "Generate docs for ComponentName"
- **Architecture**: "Create architecture diagram for [flow]"
- **Changelog**: "Generate changelog for version X.Y"
- **Full Scan**: "Audit all documentation and report gaps"

---

## Reference Files

For detailed templates and formats:

- `references/templates.md` - Gherkin, API docs, component docs templates
- `references/formats.md` - Markdown, JSDoc, OpenAPI examples

---

## Output Standards

Documentation output will:

1. **Be Immediately Usable** - Ready to commit without editing
2. **Include Metadata** - Timestamps, versions where appropriate
3. **Provide Navigation** - Table of contents, cross-references
4. **Support Search** - Keywords and tags for discoverability
5. **Enable Maintenance** - Update instructions included

---

## Error Handling

When encountering issues:

- **Missing Information**: Mark with `[TODO: Description needed]`
- **Complex Logic**: Add warnings for manual review
- **Breaking Changes**: Highlight prominently
- **Security Concerns**: Flag sensitive info that shouldn't be public
