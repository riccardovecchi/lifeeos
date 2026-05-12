/**
 * Life-OS Frontend Application
 * Manages all client-side functionality and API interactions
 */

// ============================================================================
// Configuration & State
// ============================================================================

const API_BASE = 'http://localhost:5011/api';

const state = {
    spheres: [],
    tasks: [],
    habits: [],
    goals: [],
    culture: [],
    training: [],
    hobbies: [],
    currentSection: 'dashboard',
    currentFilter: 'all'
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeFilters();
    loadAllData();
});

/**
 * Initialize navigation menu
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);

            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

/**
 * Switch between content sections
 */
function switchSection(section) {
    state.currentSection = section;

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Show selected section
    document.getElementById(section).classList.add('active');

    // Load section data
    loadSectionData(section);
}

/**
 * Initialize filter tabs
 */
function initializeFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;
            state.currentFilter = filter;

            // Update active state
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Re-render tasks with filter
            renderTasks();
        });
    });
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

/**
 * Load all data from API
 */
async function loadAllData() {
    try {
        const [spheres, tasks, habits, goals, culture, training, hobbies] = await Promise.all([
            apiRequest('/spheres'),
            apiRequest('/tasks'),
            apiRequest('/habits'),
            apiRequest('/goals'),
            apiRequest('/culture'),
            apiRequest('/training'),
            apiRequest('/hobbies')
        ]);

        state.spheres = spheres;
        state.tasks = tasks;
        state.habits = habits;
        state.goals = goals;
        state.culture = culture;
        state.training = training;
        state.hobbies = hobbies;

        // Render current section
        loadSectionData(state.currentSection);
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

/**
 * Load data for specific section
 */
function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'spheres':
            renderSpheres();
            break;
        case 'tasks':
            renderTasks();
            break;
        case 'habits':
            renderHabits();
            break;
        case 'goals':
            renderGoals();
            break;
        case 'culture':
            renderCulture();
            break;
        case 'training':
            renderTraining();
            break;
        case 'hobbies':
            renderHobbies();
            break;
    }
}

// ============================================================================
// Render Functions - Dashboard
// ============================================================================

function renderDashboard() {
    // Update statistics
    document.getElementById('stat-spheres').textContent = state.spheres.length;
    document.getElementById('stat-tasks').textContent = state.tasks.filter(t => t.status !== 'done').length;
    document.getElementById('stat-habits').textContent = state.habits.length;
    document.getElementById('stat-goals').textContent = state.goals.filter(g => g.status === 'active').length;

    // Render recent tasks
    const recentTasks = state.tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    const recentTasksHtml = recentTasks.length > 0
        ? recentTasks.map(task => `
            <div class="item-card">
                <div class="item-title">${escapeHtml(task.title)}</div>
                <div class="item-meta">
                    <span class="badge badge-${getPriorityColor(task.priority)}">${task.priority}</span>
                    ${task.due_date ? `<span>📅 ${formatDate(task.due_date)}</span>` : ''}
                </div>
            </div>
        `).join('')
        : '<p class="text-secondary">Nessun task aperto</p>';

    document.getElementById('recent-tasks').innerHTML = recentTasksHtml;

    // Render today's habits
    const today = new Date().toISOString().split('T')[0];
    const todayHabitsHtml = state.habits.length > 0
        ? state.habits.map(habit => {
            const completed = habit.completions.includes(today);
            return `
                <div class="item-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div class="item-title">${escapeHtml(habit.name)}</div>
                            <div class="item-meta">
                                <span>🔥 Streak: ${habit.streak}</span>
                            </div>
                        </div>
                        <button class="btn btn-small ${completed ? 'btn-success' : 'btn-primary'}" 
                                onclick="completeHabit('${habit.id}')"
                                ${completed ? 'disabled' : ''}>
                            ${completed ? '✓ Fatto' : 'Completa'}
                        </button>
                    </div>
                </div>
            `;
        }).join('')
        : '<p class="text-secondary">Nessuna abitudine configurata</p>';

    document.getElementById('today-habits').innerHTML = todayHabitsHtml;
}

