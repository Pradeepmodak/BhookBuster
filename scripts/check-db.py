import pymongo
import sys

MONGODB_URI = "mongodb+srv://pminsights:pminsights@cluster0.ruitbsk.mongodb.net/BhookBuster?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "BhookBuster"

try:
    client = pymongo.MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    
    print("Connected to MongoDB Atlas!")
    
    restaurants_col = db["restaurants"]
    riders_col = db["riders"]
    
    restaurants = list(restaurants_col.find({}))
    print(f"\n--- Restaurants found: {len(restaurants)} ---")
    for idx, r in enumerate(restaurants):
        is_verified = r.get("isVerified")
        print(f"{idx + 1}. Name: {r.get('name')} | isVerified: {is_verified} ({type(is_verified)}) | Owner: {r.get('ownerId')}")
        
    riders = list(riders_col.find({}))
    print(f"\n--- Riders found: {len(riders)} ---")
    for idx, r in enumerate(riders):
        is_verified = r.get("isVerified")
        print(f"{idx + 1}. UserID: {r.get('userId')} | isVerified: {is_verified} ({type(is_verified)}) | Phone: {r.get('phoneNumber')}")

except Exception as e:
    print(f"Error connecting or querying: {e}", file=sys.stderr)
