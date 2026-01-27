"""
Test async database wrapper fix
"""
import os
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

async def test_async_wrapper():
    """Test the fixed async database wrapper"""
    print("\n=== Testing Async Database Wrapper ===\n")
    
    # Import and connect
    from app.database import connect_db, get_database
    
    await connect_db()
    db = get_database()
    
    print("✓ Database connected\n")
    
    # Test multiple to_list() calls on same cursor
    print("Testing multiple reads from same query...")
    
    try:
        # First read
        tasks1 = await db.tasks.find({}).to_list()
        print(f"✓ First read: {len(tasks1)} tasks")
        
        # Second read with same query (this was failing before)
        tasks2 = await db.tasks.find({}).to_list()
        print(f"✓ Second read: {len(tasks2)} tasks")
        
        # Test with sort
        sorted_tasks = await db.tasks.find({}).sort("createdAt", -1).to_list()
        print(f"✓ Sorted read: {len(sorted_tasks)} tasks")
        
        # Test with limit
        limited_tasks = await db.tasks.find({}).to_list(5)
        print(f"✓ Limited read: {len(limited_tasks)} tasks (limited to 5)")
        
        # Test other collections
        users = await db.users.find({}).to_list()
        print(f"✓ Users read: {len(users)} users")
        
        lists = await db.lists.find({}).to_list()
        print(f"✓ Lists read: {len(lists)} lists")
        
        print("\n✅ All async database tests passed!")
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_async_wrapper())
