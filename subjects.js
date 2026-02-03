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

        subjectsGrid.innerHTML = '';
        
        subjects.forEach((sub, index) => {
            const card = document.createElement('div');
            // Using col-lg-4 creates the 3-column grid shown in the image
            card.className = 'col-12 col-md-6 col-lg-4'; 
            card.innerHTML = `
                <div class="card subject-card h-100">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="subject-icon">
                            <i class="bi bi-journal-bookmark-fill"></i>
                        </div>
                        <i class="bi bi-trash-fill delete-btn" onclick="deleteSubject(${index})"></i>
                    </div>
                    <h5 class="fw-bold text-white mb-1">${sub.name}</h5>
                    <p class="text-secondary small mb-4">Goal: ${sub.goal} hours</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between mb-1 small text-secondary">
                            <span>Progress</span>
                            <span class="text-white">${sub.progress || 0}%</span>
                        </div>
                        <div class="progress custom-progress">
                            <div class="progress-bar" style="width: ${sub.progress || 0}%"></div>
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