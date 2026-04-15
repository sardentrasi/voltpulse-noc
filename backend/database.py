import sqlite3
import os
import json
import hashlib
import secrets
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "noc.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_database():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER DEFAULT 22,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            brand TEXT NOT NULL CHECK(brand IN ('mikrotik', 'ruijie', 'ruckus', 'unifi')),
            status TEXT DEFAULT 'unknown',
            last_poll TEXT,
            uptime TEXT,
            cpu_percent REAL,
            ram_percent REAL,
            extra_info TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metrics_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL,
            timestamp TEXT DEFAULT (datetime('now')),
            status TEXT,
            cpu_percent REAL,
            ram_percent REAL,
            uptime TEXT,
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS command_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL,
            command TEXT NOT NULL,
            output TEXT,
            success INTEGER DEFAULT 0,
            executed_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )
    """)

    # --- Users table ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            role TEXT DEFAULT 'admin',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # create default admin if no users exist
    existing = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if existing == 0:
        default_hash = hash_password("admin")
        cursor.execute(
            "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
            ("admin", default_hash, "Administrator", "admin")
        )
        print("[DB] Default admin created — username: admin / password: admin")

    conn.commit()
    conn.close()
    print(f"[DB] Database initialized at {DB_PATH}")


# --- Password Hashing ---

def hash_password(password):
    """Hash password using SHA-256 with a random salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{pw_hash}"


def verify_password(password, stored_hash):
    """Verify password against stored salt:hash."""
    try:
        salt, pw_hash = stored_hash.split(":")
        check = hashlib.sha256((salt + password).encode()).hexdigest()
        return check == pw_hash
    except (ValueError, AttributeError):
        return False


# --- User Auth ---

def get_user_by_username(username):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_user_password(user_id, new_password):
    conn = get_connection()
    pw_hash = hash_password(new_password)
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, user_id))
    conn.commit()
    conn.close()
    return True


# --- Device CRUD ---

def get_all_devices():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM devices ORDER BY name ASC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_device_by_id(device_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_device(name, ip, port, username, password, brand):
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO devices (name, ip, port, username, password, brand)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (name, ip, port, username, password, brand)
    )
    device_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return device_id


def update_device(device_id, **kwargs):
    allowed = {"name", "ip", "port", "username", "password", "brand"}
    fields = {k: v for k, v in kwargs.items() if k in allowed and v is not None}

    if not fields:
        return False

    fields["updated_at"] = datetime.utcnow().isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [device_id]

    conn = get_connection()
    conn.execute(f"UPDATE devices SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return True


def delete_device(device_id):
    conn = get_connection()
    conn.execute("DELETE FROM devices WHERE id = ?", (device_id,))
    conn.commit()
    conn.close()
    return True


def update_device_status(device_id, status, uptime=None, cpu=None, ram=None, extra_info=None):
    conn = get_connection()
    now = datetime.utcnow().isoformat()

    conn.execute(
        """UPDATE devices
           SET status = ?, last_poll = ?, uptime = ?, cpu_percent = ?, ram_percent = ?, extra_info = ?
           WHERE id = ?""",
        (status, now, uptime, cpu, ram, json.dumps(extra_info) if extra_info else None, device_id)
    )

    conn.execute(
        """INSERT INTO metrics_log (device_id, status, cpu_percent, ram_percent, uptime)
           VALUES (?, ?, ?, ?, ?)""",
        (device_id, status, cpu, ram, uptime)
    )

    conn.commit()
    conn.close()


def log_command(device_id, command, output, success):
    conn = get_connection()
    conn.execute(
        """INSERT INTO command_log (device_id, command, output, success)
           VALUES (?, ?, ?, ?)""",
        (device_id, command, output, 1 if success else 0)
    )
    conn.commit()
    conn.close()


def get_recent_metrics(device_id, limit=50):
    conn = get_connection()
    rows = conn.execute(
        """SELECT * FROM metrics_log WHERE device_id = ?
           ORDER BY timestamp DESC LIMIT ?""",
        (device_id, limit)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


if __name__ == "__main__":
    init_database()
    print("[DB] Schema created successfully.")
