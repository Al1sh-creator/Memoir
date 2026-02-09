const date = new Date();
let currentMonth = date.getMonth(); // 0-11
let currentYear = date.getFullYear();

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
let selectedDateKey = null;
const noteModal = new bootstrap.Modal(document.getElementById('noteModal'));

// status -> emoji for top-right icon
const statusEmoji = {
    studied: '✅',
    long: '⏱️',
    missed: '😴',
    productive: '⭐'
};
const sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
function isFocusStreakDay(dateKey, sessions) {
    const daySessions = sessions.filter(s => s && s.date === dateKey);
    if (daySessions.length === 0) return false;

    const totalMin =
        daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;

    const avgFocus =
        daySessions.reduce((a, s) => a + (s.focusScore || 0), 0) /
        daySessions.length;

    const hasFocused =
        daySessions.some(s => s.productivity === "Focused");

    return totalMin >= 30 && avgFocus >= 60 && hasFocused;
}

function renderCalendar() {
    document.getElementById('currentMonthYear').innerText = `${months[currentMonth]} ${currentYear}`;
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // Weekday headers
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach(d => grid.innerHTML += `<div class="weekday">${d}</div>`);

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const padding = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < padding; i++) grid.innerHTML += `<div class="day empty"></div>`;

    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const mm = String(currentMonth + 1).padStart(2, '0');
        const dd = String(i).padStart(2, '0');
        const dateKey = `${currentYear}-${mm}-${dd}`;
        const hasNote = !!localStorage.getItem('note_' + dateKey);
        const status = localStorage.getItem('status_' + dateKey) || 'none';

        let activeClass = '';
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) activeClass = 'active';

        const dayDiv = document.createElement('div');
        dayDiv.className = `day ${activeClass}`;

        // Main number
        const numberHTML = `<div class="day-number">${i}</div>`;

        // Note dot
        const noteHTML = hasNote ? `<div class="note-indicator"><i class="bi bi-circle-fill" style="font-size:0.4rem"></i></div>` : '';

        // Session count for that day

        const daySessions = sessions.filter(s => s && s.date === dateKey);
        const sessionCount = sessions.filter(s => s && s.date === dateKey).length;
        const hasFocusStreak = isFocusStreakDay(dateKey, sessions);
        let fireHTML = '';

        if (hasFocusStreak) {
            const totalMin = Math.round(
                daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60
            );

            const avgFocus = Math.round(
                daySessions.reduce((a, s) => a + (s.focusScore || 0), 0) /
                daySessions.length
            );

            const continues = isPreviousDayStreak(dateKey, sessions);
            const fireClass = continues
                ? "focus-fire streak-continue"
                : "focus-fire";

            fireHTML = `
        <div class="${fireClass}"
             data-tip="Focused ${totalMin} min • Avg ${avgFocus}%">
            🔥
        </div>
    `;
        }


        const sessionHTML = sessionCount > 0 ? `<div class="session-count" title="${sessionCount} session${sessionCount > 1 ? 's' : ''}">${sessionCount}</div>` : '';

        // Status icon (top-right) and bottom bar
        const statusIconHTML = status !== 'none' && statusEmoji[status] ? `<div class="status-icon" title="${status}">${statusEmoji[status]}</div>` : '';
        const statusBarHTML = status !== 'none' ? `<div class="status-bar status-${status}"></div>` : '';

        // Today badge (if active)
        const todayBadgeHTML = activeClass === 'active' ? `<div class="today-badge">Today</div>` : '';
        let perfectHTML = '';

        if (hasFocusStreak) {
            const totalMin =
                daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;

            const avgFocus =
                daySessions.reduce((a, s) => a + (s.focusScore || 0), 0) / daySessions.length;

            if (totalMin >= 60 && avgFocus >= 90) {
                perfectHTML = `<div class="perfect-day" title="Perfect focus day 💎">💎</div>`;
            }
        }

        dayDiv.innerHTML =
            todayBadgeHTML +
            perfectHTML +       // if you added 💎
            numberHTML +
            sessionHTML +
            fireHTML +          // 🔥 HERE
            statusIconHTML +
            noteHTML +
            statusBarHTML;


        dayDiv.onclick = () => openNote(currentYear, currentMonth, i);
        grid.appendChild(dayDiv);
    }

    // render weekly focus (for current real week)
    renderWeeklyFocus();
    // render tasks for the displayed month
    renderMonthTasks();
}

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

