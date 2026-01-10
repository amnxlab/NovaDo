/**
 * Unit Tests for Task Matrix - TaskCard Component
 * 
 * Tests specific examples, edge cases, and integration points
 * for the TaskCard rendering functionality.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */

describe('TaskCard Component', () => {
    // Mock task data
    const createMockTask = (overrides = {}) => ({
        id: 'test-task-1',
        _id: 'test-task-1',
        title: 'Test Task',
        description: 'Test description',
        priority: 2,
        status: 'todo',
        tags: [],
        energyLevel: 'medium',
        timeOfDay: 'morning',
        dueDate: null,
        completed: false,
        ...overrides
    });

    // Setup before each test
    beforeEach(() => {
        // Reset matrix state to defaults
        if (typeof matrixState !== 'undefined') {
            matrixState.fourthDimensionType = 'energy';
            matrixState.preferences = {
                animationsEnabled: true,
                soundEnabled: true,
                calmModeEnabled: false,
                animationSpeed: 'normal'
            };
        }
    });

    describe('Status Icon Rendering (Requirement 2.1, 2.3)', () => {
        test('renders ✅ icon for completed status', () => {
            const task = createMockTask({ status: 'completed', completed: true });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('✅');
                expect(html).toContain('data-status="completed"');
            }
        });

        test('renders ❌ icon for skipped status', () => {
            const task = createMockTask({ status: 'skipped' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('❌');
                expect(html).toContain('data-status="skipped"');
            }
        });

        test('renders ⏳ icon with spinning class for in_progress status', () => {
            const task = createMockTask({ status: 'in_progress' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('⏳');
                expect(html).toContain('spinning');
                expect(html).toContain('data-status="in_progress"');
            }
        });

        test('renders 📅 icon for scheduled status', () => {
            const task = createMockTask({ status: 'scheduled' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('📅');
                expect(html).toContain('data-status="scheduled"');
            }
        });

        test('renders ○ icon for todo status', () => {
            const task = createMockTask({ status: 'todo' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('○');
                expect(html).toContain('data-status="todo"');
            }
        });

        test('defaults to todo status when status is undefined', () => {
            const task = createMockTask({ status: undefined });
            
            if (typeof renderTaskCard === 'function' && typeof getTaskStatus === 'function') {
                const status = getTaskStatus(task);
                expect(status).toBe('todo');
            }
        });

        test('returns completed status when task.completed is true', () => {
            const task = createMockTask({ status: undefined, completed: true });
            
            if (typeof getTaskStatus === 'function') {
                const status = getTaskStatus(task);
                expect(status).toBe('completed');
            }
        });
    });

    describe('Priority Border Color (Requirement 2.2)', () => {
        test('renders priority-high class for high priority tasks', () => {
            const task = createMockTask({ priority: 3 });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('priority-high');
            }
        });

        test('renders priority-medium class for medium priority tasks', () => {
            const task = createMockTask({ priority: 2 });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('priority-medium');
            }
        });

        test('renders priority-low class for low priority tasks', () => {
            const task = createMockTask({ priority: 1 });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('priority-low');
            }
        });

        test('handles string priority values', () => {
            const task = createMockTask({ priority: 'high' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('priority-high');
            }
        });

        test('defaults to low priority when priority is undefined', () => {
            const task = createMockTask({ priority: undefined });
            
            if (typeof getPriorityLabel === 'function') {
                const priority = getPriorityLabel(task.priority);
                expect(priority).toBe('low');
            }
        });
    });

    describe('Tag Badges Display (Requirement 2.4)', () => {
        test('displays no tags section when task has no tags', () => {
            const task = createMockTask({ tags: [] });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).not.toContain('task-card-tags');
            }
        });

        test('displays single tag correctly', () => {
            const task = createMockTask({ tags: ['work'] });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('task-card-tags');
                expect(html).toContain('#work');
                expect(html).not.toContain('tag-more');
            }
        });

        test('displays up to 3 tags', () => {
            const task = createMockTask({ tags: ['work', 'urgent', 'meeting'] });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('#work');
                expect(html).toContain('#urgent');
                expect(html).toContain('#meeting');
                expect(html).not.toContain('tag-more');
            }
        });

        test('shows "+N more" indicator when more than 3 tags', () => {
            const task = createMockTask({ tags: ['work', 'urgent', 'meeting', 'review', 'important'] });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('#work');
                expect(html).toContain('#urgent');
                expect(html).toContain('#meeting');
                expect(html).not.toContain('#review');
                expect(html).not.toContain('#important');
                expect(html).toContain('+2');
                expect(html).toContain('tag-more');
            }
        });

        test('escapes HTML in tag names', () => {
            const task = createMockTask({ tags: ['<script>alert("xss")</script>'] });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).not.toContain('<script>');
                expect(html).toContain('&lt;script&gt;');
            }
        });
    });

    describe('Fourth Dimension Icon (Requirement 2.5)', () => {
        test('displays energy icon when fourth dimension is energy', () => {
            if (typeof matrixState !== 'undefined') {
                matrixState.fourthDimensionType = 'energy';
            }
            
            const task = createMockTask({ energyLevel: 'high' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('🔥');
                expect(html).toContain('data-fourth-dim="high"');
            }
        });

        test('displays medium energy icon by default', () => {
            if (typeof matrixState !== 'undefined') {
                matrixState.fourthDimensionType = 'energy';
            }
            
            const task = createMockTask({ energyLevel: 'medium' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('☕');
            }
        });

        test('displays low energy icon', () => {
            if (typeof matrixState !== 'undefined') {
                matrixState.fourthDimensionType = 'energy';
            }
            
            const task = createMockTask({ energyLevel: 'low' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('🪫');
            }
        });

        test('displays time of day icon when fourth dimension is time_of_day', () => {
            if (typeof matrixState !== 'undefined') {
                matrixState.fourthDimensionType = 'time_of_day';
            }
            
            const task = createMockTask({ timeOfDay: 'morning' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('🌅');
            }
        });

        test('displays afternoon icon', () => {
            if (typeof matrixState !== 'undefined') {
                matrixState.fourthDimensionType = 'time_of_day';
            }
            
            const task = createMockTask({ timeOfDay: 'afternoon' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('☀️');
            }
        });

        test('displays evening icon', () => {
            if (typeof matrixState !== 'undefined') {
                matrixState.fourthDimensionType = 'time_of_day';
            }
            
            const task = createMockTask({ timeOfDay: 'evening' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('🌙');
            }
        });
    });

    describe('Hover and Drag States (Requirement 2.5)', () => {
        test('card has draggable attribute', () => {
            const task = createMockTask();
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('draggable="true"');
            }
        });

        test('card has tabindex for keyboard focus', () => {
            const task = createMockTask();
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('tabindex="0"');
            }
        });

        test('completed card has completed class', () => {
            const task = createMockTask({ status: 'completed', completed: true });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('class="matrix-task-card completed');
            }
        });

        test('skipped card has skipped class', () => {
            const task = createMockTask({ status: 'skipped' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('skipped');
            }
        });
    });

    describe('Due Date Display', () => {
        test('displays "Today" for tasks due today', () => {
            const today = new Date().toISOString();
            const task = createMockTask({ dueDate: today });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('Today');
            }
        });

        test('displays "Tomorrow" for tasks due tomorrow', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const task = createMockTask({ dueDate: tomorrow.toISOString() });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('Tomorrow');
            }
        });

        test('displays formatted date for other dates', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            const task = createMockTask({ dueDate: futureDate.toISOString() });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('due-date');
            }
        });

        test('does not display due date when not set', () => {
            const task = createMockTask({ dueDate: null });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).not.toContain('due-date');
            }
        });
    });

    describe('Accessibility (Requirement 20.2)', () => {
        test('card has role="article"', () => {
            const task = createMockTask();
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('role="article"');
            }
        });

        test('card has aria-label with task info', () => {
            const task = createMockTask({ title: 'Important Task', status: 'todo', priority: 3 });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('aria-label=');
                expect(html).toContain('Important Task');
            }
        });

        test('status icon has aria-label', () => {
            const task = createMockTask({ status: 'in_progress' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('aria-label="In Progress"');
            }
        });

        test('complete button has aria-label', () => {
            const task = createMockTask();
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('aria-label="Mark task as complete"');
            }
        });

        test('completed task has reopen aria-label', () => {
            const task = createMockTask({ status: 'completed', completed: true });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('aria-label="Reopen task"');
            }
        });
    });

    describe('HTML Escaping', () => {
        test('escapes HTML in task title', () => {
            const task = createMockTask({ title: '<script>alert("xss")</script>' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).not.toContain('<script>alert');
                expect(html).toContain('&lt;script&gt;');
            }
        });

        test('escapes special characters in title', () => {
            const task = createMockTask({ title: 'Task with "quotes" & <brackets>' });
            
            if (typeof renderTaskCard === 'function') {
                const html = renderTaskCard(task);
                expect(html).toContain('&amp;');
                expect(html).toContain('&lt;');
                expect(html).toContain('&gt;');
            }
        });
    });
});

