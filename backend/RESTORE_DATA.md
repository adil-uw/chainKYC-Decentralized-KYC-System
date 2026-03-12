# Restore data

## 1. Restore sample data in MongoDB (KYC + credentials)

If the app shows empty lists (no KYC requests, no credentials), seed the database with sample records:

```bash
cd backend
python scripts/seed_data.py
```

This uses `MONGODB_URL` from `backend/.env` and inserts:

- Sample approved KYC requests (with wallet linked)
- One sample credential

It does **not** delete existing data. Restart the backend and refresh the frontend to see the data.

## 2. Restore previous code changes (git stash)

If you had local changes that were stashed before a merge, you can bring them back:

```bash
# List stashes
git stash list

# Restore the most recent stash (may overwrite current uncommitted changes)
git stash pop
```

Current stash message: `frontend and backend local changes before merge`.  
If you prefer to keep current files and only inspect stashed content: `git stash show -p` or `git stash apply` (apply without dropping the stash).
