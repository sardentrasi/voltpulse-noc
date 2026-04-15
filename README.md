# ⚡ VoltPulse NOC

**VoltPulse NOC** is a premium, high-performance network monitoring dashboard designed for managing multi-vendor hardware (MikroTik, Ruijie, Ruckus, UniFi) through a single, unified interface. Built with a "dark terminal" aesthetic inspired by modern AI engineering platforms.

![NOC Dashboard Preview](https://via.placeholder.com/1200x600/050507/00d992?text=VoltPulse+NOC+Terminal+Aesthetic)

## ✨ Features

- **Multi-Vendor Support**: Unified SSH-based polling for:
  - **MikroTik** (RouterOS v6/v7)
  - **Ruijie** (RG-OS)
  - **Ruckus** (SmartZone/Solo APs)
  - **UniFi** (Linux-based controllers/APs)
- **Live Metrics**: Monitor CPU Load, RAM Usage, and Uptime with animated status indicators.
- **Remote Operations**: Send critical commands like **Restart** directly from the dashboard.
- **Glassmorphism UI**: A stunning "Abyss Black" and "Emerald Signal Green" interface built for developers.
- **One-Command Deployment**: Ready-to-use `install.sh` for Ubuntu/Linux environments using Systemd.

## 🚀 Quick Setup (Ubuntu/Linux)

To deploy VoltPulse NOC on your server:

1. **Clone the repository** to your server.
2. **Run the installer** with sudo:
   ```bash
   sudo bash install.sh
   ```
3. **Access the dashboard**:
   - Web UI: `http://your-server-ip:3000`
   - API Docs: `http://your-server-ip:8100/docs`

## 🛠 Tech Stack

- **Frontend**: Next.js (React) + Vanilla CSS (VoltAgent Design)
- **Backend**: Python (FastAPI) + Netmiko (Network Automation)
- **Database**: SQLite with WAL mode for high concurrency
- **Communication**: Pure SSH (Secure Shell)

### Prerequisites (Handled by install.sh)
- Node.js 20+
- Python 3.10+
- SQLite3

## 📂 Project Structure

```text
├── app/             # Next.js Frontend (VoltPulse Design)
├── backend/         # Python FastAPI SSH Service
│   ├── parsers/     # Logic to translate CLI output to data
│   ├── main.py      # Core API logic
│   └── database.py  # SQLite persistence layer
├── components/      # Reusable React UI components
├── install.sh       # Production deployment script
└── README.md
```

## 🔐 Security

- Sensitive credentials (SSH passwords) are stored in your local SQLite database.
- Backend services are configured to run as a non-root system user (`noc`) when deployed via `install.sh`.
- Masked credentials in API responses.

## 📝 License

Proprietary / Internal NOC Use.
