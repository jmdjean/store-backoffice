# Skill — Angular 21 Enterprise Coding Standard
(English Code + pt-BR UI Text + Signals + Facade + Jest)

================================================================================
PURPOSE
================================================================================
This skill enforces a modern, enterprise-grade Angular 21 architecture aligned
with real-world GitHub and large-team production standards.

It guarantees:
- scalability
- maintainability
- performance
- clean architecture
- professional UX
- full test coverage with Jest

This is NOT a simple component generator.
This is a COMPLETE FEATURE-LEVEL standard.

Skill composition rule:
- For every frontend code request, this skill MUST also apply `05-skill-ux-ui-professional.md`.
- UX/UI decisions, reusable components, and accessibility checks must follow that skill checklist.

================================================================================
CRITICAL LANGUAGE RULES (NON‑NEGOTIABLE)
================================================================================

UI text visible to users → MUST be pt-BR
Code identifiers → MUST be English
Method comments → MUST be English (max 2 lines)
All created methods → MUST include a comment (max 2 lines, in English)

Examples:

UI (pt-BR):
"Salvar", "Cancelar", "Carregando...", "Campo obrigatório", "Erro ao salvar dados"

Code (English):
CustomerService
loadCustomers()
isLoading
customer-list.page.ts

Method comment rule (applies to every created method):

// Loads customers from API and updates state.
loadCustomers(): void {}

================================================================================
GLOBAL DEFAULTS (MANDATORY)
================================================================================

- Angular 21+
- Standalone APIs only (NO new NgModules)
- TypeScript strict mode
- Signals-first state
- RxJS only for true async streams
- ChangeDetectionStrategy.OnPush
- ESLint enforced
- async pipe preferred
- NEVER use any

================================================================================
2) PROJECT STRUCTURE (FEATURE-FIRST) — MANDATORY
================================================================================

Organize by FEATURE, never by type.

Correct:

src/app/
  core/
  shared/
  features/
    customers/
    orders/
    invoices/

Feature example:

features/customers/
  pages/
  components/
  facade/
  services/
  models/
  routes.ts

Forbidden:

components/
services/
pages/
models/

globally mixed.

Reason:
Feature isolation improves scalability, ownership and lazy loading.

================================================================================
3) ARCHITECTURE PATTERNS — REQUIRED
================================================================================

SMART/DUMB COMPONENT PATTERN

Pages (Smart):
- orchestrate data
- call facade
- handle navigation
- screen logic

Components (Dumb):
- inputs/outputs only
- presentation only
- no services
- no business logic

------------------------------------------------

FACADE PATTERN (MANDATORY)

Each feature MUST expose a facade.

Responsibilities:
- state
- business logic
- API orchestration
- signals
- computed values

Components MUST NEVER call services directly.

================================================================================
4) STATE MANAGEMENT (SIGNALS FIRST)
================================================================================

Prefer:

signal()
computed()
effect()

Use RxJS only for:
- HTTP
- websockets
- continuous streams

Avoid:
BehaviorSubject
manual subscribe chains

================================================================================
5) UI / UX PROFESSIONAL STANDARDS (MANDATORY)
================================================================================

Every screen MUST include:

- loading state
- empty state
- friendly error state
- confirmation dialogs
- accessible labels
- responsive layout
- consistent spacing
- visual hierarchy
- badges with semantic colors
- clear validation messages

Error handling:
NEVER expose backend or stacktrace to users.
Always show friendly pt-BR message.

================================================================================
6) FORMS
================================================================================

Mandatory:
- Typed Forms
- ReactiveForms
- strong typing
- per-field validation messages (pt-BR)

Forbidden:
template-driven forms for business features

================================================================================
7) HTTP LAYER
================================================================================

- interceptors for loading
- interceptors for errors
- typed DTOs
- no any
- map backend → view models

================================================================================
8) PERFORMANCE RULES
================================================================================

Always:

- lazy loading per feature
- standalone routes
- OnPush
- trackBy or track
- @defer for heavy blocks
- async pipe
- avoid heavy template logic

================================================================================
9) CLEAN CODE
================================================================================

Follow:

- small functions
- explicit naming
- single responsibility
- no helpers dumping grounds
- no duplicated logic
- SOLID principles
- pure functions when possible

================================================================================
10) ROUTING
================================================================================

Each feature owns routes.ts.

App routes only lazy-load features.

================================================================================
11) TESTING STANDARD — JEST (INTEGRATED)
================================================================================

Framework:
Jest only

Must test:
- facades
- services
- presentational components
- business rules

Patterns:
describe → given → when → then

Test:
- initial state
- loading state
- success state
- error state
- computed signals
- API calls
- mapping logic

Avoid:
- flaky tests
- real timers unless required
- unnecessary DOM tests

================================================================================
12) OUTPUT REQUIREMENTS FOR GENERATED CODE
================================================================================

When asked to create a feature, ALWAYS generate:

1. feature folder
2. standalone routes
3. facade
4. service
5. page (smart)
6. dumb components
7. pt-BR UI text
8. signals state
9. OnPush
10. Jest tests

Never generate only a single isolated component.

================================================================================
13) PT-BR UI COPY GUIDELINES (MANDATORY)
================================================================================

Buttons:
Salvar, Cancelar, Editar, Excluir, Voltar

Loading:
Carregando...

Empty:
Nenhum registro encontrado.

Generic error:
Ocorreu um erro ao carregar as informações. Tente novamente.

Confirmation:
Tem certeza que deseja excluir este item?

Tone:
professional, clear, respectful

Avoid:
technical language
slang
ALL CAPS

================================================================================
FINAL CHECKLIST
================================================================================

Before finishing any code generation:

[ ] UI text is pt-BR
[ ] Code identifiers English
[ ] Every created method has an English comment (max 2 lines)
[ ] Standalone APIs
[ ] Facade used
[ ] Signals used
[ ] OnPush enabled
[ ] Feature-first structure
[ ] Jest tests created
