"""
Cleanup script to remove sync data from read-only imported calendars
"""
import os
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

async def cleanup_imported_calendars():
    """Remove sync data for imported calendars that can't be modified"""
    print("\n=== Imported Calendar Cleanup ===\n")
    
    from app.database import connect_db, get_database
    from bson import ObjectId
    
    await connect_db()
    db = get_database()
    
    print("✓ Database connected\n")
    
    # Find all tasks synced to imported calendars
    print("Searching for tasks synced to imported calendars...")
    
    all_tasks = await db.tasks.find({}).to_list()
    imported_tasks = []
    
    for task in all_tasks:
        calendar_id = task.get("googleCalendarId", "")
        if "@import.calendar.google.com" in calendar_id:
            imported_tasks.append(task)
    
    print(f"Found {len(imported_tasks)} tasks synced to imported calendars\n")
    
    if imported_tasks:
        print("Tasks to clean:")
        for task in imported_tasks[:5]:  # Show first 5
            print(f"  - {task.get('title')} (Calendar: {task.get('googleCalendarId')})")
        if len(imported_tasks) > 5:
            print(f"  ... and {len(imported_tasks) - 5} more")
        
        print("\nRemoving sync data from these tasks...")
        
        updated_count = 0
        for task in imported_tasks:
            result = await db.tasks.update_one(
                {"_id": task["_id"]},
                {"$unset": {
                    "googleEventId": "",
                    "googleCalendarId": "",
                    "syncedWithGoogle": "",
                    "lastSyncedAt": ""
                }}
            )
            if result.modified_count > 0:
                updated_count += 1
        
        print(f"✓ Cleaned {updated_count} tasks\n")
    
    # Also clean up user selected calendars
    print("Cleaning user calendar selections...")
    
    users = await db.users.find({}).to_list()
    cleaned_users = 0
    
    for user in users:
        selected_cals = user.get("googleSelectedCalendars", [])
        if not selected_cals:
            continue
        
        # Filter out imported calendars
        cleaned_cals = [
            cal_id for cal_id in selected_cals
            if "@import.calendar.google.com" not in cal_id
        ]
        
        if len(cleaned_cals) != len(selected_cals):
            # Some calendars were removed
            if not cleaned_cals:
                cleaned_cals = ["primary"]  # Ensure at least primary is selected
            
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"googleSelectedCalendars": cleaned_cals}}
            )
            
            removed = set(selected_cals) - set(cleaned_cals)
            print(f"  User {user.get('email')}: Removed {len(removed)} imported calendars")
            cleaned_users += 1
    
    if cleaned_users > 0:
        print(f"✓ Cleaned {cleaned_users} user profiles\n")
    else:
        print("  No user profiles needed cleaning\n")
    
    print("✅ Cleanup complete!")

if __name__ == "__main__":
    asyncio.run(cleanup_imported_calendars())