// ============================================================================
// Render Functions - Spheres
// ============================================================================

function renderSpheres() {
    const container = document.getElementById('spheres-grid');

    if (state.spheres.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessuna sfera creata. Inizia creando la tua prima area di interesse!</p>';
        return;
    }

    const html = state.spheres.map(sphere => `
        <div class="sphere-card">
            <div class="sphere-header">
                <div class="sphere-icon" style="color: ${sphere.color}">
                    ${sphere.icon}
                </div>
                <div class="sphere-info">
                    <div class="sphere-name">${escapeHtml(sphere.name)}</div>
                </div>
            </div>
            ${sphere.description ? `<div class="sphere-description">${escapeHtml(sphere.description)}</div>` : ''}
            <div class="sphere-actions">
                <button class="btn btn-small btn-secondary" onclick="editSphere('${sphere.id}')">Modifica</button>
                <button class="btn btn-small btn-danger" onclick="deleteSphere('${sphere.id}')">Elimina</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ============================================================================
// Render Functions - Tasks
// ============================================================================

function renderTasks() {
    const container = document.getElementById('tasks-list');

    let filteredTasks = state.tasks;

    // Apply filter
    if (state.currentFilter !== 'all') {
        filteredTasks = state.tasks.filter(t => t.status === state.currentFilter);
    }

    // Sort by priority and date
    filteredTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (filteredTasks.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessun task trovato</p>';
        return;
    }

    const html = filteredTasks.map(task => {
        const sphere = state.spheres.find(s => s.id === task.sphere_id);

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(task.title)}</div>
                    <span class="badge badge-${getStatusColor(task.status)}">${getStatusLabel(task.status)}</span>
                </div>
                ${task.description ? `<div class="item-description">${escapeHtml(task.description)}</div>` : ''}
                <div class="item-meta">
                    <span class="badge badge-${getPriorityColor(task.priority)}">${task.priority}</span>
                    ${task.due_date ? `<span>📅 ${formatDate(task.due_date)}</span>` : ''}
                    ${sphere ? `<span style="color: ${sphere.color}">◉ ${escapeHtml(sphere.name)}</span>` : ''}
                </div>
                <div class="item-actions">
                    ${task.status !== 'done' ? `<button class="btn btn-small btn-success" onclick="updateTaskStatus('${task.id}', 'done')">✓ Completa</button>` : ''}
                    <button class="btn btn-small btn-secondary" onclick="editTask('${task.id}')">Modifica</button>
                    <button class="btn btn-small btn-danger" onclick="deleteTask('${task.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================================================
// Render Functions - Habits
// ============================================================================

function renderHabits() {
    const container = document.getElementById('habits-list');

    if (state.habits.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessuna abitudine configurata</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const html = state.habits.map(habit => {
        const sphere = state.spheres.find(s => s.id === habit.sphere_id);
        const completed = habit.completions.includes(today);

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(habit.name)}</div>
                    <span class="badge badge-primary">${habit.frequency}</span>
                </div>
                ${habit.description ? `<div class="item-description">${escapeHtml(habit.description)}</div>` : ''}
                <div class="item-meta">
                    <span>🔥 Streak: ${habit.streak} giorni</span>
                    <span>✓ Completamenti: ${habit.completions.length}</span>
                    ${sphere ? `<span style="color: ${sphere.color}">◉ ${escapeHtml(sphere.name)}</span>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-small ${completed ? 'btn-success' : 'btn-primary'}" 
                            onclick="completeHabit('${habit.id}')"
                            ${completed ? 'disabled' : ''}>
                        ${completed ? '✓ Completato Oggi' : 'Completa Oggi'}
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="editHabit('${habit.id}')">Modifica</button>
                    <button class="btn btn-small btn-danger" onclick="deleteHabit('${habit.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================================================
// Render Functions - Goals
// ============================================================================

function renderGoals() {
    const container = document.getElementById('goals-list');

    if (state.goals.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessun obiettivo definito</p>';
        return;
    }

    const html = state.goals.map(goal => {
        const sphere = state.spheres.find(s => s.id === goal.sphere_id);

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(goal.name)}</div>
                    <span class="badge badge-${getStatusColor(goal.status)}">${getStatusLabel(goal.status)}</span>
                </div>
                ${goal.description ? `<div class="item-description">${escapeHtml(goal.description)}</div>` : ''}
                <div class="item-meta">
                    <span>🎯 Target: ${formatDate(goal.target_date)}</span>
                    <span>📊 Progresso: ${goal.progress}%</span>
                    ${sphere ? `<span style="color: ${sphere.color}">◉ ${escapeHtml(sphere.name)}</span>` : ''}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goal.progress}%"></div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="editGoal('${goal.id}')">Modifica</button>
                    <button class="btn btn-small btn-danger" onclick="deleteGoal('${goal.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================================================
// Render Functions - Culture
// ============================================================================

function renderCulture() {
    const container = document.getElementById('culture-list');

    if (state.culture.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessun contenuto culturale aggiunto</p>';
        return;
    }

    const html = state.culture.map(item => {
        const sphere = state.spheres.find(s => s.id === item.sphere_id);
        const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <span class="badge badge-info">${item.type}</span>
                </div>
                ${item.author ? `<div class="item-meta"><span>👤 ${escapeHtml(item.author)}</span></div>` : ''}
                ${item.notes ? `<div class="item-description">${escapeHtml(item.notes)}</div>` : ''}
                <div class="item-meta">
                    <span class="badge badge-${getStatusColor(item.status)}">${getStatusLabel(item.status)}</span>
                    ${item.rating > 0 ? `<span>${stars}</span>` : ''}
                    ${sphere ? `<span style="color: ${sphere.color}">◉ ${escapeHtml(sphere.name)}</span>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="editCulture('${item.id}')">Modifica</button>
                    <button class="btn btn-small btn-danger" onclick="deleteCulture('${item.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================================================
// Render Functions - Training
// ============================================================================

function renderTraining() {
    const container = document.getElementById('training-list');

    if (state.training.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessun corso o formazione aggiunta</p>';
        return;
    }

    const html = state.training.map(item => {
        const sphere = state.spheres.find(s => s.id === item.sphere_id);

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <span class="badge badge-info">${item.type}</span>
                </div>
                ${item.provider ? `<div class="item-meta"><span>🏢 ${escapeHtml(item.provider)}</span></div>` : ''}
                ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
                <div class="item-meta">
                    <span class="badge badge-${getStatusColor(item.status)}">${getStatusLabel(item.status)}</span>
                    <span>📊 Progresso: ${item.progress}%</span>
                    ${item.start_date ? `<span>📅 ${formatDate(item.start_date)}</span>` : ''}
                    ${sphere ? `<span style="color: ${sphere.color}">◉ ${escapeHtml(sphere.name)}</span>` : ''}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${item.progress}%"></div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="editTraining('${item.id}')">Modifica</button>
                    <button class="btn btn-small btn-danger" onclick="deleteTraining('${item.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ============================================================================
// Render Functions - Hobbies
// ============================================================================

function renderHobbies() {
    const container = document.getElementById('hobbies-list');

    if (state.hobbies.length === 0) {
        container.innerHTML = '<p class="text-secondary">Nessun hobby aggiunto</p>';
        return;
    }

    const html = state.hobbies.map(hobby => {
        const sphere = state.spheres.find(s => s.id === hobby.sphere_id);
        const hours = Math.floor(hobby.time_spent / 60);
        const minutes = hobby.time_spent % 60;

        return `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(hobby.name)}</div>
                </div>
                ${hobby.description ? `<div class="item-description">${escapeHtml(hobby.description)}</div>` : ''}
                <div class="item-meta">
                    <span>⏱️ Tempo totale: ${hours}h ${minutes}m</span>
                    <span>📊 Sessioni: ${hobby.sessions.length}</span>
                    ${sphere ? `<span style="color: ${sphere.color}">◉ ${escapeHtml(sphere.name)}</span>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="addHobbySession('${hobby.id}')">+ Aggiungi Sessione</button>
                    <button class="btn btn-small btn-secondary" onclick="editHobby('${hobby.id}')">Modifica</button>
                    <button class="btn btn-small btn-danger" onclick="deleteHobby('${hobby.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}
// ============================================================================
// Modal Functions
// ============================================================================

function openModal(title, content) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');

    container.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
            ${content}
        </div>
    `;

    overlay.classList.add('active');
    container.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');

    overlay.classList.remove('active');
    container.classList.remove('active');
}

// ============================================================================
// Sphere Modal Functions
// ============================================================================

function openSphereModal(sphereId = null) {
    const sphere = sphereId ? state.spheres.find(s => s.id === sphereId) : null;
    const isEdit = !!sphere;

    const content = `
        <form id="sphere-form" onsubmit="saveSphere(event, '${sphereId || ''}')">
            <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" class="form-input" name="name" value="${sphere ? escapeHtml(sphere.name) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" name="description">${sphere ? escapeHtml(sphere.description) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Colore</label>
                <input type="color" class="form-input" name="color" value="${sphere ? sphere.color : '#6366f1'}">
            </div>

            <div class="form-group">
                <label class="form-label">Icona</label>
                <input type="text" class="form-input" name="icon" value="${sphere ? sphere.icon : '●'}" maxlength="2">
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Sfera' : 'Nuova Sfera', content);
}

async function saveSphere(event, sphereId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        color: formData.get('color'),
        icon: formData.get('icon')
    };

    try {
        if (sphereId) {
            await apiRequest(`/spheres/${sphereId}`, 'PUT', data);
            showToast('Sfera aggiornata con successo', 'success');
        } else {
            await apiRequest('/spheres', 'POST', data);
            showToast('Sfera creata con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving sphere:', error);
    }
}

function editSphere(sphereId) {
    openSphereModal(sphereId);
}

async function deleteSphere(sphereId) {
    if (!confirm('Sei sicuro di voler eliminare questa sfera?')) return;

    try {
        await apiRequest(`/spheres/${sphereId}`, 'DELETE');
        showToast('Sfera eliminata con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting sphere:', error);
    }
}

// ============================================================================
// Task Modal Functions
// ============================================================================

function openTaskModal(taskId = null) {
    const task = taskId ? state.tasks.find(t => t.id === taskId) : null;
    const isEdit = !!task;

    const sphereOptions = state.spheres.map(s => 
        `<option value="${s.id}" ${task && task.sphere_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const content = `
        <form id="task-form" onsubmit="saveTask(event, '${taskId || ''}')">
            <div class="form-group">
                <label class="form-label">Titolo *</label>
                <input type="text" class="form-input" name="title" value="${task ? escapeHtml(task.title) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" name="description">${task ? escapeHtml(task.description) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Priorità</label>
                <select class="form-select" name="priority">
                    <option value="low" ${task && task.priority === 'low' ? 'selected' : ''}>Bassa</option>
                    <option value="medium" ${task && task.priority === 'medium' ? 'selected' : ''}>Media</option>
                    <option value="high" ${task && task.priority === 'high' ? 'selected' : ''}>Alta</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Stato</label>
                <select class="form-select" name="status">
                    <option value="todo" ${task && task.status === 'todo' ? 'selected' : ''}>Da Fare</option>
                    <option value="in_progress" ${task && task.status === 'in_progress' ? 'selected' : ''}>In Corso</option>
                    <option value="done" ${task && task.status === 'done' ? 'selected' : ''}>Completato</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Data Scadenza</label>
                <input type="date" class="form-input" name="due_date" value="${task && task.due_date ? task.due_date : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Sfera</label>
                <select class="form-select" name="sphere_id">
                    <option value="">Nessuna</option>
                    ${sphereOptions}
                </select>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Task' : 'Nuovo Task', content);
}

async function saveTask(event, taskId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        status: formData.get('status'),
        due_date: formData.get('due_date'),
        sphere_id: formData.get('sphere_id')
    };

    try {
        if (taskId) {
            await apiRequest(`/tasks/${taskId}`, 'PUT', data);
            showToast('Task aggiornato con successo', 'success');
        } else {
            await apiRequest('/tasks', 'POST', data);
            showToast('Task creato con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving task:', error);
    }
}

function editTask(taskId) {
    openTaskModal(taskId);
}

async function updateTaskStatus(taskId, status) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
        await apiRequest(`/tasks/${taskId}`, 'PUT', {
            ...task,
            status
        });
        showToast('Task aggiornato', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) return;

    try {
        await apiRequest(`/tasks/${taskId}`, 'DELETE');
        showToast('Task eliminato con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// ============================================================================
// Habit Modal Functions
// ============================================================================

function openHabitModal(habitId = null) {
    const habit = habitId ? state.habits.find(h => h.id === habitId) : null;
    const isEdit = !!habit;

    const sphereOptions = state.spheres.map(s => 
        `<option value="${s.id}" ${habit && habit.sphere_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const content = `
        <form id="habit-form" onsubmit="saveHabit(event, '${habitId || ''}')">
            <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" class="form-input" name="name" value="${habit ? escapeHtml(habit.name) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" name="description">${habit ? escapeHtml(habit.description) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Frequenza</label>
                <select class="form-select" name="frequency">
                    <option value="daily" ${habit && habit.frequency === 'daily' ? 'selected' : ''}>Giornaliera</option>
                    <option value="weekly" ${habit && habit.frequency === 'weekly' ? 'selected' : ''}>Settimanale</option>
                    <option value="monthly" ${habit && habit.frequency === 'monthly' ? 'selected' : ''}>Mensile</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Sfera</label>
                <select class="form-select" name="sphere_id">
                    <option value="">Nessuna</option>
                    ${sphereOptions}
                </select>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Abitudine' : 'Nuova Abitudine', content);
}

async function saveHabit(event, habitId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        frequency: formData.get('frequency'),
        sphere_id: formData.get('sphere_id')
    };

    try {
        if (habitId) {
            await apiRequest(`/habits/${habitId}`, 'PUT', data);
            showToast('Abitudine aggiornata con successo', 'success');
        } else {
            await apiRequest('/habits', 'POST', data);
            showToast('Abitudine creata con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving habit:', error);
    }
}

function editHabit(habitId) {
    openHabitModal(habitId);
}

async function completeHabit(habitId) {
    try {
        await apiRequest(`/habits/${habitId}/complete`, 'POST');
        showToast('Abitudine completata! 🎉', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error completing habit:', error);
    }
}

async function deleteHabit(habitId) {
    if (!confirm('Sei sicuro di voler eliminare questa abitudine?')) return;

    try {
        await apiRequest(`/habits/${habitId}`, 'DELETE');
        showToast('Abitudine eliminata con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting habit:', error);
    }
}

// ============================================================================
// Goal Modal Functions
// ============================================================================

function openGoalModal(goalId = null) {
    const goal = goalId ? state.goals.find(g => g.id === goalId) : null;
    const isEdit = !!goal;

    const sphereOptions = state.spheres.map(s => 
        `<option value="${s.id}" ${goal && goal.sphere_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const content = `
        <form id="goal-form" onsubmit="saveGoal(event, '${goalId || ''}')">
            <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" class="form-input" name="name" value="${goal ? escapeHtml(goal.name) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" name="description">${goal ? escapeHtml(goal.description) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Data Target *</label>
                <input type="date" class="form-input" name="target_date" value="${goal && goal.target_date ? goal.target_date : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Progresso (%)</label>
                <input type="number" class="form-input" name="progress" min="0" max="100" value="${goal ? goal.progress : 0}">
            </div>

            <div class="form-group">
                <label class="form-label">Stato</label>
                <select class="form-select" name="status">
                    <option value="active" ${goal && goal.status === 'active' ? 'selected' : ''}>Attivo</option>
                    <option value="completed" ${goal && goal.status === 'completed' ? 'selected' : ''}>Completato</option>
                    <option value="abandoned" ${goal && goal.status === 'abandoned' ? 'selected' : ''}>Abbandonato</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Sfera</label>
                <select class="form-select" name="sphere_id">
                    <option value="">Nessuna</option>
                    ${sphereOptions}
                </select>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Obiettivo' : 'Nuovo Obiettivo', content);
}

async function saveGoal(event, goalId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        target_date: formData.get('target_date'),
        progress: parseInt(formData.get('progress')),
        status: formData.get('status'),
        sphere_id: formData.get('sphere_id')
    };

    try {
        if (goalId) {
            await apiRequest(`/goals/${goalId}`, 'PUT', data);
            showToast('Obiettivo aggiornato con successo', 'success');
        } else {
            await apiRequest('/goals', 'POST', data);
            showToast('Obiettivo creato con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving goal:', error);
    }
}

function editGoal(goalId) {
    openGoalModal(goalId);
}

async function deleteGoal(goalId) {
    if (!confirm('Sei sicuro di voler eliminare questo obiettivo?')) return;

    try {
        await apiRequest(`/goals/${goalId}`, 'DELETE');
        showToast('Obiettivo eliminato con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting goal:', error);
    }
}

// ============================================================================
// Culture Modal Functions
// ============================================================================

function openCultureModal(itemId = null) {
    const item = itemId ? state.culture.find(c => c.id === itemId) : null;
    const isEdit = !!item;

    const sphereOptions = state.spheres.map(s => 
        `<option value="${s.id}" ${item && item.sphere_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const content = `
        <form id="culture-form" onsubmit="saveCulture(event, '${itemId || ''}')">
            <div class="form-group">
                <label class="form-label">Titolo *</label>
                <input type="text" class="form-input" name="title" value="${item ? escapeHtml(item.title) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select class="form-select" name="type">
                    <option value="book" ${item && item.type === 'book' ? 'selected' : ''}>Libro</option>
                    <option value="movie" ${item && item.type === 'movie' ? 'selected' : ''}>Film</option>
                    <option value="article" ${item && item.type === 'article' ? 'selected' : ''}>Articolo</option>
                    <option value="podcast" ${item && item.type === 'podcast' ? 'selected' : ''}>Podcast</option>
                    <option value="documentary" ${item && item.type === 'documentary' ? 'selected' : ''}>Documentario</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Autore/Creatore</label>
                <input type="text" class="form-input" name="author" value="${item ? escapeHtml(item.author) : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Note</label>
                <textarea class="form-textarea" name="notes">${item ? escapeHtml(item.notes) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Valutazione (0-5)</label>
                <input type="number" class="form-input" name="rating" min="0" max="5" value="${item ? item.rating : 0}">
            </div>

            <div class="form-group">
                <label class="form-label">Stato</label>
                <select class="form-select" name="status">
                    <option value="to_consume" ${item && item.status === 'to_consume' ? 'selected' : ''}>Da Consumare</option>
                    <option value="consuming" ${item && item.status === 'consuming' ? 'selected' : ''}>In Corso</option>
                    <option value="completed" ${item && item.status === 'completed' ? 'selected' : ''}>Completato</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Sfera</label>
                <select class="form-select" name="sphere_id">
                    <option value="">Nessuna</option>
                    ${sphereOptions}
                </select>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Contenuto' : 'Nuovo Contenuto Culturale', content);
}

async function saveCulture(event, itemId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        type: formData.get('type'),
        author: formData.get('author'),
        notes: formData.get('notes'),
        rating: parseInt(formData.get('rating')),
        status: formData.get('status'),
        sphere_id: formData.get('sphere_id')
    };

    try {
        if (itemId) {
            await apiRequest(`/culture/${itemId}`, 'PUT', data);
            showToast('Contenuto aggiornato con successo', 'success');
        } else {
            await apiRequest('/culture', 'POST', data);
            showToast('Contenuto aggiunto con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving culture item:', error);
    }
}

function editCulture(itemId) {
    openCultureModal(itemId);
}

async function deleteCulture(itemId) {
    if (!confirm('Sei sicuro di voler eliminare questo contenuto?')) return;

    try {
        await apiRequest(`/culture/${itemId}`, 'DELETE');
        showToast('Contenuto eliminato con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting culture item:', error);
    }
}

// ============================================================================
// Training Modal Functions
// ============================================================================

function openTrainingModal(itemId = null) {
    const item = itemId ? state.training.find(t => t.id === itemId) : null;
    const isEdit = !!item;

    const sphereOptions = state.spheres.map(s => 
        `<option value="${s.id}" ${item && item.sphere_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const content = `
        <form id="training-form" onsubmit="saveTraining(event, '${itemId || ''}')">
            <div class="form-group">
                <label class="form-label">Titolo *</label>
                <input type="text" class="form-input" name="title" value="${item ? escapeHtml(item.title) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select class="form-select" name="type">
                    <option value="course" ${item && item.type === 'course' ? 'selected' : ''}>Corso</option>
                    <option value="certification" ${item && item.type === 'certification' ? 'selected' : ''}>Certificazione</option>
                    <option value="workshop" ${item && item.type === 'workshop' ? 'selected' : ''}>Workshop</option>
                    <option value="bootcamp" ${item && item.type === 'bootcamp' ? 'selected' : ''}>Bootcamp</option>
                    <option value="seminar" ${item && item.type === 'seminar' ? 'selected' : ''}>Seminario</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Provider/Organizzatore</label>
                <input type="text" class="form-input" name="provider" value="${item ? escapeHtml(item.provider) : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" name="description">${item ? escapeHtml(item.description) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Progresso (%)</label>
                <input type="number" class="form-input" name="progress" min="0" max="100" value="${item ? item.progress : 0}">
            </div>

            <div class="form-group">
                <label class="form-label">Stato</label>
                <select class="form-select" name="status">
                    <option value="planned" ${item && item.status === 'planned' ? 'selected' : ''}>Pianificato</option>
                    <option value="in_progress" ${item && item.status === 'in_progress' ? 'selected' : ''}>In Corso</option>
                    <option value="completed" ${item && item.status === 'completed' ? 'selected' : ''}>Completato</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Data Inizio</label>
                <input type="date" class="form-input" name="start_date" value="${item && item.start_date ? item.start_date : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Data Fine</label>
                <input type="date" class="form-input" name="end_date" value="${item && item.end_date ? item.end_date : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Sfera</label>
                <select class="form-select" name="sphere_id">
                    <option value="">Nessuna</option>
                    ${sphereOptions}
                </select>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Formazione' : 'Nuova Formazione', content);
}

async function saveTraining(event, itemId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        type: formData.get('type'),
        provider: formData.get('provider'),
        description: formData.get('description'),
        progress: parseInt(formData.get('progress')),
        status: formData.get('status'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        sphere_id: formData.get('sphere_id')
    };

    try {
        if (itemId) {
            await apiRequest(`/training/${itemId}`, 'PUT', data);
            showToast('Formazione aggiornata con successo', 'success');
        } else {
            await apiRequest('/training', 'POST', data);
            showToast('Formazione aggiunta con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving training item:', error);
    }
}

function editTraining(itemId) {
    openTrainingModal(itemId);
}

async function deleteTraining(itemId) {
    if (!confirm('Sei sicuro di voler eliminare questa formazione?')) return;

    try {
        await apiRequest(`/training/${itemId}`, 'DELETE');
        showToast('Formazione eliminata con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting training item:', error);
    }
}

// ============================================================================
// Hobby Modal Functions
// ============================================================================

function openHobbyModal(hobbyId = null) {
    const hobby = hobbyId ? state.hobbies.find(h => h.id === hobbyId) : null;
    const isEdit = !!hobby;

    const sphereOptions = state.spheres.map(s => 
        `<option value="${s.id}" ${hobby && hobby.sphere_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const content = `
        <form id="hobby-form" onsubmit="saveHobby(event, '${hobbyId || ''}')">
            <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" class="form-input" name="name" value="${hobby ? escapeHtml(hobby.name) : ''}" required>
            </div>

            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" name="description">${hobby ? escapeHtml(hobby.description) : ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Sfera</label>
                <select class="form-select" name="sphere_id">
                    <option value="">Nessuna</option>
                    ${sphereOptions}
                </select>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Aggiorna' : 'Crea'}</button>
            </div>
        </form>
    `;

    openModal(isEdit ? 'Modifica Hobby' : 'Nuovo Hobby', content);
}

async function saveHobby(event, hobbyId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        sphere_id: formData.get('sphere_id')
    };

    try {
        if (hobbyId) {
            await apiRequest(`/hobbies/${hobbyId}`, 'PUT', data);
            showToast('Hobby aggiornato con successo', 'success');
        } else {
            await apiRequest('/hobbies', 'POST', data);
            showToast('Hobby creato con successo', 'success');
        }

        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving hobby:', error);
    }
}

function editHobby(hobbyId) {
    openHobbyModal(hobbyId);
}

function addHobbySession(hobbyId) {
    const content = `
        <form id="session-form" onsubmit="saveHobbySession(event, '${hobbyId}')">
            <div class="form-group">
                <label class="form-label">Durata (minuti) *</label>
                <input type="number" class="form-input" name="duration" min="1" required>
            </div>

            <div class="form-group">
                <label class="form-label">Note</label>
                <textarea class="form-textarea" name="notes"></textarea>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">Aggiungi</button>
            </div>
        </form>
    `;

    openModal('Aggiungi Sessione', content);
}

async function saveHobbySession(event, hobbyId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        duration: parseInt(formData.get('duration')),
        notes: formData.get('notes')
    };

    try {
        await apiRequest(`/hobbies/${hobbyId}/session`, 'POST', data);
        showToast('Sessione aggiunta con successo', 'success');
        await loadAllData();
        closeModal();
    } catch (error) {
        console.error('Error saving hobby session:', error);
    }
}

async function deleteHobby(hobbyId) {
    if (!confirm('Sei sicuro di voler eliminare questo hobby?')) return;

    try {
        await apiRequest(`/hobbies/${hobbyId}`, 'DELETE');
        showToast('Hobby eliminato con successo', 'success');
        await loadAllData();
    } catch (error) {
        console.error('Error deleting hobby:', error);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getPriorityColor(priority) {
    const colors = {
        low: 'info',
        medium: 'warning',
        high: 'danger'
    };
    return colors[priority] || 'info';
}

function getStatusColor(status) {
    const colors = {
        todo: 'info',
        in_progress: 'warning',
        done: 'success',
        active: 'primary',
        completed: 'success',
        abandoned: 'danger',
        to_consume: 'info',
        consuming: 'warning',
        planned: 'info'
    };
    return colors[status] || 'info';
}

function getStatusLabel(status) {
    const labels = {
        todo: 'Da Fare',
        in_progress: 'In Corso',
        done: 'Completato',
        active: 'Attivo',
        completed: 'Completato',
        abandoned: 'Abbandonato',
        to_consume: 'Da Consumare',
        consuming: 'In Corso',
        planned: 'Pianificato'
    };
    return labels[status] || status;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

