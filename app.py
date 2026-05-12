"""
Life-OS Backend
A secure Flask application for personal life management
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
from functools import wraps
import secrets
import hashlib

app = Flask(__name__)

# Security configurations
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['JSON_SORT_KEYS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size

# CORS configuration - restrict to localhost only
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5011", "http://127.0.0.1:5011"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

# Database file path
DB_FILE = 'lifeos_data.json'

# Initialize database structure
DEFAULT_DB = {
    "spheres": [],
    "habits": [],
    "goals": [],
    "tasks": [],
    "culture": [],
    "training": [],
    "hobbies": [],
    "metadata": {
        "created_at": datetime.now().isoformat(),
        "last_modified": datetime.now().isoformat(),
        "version": "1.0.0"
    }
}


def init_database():
    """Initialize database file if it doesn't exist"""
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_DB, f, indent=2, ensure_ascii=False)
        print(f"✓ Database initialized: {DB_FILE}")


def read_db():
    """Safely read database with error handling"""
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"⚠ Database read error: {e}. Reinitializing...")
        init_database()
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)


def write_db(data):
    """Safely write database with atomic operation"""
    # Update metadata
    data['metadata']['last_modified'] = datetime.now().isoformat()

    # Write to temporary file first (atomic operation)
    temp_file = f"{DB_FILE}.tmp"
    try:
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Replace original file
        os.replace(temp_file, DB_FILE)
        return True
    except Exception as e:
        print(f"✗ Database write error: {e}")
        if os.path.exists(temp_file):
            os.remove(temp_file)
        return False


def validate_input(required_fields):
    """Decorator to validate request JSON input"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 400

            data = request.get_json()
            missing = [field for field in required_fields if field not in data]

            if missing:
                return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

            return f(*args, **kwargs)
        return wrapper
    return decorator


def generate_id(prefix=""):
    """Generate unique ID with timestamp and random component"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = secrets.token_hex(4)
    return f"{prefix}{timestamp}_{random_part}"


def sanitize_string(text, max_length=500):
    """Sanitize user input strings"""
    if not isinstance(text, str):
        return ""
    # Remove potential XSS characters
    text = text.strip()[:max_length]
    return text


# ============================================================================
# API ROUTES - SPHERES (Aree di interesse)
# ============================================================================

@app.route('/api/spheres', methods=['GET'])
def get_spheres():
    """Get all spheres"""
    db = read_db()
    return jsonify(db['spheres']), 200


