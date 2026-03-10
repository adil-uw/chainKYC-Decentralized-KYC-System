# Database layer: MongoDB connection.
# Use get_database() from application code; init_mongo() is called at app startup.

from database.mongo_connection import get_database, init_mongo, close_connection

__all__ = ["get_database", "init_mongo", "close_connection"]
