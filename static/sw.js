/**
 * NovaDo Service Worker
 * Handles push notifications and background tasks
 */

const CACHE_NAME = 'taskflow-v5';

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    let data = {
        title: 'NovaDo',
        body: 'You have a notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'taskflow-notification',
        data: {}
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag,
        data: data.data,
        vibrate: [100, 50, 100],
        actions: data.actions || [
            { action: 'open', title: 'Open NovaDo' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    // Open the app or focus existing window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Background sync for offline task creation
self.addEventListener('sync', (event) => {
    console.log('Background sync:', event.tag);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(syncTasks());
    }
});

async function syncTasks() {
    // Get pending tasks from IndexedDB and sync with server
    console.log('Syncing tasks in background...');
}

// Periodic sync for reminders (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-reminders') {
        event.waitUntil(checkReminders());
    }
});

async function checkReminders() {
    console.log('Checking reminders...');
    // This would check for upcoming task reminders
}

