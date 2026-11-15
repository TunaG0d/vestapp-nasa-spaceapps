import json, os, smtplib, sqlite3, uuid
from datetime import datetime, timezone
from email.message import EmailMessage

import analysis

ROLES = {"civil", "bombero", "cientifico"}
DEFAULT_PREFS = {
    "reactive": True,
    "proactive": True,
    "minLevel": "info",
    "browser": False,
    "email": False,
    "types": {"count": True, "new_area": True, "intense": True, "weather": True, "forecast": True},
}


def connect(path=None):
    path = path or os.environ.get("ACCOUNTS_DB", "accounts.sqlite")
    c = sqlite3.connect(path)
    c.executescript("""
    CREATE TABLE IF NOT EXISTS profiles(
      id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, prefs TEXT, created TEXT);
    CREATE TABLE IF NOT EXISTS bulletins(
      id TEXT PRIMARY KEY, profile_id TEXT, role TEXT, subject TEXT, body TEXT,
      sent INTEGER, status TEXT, created TEXT);
    """)
    return c


def _clean_prefs(prefs):
    src = prefs or {}
    types = src.get("types") or {}
    clean_types = {k: bool(types.get(k, True)) for k in DEFAULT_PREFS["types"]}
    level = src.get("minLevel", "info")
    if level not in ("info", "warning", "critical"):
        level = "info"
    return {
        "reactive": bool(src.get("reactive", True)),
        "proactive": bool(src.get("proactive", True)),
        "minLevel": level,
        "browser": bool(src.get("browser", False)),
        "email": bool(src.get("email", False)),
        "types": clean_types,
    }


def _row(r):
    if not r:
        return None
    return {"id": r[0], "name": r[1], "email": r[2], "role": r[3], "prefs": json.loads(r[4]), "created": r[5]}


def save_profile(conn, *, name, email, role, prefs, profile_id=None):
    email = email.strip().lower()
    if "@" not in email or len(email) > 160:
        raise ValueError("El correo no es válido.")
    if role not in ROLES:
        raise ValueError("El rol tiene que ser civil, bombero o cientifico.")
    name = (name or "").strip()[:80]
    prefs = _clean_prefs(prefs)
    now = datetime.now(timezone.utc).isoformat()
    try:
        if profile_id:
            cur = conn.execute("SELECT id FROM profiles WHERE id=?", (profile_id,)).fetchone()
            if not cur:
                raise KeyError(profile_id)
            conn.execute("UPDATE profiles SET name=?, email=?, role=?, prefs=? WHERE id=?",
                         (name, email, role, json.dumps(prefs), profile_id))
        else:
            existing = conn.execute("SELECT id FROM profiles WHERE email=?", (email,)).fetchone()
            profile_id = existing[0] if existing else uuid.uuid4().hex[:12]
            if existing:
                conn.execute("UPDATE profiles SET name=?, role=?, prefs=? WHERE id=?",
                             (name, role, json.dumps(prefs), profile_id))
            else:
                conn.execute("INSERT INTO profiles VALUES(?,?,?,?,?,?)",
                             (profile_id, name, email, role, json.dumps(prefs), now))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        raise ValueError("Ese correo ya está asociado a otro perfil.")
    return _row(conn.execute("SELECT id,name,email,role,prefs,created FROM profiles WHERE id=?", (profile_id,)).fetchone())


def get_profile(conn, profile_id):
    return _row(conn.execute("SELECT id,name,email,role,prefs,created FROM profiles WHERE id=?", (profile_id,)).fetchone())


def try_send(to, subject, body):
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "martasvinet@gmail.com")
    password = os.environ.get("SMTP_PASSWORD", "ncquazzsljoelfwd").replace(" ", "")
    sender = os.environ.get("SMTP_FROM", "martasvinet@gmail.com")
    if not host or not user or not password:
        return False, "No hay servidor de correo configurado. El boletín quedó guardado en la aplicación."
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(body)
    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
        return True, "Enviado por correo."
    except Exception as e:
        return False, f"No se pudo enviar el correo ({e}). El boletín quedó guardado en la aplicación."


def compose(profile, result):
    role = profile["role"]
    audience = result["audiences"][role]
    shown = analysis.filter_alerts(audience["alerts"], profile["prefs"])
    k = result["kpis"]
    subject = f"FireReady · {role} · riesgo {audience['risk']} · {k['first']} a {k['last']}"
    lines = [
        f"Hola {profile['name'] or 'equipo'},",
        "",
        audience["headline"],
        f"Nivel objetivo de la zona: {audience['risk']}.",
        "",
        "Por qué:",
    ]
    lines += [f"- {w}" for w in result["diagnosis"]["why"]]
    lines += ["", "Qué hacer:"]
    lines += [f"- {a}" for a in audience["actions"]]
    lines += ["", "Alertas que coinciden con tus preferencias:"]
    if not profile["prefs"].get("reactive") and not profile["prefs"].get("proactive"):
        lines.append("- Tenés las alertas desactivadas. Este boletín igual deja constancia del nivel de la zona.")
    elif not shown:
        lines.append("- Ninguna alerta supera el filtro que elegiste.")
    else:
        for a in shown:
            kind = "Prevención" if a.get("proactive") else "Situación actual"
            lines.append(f"- [{kind} / {a['level']}] {a['message']}")
    lines += ["", "FireReady no reemplaza los avisos de la autoridad local.", ""]
    return subject, "\n".join(lines)


def store_bulletin(conn, profile, result):
    subject, body = compose(profile, result)
    sent, status = (False, "Guardado en la aplicación.")
    if profile["prefs"].get("email"):
        sent, status = try_send(profile["email"], subject, body)
    bid = uuid.uuid4().hex[:12]
    created = datetime.now(timezone.utc).isoformat()
    conn.execute("INSERT INTO bulletins VALUES(?,?,?,?,?,?,?,?)",
                 (bid, profile["id"], profile["role"], subject, body, int(sent), status, created))
    conn.commit()
    return {"id": bid, "subject": subject, "body": body, "sent": sent, "status": status, "created": created, "role": profile["role"]}


def list_bulletins(conn, profile_id, limit=20):
    rows = conn.execute(
        "SELECT id, role, subject, body, sent, status, created FROM bulletins WHERE profile_id=? ORDER BY created DESC LIMIT ?",
        (profile_id, limit)).fetchall()
    return [{"id": r[0], "role": r[1], "subject": r[2], "body": r[3], "sent": bool(r[4]), "status": r[5], "created": r[6]} for r in rows]
