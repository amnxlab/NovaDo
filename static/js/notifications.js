/**
 * NovaDo Notifications
 * Handles push notifications and reminders
 */

class NotificationManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    }
    
    async init() {
        if (!this.isSupported) {
            console.log('Push notifications not supported');
            return false;
        }
        
        try {
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', this.swRegistration);
            
            // Check existing subscription
            this.subscription = await this.swRegistration.pushManager.getSubscription();
            
            return true;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return false;
        }
    }
    
    async requestPermission() {
        if (!this.isSupported) return false;
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    
    async subscribe() {
        if (!this.swRegistration) {
            await this.init();
        }
        
        if (!this.swRegistration) {
            console.error('Service Worker not registered');
            return null;
        }
        
        try {
            // Get VAPID public key from server
            const response = await fetch('/api/notifications/vapid-key');
            const { publicKey } = await response.json();
            
            if (!publicKey) {
                console.log('VAPID key not configured, using local notifications only');
                return null;
            }
            
            // Subscribe to push notifications
            this.subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(publicKey)
            });
            
            // Send subscription to server
            await this.saveSubscription(this.subscription);
            
            console.log('Push notification subscription created');
            return this.subscription;
        } catch (error) {
            console.error('Failed to subscribe:', error);
            return null;
        }
    }
    
    async unsubscribe() {
        if (this.subscription) {
            await this.subscription.unsubscribe();
            await this.removeSubscription();
            this.subscription = null;
            console.log('Unsubscribed from push notifications');
        }
    }
    
    async saveSubscription(subscription) {
        try {
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Failed to save subscription:', error);
        }
    }
    
    async removeSubscription() {
        try {
            await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Failed to remove subscription:', error);
        }
    }
    
    // Show local notification (no server needed)
    showLocalNotification(title, options = {}) {
        if (Notification.permission !== 'granted') {
            console.log('Notification permission not granted');
            return;
        }
        
        const notification = new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        return notification;
    }
    
    // Schedule a reminder notification
    scheduleReminder(taskTitle, dueDate, taskId) {
        const now = new Date();
        const due = new Date(dueDate);
        const timeDiff = due.getTime() - now.getTime();
        
        // Only schedule if due date is in the future
        if (timeDiff <= 0) return null;
        
        // Reminder 30 minutes before
        const reminderTime = timeDiff - (30 * 60 * 1000);
        
        if (reminderTime > 0) {
            return setTimeout(() => {
                this.showLocalNotification('Task Reminder', {
                    body: `"${taskTitle}" is due in 30 minutes`,
                    tag: `reminder-${taskId}`,
                    requireInteraction: true
                });
            }, reminderTime);
        }
        
        return null;
    }
    
    // Helper to convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
    
    get isSubscribed() {
        return !!this.subscription;
    }
    
    get permissionState() {
        return Notification.permission;
    }
}

// Global notification manager
window.notificationManager = new NotificationManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (window.notificationManager.isSupported) {
        await window.notificationManager.init();
    }
});