describe('Helper Functions', () => {
    describe('getTaskStatus', () => {
        test('returns explicit status when set', () => {
            if (typeof getTaskStatus === 'function') {
                expect(getTaskStatus({ status: 'in_progress' })).toBe('in_progress');
                expect(getTaskStatus({ status: 'completed' })).toBe('completed');
                expect(getTaskStatus({ status: 'skipped' })).toBe('skipped');
            }
        });

        test('returns completed when task.completed is true', () => {
            if (typeof getTaskStatus === 'function') {
                expect(getTaskStatus({ completed: true })).toBe('completed');
            }
        });

        test('returns todo as default', () => {
            if (typeof getTaskStatus === 'function') {
                expect(getTaskStatus({})).toBe('todo');
                expect(getTaskStatus({ completed: false })).toBe('todo');
            }
        });
    });

    describe('getPriorityLabel', () => {
        test('converts numeric priority to label', () => {
            if (typeof getPriorityLabel === 'function') {
                expect(getPriorityLabel(3)).toBe('high');
                expect(getPriorityLabel(2)).toBe('medium');
                expect(getPriorityLabel(1)).toBe('low');
                expect(getPriorityLabel(0)).toBe('low');
            }
        });

        test('returns string priority as-is', () => {
            if (typeof getPriorityLabel === 'function') {
                expect(getPriorityLabel('high')).toBe('high');
                expect(getPriorityLabel('medium')).toBe('medium');
                expect(getPriorityLabel('low')).toBe('low');
            }
        });

        test('returns low for undefined', () => {
            if (typeof getPriorityLabel === 'function') {
                expect(getPriorityLabel(undefined)).toBe('low');
                expect(getPriorityLabel(null)).toBe('low');
            }
        });
    });

    describe('escapeHtml', () => {
        test('escapes HTML special characters', () => {
            if (typeof escapeHtml === 'function') {
                expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
                expect(escapeHtml('a & b')).toBe('a &amp; b');
                expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
            }
        });

        test('handles empty string', () => {
            if (typeof escapeHtml === 'function') {
                expect(escapeHtml('')).toBe('');
            }
        });

        test('handles normal text', () => {
            if (typeof escapeHtml === 'function') {
                expect(escapeHtml('Normal text')).toBe('Normal text');
            }
        });
    });

    describe('formatDueDate', () => {
        test('returns "Today" for today\'s date', () => {
            if (typeof formatDueDate === 'function') {
                const today = new Date().toISOString();
                expect(formatDueDate(today)).toBe('Today');
            }
        });

        test('returns "Tomorrow" for tomorrow\'s date', () => {
            if (typeof formatDueDate === 'function') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                expect(formatDueDate(tomorrow.toISOString())).toBe('Tomorrow');
            }
        });

        test('returns formatted date for other dates', () => {
            if (typeof formatDueDate === 'function') {
                const futureDate = new Date(2026, 5, 15); // June 15, 2026
                const result = formatDueDate(futureDate.toISOString());
                expect(result).toContain('Jun');
                expect(result).toContain('15');
            }
        });
    });

    describe('getStatusIcon', () => {
        test('returns correct icon for each status', () => {
            if (typeof getStatusIcon === 'function') {
                expect(getStatusIcon('completed')).toBe('✅');
                expect(getStatusIcon('skipped')).toBe('❌');
                expect(getStatusIcon('in_progress')).toBe('⏳');
                expect(getStatusIcon('scheduled')).toBe('📅');
                expect(getStatusIcon('todo')).toBe('○');
            }
        });

        test('returns todo icon for unknown status', () => {
            if (typeof getStatusIcon === 'function') {
                expect(getStatusIcon('unknown')).toBe('○');
                expect(getStatusIcon(undefined)).toBe('○');
            }
        });
    });
});

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
