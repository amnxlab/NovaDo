"""
Background Scheduler for NovaDo
- Checks for upcoming task reminders
- Sends push notifications
- Runs periodic bidirectional calendar sync every 5 minutes
"""
import logging
import asyncio
import sys
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

logger = logging.getLogger(__name__)


def safe_print(text):
    """
    Safely print text with Unicode characters on Windows.
    Falls back to encoding-safe version if console doesn't support UTF-8.
    """
    try:
        print(text)
    except UnicodeEncodeError:
        # Fallback: encode as UTF-8 then decode with 'replace' error handling
        safe_text = text.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        print(safe_text)

# Global scheduler instance
_scheduler = None
_scheduler_started = False


class ReminderScheduler:
    """
    Background scheduler that:
    - Checks for upcoming task reminders and sends push notifications
    - Performs bidirectional Google Calendar sync every 5 minutes
    """
    
    def __init__(self):
        self.running = False
        self._reminder_task: Optional[asyncio.Task] = None
        self._sync_task: Optional[asyncio.Task] = None
        self.reminder_interval = 60  # Check reminders every 60 seconds
        self.sync_interval = 300  # Sync calendar every 5 minutes (300 seconds)
        self.last_sync_time = None
        
    async def start(self):
        """Start the background scheduler"""
        if self.running:
            logger.warning("[SCHEDULER] Already running")
            return
            
        self.running = True
        self._reminder_task = asyncio.create_task(self._run_reminder_loop())
        self._sync_task = asyncio.create_task(self._run_sync_loop())
        logger.info("[SCHEDULER] Started reminder and sync scheduler")
        
    async def stop(self):
        """Stop the background scheduler"""
        self.running = False
        
        for task in [self._reminder_task, self._sync_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                    
        logger.info("[SCHEDULER] Stopped scheduler")
        
    async def _run_reminder_loop(self):
        """Reminder check loop - runs every 60 seconds"""
        while self.running:
            try:
                await self._check_reminders()
            except Exception as e:
                logger.exception(f"[SCHEDULER] Error in reminder check: {e}")
            
            await asyncio.sleep(self.reminder_interval)
    
    async def _run_sync_loop(self):
        """Bidirectional sync loop - runs every 5 minutes"""
        # Wait 30 seconds before first sync to let app fully initialize
        await asyncio.sleep(30)
        
        while self.running:
            try:
                await self._bidirectional_sync_all_users()
            except Exception as e:
                logger.exception(f"[SCHEDULER] Error in calendar sync: {e}")
            
            await asyncio.sleep(self.sync_interval)
    
    async def _bidirectional_sync_all_users(self):
        """
        Perform bidirectional sync for all users with connected Google Calendar.
        """
        from app.database import get_database
        
        db = get_database()
        if not db:
            return
        
        # Find all users with Google Calendar connected
        # Note: Mongita doesn't support $exists, so we fetch all and filter in Python
        all_users = await db.users.find({}).to_list(None)
        users = [u for u in all_users if u.get("googleAccessToken")]
        
        if not users:
            logger.debug("[SCHEDULER] No users with Google Calendar connected")
            return
        
        logger.info(f"[SCHEDULER] Starting bidirectional sync for {len(users)} users")
        
        synced_count = 0
        error_count = 0
        
        for user in users:
            try:
                result = await self._sync_user_calendar(user, db)
                if result:
                    synced_count += 1
            except Exception as e:
                error_count += 1
                logger.warning(f"[SCHEDULER] Sync failed for user {user.get('email')}: {e}")
        
        self.last_sync_time = datetime.utcnow()
        logger.info(f"[SCHEDULER] Sync complete: {synced_count} users synced, {error_count} errors")
    
    async def _sync_user_calendar(self, user: dict, db) -> bool:
        """
        Perform bidirectional sync for a single user.
        
        1. Pull new/updated events FROM Google Calendar TO NovaDo
        2. Push new/updated tasks FROM NovaDo TO Google Calendar
        """
        from app.routes.calendar import (
            get_credentials_from_user,
            build_google_calendar_event
        )
        from googleapiclient.discovery import build
        
        creds = get_credentials_from_user(user)
        if not creds:
            # Clear invalid tokens if credentials are None
            if user.get("googleAccessToken"):
                logger.warning(f"[SCHEDULER] Clearing invalid Google tokens for {user.get('email')}")
                await db.users.update_one(
                    {"_id": ObjectId(user["_id"])},
                    {"$set": {
                        "googleAccessToken": None,
                        "googleRefreshToken": None,
                        "googleTokenExpiry": None
                    }}
                )
            return False
        
        try:
            service = build("calendar", "v3", credentials=creds)
            user_oid = ObjectId(user["_id"])
            user_preferences = user.get("preferences", {})
            
            # Get selected calendars
            selected_calendars = user.get("googleSelectedCalendars") or ["primary"]
            
            # === PART 1: Pull from Google Calendar ===
            await self._pull_from_google(service, user, db, selected_calendars)
            
            # === PART 2: Push to Google Calendar ===
            await self._push_to_google(service, user, db, user_preferences, selected_calendars[0] if selected_calendars else "primary")
            
            return True
            
        except Exception as e:
            logger.warning(f"[SCHEDULER] Sync error for {user.get('email')}: {e}")
            return False
    
    async def _pull_from_google(self, service, user: dict, db, selected_calendars: list):
        """Pull new/updated events from Google Calendar to NovaDo"""
        from app.routes.calendar import convert_event_time_to_user_tz
        
        user_oid = ObjectId(user["_id"])
        user_preferences = user.get("preferences", {})
        
        # Get events from last sync or last 24 hours
        last_sync = user.get("lastCalendarSync")
        if last_sync:
            time_min = (last_sync - timedelta(hours=1)).isoformat() + "Z"
        else:
            time_min = (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
        
        time_max = (datetime.utcnow() + timedelta(days=90)).isoformat() + "Z"
        
        pulled_count = 0
        
        for calendar_id in selected_calendars:
            try:
                events_result = service.events().list(
                    calendarId=calendar_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=100,
                    singleEvents=True,
                    orderBy="startTime"
                ).execute()
                
                events = events_result.get("items", [])
                
                for event in events:
                    event_id = event.get("id")
                    if not event_id:
                        continue
                    
                    # Check if we already have this event
                    existing_task = await db.tasks.find_one({
                        "user": user_oid,
                        "googleEventId": event_id
                    })
                    
                    # Get event times
                    start = event.get("start", {})
                    end = event.get("end", {})
                    
                    if start.get("dateTime"):
                        due_date, due_time = convert_event_time_to_user_tz(
                            start["dateTime"], user_preferences
                        )
                    elif start.get("date"):
                        due_date = datetime.strptime(start["date"], "%Y-%m-%d")
                        due_time = None
                    else:
                        continue
                    
                    event_updated = event.get("updated")
                    if event_updated:
                        # Convert to timezone-naive UTC for comparison with database timestamps
                        event_updated = datetime.fromisoformat(event_updated.replace("Z", "+00:00")).replace(tzinfo=None)
                    
                    if existing_task:
                        # Check if Google version is newer (last write wins)
                        task_updated = existing_task.get("updatedAt")
                        if event_updated and task_updated:
                            if event_updated > task_updated:
                                # Update local task with Google data
                                await db.tasks.update_one(
                                    {"_id": existing_task["_id"]},
                                    {"$set": {
                                        "title": event.get("summary", "Untitled"),
                                        "description": event.get("description", ""),
                                        "dueDate": due_date,
                                        "dueTime": due_time,
                                        "lastSyncedAt": datetime.utcnow()
                                    }}
                                )
                                pulled_count += 1
                    else:
                        # Create new task from Google event
                        # Find default list
                        inbox_list = await db.lists.find_one({
                            "user": user_oid,
                            "name": "Inbox"
                        })
                        list_id = inbox_list["_id"] if inbox_list else None
                        
                        new_task = {
                            "title": event.get("summary", "Untitled"),
                            "description": event.get("description", ""),
                            "user": user_oid,
                            "list": list_id,
                            "dueDate": due_date,
                            "dueTime": due_time,
                            "priority": "none",
                            "status": "scheduled",
                            "tags": ["google-calendar"],
                            "subtasks": [],
                            "attachments": [],
                            "reminder": {"enabled": False},
                            "googleEventId": event_id,
                            "googleCalendarId": calendar_id,
                            "googleCalendarColor": event.get("colorId"),
                            "syncedWithGoogle": True,
                            "syncToCalendar": True,
                            "lastSyncedAt": datetime.utcnow(),
                            "createdAt": datetime.utcnow(),
                            "updatedAt": datetime.utcnow()
                        }
                        await db.tasks.insert_one(new_task)
                        pulled_count += 1
                        
            except Exception as e:
                error_str = str(e)
                # Check if this is an auth error (token expired/revoked)
                if 'invalid_grant' in error_str or 'invalid_client' in error_str or 'Token has been expired or revoked' in error_str:
                    logger.warning(f"[SCHEDULER] Token revoked for {user.get('email')}, clearing credentials")
                    await db.users.update_one(
                        {"_id": user["_id"]},
                        {"$set": {
                            "googleAccessToken": None,
                            "googleRefreshToken": None,
                            "googleTokenExpiry": None,
                            "googleSelectedCalendars": None
                        }}
                    )
                    # Stop trying to sync this user's calendars
                    return
                logger.warning(f"[SCHEDULER] Error pulling from calendar {calendar_id}: {e}")
        
        if pulled_count > 0:
            logger.info(f"[SCHEDULER] Pulled {pulled_count} events for user {user.get('email')}")
        
        # Update last sync time
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"lastCalendarSync": datetime.utcnow()}}
        )
    
    async def _push_to_google(self, service, user: dict, db, user_preferences: dict, calendar_id: str):
        """Push new/updated NovaDo tasks to Google Calendar"""
        from app.routes.calendar import build_google_calendar_event
        
        safe_print(f"\n{'='*80}")
        safe_print(f"[PUSH TO GOOGLE] Starting push for user: {user.get('email')}")
        safe_print(f"[PUSH TO GOOGLE] Calendar ID: {calendar_id}")
        safe_print(f"{'='*80}\n")
        
        user_oid = ObjectId(user["_id"])
        
        # Find tasks that need to be synced
        # - Have syncToCalendar enabled
        # - Have a dueDate
        # - Either don't have googleEventId OR were updated after lastSyncedAt
        all_tasks = await db.tasks.find({"user": user_oid}).to_list(None)
        
        # Track stats for logging
        stats = {
            "total": len(all_tasks),
            "no_due_date": 0,
            "completed_deleted": 0,
            "sync_disabled": 0,
            "already_synced": 0
        }
        
        tasks_to_push = []
        for task in all_tasks:
            if not task.get("dueDate"):
                stats["no_due_date"] += 1
                continue
            if task.get("status") in ["completed", "deleted", "skipped"]:
                stats["completed_deleted"] += 1
                continue
            if not task.get("syncToCalendar", False):
                stats["sync_disabled"] += 1
                continue
            
            # Check if needs push
            if not task.get("googleEventId"):
                # New task, needs to be pushed
                tasks_to_push.append(task)
            else:
                # Existing synced task - check if local is newer
                # Skip verification for now to improve performance - just check timestamps
                last_synced = task.get("lastSyncedAt")
                updated_at = task.get("updatedAt")
                if updated_at and last_synced and updated_at > last_synced:
                    tasks_to_push.append(task)
                else:
                    stats["already_synced"] += 1
        
        logger.info(
            f"[SCHEDULER] Push stats for {user.get('email')}: "
            f"{stats['total']} total tasks, "
            f"{len(tasks_to_push)} to push, "
            f"{stats['sync_disabled']} have sync disabled, "
            f"{stats['no_due_date']} missing due date, "
            f"{stats['completed_deleted']} completed/deleted, "
            f"{stats['already_synced']} already synced"
        )
        
        # ALSO print to console for visibility
        safe_print(f"\n[PUSH STATS] User: {user.get('email')}")
        safe_print(f"  Total tasks: {stats['total']}")
        safe_print(f"  To push: {len(tasks_to_push)}")
        safe_print(f"  Sync disabled: {stats['sync_disabled']}")
        safe_print(f"  No due date: {stats['no_due_date']}")
        safe_print(f"  Completed/deleted: {stats['completed_deleted']}")
        safe_print(f"  Already synced: {stats['already_synced']}")
        
        if len(tasks_to_push) > 0:
            safe_print(f"\n[TASKS TO PUSH]:")
            for i, task in enumerate(tasks_to_push[:5], 1):  # Show first 5
                safe_print(f"  {i}. {task.get('title')} - Due: {task.get('dueDate')}")
            if len(tasks_to_push) > 5:
                safe_print(f"  ... and {len(tasks_to_push) - 5} more")
        print()  # Empty line - no Unicode issue
        
        pushed_count = 0
        
        if len(tasks_to_push) > 0:
            logger.info(f"[SCHEDULER] Found {len(tasks_to_push)} tasks to push for {user.get('email')}")
        else:
            logger.debug(f"[SCHEDULER] No tasks to push for {user.get('email')}")
        
        for task in tasks_to_push:
            try:
                safe_print(f"\n[PUSHING TASK] Title: '{task.get('title')}'")
                safe_print(f"  Due Date: {task.get('dueDate')}")
                safe_print(f"  Due Time: {task.get('dueTime')}")
                safe_print(f"  Calendar ID: {calendar_id}")
                
                logger.info(f"[SCHEDULER] Pushing task '{task.get('title')}' to calendar {calendar_id}")
                event_body = build_google_calendar_event(task, user_preferences)
                logger.debug(f"[SCHEDULER] Event body: {event_body}")
                
                if task.get("googleEventId"):
                    # Update existing event
                    logger.info(f"[SCHEDULER] Updating existing event {task['googleEventId']}")
                    event = service.events().update(
                        calendarId=task.get("googleCalendarId", calendar_id),
                        eventId=task["googleEventId"],
                        body=event_body
                    ).execute()
                    logger.info(f"[SCHEDULER] Updated event: {event.get('htmlLink')}")
                else:
                    # Create new event
                    logger.info(f"[SCHEDULER] Creating new event on calendar {calendar_id}")
                    safe_print(f"  [API CALL] Inserting event into Google Calendar...")
                    event = service.events().insert(
                        calendarId=calendar_id,
                        body=event_body
                    ).execute()
                    logger.info(f"[SCHEDULER] Created event: {event.get('htmlLink')}")
                    safe_print(f"  [SUCCESS] Event created: {event.get('htmlLink')}")
                    safe_print(f"  Event ID: {event.get('id')}\n")
                
                # Update task with sync info
                update_result = await db.tasks.update_one(
                    {"_id": task["_id"]},
                    {"$set": {
                        "googleEventId": event["id"],
                        "googleCalendarId": calendar_id,
                        "syncedWithGoogle": True,
                        "lastSyncedAt": datetime.utcnow()
                    }}
                )
                logger.info(
                    f"[SCHEDULER] Successfully synced task '{task.get('title')}' - "
                    f"Event ID: {event['id']}, Modified: {update_result.modified_count}"
                )
                pushed_count += 1
                
            except Exception as e:
                logger.error(
                    f"[SCHEDULER] Error pushing task '{task.get('title')}' (ID: {task.get('_id')}): {e}",
                    exc_info=True
                )
        
        if pushed_count > 0:
            logger.info(f"[SCHEDULER] Pushed {pushed_count} tasks for user {user.get('email')}")
    
    async def _check_reminders(self):
        """
        Check for tasks with reminders due within the next minute.
        Send push notifications for any that are due.
        """
        from app.database import get_database
        
        db = get_database()
        if not db:
            return
        
        now = datetime.utcnow()
        one_minute_from_now = now + timedelta(minutes=1)
        
        # Find all tasks with reminders
        all_tasks = await db.tasks.find({}).to_list(None)
        
        tasks_to_notify = []
        
        for task in all_tasks:
            reminder = task.get("reminder", {})
            if not reminder.get("enabled", False):
                continue
                
            if not reminder.get("notifyDesktop", True):
                continue
            
            # Check if already sent
            if reminder.get("lastSent"):
                last_sent = reminder["lastSent"]
                if isinstance(last_sent, datetime):
                    if (now - last_sent).total_seconds() < 300:
                        continue
            
            due_date = task.get("dueDate")
            due_time = task.get("dueTime")
            
            if not due_date:
                continue
            
            if isinstance(due_date, datetime):
                task_due = due_date
            else:
                try:
                    task_due = datetime.fromisoformat(str(due_date).replace("Z", "+00:00"))
                except:
                    continue
            
            if due_time:
                try:
                    hours, minutes = map(int, due_time.split(":"))
                    task_due = task_due.replace(hour=hours, minute=minutes)
                except:
                    pass
            
            minutes_before = reminder.get("minutesBefore", 30)
            reminder_time = task_due - timedelta(minutes=minutes_before)
            
            if now <= reminder_time <= one_minute_from_now:
                tasks_to_notify.append(task)
        
        if not tasks_to_notify:
            return
        
        logger.info(f"[SCHEDULER] Found {len(tasks_to_notify)} tasks with reminders due")
        
        for task in tasks_to_notify:
            await self._send_reminder(task)
    
    async def _send_reminder(self, task: dict):
        """Send a push notification for a task reminder"""
        from app.database import get_database
        
        db = get_database()
        user_id = task.get("user")
        
        if not user_id:
            return
        
        subscription = await db.push_subscriptions.find_one({"userId": user_id})
        
        if not subscription:
            logger.debug(f"[SCHEDULER] No push subscription for user {user_id}")
            return
        
        reminder = task.get("reminder", {})
        minutes_before = reminder.get("minutesBefore", 30)
        
        payload = {
            "title": "⏰ Task Reminder",
            "body": f'"{task.get("title", "Task")}" is due in {minutes_before} minutes',
            "icon": "/favicon.ico",
            "badge": "/favicon.ico",
            "tag": f"task-reminder-{task['_id']}",
            "data": {
                "taskId": str(task["_id"]),
                "type": "task_reminder"
            },
            "requireInteraction": True,
            "actions": [
                {"action": "complete", "title": "✓ Done"},
                {"action": "snooze", "title": "⏰ Snooze"},
                {"action": "open", "title": "Open"}
            ]
        }
        
        try:
            await self._send_push_notification(subscription, payload)
            
            await db.tasks.update_one(
                {"_id": task["_id"]},
                {"$set": {"reminder.lastSent": datetime.utcnow()}}
            )
            
            logger.info(f"[SCHEDULER] Sent reminder for task: {task.get('title')}")
            
        except Exception as e:
            logger.warning(f"[SCHEDULER] Failed to send notification: {e}")
    
    async def _send_push_notification(self, subscription: dict, payload: dict):
        """Send a web push notification"""
        import os
        import json
        
        vapid_private_key = os.getenv("VAPID_PRIVATE_KEY", "")
        vapid_email = os.getenv("VAPID_EMAIL", "mailto:admin@novado.app")
        
        if not vapid_private_key:
            logger.debug("[SCHEDULER] VAPID_PRIVATE_KEY not configured, skipping push")
            return
        
        try:
            from pywebpush import webpush, WebPushException
            
            webpush(
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": subscription["keys"]
                },
                data=json.dumps(payload),
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": vapid_email}
            )
            
        except ImportError:
            logger.warning("[SCHEDULER] pywebpush not installed, skipping push notification")
        except Exception as e:
            raise


async def trigger_sync_now(user: dict = None):
    """Trigger an immediate sync (called from API endpoint)
    
    Args:
        user: Optional user dict to sync only that user. If None, syncs all users.
    """
    scheduler = get_scheduler()
    if not scheduler or not scheduler.running:
        return False
    
    if user:
        # Sync only the specified user
        from app.database import get_database
        db = get_database()
        if not db:
            return False
        return await scheduler._sync_user_calendar(user, db)
    else:
        # Sync all users
        await scheduler._bidirectional_sync_all_users()
        return True


def get_scheduler() -> ReminderScheduler:
    """Get the global scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = ReminderScheduler()
    return _scheduler


async def start_scheduler():
    """Start the global scheduler"""
    global _scheduler_started
    if _scheduler_started:
        return
    
    scheduler = get_scheduler()
    await scheduler.start()
    _scheduler_started = True
    logger.info("[SCHEDULER] Background scheduler started")


async def stop_scheduler():
    """Stop the global scheduler"""
    global _scheduler_started
    if not _scheduler_started:
        return
    
    scheduler = get_scheduler()
    await scheduler.stop()
    _scheduler_started = False

