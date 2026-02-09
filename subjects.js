document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    const subjectForm = document.getElementById('subjectForm');
    const subjectsGrid = document.getElementById('subjectsGrid');

    // Default subjects matching the screenshot
    const defaultSubjects = [
        { name: "Mathematics", goal: 40, progress: 0 },
        { name: "Physics", goal: 40, progress: 0 },
        { name: "Chemistry", goal: 30, progress: 0 },
        { name: "Biology", goal: 39, progress: 0 },
        { name: "History", goal: 55, progress: 0 },
        { name: "Literature", goal: 46, progress: 0 },
        { name: "Computer Science", goal: 45, progress: 0 },
        { name: "Economics", goal: 37, progress: 0 }
    ];

    // 2. Load and Display Subjects
    const loadSubjects = () => {
        // Load from local storage, or use defaults if empty
        let subjects = JSON.parse(localStorage.getItem('subjects'));
        if (!subjects || subjects.length === 0) {
            subjects = defaultSubjects;
            localStorage.setItem('subjects', JSON.stringify(subjects));
        }

        // Load sessions to compute real progress per subject
        const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');

        // Auto-create subjects from sessions if they don't exist
        const subjectNames = new Set(subjects.map(s => s.name));
        const sessionSubjects = new Set(
            sessions
                .map(s => s.subject || s.course || 'No subject')
                .filter(name => name && name !== 'No subject')
        );

        let subjectsModified = false;
        sessionSubjects.forEach(sessionSubject => {
            if (!subjectNames.has(sessionSubject)) {
                // Create new subject from session data
                subjects.push({
                    name: sessionSubject,
                    goal: 40, // Default goal
                    progress: 0,
                    createdAt: new Date().toISOString()
                });
                subjectNames.add(sessionSubject);
                subjectsModified = true;
            }
        });

        // Save if we added new subjects
        if (subjectsModified) {
            localStorage.setItem('subjects', JSON.stringify(subjects));
        }

        subjectsGrid.innerHTML = '';

        subjects.forEach((sub, index) => {
            // Compute total minutes studied for this subject
            const totalMinutes = sessions
                .filter(s => (s.subject || s.course || 'No subject') === sub.name)
                .reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;

            const totalHours = totalMinutes / 60; // Convert minutes to hours
            const goalHours = Number(sub.goal) || 0;
            const percent = goalHours > 0 ? Math.min(100, Math.round((totalHours / goalHours) * 100)) : 0;

            const card = document.createElement('div');
            // Using col-lg-4 creates the 3-column grid shown in the image
            card.className = 'col-12 col-md-6 col-lg-4';
            card.innerHTML = `
                <div class="card subject-card h-100" style="cursor: pointer;" data-subject-index="${index}">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="subject-icon">
                            <i class="bi bi-journal-bookmark-fill"></i>
                        </div>
                        <div>
                            <i class="bi bi-pencil-fill me-2 edit-btn" style="cursor:pointer" data-index="${index}" title="Edit subject"></i>
                            <i class="bi bi-trash-fill delete-btn" style="cursor:pointer" onclick="event.stopPropagation(); deleteSubject(${index})" title="Delete subject"></i>
                        </div>
                    </div>
                    <h5 class="fw-bold text-white mb-1">${sub.name}</h5>
                    <p class="text-secondary small mb-4">Goal: ${goalHours} hours</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between mb-1 small text-secondary">
                            <span>Progress</span>
                            <span class="text-white">${percent}% (${totalHours.toFixed(1)}h/${goalHours}h)</span>
                        </div>
                        <div class="progress custom-progress">
                            <div class="progress-bar" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
            `;
            subjectsGrid.appendChild(card);

            // Make the entire card clickable to edit
            const cardElement = card.querySelector('.subject-card');
            if (cardElement) {
                cardElement.addEventListener('click', (e) => {
                    // Don't trigger if clicking delete button
                    if (!e.target.closest('.delete-btn')) {
                        window.editSubject(index);
                    }
                });
            }

            // Attach direct click handler to ensure the edit button works
            try {
                const editBtnEl = card.querySelector('.edit-btn');
                if (editBtnEl) {
                    editBtnEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = Number(editBtnEl.dataset.index);
                        window.editSubject(idx);
                    });
                }
            } catch (err) {
                // ignore
            }
        });
    };

    // Use event delegation so dynamically created edit buttons reliably trigger edit
    subjectsGrid.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.edit-btn');
        if (!btn) return;
        const idx = Number(btn.dataset.index);
        if (Number.isFinite(idx)) {
            window.editSubject(idx);
        }
    });

    // 5. Edit Subject
    window.editSubject = (index) => {
        console.log('editSubject called for index', index);
        const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
        const sub = subjects[index];
        if (!sub) return;

        document.getElementById('editSubjectIndex').value = index;
        document.getElementById('editSubjectName').value = sub.name;
        document.getElementById('editSubjectGoal').value = sub.goal;

        const modalEl = document.getElementById('editSubjectModal');
        if (!modalEl) {
            console.error('editSubjectModal element not found');
            alert('Edit modal not found in DOM');
            return;
        }

        try {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } catch (err) {
            console.error('Bootstrap Modal show failed', err);
            // fallback: show a simple prompt to edit
            const newName = prompt('Subject name', sub.name);
            const newGoal = prompt('Goal hours', sub.goal);
            if (newName !== null && newGoal !== null) {
                subjects[index].name = newName.trim();
                subjects[index].goal = Number(newGoal) || 0;
                localStorage.setItem('subjects', JSON.stringify(subjects));
                loadSubjects();
            }
        }
    };

    // Handle edit form submit
    const editForm = document.getElementById('editSubjectForm');
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const idx = Number(document.getElementById('editSubjectIndex').value);
            const name = document.getElementById('editSubjectName').value.trim();
            const goal = Number(document.getElementById('editSubjectGoal').value) || 0;

            const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
            if (!subjects[idx]) return;

            subjects[idx].name = name;
            subjects[idx].goal = goal;
            localStorage.setItem('subjects', JSON.stringify(subjects));

            bootstrap.Modal.getInstance(document.getElementById('editSubjectModal')).hide();
            loadSubjects();
        });
    }

    // 3. Add New Subject
    subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subjects = JSON.parse(localStorage.getItem('subjects')) || [];

        const newSubject = {
            name: document.getElementById('subjectName').value.trim(),
            goal: Number(document.getElementById('subjectGoal').value) || 0,
            progress: 0,
            createdAt: new Date().toISOString()
        };

        subjects.push(newSubject);
        localStorage.setItem('subjects', JSON.stringify(subjects));

        // Reset and close modal
        subjectForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
        loadSubjects();
    });

    // 4. Delete Subject
    window.deleteSubject = (index) => {
        const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
        subjects.splice(index, 1);
        localStorage.setItem('subjects', JSON.stringify(subjects));
        loadSubjects();
    };

    loadSubjects();
});