# Contributing to NovaDo

Thank you for your interest in contributing to NovaDo! We welcome contributions from developers of all skill levels.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

### Our Standards

- **Be respectful** and inclusive in all interactions
- **Welcome newcomers** and help them get started
- **Focus on constructive feedback** rather than criticism
- **Respect different viewpoints** and experiences
- **Accept responsibility** and apologize when mistakes happen

### Unacceptable Behavior

- Harassment, trolling, or discriminatory comments
- Publishing others' private information
- Personal attacks or inflammatory language
- Spamming or off-topic discussions

**Enforcement:** Violations may result in temporary or permanent ban from the project.

---

## 🤝 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report:
1. **Check existing issues** to avoid duplicates
2. **Update to latest version** to verify bug still exists
3. **Collect information**: OS, Python version, browser, error messages

**Create a detailed bug report** including:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details

**Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable.

**Environment:**
- OS: [e.g., Windows 11]
- Python: [e.g., 3.10.5]
- Browser: [e.g., Chrome 120]
- NovaDo Version: [e.g., 1.0.0-beta]
```

### 💡 Suggesting Features

Before suggesting a feature:
1. **Check roadmap** to see if it's planned
2. **Search existing feature requests**
3. **Consider if it aligns** with project goals

**Create a feature request** including:
- Clear, descriptive title
- Problem it solves
- Proposed solution
- Alternative solutions considered
- Additional context

### 🔧 Code Contributions

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following coding guidelines
4. **Test thoroughly**
5. **Commit with descriptive messages**
6. **Push to your fork**
7. **Open a Pull Request**

### 📝 Documentation Improvements

Documentation is crucial! Contributions welcome for:
- Fixing typos or clarifying language
- Adding examples or tutorials
- Improving API documentation
- Creating guides or how-tos

---

## 💻 Development Setup

### Prerequisites

- **Python 3.10+**
- **Git**
- **Virtual environment** (recommended)
- **Code editor** (VS Code recommended)

### Setup Steps

```bash
# 1. Fork and clone repository
git clone https://github.com/YOUR_USERNAME/NovaDo.git
cd NovaDo

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
.\venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Install development dependencies (if available)
pip install -r requirements-dev.txt  # Optional

# 6. Copy environment template
cp env.example .env

# 7. Configure .env file
# Add your API keys for testing (optional)

# 8. Run application
python main.py
```

### Verify Installation

Open browser to `http://localhost:5000` and verify:
- Application loads correctly
- Can create an account
- Can create a task
- UI renders properly

---

## 📐 Coding Guidelines

### Python (Backend)

**Style:**
- Follow **PEP 8** style guide
- Use **type hints** where applicable
- Maximum line length: **100 characters**
- Use **Black** for formatting (if available)

**Best Practices:**
```python
# Good - Type hints, descriptive names
async def get_task_by_id(
    task_id: str,
    user_id: str,
    db=Depends(get_db)
) -> Optional[Task]:
    """Retrieve a task by ID for a specific user."""
    return db.tasks.find_one({"_id": task_id, "user_id": user_id})

# Avoid - No type hints, unclear naming
async def get(id, uid, db=Depends(get_db)):
    return db.tasks.find_one({"_id": id, "user_id": uid})
```

**File Structure:**
- One class per file when possible
- Group related functions
- Keep routes in `app/routes/`
- Keep models in `app/models.py`

### JavaScript (Frontend)

**Style:**
- Use **ES6+ features** (arrow functions, const/let, destructuring)
- Maximum line length: **100 characters**
- Use **camelCase** for variables and functions
- Use **UPPER_CASE** for constants

**Best Practices:**
```javascript
// Good - Modern ES6+, clear naming
const fetchTaskById = async (taskId) => {
    try {
        const response = await api.get(`/tasks/${taskId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch task:', error);
        throw error;
    }
};

// Avoid - Old style, unclear
function get(id) {
    return api.get('/tasks/' + id).then(r => r.data);
}
```

**File Organization:**
- Keep modules focused and single-purpose
- Use descriptive file names (`taskMatrix.js`, not `tm.js`)
- Group related functionality

### CSS

**Style:**
- Use **CSS variables** for theming
- Use **kebab-case** for class names
- Mobile-first responsive design
- Avoid `!important` unless absolutely necessary

**Best Practices:**
```css
/* Good - CSS variables, clear naming */
.task-card {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 1rem;
}

/* Avoid - Hard-coded values */
.card {
    background: #fff;
    border: 1px solid #ddd;
}
```

---

## 📝 Commit Messages

### Format

Use **conventional commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(calendar): add drag-and-drop rescheduling

# Bug fix
fix(tasks): resolve duplicate task creation issue

# Documentation
docs(api): update task endpoint documentation

# Multiple changes
feat(habits): add streak calculation
- Implement current streak tracking
- Add best streak recording
- Update UI to display streaks
```