function openNote(y, m, d) {
    // Select a day and update right-hand summary panel (don't auto-show modal)
    // Format month and day with zero-padding to match the format used in renderCalendar
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    selectedDateKey = `${y}-${mm}-${dd}`;

    const pretty = `${months[m]} ${d}, ${y}`;
    document.getElementById('modalTitle').innerText = pretty;
    document.getElementById('noteInput').value = localStorage.getItem('note_' + selectedDateKey) || '';

    // Set status selection UI for modal (kept for edit action)
    const currentStatus = localStorage.getItem('status_' + selectedDateKey) || 'none';
    document.querySelectorAll('#statusOptions .status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === currentStatus);
        btn.onclick = () => { document.querySelectorAll('#statusOptions .status-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); };
    });

    updateDailySummary(selectedDateKey);
}

// Update the right-side daily summary panel using stored sessions/notes/status
function formatTime(seconds) {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return (h > 0 ? h + 'h ' : '') + (m > 0 ? m + 'm' : '');
}

function updateDailySummary(dateKey) {
    const card = document.getElementById('dailySummary');
    const empty = document.getElementById('dailySummaryEmpty');
    if (!dateKey) { card.style.display = 'none'; empty.style.display = 'block'; return; }

    const [y, mm, dd] = dateKey.split('-');
    document.getElementById('summaryDate').innerText = `${months[Number(mm) - 1]} ${Number(dd)}, ${y}`;

    // sessions.js exposes getSessions(); fallback to localStorage
    const sessions = (window.getSessions && typeof window.getSessions === 'function') ? window.getSessions() : JSON.parse(localStorage.getItem('sessions') || '[]');
    const sessionsForDay = sessions.filter(s => s && s.date === dateKey);
    const totalSeconds = sessionsForDay.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    document.getElementById('summaryTotalTime').innerText = formatTime(totalSeconds);

    // Session count
    const sessionCountEl = document.getElementById('sessionCount');
    if (sessionCountEl) sessionCountEl.innerText = sessionsForDay.length;

    // Calculate focus metrics if sessions have focus data
    const sessionsWithFocus = sessionsForDay.filter(s => s.focusScore !== undefined && s.focusScore !== null);
    const focusMetricsSection = document.getElementById('focusMetricsSection');

    if (sessionsWithFocus.length > 0) {
        const avgFocus = Math.round(sessionsWithFocus.reduce((sum, s) => sum + s.focusScore, 0) / sessionsWithFocus.length);
        const focusScoreEl = document.getElementById('summaryFocusScore');
        const focusBarEl = document.getElementById('summaryFocusBar');

        if (focusScoreEl) focusScoreEl.innerText = avgFocus + '%';
        if (focusBarEl) {
            focusBarEl.style.width = avgFocus + '%';
            // Color based on score
            focusBarEl.className = 'progress-bar';
            if (avgFocus >= 75) focusBarEl.classList.add('bg-success');
            else if (avgFocus >= 40) focusBarEl.classList.add('bg-warning');
            else focusBarEl.classList.add('bg-danger');
        }

        // Productivity breakdown
        const productivityCounts = { Focused: 0, Average: 0, Distracted: 0 };
        sessionsWithFocus.forEach(s => {
            if (s.productivity) productivityCounts[s.productivity]++;
        });

        const productivityEl = document.getElementById('summaryProductivity');
        if (productivityEl) {
            productivityEl.innerHTML = '';
            if (productivityCounts.Focused > 0) {
                productivityEl.innerHTML += `<span class="badge bg-success"><i class="bi bi-check-circle"></i> ${productivityCounts.Focused} Focused</span>`;
            }
            if (productivityCounts.Average > 0) {
                productivityEl.innerHTML += `<span class="badge bg-warning text-dark"><i class="bi bi-dash-circle"></i> ${productivityCounts.Average} Average</span>`;
            }
            if (productivityCounts.Distracted > 0) {
                productivityEl.innerHTML += `<span class="badge bg-danger"><i class="bi bi-x-circle"></i> ${productivityCounts.Distracted} Distracted</span>`;
            }
        }

        focusMetricsSection.style.display = 'block';
    } else {
        focusMetricsSection.style.display = 'none';
    }

    // subjects
    const subjects = Array.from(new Set(sessionsForDay.map(s => (s.subject || '').trim()).filter(Boolean)));
    const subjEl = document.getElementById('summarySubjects');
    subjEl.innerHTML = subjects.length ? subjects.map(s => `<span class="badge bg-light text-dark me-1 mb-1">${s}</span>`).join('') : '<div class="text-muted small">No subjects</div>';

    // notes
    const note = localStorage.getItem('note_' + dateKey) || '';
    const notesEl = document.getElementById('summaryNotes');
    if (note) {
        notesEl.innerText = note;
        notesEl.classList.remove('text-muted');
    } else {
        notesEl.innerText = 'No notes for this day.';
        notesEl.classList.add('text-muted');
    }

    // status/mood
    const status = localStorage.getItem('status_' + dateKey) || 'none';
    const statusMap = { studied: 'Studied', long: 'Long session', missed: 'Missed', productive: 'Productive' };
    const statusEmoji = { studied: '✅', long: '⏱️', missed: '😴', productive: '⭐' };
    const statusLabel = statusMap[status] || '';
    const statusEl = document.getElementById('summaryStatus');
    statusEl.innerHTML = statusLabel ? `<span class="badge bg-primary text-white">${statusEmoji[status] || ''} ${statusLabel}</span>` : '';

    // sessions list with enhanced display
    const listEl = document.getElementById('summarySessionsList');
    listEl.innerHTML = '';
    if (sessionsForDay.length === 0) {
        listEl.innerHTML = '<div class="text-muted small text-center py-3">No sessions recorded</div>';
    } else {
        sessionsForDay.forEach((s, idx) => {
            const duration = formatTime(s.durationSeconds || 0);
            const subject = s.subject || 'Session';
            const focusScore = s.focusScore !== undefined ? s.focusScore : null;
            const productivity = s.productivity || '';

            const row = document.createElement('div');
            row.className = 'list-group-item p-2 mb-1 rounded';

            let productivityBadge = '';
            if (productivity === 'Focused') productivityBadge = '<span class="badge bg-success-subtle text-success">Focused</span>';
            else if (productivity === 'Average') productivityBadge = '<span class="badge bg-warning-subtle text-warning">Average</span>';
            else if (productivity === 'Distracted') productivityBadge = '<span class="badge bg-danger-subtle text-danger">Distracted</span>';

            row.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-semibold small">${subject}</div>
                        ${focusScore !== null ? `<div class="text-muted" style="font-size: 0.75rem;">Focus: ${focusScore}% • ${s.pauseCount || 0} pauses • ${s.inactiveCount || 0} distractions</div>` : ''}
                    </div>
                    <div class="text-end ms-2">
                        <div class="small fw-semibold">${duration}</div>
                        ${productivityBadge}
                    </div>
                </div>
            `;
            listEl.appendChild(row);
        });
    }

    // show panel
    empty.style.display = 'none';
    card.style.display = 'block';
}

/* Weekly focus: store per ISO week */
function getWeekKey(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    // ISO week date weeks start on Monday
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNr = (tmp.getUTCDay() + 6) % 7; // Monday=0
    tmp.setUTCDate(tmp.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
    const weekNo = 1 + Math.round(((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function loadWeeklyFocus() {
    const key = getWeekKey(new Date());
    const raw = localStorage.getItem('weekly_focus_' + key);
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}

function saveWeeklyFocus(items) {
    const key = getWeekKey(new Date());
    localStorage.setItem('weekly_focus_' + key, JSON.stringify(items));
}

function renderWeeklyFocus() {
    const list = loadWeeklyFocus();
    const container = document.getElementById('focusChips');
    if (!container) return;
    container.innerHTML = '';
    list.forEach((t, idx) => {
        const chip = document.createElement('div');
        chip.className = 'focus-chip me-2 mb-2';
        chip.textContent = t;
        chip.title = 'Double-click to edit';
        chip.ondblclick = () => { chip.contentEditable = true; chip.focus(); };
        chip.onblur = () => { chip.contentEditable = false; list[idx] = chip.textContent.trim(); saveWeeklyFocus(list); renderWeeklyFocus(); };
        container.appendChild(chip);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // add focus handlers
    const addBtn = document.getElementById('addFocusBtn');
    const input = document.getElementById('focusInput');
    const clearBtn = document.getElementById('clearFocusBtn');
    if (addBtn && input) {
        addBtn.onclick = () => {
            const v = input.value.trim();
            if (!v) return;
            const cur = loadWeeklyFocus();
            cur.push(v);
            saveWeeklyFocus(cur);
            input.value = '';
            renderWeeklyFocus();
        };
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { addBtn.click(); e.preventDefault(); } });
    }
    if (clearBtn) { clearBtn.onclick = () => { if (confirm('Clear this week\'s focus?')) { saveWeeklyFocus([]); renderWeeklyFocus(); } } }
});

// Monthly tasks (per month storage)
function getMonthKey(y, m) { return `${y}-${m}`; }
function loadMonthTasks(y, m) {
    const raw = localStorage.getItem('month_tasks_' + getMonthKey(y, m));
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}
function saveMonthTasks(y, m, items) {
    localStorage.setItem('month_tasks_' + getMonthKey(y, m), JSON.stringify(items));
}

function renderMonthTasks() {
    const listEl = document.getElementById('monthTasksList');
    if (!listEl) return;
    const tasks = loadMonthTasks(currentYear, currentMonth);
    listEl.innerHTML = '';
    if (tasks.length === 0) { listEl.innerHTML = '<div class="text-muted small">No tasks for this month.</div>'; return; }
    tasks.forEach(t => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex align-items-center justify-content-between';
        item.innerHTML = `<div class="form-check"><input class="form-check-input me-2" type="checkbox" ${t.done ? 'checked' : ''} data-id="${t.id}"><label class="form-check-label">${escapeHtml(t.text)}</label></div><div><button class="btn btn-sm btn-outline-secondary btn-delete" data-id="${t.id}"><i class="bi bi-trash"></i></button></div>`;
        listEl.appendChild(item);
    });

    // wire events
    listEl.querySelectorAll('.form-check-input').forEach(cb => cb.onchange = (e) => {
        const id = cb.dataset.id; const tasks = loadMonthTasks(currentYear, currentMonth);
        const idx = tasks.findIndex(x => x.id == id); if (idx > -1) { tasks[idx].done = cb.checked; saveMonthTasks(currentYear, currentMonth, tasks); }
    });
    listEl.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => {
        const id = btn.dataset.id; let tasks = loadMonthTasks(currentYear, currentMonth); tasks = tasks.filter(x => x.id != id); saveMonthTasks(currentYear, currentMonth, tasks); renderMonthTasks();
    });
}

function addTaskToMonth(text) {
    const tasks = loadMonthTasks(currentYear, currentMonth);
    const t = { id: 't_' + Date.now(), text: text, done: false };
    tasks.push(t); saveMonthTasks(currentYear, currentMonth, tasks); renderMonthTasks();
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]); }

// wire month tasks UI
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addTaskBtn');
    const input = document.getElementById('taskInput');
    const clearBtn = document.getElementById('clearMonthTasksBtn');
    if (addBtn && input) { addBtn.onclick = () => { const v = input.value.trim(); if (!v) return; addTaskToMonth(v); input.value = ''; }; input.addEventListener('keypress', e => { if (e.key === 'Enter') { addBtn.click(); e.preventDefault(); } }); }
    if (clearBtn) { clearBtn.onclick = () => { if (confirm('Clear all tasks for this month?')) { saveMonthTasks(currentYear, currentMonth, []); renderMonthTasks(); } } }
    // initial render
    renderMonthTasks();
});

// Edit note button in panel
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('editNoteFromPanel');
    if (editBtn) { editBtn.onclick = () => { if (!selectedDateKey) return; document.getElementById('modalTitle').innerText = document.getElementById('summaryDate').innerText; document.getElementById('noteInput').value = localStorage.getItem('note_' + selectedDateKey) || ''; noteModal.show(); } };
    const clearBtn = document.getElementById('clearSummaryBtn');
    if (clearBtn) { clearBtn.onclick = () => { selectedDateKey = null; updateDailySummary(null); } }
});

function saveNote() {
    if (!selectedDateKey) return;
    const text = document.getElementById('noteInput').value;
    if (text.trim()) localStorage.setItem('note_' + selectedDateKey, text);
    else localStorage.removeItem('note_' + selectedDateKey);

    // Save selected status
    const activeBtn = document.querySelector('#statusOptions .status-btn.active');
    const status = activeBtn ? activeBtn.dataset.status : 'none';
    if (status && status !== 'none') localStorage.setItem('status_' + selectedDateKey, status);
    else localStorage.removeItem('status_' + selectedDateKey);

    noteModal.hide();
    renderCalendar();
}

// Initialize static status option wiring so keyboard users can tab too
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#statusOptions .status-btn').forEach(btn => {
        btn.tabIndex = 0;
        btn.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') btn.click(); });
    });
    renderCalendar();
});
function isPreviousDayStreak(dateKey, sessions) {
    const d = new Date(dateKey);
    d.setDate(d.getDate() - 1);
    const prevKey = d.toISOString().split("T")[0];
    return isFocusStreakDay(prevKey, sessions);
}
