import sqlite3
import os
from datetime import datetime

import sys

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "video_data.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Bảng Video
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            creator TEXT NOT NULL,
            status TEXT DEFAULT 'chua_dang',
            posted_tiktok INTEGER DEFAULT 0,
            posted_facebook INTEGER DEFAULT 0,
            posted_youtube INTEGER DEFAULT 0,
            channels TEXT DEFAULT '',
            created_date TEXT NOT NULL,
            published_date TEXT DEFAULT '',
            video_filename TEXT DEFAULT '',
            original_filename TEXT DEFAULT '',
            file_size INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. Bảng Tài Khoản & Nhân Sự (Users / Roles / PIN)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL DEFAULT 'editor', -- 'admin', 'editor', 'boss'
            pin TEXT NOT NULL DEFAULT '1234',
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

    # Kiểm tra và thêm cột nếu thiếu
    cursor.execute("PRAGMA table_info(videos)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "posted_tiktok" not in columns:
        cursor.execute("ALTER TABLE videos ADD COLUMN posted_tiktok INTEGER DEFAULT 0")
    if "posted_facebook" not in columns:
        cursor.execute("ALTER TABLE videos ADD COLUMN posted_facebook INTEGER DEFAULT 0")
    if "posted_youtube" not in columns:
        cursor.execute("ALTER TABLE videos ADD COLUMN posted_youtube INTEGER DEFAULT 0")
    if "channels" not in columns:
        cursor.execute("ALTER TABLE videos ADD COLUMN channels TEXT DEFAULT ''")
    conn.commit()
    
    # Cập nhật danh sách tài khoản mẫu kèm mã PIN mặc định riêng cho từng người
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        sample_users = [
            ("Tường Vy (Admin)", "admin", "123456"),
            ("Sếp (Chỉ xem)", "boss", "8888"),
            ("Nguyên", "editor", "1111"),
            ("Quý", "editor", "1112"),
            ("Thương", "editor", "1113")
        ]
        cursor.executemany("INSERT INTO users (name, role, pin) VALUES (?, ?, ?)", sample_users)
        conn.commit()
    else:
        # Đảm bảo các tài khoản hiện có đều có mã PIN riêng biệt
        cursor.execute("UPDATE users SET pin = '123456' WHERE role = 'admin' AND (pin = '' OR pin IS NULL)")
        cursor.execute("UPDATE users SET pin = '8888' WHERE role = 'boss' AND (pin = '' OR pin IS NULL)")
        cursor.execute("UPDATE users SET pin = '1111' WHERE name LIKE '%Hoàng Nam%' AND (pin = '' OR pin IS NULL)")
        cursor.execute("UPDATE users SET pin = '2222' WHERE name LIKE '%Thảo Linh%' AND (pin = '' OR pin IS NULL)")
        cursor.execute("UPDATE users SET pin = '3333' WHERE name LIKE '%Minh Tuấn%' AND (pin = '' OR pin IS NULL)")
        # Bất kỳ user nào chưa có PIN thì cấp mặc định '1234'
        cursor.execute("UPDATE users SET pin = '1234' WHERE pin = '' OR pin IS NULL")
        conn.commit()

    conn.close()

# Lấy danh sách cho Màn hình đăng nhập (Ẩn mã PIN vì lý do bảo mật)
def get_users_public():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role FROM users WHERE active = 1 ORDER BY CASE WHEN role = 'admin' THEN 1 WHEN role = 'boss' THEN 2 ELSE 3 END, name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# Lấy danh sách cho TƯỜNG VY ADMIN (Hiển thị mã PIN để Tường Vy xem và cấp cho từng người)
def get_users_for_admin():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, pin, created_at FROM users WHERE active = 1 ORDER BY CASE WHEN role = 'admin' THEN 1 WHEN role = 'boss' THEN 2 ELSE 3 END, name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ? AND active = 1", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# Xác thực đăng nhập bằng Mã PIN
def verify_user_login(user_id, input_pin):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, pin FROM users WHERE id = ? AND active = 1", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return None
        
    if str(user["pin"]).strip() != str(input_pin).strip():
        return None
        
    return {
        "id": user["id"],
        "name": user["name"],
        "role": user["role"]
    }

# Tường Vy thêm nhân sự hoặc Sếp mới kèm mã PIN riêng
def add_user(name, role="editor", pin="1234"):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        clean_pin = pin.strip() if pin.strip() else "1234"
        cursor.execute("INSERT INTO users (name, role, pin) VALUES (?, ?, ?)", (name.strip(), role, clean_pin))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    conn.close()
    return success

# Tường Vy đổi mã PIN cho bất kỳ người nào
def update_user_pin(user_id, new_pin):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET pin = ? WHERE id = ?", (new_pin.strip(), user_id))
    conn.commit()
    conn.close()
    return True

# Tường Vy đổi vai trò (Sếp hoặc Nhân viên) cho bất kỳ ai
def update_user_role(user_id, new_role):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Không được đổi vai trò của Quản trị viên Tường Vy
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if row and row["role"] == "admin":
        conn.close()
        return False
        
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    conn.commit()
    conn.close()
    return True

# Tường Vy xóa nhân sự
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if row and row["role"] == "admin":
        conn.close()
        return False
        
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

# ================= VIDEO OPERATIONS =================
def get_all_videos(tab="all", search=None, creator=None, date_from=None, date_to=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM videos WHERE 1=1"
    params = []

    if tab == 'archive':
        query += " AND (status = 'chua_dang' OR (posted_tiktok = 0 AND posted_facebook = 0 AND posted_youtube = 0))"
    elif tab == 'tiktok':
        query += " AND (posted_tiktok = 1 OR channels LIKE '%TikTok%')"
    elif tab == 'facebook':
        query += " AND (posted_facebook = 1 OR channels LIKE '%Facebook%')"
    elif tab == 'youtube':
        query += " AND (posted_youtube = 1 OR channels LIKE '%YouTube%')"
    
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])
        
    if creator and creator != 'all':
        query += " AND creator = ?"
        params.append(creator)
        
    if date_from:
        query += " AND created_date >= ?"
        params.append(date_from)
        
    if date_to:
        query += " AND created_date <= ?"
        params.append(date_to)
        
    query += " ORDER BY created_date DESC, id DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_video_by_id(video_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_video(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    posted_tiktok = int(data.get("posted_tiktok", 0))
    posted_facebook = int(data.get("posted_facebook", 0))
    posted_youtube = int(data.get("posted_youtube", 0))
    
    channels_list = []
    if posted_tiktok: channels_list.append("TikTok")
    if posted_facebook: channels_list.append("Facebook")
    if posted_youtube: channels_list.append("YouTube")
    channels_str = ", ".join(channels_list)

    status = "da_dang" if len(channels_list) > 0 else data.get("status", "chua_dang")
    published_date = data.get("published_date", "")
    if status == "da_dang" and not published_date:
        published_date = datetime.now().strftime("%Y-%m-%d")

    cursor.execute('''
        INSERT INTO videos (
            title, description, creator, status,
            posted_tiktok, posted_facebook, posted_youtube, channels,
            created_date, published_date, video_filename,
            original_filename, file_size, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get("title", "").strip(),
        data.get("description", "").strip(),
        data.get("creator", "").strip(),
        status,
        posted_tiktok,
        posted_facebook,
        posted_youtube,
        channels_str,
        data.get("created_date", datetime.now().strftime("%Y-%m-%d")),
        published_date,
        data.get("video_filename", ""),
        data.get("original_filename", ""),
        data.get("file_size", 0),
        now_str,
        now_str
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_video(video_id, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if "posted_tiktok" in data or "posted_facebook" in data or "posted_youtube" in data:
        cursor.execute("SELECT posted_tiktok, posted_facebook, posted_youtube, published_date FROM videos WHERE id = ?", (video_id,))
        cur = cursor.fetchone()
        
        tiktok = int(data.get("posted_tiktok", cur["posted_tiktok"] if cur else 0))
        facebook = int(data.get("posted_facebook", cur["posted_facebook"] if cur else 0))
        youtube = int(data.get("posted_youtube", cur["posted_youtube"] if cur else 0))
        pub_date = data.get("published_date", cur["published_date"] if cur else "")
        
        channels_list = []
        if tiktok: channels_list.append("TikTok")
        if facebook: channels_list.append("Facebook")
        if youtube: channels_list.append("YouTube")
        
        data["channels"] = ", ".join(channels_list)
        if len(channels_list) > 0:
            data["status"] = "da_dang"
            if not pub_date:
                data["published_date"] = datetime.now().strftime("%Y-%m-%d")
        else:
            data["status"] = "chua_dang"

    fields = []
    values = []
    
    allow_fields = [
        "title", "description", "creator", "status",
        "posted_tiktok", "posted_facebook", "posted_youtube", "channels",
        "created_date", "published_date",
        "video_filename", "original_filename", "file_size"
    ]
    
    for key in allow_fields:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
            
    fields.append("updated_at = ?")
    values.append(now_str)
    values.append(video_id)
    
    sql = f"UPDATE videos SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(sql, values)
    conn.commit()
    conn.close()
    return True

def toggle_video_channel(video_id, channel):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT posted_tiktok, posted_facebook, posted_youtube, published_date FROM videos WHERE id = ?", (video_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
        
    tiktok = row["posted_tiktok"]
    facebook = row["posted_facebook"]
    youtube = row["posted_youtube"]
    pub_date = row["published_date"]
    
    if channel == 'tiktok':
        tiktok = 0 if tiktok == 1 else 1
    elif channel == 'facebook':
        facebook = 0 if facebook == 1 else 1
    elif channel == 'youtube':
        youtube = 0 if youtube == 1 else 1
    elif channel == 'archive':
        tiktok = 0
        facebook = 0
        youtube = 0

    channels_list = []
    if tiktok: channels_list.append("TikTok")
    if facebook: channels_list.append("Facebook")
    if youtube: channels_list.append("YouTube")
    
    status = "da_dang" if len(channels_list) > 0 else "chua_dang"
    if status == "da_dang" and not pub_date:
        pub_date = datetime.now().strftime("%Y-%m-%d")
        
    channels_str = ", ".join(channels_list)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute('''
        UPDATE videos 
        SET posted_tiktok = ?, posted_facebook = ?, posted_youtube = ?, channels = ?, status = ?, published_date = ?, updated_at = ?
        WHERE id = ?
    ''', (tiktok, facebook, youtube, channels_str, status, pub_date, now_str, video_id))
    
    conn.commit()
    conn.close()
    return {"status": status, "channels": channels_str, "tiktok": tiktok, "facebook": facebook, "youtube": youtube}

def delete_video(video_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT video_filename FROM videos WHERE id = ?", (video_id,))
    row = cursor.fetchone()
    filename = row["video_filename"] if row else None
    
    cursor.execute("DELETE FROM videos WHERE id = ?", (video_id,))
    conn.commit()
    conn.close()
    return filename

def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    cursor.execute("SELECT COUNT(*) FROM videos")
    total_videos = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM videos WHERE created_date = ?", (today_str,))
    today_videos = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM videos WHERE status = 'chua_dang' OR (posted_tiktok = 0 AND posted_facebook = 0 AND posted_youtube = 0)")
    archive_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM videos WHERE posted_tiktok = 1 OR channels LIKE '%TikTok%'")
    tiktok_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM videos WHERE posted_facebook = 1 OR channels LIKE '%Facebook%'")
    facebook_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM videos WHERE posted_youtube = 1 OR channels LIKE '%YouTube%'")
    youtube_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM videos WHERE status = 'da_dang' AND (posted_tiktok = 1 OR posted_facebook = 1 OR posted_youtube = 1)")
    total_published = cursor.fetchone()[0]

    cursor.execute('''
        SELECT creator, 
               COUNT(*) as total, 
               SUM(CASE WHEN (posted_tiktok = 1 OR posted_facebook = 1 OR posted_youtube = 1) THEN 1 ELSE 0 END) as published,
               SUM(CASE WHEN (posted_tiktok = 0 AND posted_facebook = 0 AND posted_youtube = 0) THEN 1 ELSE 0 END) as archive
        FROM videos 
        WHERE creator != '' 
        GROUP BY creator 
        ORDER BY total DESC
    ''')
    creator_stats = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "total_videos": total_videos,
        "today_videos": today_videos,
        "archive_count": archive_count,
        "tiktok_count": tiktok_count,
        "facebook_count": facebook_count,
        "youtube_count": youtube_count,
        "total_published": total_published,
        "creator_stats": creator_stats
    }
