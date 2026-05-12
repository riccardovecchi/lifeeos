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
