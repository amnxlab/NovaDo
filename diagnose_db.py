"""
Database diagnostic and repair tool
Checks for BSON corruption and repairs if possible
"""
import os
import sys
import asyncio
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

async def diagnose_database():
    """Diagnose and repair database issues"""
    print("\n=== Database Diagnostic Tool ===\n")
    
    # Import here to ensure proper path
    from mongita import MongitaClientDisk
    
    # Determine data directory
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data")
    
    print(f"Data directory: {data_dir}")
    print(f"Directory exists: {os.path.exists(data_dir)}\n")
    
    if not os.path.exists(data_dir):
        print("[ERROR] Data directory not found!")
        return
    
    try:
        # Connect directly to Mongita
        client = MongitaClientDisk(data_dir)
        db = client["taskflow"]
        
        # Test each collection
        collections = ["users", "tasks", "lists", "tags", "habits", "oauth_states"]
        
        for coll_name in collections:
            print(f"\n--- Testing collection: {coll_name} ---")
            try:
                collection = db[coll_name]
                
                # Try to count documents
                count = collection.count_documents({})
                print(f"✓ Count: {count} documents")
                
                # Try to list documents
                docs = list(collection.find({}))
                print(f"✓ Successfully read {len(docs)} documents")
                
                # Show first document if exists
                if docs:
                    first_doc = docs[0]
                    print(f"✓ Sample document keys: {list(first_doc.keys())}")
                    
            except Exception as e:
                print(f"✗ ERROR reading {coll_name}: {e}")
                print(f"  Error type: {type(e).__name__}")
                
                # Try to repair
                print(f"\n  Attempting repair...")
                try:
                    # Get collection path
                    coll_path = os.path.join(data_dir, f"taskflow.{coll_name}")
                    data_file = os.path.join(coll_path, "$.data")
                    
                    if os.path.exists(data_file):
                        file_size = os.path.getsize(data_file)
                        print(f"  Data file size: {file_size} bytes")
                        
                        if file_size == 0:
                            print(f"  ℹ Empty collection, no repair needed")
                        else:
                            # Try reading raw BSON
                            import bson
                            with open(data_file, 'rb') as f:
                                data = f.read()
                                
                            # Try to decode BSON documents
                            offset = 0
                            valid_docs = []
                            corrupted_count = 0
                            
                            while offset < len(data):
                                try:
                                    # Read document size (first 4 bytes)
                                    if offset + 4 > len(data):
                                        print(f"  ✗ Incomplete document at offset {offset}")
                                        break
                                        
                                    doc_size = int.from_bytes(data[offset:offset+4], 'little')
                                    
                                    if doc_size <= 5 or doc_size > len(data) - offset:
                                        print(f"  ✗ Invalid document size {doc_size} at offset {offset}")
                                        corrupted_count += 1
                                        # Try to skip and find next valid document
                                        offset += 1
                                        continue
                                    
                                    # Read full document
                                    doc_bytes = data[offset:offset+doc_size]
                                    doc = bson.decode(doc_bytes)
                                    valid_docs.append(doc)
                                    offset += doc_size
                                    
                                except Exception as decode_error:
                                    print(f"  ✗ Failed to decode at offset {offset}: {decode_error}")
                                    corrupted_count += 1
                                    offset += 1
                            
                            print(f"  Found {len(valid_docs)} valid documents, {corrupted_count} corrupted regions")
                            
                            if corrupted_count > 0 and valid_docs:
                                # Backup original
                                backup_file = data_file + ".backup"
                                import shutil
                                shutil.copy2(data_file, backup_file)
                                print(f"  ✓ Created backup: {backup_file}")
                                
                                # Rebuild collection with valid documents
                                collection.delete_many({})
                                if valid_docs:
                                    collection.insert_many(valid_docs)
                                print(f"  ✓ Repaired: Restored {len(valid_docs)} valid documents")
                            
                except Exception as repair_error:
                    print(f"  ✗ Repair failed: {repair_error}")
        
        print("\n\n=== Summary ===")
        print("Diagnostic complete. Check results above.")
        
    except Exception as e:
        print(f"\n[CRITICAL ERROR] {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(diagnose_database())
