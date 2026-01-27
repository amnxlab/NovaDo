"""
Database connection and configuration
Supports both MongoDB (production) and Mongita (local development fallback)
"""
import os
import asyncio
from typing import Optional, Any, List, Dict
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

# Global database client and database instance
client = None
database = None
use_mongita = False


class InsertOneResult:
    """Mock result for insert_one operation"""
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class InsertManyResult:
    """Mock result for insert_many operation"""
    def __init__(self, inserted_ids):
        self.inserted_ids = inserted_ids


class UpdateResult:
    """Mock result for update operations"""
    def __init__(self, matched_count=0, modified_count=0):
        self.matched_count = matched_count
        self.modified_count = modified_count


class DeleteResult:
    """Mock result for delete operations"""
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class MongitaAsyncWrapper:
    """Async wrapper for Mongita to make it compatible with Motor-style async calls"""
    
    def __init__(self, collection):
        self._collection = collection
    
    async def find_one(self, filter=None, *args, **kwargs):
        try:
            result = self._collection.find_one(filter or {})
            return result
        except Exception as e:
            logger.error(f"find_one error: {e}")
            return None
    
    def find(self, filter=None, *args, **kwargs):
        return MongitaCursorWrapper(self._collection.find(filter or {}))
    
    async def insert_one(self, document: Dict[str, Any]) -> InsertOneResult:
        try:
            # Ensure document has an _id
            if "_id" not in document:
                document["_id"] = ObjectId()
            
            result = self._collection.insert_one(document)
            # Mongita returns the result synchronously
            if hasattr(result, 'inserted_id'):
                return InsertOneResult(result.inserted_id)
            else:
                # If mongita doesn't provide inserted_id, use our generated one
                return InsertOneResult(document["_id"])
        except Exception as e:
            logger.error(f"insert_one error: {e}")
            raise
    
    async def insert_many(self, documents: List[Dict[str, Any]]) -> InsertManyResult:
        try:
            # Ensure each document has an _id
            for doc in documents:
                if "_id" not in doc:
                    doc["_id"] = ObjectId()
            
            result = self._collection.insert_many(documents)
            if hasattr(result, 'inserted_ids'):
                return InsertManyResult(result.inserted_ids)
            else:
                return InsertManyResult([doc["_id"] for doc in documents])
        except Exception as e:
            logger.error(f"insert_many error: {e}")
            raise
    
    async def update_one(self, filter: Dict, update: Dict, upsert: bool = False) -> UpdateResult:
        try:
            result = self._collection.update_one(filter, update, upsert=upsert)
            if hasattr(result, 'matched_count'):
                return UpdateResult(result.matched_count, result.modified_count)
            return UpdateResult(1, 1)
        except Exception as e:
            logger.error(f"update_one error: {e}")
            raise
    
    async def update_many(self, filter: Dict, update: Dict) -> UpdateResult:
        try:
            result = self._collection.update_many(filter, update)
            if hasattr(result, 'matched_count'):
                return UpdateResult(result.matched_count, result.modified_count)
            return UpdateResult(1, 1)
        except Exception as e:
            logger.error(f"update_many error: {e}")
            raise
    
    async def delete_one(self, filter: Dict) -> DeleteResult:
        try:
            result = self._collection.delete_one(filter)
            if hasattr(result, 'deleted_count'):
                return DeleteResult(result.deleted_count)
            return DeleteResult(1)
        except Exception as e:
            logger.error(f"delete_one error: {e}")
            raise
    
    async def delete_many(self, filter: Dict) -> DeleteResult:
        try:
            result = self._collection.delete_many(filter)
            if hasattr(result, 'deleted_count'):
                return DeleteResult(result.deleted_count)
            return DeleteResult(1)
        except Exception as e:
            logger.error(f"delete_many error: {e}")
            raise
    
    async def count_documents(self, filter: Dict) -> int:
        try:
            return self._collection.count_documents(filter)
        except Exception as e:
            logger.error(f"count_documents error: {e}")
            return 0


class MongitaCursorWrapper:
    """Async wrapper for Mongita cursor"""
    
    def __init__(self, cursor):
        # Convert cursor to list immediately to avoid exhaustion issues
        try:
            self._results = list(cursor)
        except Exception as e:
            logger.error(f"cursor initialization error: {e}")
            self._results = []
        self._sort_key = None
        self._sort_direction = 1
    
    def sort(self, key, direction=1):
        self._sort_key = key
        self._sort_direction = direction
        return self
    
    async def to_list(self, length=None):
        try:
            results = self._results.copy()
            if self._sort_key:
                reverse = (self._sort_direction == -1)
                results.sort(key=lambda x: x.get(self._sort_key, 0) or 0, reverse=reverse)
            if length:
                return results[:length]
            return results
        except Exception as e:
            logger.error(f"to_list error: {e}")
            return []

    def __aiter__(self):
        self._iter_index = 0
        return self

    async def __anext__(self):
        try:
            if self._iter_index >= len(self._results):
                raise StopAsyncIteration
            result = self._results[self._iter_index]
            self._iter_index += 1
            return result
        except (IndexError, StopIteration):
            raise StopAsyncIteration


class MongitaDatabaseWrapper:
    """Wrapper for Mongita database to provide async-compatible access"""
    
    def __init__(self, db):
        self._db = db
        self._collections = {}
    
    def __getattr__(self, name):
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        if name not in self._collections:
            self._collections[name] = MongitaAsyncWrapper(self._db[name])
        return self._collections[name]


async def connect_db():
    """Connect to database - Uses Mongita for local development by default"""
    global client, database, use_mongita
    
    # Check if user explicitly wants MongoDB (set MONGODB_URI env var)
    mongodb_uri = os.getenv("MONGODB_URI")
    
    if mongodb_uri:
        # Only try MongoDB if explicitly configured
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
            
            client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=5000)
            # Test connection with timeout
            await client.admin.command('ping')
            
            # Extract database name from URI or use default
            if '/' in mongodb_uri:
                db_name = mongodb_uri.split('/')[-1].split('?')[0]
            else:
                db_name = "ticktick-clone"
            
            database = client[db_name]
            use_mongita = False
            logger.info("MongoDB connected successfully")
            print("[OK] MongoDB connected successfully")
            return
            
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}")
            print(f"[WARN] MongoDB connection failed, using local database...")
    
    # Use Mongita (local file-based database) by default
    try:
        from mongita import MongitaClientDisk
        
        # Store data in a local directory
        # Handle PyInstaller frozen executable - use exe directory not _MEIPASS
        import sys
        if getattr(sys, 'frozen', False):
            # Running as frozen exe - store data next to the exe
            base_dir = os.path.dirname(sys.executable)
        else:
            # Running as script - store data in project folder
            base_dir = os.path.dirname(os.path.dirname(__file__))
        
        data_dir = os.path.join(base_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        
        client = MongitaClientDisk(data_dir)
        database = MongitaDatabaseWrapper(client["taskflow"])
        use_mongita = True
        
        logger.info("Local database connected successfully")
        print("[OK] Local database connected successfully")
        print(f"     Data stored in: {data_dir}")
        
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        print(f"[ERROR] Failed to connect to database: {e}")
        raise


async def close_db():
    """Close database connection"""
    global client, use_mongita
    if client:
        if not use_mongita:
            client.close()
        logger.info("Database connection closed")
        print("Database connection closed")


def get_database():
    """Get database instance"""
    return database


def is_using_mongita():
    """Check if using Mongita fallback"""
    return use_mongita
