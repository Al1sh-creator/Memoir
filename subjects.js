document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Tooltips (Matching your Dashboard logic)
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    const subjectForm = document.getElementById('subjectForm');
    const subjectsGrid = document.getElementById('subjectsGrid');

    // 2. Load and Display Subjects
    const loadSubjects = () => {
        const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
        subjectsGrid.innerHTML = subjects.length ? '' : '<p class="text-muted text-center py-5">No subjects added yet.</p>';
        
        subjects.forEach((sub, index) => {
            const card = document.createElement('div');
            card.className = 'col-md-4';
            card.innerHTML = `
                <div class="card subject-card shadow-sm h-100">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="subject-icon">
                            <i class="bi bi-journal-bookmark"></i>
                        </div>
                        <i class="bi bi-trash delete-btn text-danger" onclick="deleteSubject(${index})"></i>
                    </div>
                    <h5 class="fw-bold mb-1">${sub.name}</h5>
                    <p class="text-muted small mb-3">Goal: ${sub.goal || 0} hours</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between mb-1 small">
                            <span>Progress</span>
                            <span>0%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            `;
            subjectsGrid.appendChild(card);
        });
    };

    // 3. Add New Subject
    subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
        
        const newSubject = {
            name: document.getElementById('subjectName').value,
            goal: document.getElementById('subjectGoal').value,
            createdAt: new Date().toISOString()
        };

        subjects.push(newSubject);
        localStorage.setItem('subjects', JSON.stringify(subjects));
        
        // Reset and close modal
        subjectForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
        loadSubjects();
    });

    window.deleteSubject = (index) => {
        const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
        subjects.splice(index, 1);
        localStorage.setItem('subjects', JSON.stringify(subjects));
        loadSubjects();
    };

    loadSubjects();
});