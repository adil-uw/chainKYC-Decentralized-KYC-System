# Connect to the database that has your 27 KYC requests

The app uses the database name from (in order):
1. **MONGODB_DATABASE** in `backend/.env`
2. The path in **MONGODB_URL** (e.g. `...mongodb.net/YourDbName?retryWrites=...`)
3. Default: **chainkyc**

If you see 2 requests instead of 27, the backend is using a different database.

## Find the correct database name

1. **Restart the backend** (so it loads the latest code):
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Open in your browser (or with curl):
   ```
   http://localhost:8000/api/debug/databases
   ```
   You’ll see a list of databases and how many documents are in `kyc_requests` for each.

3. Find the database where **kyc_requests_count** is **27**.

4. In `backend/.env`, set (uncomment and set the name):
   ```
   MONGODB_DATABASE=that_database_name
   ```
   Use the exact name from the debug output (e.g. if it says `"database": "mydb"`, use `MONGODB_DATABASE=mydb`).

5. **Restart the backend** again. Check the startup log: it should show `database=that_database_name`. The app and `/api/stats` should now show 27 total requests.