### Best Practices

- **Use imperative mood** ("add feature" not "added feature")
- **Keep subject line under 50 characters**
- **Capitalize subject line**
- **No period at end of subject**
- **Use body to explain what and why**, not how

---

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Test your changes** thoroughly
3. **Run linters** if available
4. **Check for console errors**
5. **Verify no breaking changes** (or document them)

### PR Title

Follow conventional commit format:
```
feat(scope): Add new feature
fix(scope): Fix bug description
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] No console errors
- [ ] Tested on multiple browsers (if frontend)
- [ ] Added/updated tests (if applicable)

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code sections
- [ ] Updated documentation
- [ ] No new warnings generated
```

### Review Process

1. **Maintainer reviews** code and provides feedback
2. **Address feedback** by pushing additional commits
3. **Approval required** from at least one maintainer
4. **Merge** performed by maintainer

### After Merge

- **Delete your branch** (if not automatically deleted)
- **Update your fork** with latest changes
- **Celebrate** your contribution! 🎉

---

## 🗂️ Project Structure

```
NovaDo/
├── app/                        # Backend application
│   ├── routes/                 # API route handlers
│   │   ├── tasks.py            # Task CRUD endpoints
│   │   ├── calendar.py         # Google Calendar integration
│   │   ├── llm.py              # AI assistant endpoints
│   │   └── ...
│   ├── models.py               # Pydantic data models
│   ├── database.py             # Database connection
│   └── auth.py                 # JWT authentication
│
├── static/                     # Frontend files
│   ├── index.html              # Main application
│   ├── css/                    # Stylesheets
│   │   ├── style.css           # Global styles
│   │   ├── taskMatrix.css      # Matrix view styles
│   │   └── themes.css          # Theme definitions
│   └── js/                     # JavaScript modules
│       ├── app.js              # Main application logic
│       ├── api.js              # API client
│       ├── taskMatrix.js       # Matrix view logic
│       └── statistics.js       # Analytics
│
├── docs/                       # Documentation
│   ├── FEATURES.md             # Feature documentation
│   ├── API_REFERENCE.md        # API specification
│   └── DEVELOPER_GUIDE.md      # Developer guide
│
├── data/                       # Database storage (gitignored)
├── uploads/                    # User uploads (gitignored)
├── main.py                     # Application entry point
└── requirements.txt            # Python dependencies
```

---

## 🧪 Testing

### Manual Testing

Before submitting changes:

1. **User flows** - Test complete user journeys
2. **Edge cases** - Test with empty data, long text, special characters
3. **Error handling** - Verify proper error messages
4. **Browser compatibility** - Test on Chrome, Firefox, Edge
5. **Responsive design** - Test on different screen sizes

### Automated Testing (Future)

We're working on automated test coverage. Contributions welcome!

---

## 📚 Documentation

### Where to Document

- **Code comments** - Complex logic, non-obvious decisions
- **Docstrings** - All public functions and classes
- **README.md** - Getting started, quick reference
- **docs/FEATURES.md** - Feature descriptions
- **docs/API_REFERENCE.md** - API endpoints
- **docs/DEVELOPER_GUIDE.md** - Development details

### Documentation Style

**Python docstrings:**
```python
def calculate_streak(habit_id: str, user_id: str) -> Dict[str, int]:
    """
    Calculate current and best streaks for a habit.
    
    Args:
        habit_id: Unique identifier for the habit
        user_id: Unique identifier for the user
        
    Returns:
        Dictionary containing 'current_streak' and 'best_streak'
        
    Raises:
        ValueError: If habit not found
    """
    # Implementation...
```

**JavaScript comments:**
```javascript
/**
 * Fetch tasks with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Task list with pagination info
 */
async function fetchTasks(filters = {}, page = 1, limit = 50) {
    // Implementation...
}
```

---

## 🎯 Areas Needing Contributions

### High Priority
- [ ] Automated testing suite
- [ ] Mobile responsiveness improvements
- [ ] Performance optimization
- [ ] Accessibility enhancements
- [ ] Error handling improvements

### Medium Priority
- [ ] Additional themes
- [ ] More AI providers
- [ ] Export/import functionality
- [ ] Keyboard shortcut customization
- [ ] Tutorial/onboarding flow

### Good First Issues
- [ ] UI/UX polish
- [ ] Documentation improvements
- [ ] Code comments
- [ ] Bug fixes
- [ ] Icon additions

---

## 💬 Getting Help

Stuck? Need guidance?

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Check existing issues or create one
- **Email**: contact@amnxlab.site
- **Documentation**: See [Developer Guide](docs/DEVELOPER_GUIDE.md)

---

## 🏆 Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Project README (for significant contributions)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to NovaDo! Every contribution, no matter how small, helps make this project better. 🙏
