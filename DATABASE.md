# Database Setup

## Local Development

The database is automatically created when you start the server for the first time:

```bash
npm start
```

This will create `data/users.db` in your project directory.

## Production Deployment (DigitalOcean)

### 1. Database Creation
The database will be automatically created when the server starts for the first time. The server will:
- Create the `data/` directory if it doesn't exist
- Create `users.db` with the proper schema
- Initialize all tables

### 2. Database Location
- **Local**: `./data/users.db` (relative to project root)
- **Production**: `/path/to/your/app/data/users.db`

### 3. Database Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Backup (Optional)
For production, consider setting up regular backups:

```bash
# Backup database
cp data/users.db data/users.db.backup

# Restore database
cp data/users.db.backup data/users.db
```

### 5. File Permissions
Make sure the `data/` directory is writable by your Node.js process:

```bash
chmod 755 data/
chmod 644 data/users.db
```

## Important Notes

- **Don't commit** `data/users.db` to Git (it's in .gitignore)
- **Don't share** the database file (contains user data)
- **Backup regularly** in production
- **Database is SQLite** - no separate database server needed
