# Task — Dynamic Form Builder with Public Submission

Build an application where users can create dynamic forms, add various question
types, publish forms to generate a public URL, and view submissions.

## Technical Constraints

- **Backend:** Fastify with TypeScript
- **Frontend:** React with TypeScript

---

## Core Requirements

### 1. Form Management

- **Create & Edit Forms** — Users must be able to create, list, rename, and
  delete forms.
- **Form Builder** — Users can add, edit, delete, and **reorder** questions
  within a form.
- **Question Attributes** — Questions must support different types and can be
  marked as **required**:
  - Text Input
  - Multiple Choice (with configurable options)
  - File Uploads
- **Publishing** — Forms can be toggled between **Draft** and **Published**
  states. Publishing a form must generate a **unique, public URL**.

### 2. Public Submissions

- **Public Form Page** — A dedicated, **unauthenticated** page where respondents
  can view and fill out a published form.
- **Data Capture** — The system must:
  - validate required fields,
  - handle file uploads appropriately,
  - capture the submitted answers.

### 3. Submission Viewing

- **Submissions Dashboard** — Form creators must be able to view a summarized
  list of all submissions for a specific form.
- **Submission Details** — Form creators must be able to open individual
  submissions to view the full set of answers and **access uploaded files**.

---

## Bonus Task (Challenge Mode)

Implement a sophisticated **conditional logic system** where a question's
visibility dynamically depends on complex, nested rules based on previous
answers.

### Requirements

- **Advanced Rule Evaluation** — Support **infinitely nested boolean groups**
  (`AND`, `OR`, `NOT`) to evaluate visibility conditions based on respondent
  answers.
- **Type-Specific Operators** — Implement context-aware operators tailored to
  the question type:
  - text matching for string inputs,
  - array inclusion for multiple choice,
  - presence checks for file uploads.
- **Visual Condition Builder** — An intuitive UI that allows form creators to
  visually construct, nest, and manage rule trees. The UI must:
  - dynamically filter available operators based on the selected target
    question, and
  - provide a **human-readable summary** of the configured logic.

---

## Deliverables

- A **GitHub repository** containing the complete source code and a `README.md`
  with clear instructions on how to set up and run the application locally.
- A **live, deployed version** of the application (e.g. Vercel, Render, Railway,
  AWS, etc.). The working URL must be provided in the `README.md` or submission
  message.

---

## Requirement checklist

### Core

- [ ] Create form
- [ ] List forms
- [ ] Rename form
- [ ] Delete form
- [ ] Add / edit / delete questions
- [ ] Reorder questions
- [ ] Text Input question type
- [ ] Multiple Choice question type (configurable options)
- [ ] File Upload question type
- [ ] Mark question as required
- [ ] Draft / Published toggle
- [ ] Unique public URL on publish
- [ ] Public, unauthenticated form page
- [ ] Required-field validation on submit
- [ ] File upload handling on submit
- [ ] Submissions dashboard (summary list)
- [ ] Submission detail view (full answers + file access)

### Bonus — Conditional Logic

- [ ] Nested boolean groups (AND / OR / NOT, arbitrary depth)
- [ ] Type-specific operators (text / choice / file)
- [ ] Visual rule-tree builder
- [ ] Operators filtered by target question type
- [ ] Human-readable logic summary
- [ ] Runtime visibility evaluation on the public form

### Delivery

- [ ] GitHub repo
- [ ] README with local setup instructions
- [ ] Deployed live URL