@app.route('/api/spheres', methods=['POST'])
@validate_input(['name'])
def create_sphere():
    """Create a new sphere"""
    data = request.get_json()
    db = read_db()

    sphere = {
        "id": generate_id("sph_"),
        "name": sanitize_string(data['name'], 100),
        "description": sanitize_string(data.get('description', ''), 500),
        "color": sanitize_string(data.get('color', '#6366f1'), 20),
        "icon": sanitize_string(data.get('icon', '●'), 10),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    db['spheres'].append(sphere)

    if write_db(db):
        return jsonify(sphere), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/spheres/<sphere_id>', methods=['PUT'])
@validate_input(['name'])
def update_sphere(sphere_id):
    """Update a sphere"""
    data = request.get_json()
    db = read_db()

    sphere = next((s for s in db['spheres'] if s['id'] == sphere_id), None)
    if not sphere:
        return jsonify({"error": "Sphere not found"}), 404

    sphere['name'] = sanitize_string(data['name'], 100)
    sphere['description'] = sanitize_string(data.get('description', sphere.get('description', '')), 500)
    sphere['color'] = sanitize_string(data.get('color', sphere.get('color', '#6366f1')), 20)
    sphere['icon'] = sanitize_string(data.get('icon', sphere.get('icon', '●')), 10)
    sphere['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(sphere), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/spheres/<sphere_id>', methods=['DELETE'])
def delete_sphere(sphere_id):
    """Delete a sphere"""
    db = read_db()

    initial_length = len(db['spheres'])
    db['spheres'] = [s for s in db['spheres'] if s['id'] != sphere_id]

    if len(db['spheres']) == initial_length:
        return jsonify({"error": "Sphere not found"}), 404

    if write_db(db):
        return jsonify({"message": "Sphere deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# API ROUTES - HABITS (Abitudini)
# ============================================================================

@app.route('/api/habits', methods=['GET'])
def get_habits():
    """Get all habits"""
    db = read_db()
    return jsonify(db['habits']), 200


@app.route('/api/habits', methods=['POST'])
@validate_input(['name', 'frequency'])
def create_habit():
    """Create a new habit"""
    data = request.get_json()
    db = read_db()

    habit = {
        "id": generate_id("hab_"),
        "name": sanitize_string(data['name'], 100),
        "description": sanitize_string(data.get('description', ''), 500),
        "frequency": sanitize_string(data['frequency'], 20),  # daily, weekly, monthly
        "sphere_id": sanitize_string(data.get('sphere_id', ''), 50),
        "streak": 0,
        "completions": [],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    db['habits'].append(habit)

    if write_db(db):
        return jsonify(habit), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/habits/<habit_id>', methods=['PUT'])
@validate_input(['name', 'frequency'])
def update_habit(habit_id):
    """Update a habit"""
    data = request.get_json()
    db = read_db()

    habit = next((h for h in db['habits'] if h['id'] == habit_id), None)
    if not habit:
        return jsonify({"error": "Habit not found"}), 404

    habit['name'] = sanitize_string(data['name'], 100)
    habit['description'] = sanitize_string(data.get('description', habit.get('description', '')), 500)
    habit['frequency'] = sanitize_string(data['frequency'], 20)
    habit['sphere_id'] = sanitize_string(data.get('sphere_id', habit.get('sphere_id', '')), 50)
    habit['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(habit), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/habits/<habit_id>/complete', methods=['POST'])
def complete_habit(habit_id):
    """Mark habit as completed for today"""
    db = read_db()

    habit = next((h for h in db['habits'] if h['id'] == habit_id), None)
    if not habit:
        return jsonify({"error": "Habit not found"}), 404

    today = datetime.now().date().isoformat()

    # Check if already completed today
    if today not in habit['completions']:
        habit['completions'].append(today)
        habit['streak'] += 1
        habit['updated_at'] = datetime.now().isoformat()

        if write_db(db):
            return jsonify(habit), 200

    return jsonify(habit), 200


@app.route('/api/habits/<habit_id>', methods=['DELETE'])
def delete_habit(habit_id):
    """Delete a habit"""
    db = read_db()

    initial_length = len(db['habits'])
    db['habits'] = [h for h in db['habits'] if h['id'] != habit_id]

    if len(db['habits']) == initial_length:
        return jsonify({"error": "Habit not found"}), 404

    if write_db(db):
        return jsonify({"message": "Habit deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# API ROUTES - GOALS (Obiettivi)
# ============================================================================

@app.route('/api/goals', methods=['GET'])
def get_goals():
    """Get all goals"""
    db = read_db()
    return jsonify(db['goals']), 200


@app.route('/api/goals', methods=['POST'])
@validate_input(['name', 'target_date'])
def create_goal():
    """Create a new goal"""
    data = request.get_json()
    db = read_db()

    goal = {
        "id": generate_id("gol_"),
        "name": sanitize_string(data['name'], 100),
        "description": sanitize_string(data.get('description', ''), 500),
        "target_date": sanitize_string(data['target_date'], 20),
        "progress": max(0, min(100, int(data.get('progress', 0)))),
        "sphere_id": sanitize_string(data.get('sphere_id', ''), 50),
        "status": "active",  # active, completed, abandoned
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    db['goals'].append(goal)

    if write_db(db):
        return jsonify(goal), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/goals/<goal_id>', methods=['PUT'])
@validate_input(['name', 'target_date'])
def update_goal(goal_id):
    """Update a goal"""
    data = request.get_json()
    db = read_db()

    goal = next((g for g in db['goals'] if g['id'] == goal_id), None)
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    goal['name'] = sanitize_string(data['name'], 100)
    goal['description'] = sanitize_string(data.get('description', goal.get('description', '')), 500)
    goal['target_date'] = sanitize_string(data['target_date'], 20)
    goal['progress'] = max(0, min(100, int(data.get('progress', goal.get('progress', 0)))))
    goal['sphere_id'] = sanitize_string(data.get('sphere_id', goal.get('sphere_id', '')), 50)
    goal['status'] = sanitize_string(data.get('status', goal.get('status', 'active')), 20)
    goal['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(goal), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/goals/<goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    """Delete a goal"""
    db = read_db()

    initial_length = len(db['goals'])
    db['goals'] = [g for g in db['goals'] if g['id'] != goal_id]

    if len(db['goals']) == initial_length:
        return jsonify({"error": "Goal not found"}), 404

    if write_db(db):
        return jsonify({"message": "Goal deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# API ROUTES - TASKS
# ============================================================================

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks"""
    db = read_db()
    return jsonify(db['tasks']), 200


@app.route('/api/tasks', methods=['POST'])
@validate_input(['title'])
def create_task():
    """Create a new task"""
    data = request.get_json()
    db = read_db()

    task = {
        "id": generate_id("tsk_"),
        "title": sanitize_string(data['title'], 200),
        "description": sanitize_string(data.get('description', ''), 500),
        "priority": sanitize_string(data.get('priority', 'medium'), 20),  # low, medium, high
        "status": "todo",  # todo, in_progress, done
        "due_date": sanitize_string(data.get('due_date', ''), 20),
        "sphere_id": sanitize_string(data.get('sphere_id', ''), 50),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "completed_at": None
    }

    db['tasks'].append(task)

    if write_db(db):
        return jsonify(task), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/tasks/<task_id>', methods=['PUT'])
@validate_input(['title'])
def update_task(task_id):
    """Update a task"""
    data = request.get_json()
    db = read_db()

    task = next((t for t in db['tasks'] if t['id'] == task_id), None)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    task['title'] = sanitize_string(data['title'], 200)
    task['description'] = sanitize_string(data.get('description', task.get('description', '')), 500)
    task['priority'] = sanitize_string(data.get('priority', task.get('priority', 'medium')), 20)
    task['status'] = sanitize_string(data.get('status', task.get('status', 'todo')), 20)
    task['due_date'] = sanitize_string(data.get('due_date', task.get('due_date', '')), 20)
    task['sphere_id'] = sanitize_string(data.get('sphere_id', task.get('sphere_id', '')), 50)
    task['updated_at'] = datetime.now().isoformat()

    # Set completed_at when status changes to done
    if task['status'] == 'done' and not task.get('completed_at'):
        task['completed_at'] = datetime.now().isoformat()
    elif task['status'] != 'done':
        task['completed_at'] = None

    if write_db(db):
        return jsonify(task), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    db = read_db()

    initial_length = len(db['tasks'])
    db['tasks'] = [t for t in db['tasks'] if t['id'] != task_id]

    if len(db['tasks']) == initial_length:
        return jsonify({"error": "Task not found"}), 404

    if write_db(db):
        return jsonify({"message": "Task deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# API ROUTES - CULTURE (Cultura)
# ============================================================================

@app.route('/api/culture', methods=['GET'])
def get_culture():
    """Get all culture items"""
    db = read_db()
    return jsonify(db['culture']), 200


@app.route('/api/culture', methods=['POST'])
@validate_input(['title', 'type'])
def create_culture():
    """Create a new culture item (book, movie, article, etc.)"""
    data = request.get_json()
    db = read_db()

    item = {
        "id": generate_id("cul_"),
        "title": sanitize_string(data['title'], 200),
        "type": sanitize_string(data['type'], 50),  # book, movie, article, podcast, etc.
        "author": sanitize_string(data.get('author', ''), 100),
        "notes": sanitize_string(data.get('notes', ''), 1000),
        "rating": max(0, min(5, int(data.get('rating', 0)))),
        "status": sanitize_string(data.get('status', 'to_consume'), 50),  # to_consume, consuming, completed
        "sphere_id": sanitize_string(data.get('sphere_id', ''), 50),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    db['culture'].append(item)

    if write_db(db):
        return jsonify(item), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/culture/<item_id>', methods=['PUT'])
@validate_input(['title', 'type'])
def update_culture(item_id):
    """Update a culture item"""
    data = request.get_json()
    db = read_db()

    item = next((c for c in db['culture'] if c['id'] == item_id), None)
    if not item:
        return jsonify({"error": "Culture item not found"}), 404

    item['title'] = sanitize_string(data['title'], 200)
    item['type'] = sanitize_string(data['type'], 50)
    item['author'] = sanitize_string(data.get('author', item.get('author', '')), 100)
    item['notes'] = sanitize_string(data.get('notes', item.get('notes', '')), 1000)
    item['rating'] = max(0, min(5, int(data.get('rating', item.get('rating', 0)))))
    item['status'] = sanitize_string(data.get('status', item.get('status', 'to_consume')), 50)
    item['sphere_id'] = sanitize_string(data.get('sphere_id', item.get('sphere_id', '')), 50)
    item['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(item), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/culture/<item_id>', methods=['DELETE'])
def delete_culture(item_id):
    """Delete a culture item"""
    db = read_db()

    initial_length = len(db['culture'])
    db['culture'] = [c for c in db['culture'] if c['id'] != item_id]

    if len(db['culture']) == initial_length:
        return jsonify({"error": "Culture item not found"}), 404

    if write_db(db):
        return jsonify({"message": "Culture item deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# API ROUTES - TRAINING (Formazione)
# ============================================================================

@app.route('/api/training', methods=['GET'])
def get_training():
    """Get all training items"""
    db = read_db()
    return jsonify(db['training']), 200


@app.route('/api/training', methods=['POST'])
@validate_input(['title', 'type'])
def create_training():
    """Create a new training item (course, certification, workshop, etc.)"""
    data = request.get_json()
    db = read_db()

    item = {
        "id": generate_id("trn_"),
        "title": sanitize_string(data['title'], 200),
        "type": sanitize_string(data['type'], 50),  # course, certification, workshop, etc.
        "provider": sanitize_string(data.get('provider', ''), 100),
        "description": sanitize_string(data.get('description', ''), 500),
        "progress": max(0, min(100, int(data.get('progress', 0)))),
        "status": sanitize_string(data.get('status', 'planned'), 50),  # planned, in_progress, completed
        "start_date": sanitize_string(data.get('start_date', ''), 20),
        "end_date": sanitize_string(data.get('end_date', ''), 20),
        "sphere_id": sanitize_string(data.get('sphere_id', ''), 50),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    db['training'].append(item)

    if write_db(db):
        return jsonify(item), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/training/<item_id>', methods=['PUT'])
@validate_input(['title', 'type'])
def update_training(item_id):
    """Update a training item"""
    data = request.get_json()
    db = read_db()

    item = next((t for t in db['training'] if t['id'] == item_id), None)
    if not item:
        return jsonify({"error": "Training item not found"}), 404

    item['title'] = sanitize_string(data['title'], 200)
    item['type'] = sanitize_string(data['type'], 50)
    item['provider'] = sanitize_string(data.get('provider', item.get('provider', '')), 100)
    item['description'] = sanitize_string(data.get('description', item.get('description', '')), 500)
    item['progress'] = max(0, min(100, int(data.get('progress', item.get('progress', 0)))))
    item['status'] = sanitize_string(data.get('status', item.get('status', 'planned')), 50)
    item['start_date'] = sanitize_string(data.get('start_date', item.get('start_date', '')), 20)
    item['end_date'] = sanitize_string(data.get('end_date', item.get('end_date', '')), 20)
    item['sphere_id'] = sanitize_string(data.get('sphere_id', item.get('sphere_id', '')), 50)
    item['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(item), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/training/<item_id>', methods=['DELETE'])
def delete_training(item_id):
    """Delete a training item"""
    db = read_db()

    initial_length = len(db['training'])
    db['training'] = [t for t in db['training'] if t['id'] != item_id]

    if len(db['training']) == initial_length:
        return jsonify({"error": "Training item not found"}), 404

    if write_db(db):
        return jsonify({"message": "Training item deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# API ROUTES - HOBBIES
# ============================================================================

@app.route('/api/hobbies', methods=['GET'])
def get_hobbies():
    """Get all hobbies"""
    db = read_db()
    return jsonify(db['hobbies']), 200


@app.route('/api/hobbies', methods=['POST'])
@validate_input(['name'])
def create_hobby():
    """Create a new hobby"""
    data = request.get_json()
    db = read_db()

    hobby = {
        "id": generate_id("hob_"),
        "name": sanitize_string(data['name'], 100),
        "description": sanitize_string(data.get('description', ''), 500),
        "time_spent": 0,  # in minutes
        "sessions": [],
        "sphere_id": sanitize_string(data.get('sphere_id', ''), 50),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    db['hobbies'].append(hobby)

    if write_db(db):
        return jsonify(hobby), 201
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/hobbies/<hobby_id>', methods=['PUT'])
@validate_input(['name'])
def update_hobby(hobby_id):
    """Update a hobby"""
    data = request.get_json()
    db = read_db()

    hobby = next((h for h in db['hobbies'] if h['id'] == hobby_id), None)
    if not hobby:
        return jsonify({"error": "Hobby not found"}), 404

    hobby['name'] = sanitize_string(data['name'], 100)
    hobby['description'] = sanitize_string(data.get('description', hobby.get('description', '')), 500)
    hobby['sphere_id'] = sanitize_string(data.get('sphere_id', hobby.get('sphere_id', '')), 50)
    hobby['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(hobby), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/hobbies/<hobby_id>/session', methods=['POST'])
@validate_input(['duration'])
def add_hobby_session(hobby_id):
    """Add a session to a hobby"""
    data = request.get_json()
    db = read_db()

    hobby = next((h for h in db['hobbies'] if h['id'] == hobby_id), None)
    if not hobby:
        return jsonify({"error": "Hobby not found"}), 404

    duration = max(0, int(data['duration']))  # in minutes
    session = {
        "date": datetime.now().isoformat(),
        "duration": duration,
        "notes": sanitize_string(data.get('notes', ''), 500)
    }

    hobby['sessions'].append(session)
    hobby['time_spent'] += duration
    hobby['updated_at'] = datetime.now().isoformat()

    if write_db(db):
        return jsonify(hobby), 200
    return jsonify({"error": "Failed to save data"}), 500


@app.route('/api/hobbies/<hobby_id>', methods=['DELETE'])
def delete_hobby(hobby_id):
    """Delete a hobby"""
    db = read_db()

    initial_length = len(db['hobbies'])
    db['hobbies'] = [h for h in db['hobbies'] if h['id'] != hobby_id]

    if len(db['hobbies']) == initial_length:
        return jsonify({"error": "Hobby not found"}), 404

    if write_db(db):
        return jsonify({"message": "Hobby deleted successfully"}), 200
    return jsonify({"error": "Failed to save data"}), 500


# ============================================================================
# STATIC FILES & MAIN
# ============================================================================

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('.', path)


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    # Initialize database on startup
    init_database()

    print("\n" + "="*60)
    print("🚀 Life-OS Backend Starting...")
    print("="*60)
    print(f"📊 Database: {DB_FILE}")
    print(f"🌐 Server: http://localhost:5011")
    print(f"🔒 Security: CORS enabled for localhost only")
    print("="*60 + "\n")

    # Run Flask app
    app.run(
        host='127.0.0.1',
        port=5011,
        debug=False,  # Set to False in production
        threaded=True
    )
