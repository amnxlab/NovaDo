"""
Reset Google Calendar sync data for testing
"""
from mongita import MongitaClientDisk
from bson import ObjectId

client = MongitaClientDisk("data")
db = client.taskflow

# User ID for ahmedmohamed6071@gmail.com
user_id = "69609f394fdc2ccab1fe18b2"
user_oid = ObjectId(user_id)

# Get all tasks and filter those with googleEventId
all_tasks = list(db.tasks.find({"user": user_oid}))
synced_tasks = [t for t in all_tasks if t.get("googleEventId")]

deleted = 0
for task in synced_tasks:
    db.tasks.delete_one({"_id": task["_id"]})
    deleted += 1

print(f"Deleted {deleted} synced tasks")

# Reset lastCalendarSync - set to None instead of $unset
db.users.update_one(
    {"_id": user_oid},
    {"$set": {"lastCalendarSync": None}}
)
print("Reset lastCalendarSync to None")

print("\n✅ All synced data cleared! Refresh the app and test sync.")
