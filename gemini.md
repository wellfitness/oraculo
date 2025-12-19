# Personal Diary and Agenda System

This document outlines the plan and progress for creating a personal diary and agenda system based on the user's requirements.

## 1. Core Principles

The application will be designed around the following principles, derived from the provided documents:

*   **Embrace Finitude:** The system will encourage the user to accept their limited time and capacity.
*   **Focus on What Matters:** The system will help the user to prioritize and focus on a few important things at a time.
*   **Action Over Planning:** The system will be designed to encourage action and reduce time spent on organizing and planning.
*   **Celebrate Accomplishments:** The system will provide a way to acknowledge and celebrate completed tasks.
*   **Mindful Productivity:** The system will promote a mindful and intentional approach to productivity.

## 2. Features

The application will include the following features:

*   **A Digital Bullet Journal:** A simple and flexible system for organizing tasks, notes, and events.
*   **Limited Task List:** A task list with a fixed, small number of slots to enforce prioritization.
*   **"Done" List:** A list of completed tasks to provide a sense of accomplishment.
*   **"Someday/Maybe" List:** A place to store ideas and projects that are not currently active.
*   **Journaling Section:** A space for daily reflections and journaling, with prompts inspired by the provided books.
*   **Local Data Storage:** All data will be stored locally in the user's browser using a SQLite database.

## 3. Technical Setup

*   **Frontend:** HTML, CSS, and JavaScript.
*   **Database:** SQLite, using the `sql.js` library.
*   **Design:** The UI will be designed following the guidelines in the `design-system` folder.

## 4. Implementation Plan

1.  Create the basic HTML structure for the application.
2.  Set up the SQLite database using `sql.js`.
3.  Implement the UI for the different sections of the application, following the design system.
4.  Implement the CRUD (Create, Read, Update, Delete) operations for tasks and journal entries.
5.  Add the specific features, such as the limited task list and the "Done" list.
6.  Style the application using CSS, following the design system.
7.  Write the JavaScript code to handle user interactions and data management.

## 5. Progress

This section will be updated as the project progresses.

### 2025-11-30

*   Created the basic HTML structure for the application (`index.html`).
*   Created the CSS file (`css/style.css`) and added the initial styles, including the color palette, typography, and spacing from the design system.
*   Created the JavaScript file (`js/script.js`) and set up the SQLite database using `sql.js`.
*   Implemented the UI for the journal and agenda sections.
*   Implemented the CRUD (Create, Read, Update, Delete) operations for tasks and journal entries.
*   Styled the application following the design system guidelines, including styles for the journal entries, task list items, and buttons.
### 2025-11-30 (v2)

*   **Implemented Burkeman's Task Management:**
    *   Redesigned the agenda section to incorporate the principles from Oliver Burkeman's Time Management for Mortals course.
    *   The task management system now features three lists: "Live Tasks" (limited to 10), "Someday/Maybe", and "Done".
    *   Updated the database schema to support the new list structure.
    *   Implemented the logic to move tasks between lists, enforce the 10-task limit on the "Live" list, and clear the "Done" list.
    *   Updated the UI to reflect the new three-list system and added a message to inform the user when the "Live" list is full.
*   **Journal Entry Management:**
    *   Added "Edit" and "Delete" buttons to each journal entry.
    *   Implemented inline editing for journal entries, allowing users to modify their entries directly in the UI.
    *   Updated the JavaScript to handle the deletion and updating of journal entries in the database.
    *   Added new CSS styles for the edit/delete buttons and the inline editing form.
