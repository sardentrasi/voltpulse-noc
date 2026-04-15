#!/bin/bash
# ============================================================
#  NOC Dashboard — Ubuntu Installation Script
#  Tested on: Ubuntu 22.04 / 24.04 LTS
#  Run as root or with sudo: sudo bash install.sh
# ============================================================

set -e

# --- Configuration ---
APP_DIR="/opt/noc-dashboard"
APP_USER="noc"
NODE_VERSION="20"
BACKEND_PORT=8100
FRONTEND_PORT=3000

# colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[NOC]${NC} $1"; }
warn()  { echo -e "${YELLOW}[NOC]${NC} $1"; }
error() { echo -e "${RED}[NOC]${NC} $1"; exit 1; }

# --- Pre-flight checks ---
if [ "$EUID" -ne 0 ]; then
    error "Please run as root: sudo bash install.sh"
fi

log "Starting NOC Dashboard installation..."
log "Target directory: ${APP_DIR}"

# --- System update ---
log "Updating system packages (please wait)..."
# Using noninteractive to prevent hanging on prompts
# Removed apt-get upgrade to avoid interactive config prompts
DEBIAN_FRONTEND=noninteractive apt-get update -y

# --- Install system dependencies ---
log "Installing system dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    ufw

# --- Install Node.js ---
if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
        log "Node.js v$(node -v) already installed, skipping..."
    else
        warn "Node.js version too old (v$(node -v)), upgrading..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
    fi
else
    log "Installing Node.js ${NODE_VERSION}.x..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

log "Node.js $(node -v) / npm $(npm -v) ready"

# --- Create app user ---
if id "$APP_USER" &>/dev/null; then
    log "User '${APP_USER}' already exists"
else
    log "Creating system user '${APP_USER}'..."
    useradd -r -m -s /bin/bash "$APP_USER"
fi

# --- Copy project files ---
log "Setting up application directory..."
mkdir -p "$APP_DIR"

# copy project files (excluding node_modules, .next, __pycache__, venv)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rsync -a --exclude='node_modules' --exclude='.next' --exclude='__pycache__' \
    --exclude='venv' --exclude='*.db' --exclude='*.pyc' \
    "$SCRIPT_DIR/" "$APP_DIR/"

# --- Python virtual environment ---
log "Setting up Python virtual environment..."
python3 -m venv "${APP_DIR}/backend/venv"
source "${APP_DIR}/backend/venv/bin/activate"

log "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r "${APP_DIR}/backend/requirements.txt" -q

deactivate

# --- Node.js dependencies ---
log "Installing Node.js dependencies..."
cd "$APP_DIR"
npm install --production --silent 2>/dev/null

log "Building Next.js production bundle..."
npm run build

# --- Initialize database ---
log "Initializing SQLite database..."
cd "${APP_DIR}/backend"
"${APP_DIR}/backend/venv/bin/python" -c "from database import init_database; init_database()"

# --- Create environment file ---
if [ ! -f "${APP_DIR}/.env.local" ]; then
    log "Creating environment config..."
    cat > "${APP_DIR}/.env.local" <<EOF
# NOC Dashboard Configuration
NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}
EOF
fi

# --- Set permissions ---
log "Setting file permissions..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR"
chmod 600 "${APP_DIR}/backend/noc.db" 2>/dev/null || true

# --- Systemd service: Python Backend ---
log "Creating systemd service for backend..."
cat > /etc/systemd/system/noc-backend.service <<EOF
[Unit]
Description=NOC Dashboard — Python Backend (FastAPI)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${APP_DIR}/backend/venv/bin:/usr/local/bin:/usr/bin"
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port ${BACKEND_PORT}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=noc-backend

# security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}/backend
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# --- Systemd service: Next.js Frontend ---
log "Creating systemd service for frontend..."
cat > /etc/systemd/system/noc-frontend.service <<EOF
[Unit]
Description=NOC Dashboard — Next.js Frontend
After=network.target noc-backend.service
Wants=noc-backend.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment="NODE_ENV=production"
Environment="PORT=${FRONTEND_PORT}"
Environment="NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=noc-frontend

# security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# --- Enable and start services ---
log "Enabling and starting services..."
systemctl daemon-reload
systemctl enable noc-backend.service
systemctl enable noc-frontend.service
systemctl start noc-backend.service
sleep 2
systemctl start noc-frontend.service

# --- Firewall (optional) ---
if command -v ufw &> /dev/null; then
    log "Configuring firewall..."
    ufw allow ${FRONTEND_PORT}/tcp comment "NOC Dashboard" > /dev/null 2>&1 || true
fi

# --- Health check ---
sleep 3
BACKEND_STATUS=$(systemctl is-active noc-backend.service)
FRONTEND_STATUS=$(systemctl is-active noc-frontend.service)

echo ""
echo "============================================================"
echo -e "  ${GREEN}NOC Dashboard — Installation Complete${NC}"
echo "============================================================"
echo ""
echo "  Services:"
echo -e "    Backend:  ${BACKEND_STATUS} (port ${BACKEND_PORT})"
echo -e "    Frontend: ${FRONTEND_STATUS} (port ${FRONTEND_PORT})"
echo ""
echo "  URLs:"
echo "    Dashboard: http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT}"
echo "    API:       http://localhost:${BACKEND_PORT}/docs"
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status noc-backend"
echo "    sudo systemctl status noc-frontend"
echo "    sudo journalctl -u noc-backend -f"
echo "    sudo journalctl -u noc-frontend -f"
echo "    sudo systemctl restart noc-backend noc-frontend"
echo ""
echo "  Database: ${APP_DIR}/backend/noc.db"
echo "  Logs:     journalctl -u noc-backend -u noc-frontend"
echo "============================================================"
