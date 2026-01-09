"""
Database connection and configuration
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)

# Global database client
client: AsyncIOMotorClient = None
database = None


async def connect_db():
    """Connect to MongoDB"""
    global client, database
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ticktick-clone")
    
    try:
        client = AsyncIOMotorClient(mongodb_uri)
        # Test connection
        await client.admin.command('ping')
        # Extract database name from URI or use default
        if '/' in mongodb_uri:
            db_name = mongodb_uri.split('/')[-1].split('?')[0]
        else:
            db_name = "ticktick-clone"
        database = client[db_name]
        logger.info("✅ MongoDB connected successfully")
        print("✅ MongoDB connected successfully")
    except ConnectionFailure as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        print(f"❌ MongoDB connection failed: {e}")
        raise


async def close_db():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")
        print("MongoDB connection closed")


def get_database():
    """Get database instance"""
    return database

