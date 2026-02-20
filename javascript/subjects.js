document.addEventListener("DOMContentLoaded", () => {
    // 0. Get User Context
    const currentUser = auth.getCurrentUser();
    if (!currentUser) return; // auth.requireAuth() in HTML handles redirect
    const userId = currentUser.id;

    // 1. Initialize Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    const subjectForm = document.getElementById('subjectForm');
    const subjectsGrid = document.getElementById('subjectsGrid');

    // 2. Load and Display Subjects
    const loadSubjects = () => {
        // Load from local storage
        let subjects = JSON.parse(localStorage.getItem(`memoir_subjects_${userId}`));
        if (!subjects) {
            subjects = [];
            localStorage.setItem(`memoir_subjects_${userId}`, JSON.stringify(subjects));
        }

        // Load sessions to compute real progress per subject
        const sessions = JSON.parse(localStorage.getItem(`memoir_sessions_${userId}`) || '[]');

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
            localStorage.setItem(`memoir_subjects_${userId}`, JSON.stringify(subjects));
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
            // Using col-lg-4 creates the 3-column grid
            card.className = 'col-12 col-md-6 col-lg-4';
            card.innerHTML = `
                <div class="card subject-card h-100" data-subject-index="${index}">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="subject-icon">
                            <i class="bi bi-journal-bookmark-fill"></i>
                        </div>
                        <div class="d-flex gap-2">
                            <i class="bi bi-gear-fill edit-btn text-secondary" style="cursor:pointer" title="Edit subject"></i>
                            <i class="bi bi-trash-fill delete-btn text-danger" style="cursor:pointer" title="Delete subject"></i>
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
        });
    };

    // 6. Event Delegation for Interactions
    subjectsGrid.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.subject-card');
        if (!card) return;

        const index = Number(card.dataset.subjectIndex);

        // DELETE
        if (target.closest('.delete-btn')) {
            e.stopPropagation();
            deleteSubject(index);
            return;
        }

        // EDIT (Gear Icon)
        if (target.closest('.edit-btn')) {
            e.stopPropagation();
            enableinlineEdit(card, index);
            return;
        }

        // SAVE
        if (target.closest('.save-btn')) {
            e.stopPropagation();
            saveInlineEdit(card, index);
            return;
        }

        // CANCEL
        if (target.closest('.cancel-btn')) {
            e.stopPropagation();
            loadSubjects(); // Re-render to reset
            return;
        }
    });

    // 5. Inline Edit Logic
    const enableinlineEdit = (card, index) => {
        const subjects = JSON.parse(localStorage.getItem(`memoir_subjects_${userId}`)) || [];
        const sub = subjects[index];
        if (!sub) return;

        // Replace content with inputs
        const header = card.querySelector('h5');
        const goalText = card.querySelector('p.text-secondary');
        const actionContainer = card.querySelector('.d-flex.gap-2'); // Icons container

        if (header && goalText && actionContainer) {
            header.innerHTML = `<input type="text" class="form-control form-control-sm mb-1" id="edit-name-${index}" value="${sub.name}">`;
            goalText.innerHTML = `Goal: <input type="number" class="form-control form-control-sm d-inline-block w-50" id="edit-goal-${index}" value="${sub.goal}"> hours`;

            // Swap icons for Save/Cancel
            actionContainer.innerHTML = `
                <i class="bi bi-check-circle-fill save-btn text-success fs-5" style="cursor:pointer" title="Save"></i>
                <i class="bi bi-x-circle-fill cancel-btn text-secondary fs-5" style="cursor:pointer" title="Cancel"></i>
             `;
        }
    };

    const saveInlineEdit = (card, index) => {
        const nameInput = document.getElementById(`edit-name-${index}`);
        const goalInput = document.getElementById(`edit-goal-${index}`);

        if (!nameInput || !goalInput) return;

        const newName = nameInput.value.trim();
        const newGoal = Number(goalInput.value) || 0;

        if (!newName) {
            alert("Subject name cannot be empty.");
            return;
        }

        const subjects = JSON.parse(localStorage.getItem(`memoir_subjects_${userId}`)) || [];
        if (!subjects[index]) return;

        subjects[index].name = newName;
        subjects[index].goal = newGoal;
        localStorage.setItem(`memoir_subjects_${userId}`, JSON.stringify(subjects));

        loadSubjects(); // Re-render to show updated static view
    };

    // Handle edit form submit
    const editForm = document.getElementById('editSubjectForm');
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const idx = Number(document.getElementById('editSubjectIndex').value);
            const name = document.getElementById('editSubjectName').value.trim();
            const goal = Number(document.getElementById('editSubjectGoal').value) || 0;

            const subjects = JSON.parse(localStorage.getItem(`memoir_subjects_${userId}`)) || [];
            if (!subjects[idx]) return;

            subjects[idx].name = name;
            subjects[idx].goal = goal;
            localStorage.setItem(`memoir_subjects_${userId}`, JSON.stringify(subjects));

            const modalEl = document.getElementById('editSubjectModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            loadSubjects();
        });
    }

    // 3. Add New Subject
    subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subjects = JSON.parse(localStorage.getItem(`memoir_subjects_${userId}`)) || [];

        const newSubject = {
            name: document.getElementById('subjectName').value.trim(),
            goal: Number(document.getElementById('subjectGoal').value) || 0,
            progress: 0,
            createdAt: new Date().toISOString()
        };

        subjects.push(newSubject);
        localStorage.setItem(`memoir_subjects_${userId}`, JSON.stringify(subjects));

        // Reset and close modal
        subjectForm.reset();
        const modalEl = document.getElementById('addSubjectModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadSubjects();
    });

    // 4. Delete Subject Logic
    const deleteSubject = (index) => {
        if (!confirm("Are you sure you want to delete this subject?")) return;

        const subjects = JSON.parse(localStorage.getItem(`memoir_subjects_${userId}`)) || [];
        subjects.splice(index, 1);
        localStorage.setItem(`memoir_subjects_${userId}`, JSON.stringify(subjects));
        loadSubjects();
    };

    loadSubjects();
});