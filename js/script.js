const config = {
    locateFile: filename => `https://cdn.jsdelivr.net/npm/sql.js/dist/${filename}`
};

// Initialize sql.js
async function initializeDB() {
    const sql = await initSqlJs(config);
    const db = new sql.Database();
    db.run("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, task TEXT, list TEXT);"); // list can be 'live', 'someday', or 'done'
    db.run("CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY, entry TEXT, date TEXT);");
    return db;
}

document.addEventListener('DOMContentLoaded', async () => {
    const db = await initializeDB();

    const journalEntryInput = document.getElementById('journal-entry');
    const saveJournalEntryButton = document.getElementById('save-journal-entry');
    const journalEntriesContainer = document.getElementById('journal-entries');

    const taskInput = document.getElementById('task-input');
    const addTaskSomedayButton = document.getElementById('add-task-someday');
    const liveTaskList = document.getElementById('live-task-list');
    const somedayTaskList = document.getElementById('someday-task-list');
    const doneList = document.getElementById('done-list');
    const liveTaskLimitMessage = document.getElementById('live-task-limit-message');
    const clearDoneListButton = document.getElementById('clear-done-list');

    // Journal
    async function loadJournalEntries() {
        const entries = db.exec("SELECT * FROM journal ORDER BY date DESC");
        journalEntriesContainer.innerHTML = '';
        if (entries.length > 0 && entries[0].values) {
            entries[0].values.forEach(row => {
                const entryId = row[0];
                const entryText = row[1];
                const entryDate = new Date(row[2]).toLocaleDateString();

                const entryElement = document.createElement('div');
                entryElement.className = 'journal-entry-item';
                entryElement.dataset.id = entryId;
                entryElement.innerHTML = `
                    <div class="entry-header">
                        <p class="entry-date">${entryDate}</p>
                        <div>
                            <button class="btn-edit-journal">✏️</button>
                            <button class="btn-delete-journal">❌</button>
                        </div>
                    </div>
                    <p class="entry-text">${entryText}</p>
                `;
                journalEntriesContainer.appendChild(entryElement);
            });
        }
    }

    saveJournalEntryButton.addEventListener('click', async () => {
        const entry = journalEntryInput.value;
        if (entry) {
            db.run("INSERT INTO journal (entry, date) VALUES (?, ?)", [entry, new Date().toISOString()]);
            journalEntryInput.value = '';
            await loadJournalEntries();
        }
    });

    journalEntriesContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete-journal')) {
            const entryId = e.target.closest('.journal-entry-item').dataset.id;
            db.run("DELETE FROM journal WHERE id = ?", [entryId]);
            await loadJournalEntries();
        } else if (e.target.classList.contains('btn-edit-journal')) {
            const entryElement = e.target.closest('.journal-entry-item');
            const entryTextElement = entryElement.querySelector('.entry-text');
            const entryText = entryTextElement.textContent;

            entryTextElement.innerHTML = `
                <textarea class="edit-entry-textarea">${entryText}</textarea>
                <button class="btn-save-edited-journal">Guardar</button>
            `;
        } else if (e.target.classList.contains('btn-save-edited-journal')) {
            const entryElement = e.target.closest('.journal-entry-item');
            const entryId = entryElement.dataset.id;
            const newText = entryElement.querySelector('.edit-entry-textarea').value;
            db.run("UPDATE journal SET entry = ? WHERE id = ?", [newText, entryId]);
            await loadJournalEntries();
        }
    });


    // Agenda
    async function loadTasks() {
        const tasks = db.exec("SELECT * FROM tasks");
        liveTaskList.innerHTML = '';
        somedayTaskList.innerHTML = '';
        doneList.innerHTML = '';

        let liveTaskCount = 0;

        if (tasks.length > 0 && tasks[0].values) {
            tasks[0].values.forEach(row => {
                const taskId = row[0];
                const taskText = row[1];
                const taskListType = row[2];

                const taskElement = document.createElement('li');
                taskElement.dataset.id = taskId;

                if (taskListType === 'live') {
                    taskElement.innerHTML = `
                        <span>${taskText}</span>
                        <div>
                            <button class="btn-complete">✅</button>
                            <button class="btn-delete">❌</button>
                        </div>
                    `;
                    liveTaskList.appendChild(taskElement);
                    liveTaskCount++;
                } else if (taskListType === 'someday') {
                    taskElement.innerHTML = `
                        <span>${taskText}</span>
                        <div>
                            <button class="btn-move-to-live">⬆️</button>
                            <button class="btn-delete">❌</button>
                        </div>
                    `;
                    somedayTaskList.appendChild(taskElement);
                } else if (taskListType === 'done') {
                    taskElement.innerHTML = `
                        <span>${taskText}</span>
                        <div>
                            <button class="btn-delete">❌</button>
                        </div>
                    `;
                    doneList.appendChild(taskElement);
                }
            });
        }

        if (liveTaskCount >= 10) {
            liveTaskLimitMessage.style.display = 'block';
        } else {
            liveTaskLimitMessage.style.display = 'none';
        }
    }

    addTaskSomedayButton.addEventListener('click', async () => {
        const task = taskInput.value;
        if (task) {
            db.run("INSERT INTO tasks (task, list) VALUES (?, ?)", [task, 'someday']);
            taskInput.value = '';
            await loadTasks();
        }
    });

    clearDoneListButton.addEventListener('click', async () => {
        db.run("DELETE FROM tasks WHERE list = 'done'");
        await loadTasks();
    });

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete') && e.target.closest('li')) {
            const taskId = e.target.closest('li').dataset.id;
            db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
            await loadTasks();
        } else if (e.target.classList.contains('btn-complete')) {
            const taskId = e.target.closest('li').dataset.id;
            db.run("UPDATE tasks SET list = 'done' WHERE id = ?", [taskId]);
            await loadTasks();
        } else if (e.target.classList.contains('btn-move-to-live')) {
            const liveTaskCountResult = db.exec("SELECT COUNT(*) FROM tasks WHERE list = 'live'");
            const liveTaskCount = liveTaskCountResult[0].values[0][0];

            if (liveTaskCount < 10) {
                const taskId = e.target.closest('li').dataset.id;
                db.run("UPDATE tasks SET list = 'live' WHERE id = ?", [taskId]);
                await loadTasks();
            } else {
                liveTaskLimitMessage.style.display = 'block';
            }
        }
    });

    await loadJournalEntries();
    await loadTasks();
});
