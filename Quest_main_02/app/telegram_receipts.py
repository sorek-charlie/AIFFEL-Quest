"""Persist text received through an authenticated private Telegram route."""
import sqlite3
from contextlib import closing
from time import time


def save_receipt(database, message_id, text, timestamp=None):
    if message_id is None or not text.strip():
        return
    with closing(sqlite3.connect(database, timeout=5)) as db, db:
        db.execute('CREATE TABLE IF NOT EXISTS inbound_messages (id TEXT PRIMARY KEY, received REAL, text TEXT)')
        db.execute('INSERT OR IGNORE INTO inbound_messages VALUES (?, ?, ?)',
                   (str(message_id), timestamp or time(), text))
