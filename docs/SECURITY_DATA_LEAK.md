# SECURITY DATA LEAK - Git History Contamination

## Issue
Database backup files containing real user data were committed to git history.

## Affected Data
The following files were committed and are now in git history:
- `server/backup/database-2026-07-01-*.json` (20 files)

## Data Exposure
The backup files contain:
- User emails (e.g., alex.mercer@stark.corp, dsabari688@gmail.com)
- Password hashes (bcrypt)
- User profile data (names, avatars, settings)
- Task data and user activity patterns

## Immediate Actions Taken
1. Added `server/backup/`, `*.tmp`, `coverage/`, `server/coverage/` to `.gitignore`
2. Removed files from git tracking via `git rm -r --cached`
3. Committed removal (commit 85888e8)

## Remaining Risk
**The data is still in git history.** Anyone with access to this repository can recover the user data from historical commits.

## Required Cleanup
To fully remove the data from git history, run one of:

### Option 1: git filter-repo (recommended)
```bash
pip install git-filter-repo
git filter-repo --path server/backup/ --invert-paths
git filter-repo --path server/coverage/ --invert-paths
git filter-repo --path server/lifeos_db.json.tmp --invert-paths
```

### Option 2: BFG Repo-Cleaner
```bash
brew install bfg
bfg --delete-files server/backup/*.json
bfg --delete-files server/coverage/*
bfg --delete-files server/lifeos_db.json.tmp
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Post-Cleanup
After running either tool:
1. Force push to remote: `git push origin main --force`
2. Notify all collaborators to re-clone the repository
3. Rotate any exposed password hashes (force password resets for affected users)
4. Review access logs for the repository

## Prevention
- Backup job should write to a directory outside the git repository
- Or use a separate backup repository with restricted access
- Add pre-commit hooks to prevent committing `.json` files in backup directories
