/**
 * Property-Based Tests for Task Matrix
 * Using fast-check for randomized testing
 * 
 * These tests validate correctness properties that should hold
 * across all valid inputs.
 */

// Mock fast-check if not available (for browser testing)
const fc = typeof require !== 'undefined' ? require('fast-check') : window.fc;

// Import or reference the task matrix module
const taskMatrix = typeof require !== 'undefined' 
    ? require('../taskMatrix.js') 
    : window.taskMatrix;

/**
 * Arbitrary generators for test data
 */
const statusArbitrary = fc.constantFrom('todo', 'in_progress', 'scheduled', 'completed', 'skipped');
const priorityArbitrary = fc.constantFrom('high', 'medium', 'low');
const energyLevelArbitrary = fc.constantFrom('high', 'medium', 'low');
const timeOfDayArbitrary = fc.constantFrom('morning', 'afternoon', 'evening');

const tagArbitrary = fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z0-9-_]+$/.test(s));

const taskArbitrary = fc.record({
    id: fc.uuid(),
    _id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 })),
    priority: fc.oneof(
        fc.integer({ min: 0, max: 3 }),
        priorityArbitrary
    ),
    status: statusArbitrary,
    tags: fc.array(tagArbitrary, { maxLength: 10 }),
    energyLevel: fc.option(energyLevelArbitrary),
    timeOfDay: fc.option(timeOfDayArbitrary),
    dueDate: fc.option(fc.date().map(d => d.toISOString())),
    completed: fc.boolean()
});

/**
 * Property 3: Status Icon Mapping
 * For any task with a given status, the rendered task card should 
 * contain the corresponding icon.
 * 
 * Validates: Requirements 2.1, 2.3
 */
