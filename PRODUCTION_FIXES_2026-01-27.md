# Production Issues Fixed - Database & Calendar Sync

## Issues Identified

### 1. BSON Database Corruption Error
**Symptom**: `"not enough data for a BSON document"` errors appearing repeatedly in logs, preventing all data from loading.

**Root Cause**: The `MongitaCursorWrapper` class was converting the Mongita cursor to a list each time `to_list()` was called. This exhausted the cursor iterator, causing subsequent reads to fail with BSON errors.

**Fix**: Modified `MongitaCursorWrapper` to convert the cursor to a list immediately upon initialization and cache the results. All subsequent operations use the cached list instead of trying to re-read from an exhausted cursor.

**Files Changed**:
- `app/database.py` - Lines 141-175

### 2. Google Calendar 403 Forbidden Errors
**Symptom**: Repeated 403 Forbidden errors when trying to update events in calendars with IDs like `nmspn0mckk9hgmtm3g1jnqo46eeqh1ok@import.calendar.google.com`.

**Root Cause**: The application was attempting to modify events in imported Google Calendars, which are read-only. Imported calendars (identified by `@import.calendar.google.com` in their ID) cannot be modified via the API.

**Fix**: Added checks to:
1. Skip pulling from imported calendars during sync
2. Skip pushing to imported calendars during sync
3. Clear sync data from tasks previously synced to imported calendars
4. Mark imported calendars as read-only in the calendar list API
5. Auto-filter imported calendars when users select calendars

**Files Changed**:
- `app/scheduler.py` - Lines 197-203, 419-434, 437-448
- `app/routes/calendar.py` - Lines 455-463, 483-494

## Testing & Verification

### Database Fix Verification
Created `test_db_fix.py` to verify that:
- Multiple reads from the same query work correctly
- Sorted queries work
- Limited queries work
- All collections can be read without errors

**Result**: ✅ All tests passed

### Cleanup Tool
Created `cleanup_imported_calendars.py` to:
- Find and clean tasks synced to imported calendars
- Remove imported calendars from user selections
- Ensure database is in a clean state

**Result**: ✅ Cleanup completed successfully

## Impact & Benefits

### Before Fixes:
- Server couldn't load any data due to BSON errors
- 403 errors every 5 minutes during calendar sync
- Tasks synced to imported calendars caused sync failures
- User experience was completely broken

### After Fixes:
- Database reads work correctly without errors
- No more 403 errors from imported calendars
- Calendar sync only operates on writable calendars
- Users are prevented from selecting read-only calendars
- Application should run smoothly in production

## Deployment Steps

1. **Stop the running application**
2. **Backup the data directory** (recommended):
   ```powershell
   Copy-Item -Path "data" -Destination "data_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')" -Recurse
   ```
3. **Deploy the fixed code** (files already updated in your workspace)
4. **Run the cleanup script** (already completed):
   ```powershell
   python cleanup_imported_calendars.py
   ```
5. **Restart the application**
6. **Monitor logs** for the next few sync cycles to ensure no errors

## Monitoring

Watch for these log messages to confirm fixes are working:

### Good Signs:
- `[OK] Local database connected successfully`
- `[SCHEDULER] Skipping pull from read-only calendar: <calendar-id>`
- `[SCHEDULER] Skipping update - calendar <calendar-id> is read-only (imported)`
- No more "not enough data for a BSON document" errors
- No more "403 Forbidden" errors

### Warning Signs (if still present, report immediately):
- Any BSON document errors
- 403 Forbidden errors from Google Calendar API
- Database connection failures

## Additional Notes

### What Imported Calendars Are
Imported calendars are read-only subscriptions to other calendars (like holidays, sports schedules, or public calendars). Users can view these calendars but cannot create or modify events in them.

### Prevention
The application now:
1. Identifies imported calendars in the UI with `readOnly: true` and `imported: true` flags
2. Automatically filters them out from calendar selection
3. Skips them during bidirectional sync
4. Clears any existing sync data if found

### User Impact
Users will no longer be able to select imported calendars for sync, and any existing tasks that were incorrectly synced to imported calendars will have their sync data cleared (but the tasks themselves remain in NovaDo).
