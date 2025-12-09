import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional
import os

DATABASE_PATH = "analysis_history.db"

def init_database():
    """Initialize the SQLite database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Table for training history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT,
            num_rows INTEGER,
            training_time REAL,
            depth TEXT,
            latitude TEXT,
            longitude TEXT,
            collection_date TEXT,
            voyage TEXT,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table for websocket analysis history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT,
            sequence_count INTEGER,
            total_clusters INTEGER,
            total_reads INTEGER,
            status TEXT DEFAULT 'completed',
            result_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def add_training_record(
    file_id: str,
    filename: str,
    file_type: str,
    num_rows: int,
    training_time: float,
    depth: str = "",
    latitude: str = "",
    longitude: str = "",
    collection_date: str = "",
    voyage: str = "",
    status: str = "completed"
):
    """Add a new training record to the database"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO training_history 
            (file_id, filename, file_type, num_rows, training_time, depth, latitude, longitude, collection_date, voyage, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (file_id, filename, file_type, num_rows, training_time, depth, latitude, longitude, collection_date, voyage, status))
        
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def add_analysis_record(
    file_id: str,
    filename: str,
    file_type: str,
    sequence_count: int,
    total_clusters: int = 0,
    total_reads: int = 0,
    status: str = "completed",
    result_data: Dict = None
):
    """Add a new analysis record to the database"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        result_json = json.dumps(result_data) if result_data else "{}"
        
        cursor.execute('''
            INSERT INTO analysis_history 
            (file_id, filename, file_type, sequence_count, total_clusters, total_reads, status, result_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (file_id, filename, file_type, sequence_count, total_clusters, total_reads, status, result_json))
        
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def update_analysis_status(file_id: str, status: str):
    """Update the status of an analysis record"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE analysis_history 
        SET status = ?
        WHERE file_id = ?
    ''', (status, file_id))
    
    conn.commit()
    conn.close()

def get_all_training_history() -> List[Dict]:
    """Get all training history records"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM training_history 
        ORDER BY created_at DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_all_analysis_history() -> List[Dict]:
    """Get all analysis history records"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM analysis_history 
        ORDER BY created_at DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        record = dict(row)
        # Parse JSON result_data
        if record.get('result_data'):
            try:
                record['result_data'] = json.loads(record['result_data'])
            except:
                record['result_data'] = {}
        result.append(record)
    
    return result

def get_combined_history() -> List[Dict]:
    """Get combined history from both training and analysis tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get training history
    cursor.execute('''
        SELECT 
            'training' as type,
            file_id,
            filename,
            file_type,
            num_rows,
            training_time,
            depth,
            latitude,
            longitude,
            collection_date,
            voyage,
            status,
            created_at
        FROM training_history 
        ORDER BY created_at DESC
    ''')
    training_rows = cursor.fetchall()
    
    # Get analysis history
    cursor.execute('''
        SELECT 
            'analysis' as type,
            file_id,
            filename,
            file_type,
            sequence_count,
            total_clusters,
            total_reads,
            status,
            result_data,
            created_at
        FROM analysis_history 
        ORDER BY created_at DESC
    ''')
    analysis_rows = cursor.fetchall()
    
    conn.close()
    
    combined = []
    
    for row in training_rows:
        record = dict(row)
        combined.append(record)
    
    for row in analysis_rows:
        record = dict(row)
        if record.get('result_data'):
            try:
                record['result_data'] = json.loads(record['result_data'])
            except:
                record['result_data'] = {}
        combined.append(record)
    
    # Sort by created_at
    combined.sort(key=lambda x: x['created_at'], reverse=True)
    
    return combined

def delete_training_record(file_id: str) -> bool:
    """Delete a training record"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM training_history WHERE file_id = ?', (file_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted

def delete_analysis_record(file_id: str) -> bool:
    """Delete an analysis record"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM analysis_history WHERE file_id = ?', (file_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted

def clear_all_history():
    """Clear all history records"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM training_history')
    cursor.execute('DELETE FROM analysis_history')
    
    conn.commit()
    conn.close()

# Initialize database on module import
if not os.path.exists(DATABASE_PATH):
    init_database()