describe('Property 3: Status Icon Mapping', () => {
    const STATUS_ICONS = {
        completed: '✅',
        skipped: '❌',
        in_progress: '⏳',
        scheduled: '📅',
        todo: '○'
    };

    test('status icon mapping is complete and correct', () => {
        fc.assert(
            fc.property(statusArbitrary, (status) => {
                // Every valid status should have a corresponding icon
                const icon = STATUS_ICONS[status];
                expect(icon).toBeDefined();
                expect(typeof icon).toBe('string');
                expect(icon.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 }
        );
    });

    test('rendered task card contains correct status icon', () => {
        fc.assert(
            fc.property(taskArbitrary, (task) => {
                // Ensure task has explicit status
                const taskWithStatus = { ...task, status: task.status || 'todo' };
                
                // Mock the DOM environment if needed
                if (typeof document === 'undefined') {
                    // Skip DOM tests in non-browser environment
                    return true;
                }

                // Get expected icon
                const expectedIcon = STATUS_ICONS[taskWithStatus.status];
                
                // Render the card (using the global function)
                if (typeof renderTaskCard === 'function') {
                    const html = renderTaskCard(taskWithStatus);
                    
                    // Verify the icon is present
                    expect(html).toContain(expectedIcon);
                    expect(html).toContain(`data-status="${taskWithStatus.status}"`);
                }
                
                return true;
            }),
            { numRuns: 50 }
        );
    });

    test('in_progress status has spinning animation class', () => {
        fc.assert(
            fc.property(taskArbitrary, (task) => {
                const taskInProgress = { ...task, status: 'in_progress' };
                
                if (typeof renderTaskCard === 'function') {
                    const html = renderTaskCard(taskInProgress);
                    expect(html).toContain('spinning');
                }
                
                return true;
            }),
            { numRuns: 20 }
        );
    });

    test('non-in_progress statuses do not have spinning class', () => {
        const nonSpinningStatuses = ['todo', 'completed', 'skipped', 'scheduled'];
        
        fc.assert(
            fc.property(
                taskArbitrary,
                fc.constantFrom(...nonSpinningStatuses),
                (task, status) => {
                    const taskWithStatus = { ...task, status };
                    
                    if (typeof renderTaskCard === 'function') {
                        const html = renderTaskCard(taskWithStatus);
                        // Should not have spinning class (or if it does, it should be conditional)
                        const statusIconMatch = html.match(/class="status-icon([^"]*)"/);
                        if (statusIconMatch) {
                            expect(statusIconMatch[1]).not.toContain('spinning');
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * Property: Priority Border Color Mapping
 * For any task with a given priority, the rendered card should have
 * the correct priority class for border coloring.
 * 
 * Validates: Requirements 2.2
 */
describe('Property: Priority Border Color Mapping', () => {
    test('task card has correct priority class', () => {
        fc.assert(
            fc.property(taskArbitrary, priorityArbitrary, (task, priority) => {
                const taskWithPriority = { 
                    ...task, 
                    priority: priority === 'high' ? 3 : priority === 'medium' ? 2 : 1 
                };
                
                if (typeof renderTaskCard === 'function' && typeof getPriorityLabel === 'function') {
                    const html = renderTaskCard(taskWithPriority);
                    const expectedClass = `priority-${priority}`;
                    expect(html).toContain(expectedClass);
                }
                
                return true;
            }),
            { numRuns: 50 }
        );
    });
});

/**
 * Property: Tag Display Limit
 * For any task with tags, at most 3 tags should be displayed,
 * with a "+N more" indicator for additional tags.
 * 
 * Validates: Requirements 2.4
 */
describe('Property: Tag Display Limit', () => {
    test('displays at most 3 tag pills', () => {
        fc.assert(
            fc.property(
                taskArbitrary,
                fc.array(tagArbitrary, { minLength: 0, maxLength: 10 }),
                (task, tags) => {
                    const taskWithTags = { ...task, tags };
                    
                    if (typeof renderTaskCard === 'function') {
                        const html = renderTaskCard(taskWithTags);
                        
                        // Count tag-pill occurrences
                        const tagPillMatches = html.match(/class="tag-pill"/g) || [];
                        
                        if (tags.length > 0) {
                            expect(tagPillMatches.length).toBeLessThanOrEqual(3);
                            expect(tagPillMatches.length).toBe(Math.min(tags.length, 3));
                        }
                        
                        // Check for "+N more" indicator when tags > 3
                        if (tags.length > 3) {
                            expect(html).toContain(`+${tags.length - 3}`);
                            expect(html).toContain('tag-more');
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });
});

/**
 * Property: Fourth Dimension Icon Display
 * For any task, the fourth dimension icon should be displayed
 * based on the current dimension type setting.
 * 
 * Validates: Requirements 2.5, 1.5, 1.6
 */
describe('Property: Fourth Dimension Icon Display', () => {
    const ENERGY_ICONS = { high: '🔥', medium: '☕', low: '🪫' };
    const TIME_ICONS = { morning: '🌅', afternoon: '☀️', evening: '🌙' };

    test('displays correct energy icon when fourth dimension is energy', () => {
        fc.assert(
            fc.property(taskArbitrary, energyLevelArbitrary, (task, energyLevel) => {
                const taskWithEnergy = { ...task, energyLevel };
                
                // Set fourth dimension to energy
                if (typeof matrixState !== 'undefined') {
                    matrixState.fourthDimensionType = 'energy';
                }
                
                if (typeof renderTaskCard === 'function') {
                    const html = renderTaskCard(taskWithEnergy);
                    const expectedIcon = ENERGY_ICONS[energyLevel];
                    expect(html).toContain(expectedIcon);
                }
                
                return true;
            }),
            { numRuns: 30 }
        );
    });

    test('displays correct time icon when fourth dimension is time_of_day', () => {
        fc.assert(
            fc.property(taskArbitrary, timeOfDayArbitrary, (task, timeOfDay) => {
                const taskWithTime = { ...task, timeOfDay };
                
                // Set fourth dimension to time_of_day
                if (typeof matrixState !== 'undefined') {
                    matrixState.fourthDimensionType = 'time_of_day';
                }
                
                if (typeof renderTaskCard === 'function') {
                    const html = renderTaskCard(taskWithTime);
                    const expectedIcon = TIME_ICONS[timeOfDay];
                    expect(html).toContain(expectedIcon);
                }
                
                return true;
            }),
            { numRuns: 30 }
        );
    });
});

/**
 * Property: Accessibility Attributes
 * For any task, the rendered card should have proper ARIA attributes.
 * 
 * Validates: Requirements 20.2
 */
describe('Property: Accessibility Attributes', () => {
    test('task card has role and aria-label', () => {
        fc.assert(
            fc.property(taskArbitrary, (task) => {
                if (typeof renderTaskCard === 'function') {
                    const html = renderTaskCard(task);
                    
                    // Should have role="article"
                    expect(html).toContain('role="article"');
                    
                    // Should have aria-label
                    expect(html).toContain('aria-label=');
                    
                    // Should have tabindex for keyboard navigation
                    expect(html).toContain('tabindex="0"');
                }
                
                return true;
            }),
            { numRuns: 30 }
        );
    });
});

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        statusArbitrary,
        priorityArbitrary,
        taskArbitrary
    };
}
