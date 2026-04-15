# VoltPulse NOC - Project Context History

This document serves as a _"Context Loader"_ designed specifically to be ingested by subsequent AI assistants (such as Claude, GPT, or Devin) to rapidly adapt and continue the codebase development of this project without losing historical context.

## 1. Project Objective (Primary Goal)

Building an enterprise NOC (Network Operations Center) Dashboard that monitors and manages multi-vendor network devices (routers and access points) via SSH. Supported brands: **MikroTik, Ruijie, Ruckus, UniFi**. The dashboard provides real-time device status monitoring (Up/Down, CPU, RAM, Uptime) and the ability to restart devices remotely.

## 2. System Architecture & Tech Stack

**Two-service architecture:**

- **Frontend:** Next.js (React, App Router) running on port 3000.
  - UI follows the **VoltAgent Design System** (`voltagent_design.md`) — dark terminal aesthetic with Abyss Black canvas (`#050507`), Emerald Signal Green (`#00d992`) accents, Carbon Surface (`#101010`) cards, Warm Charcoal (`#3d3a39`) borders.
  - Pure Vanilla CSS (no Tailwind or UI libraries).
  - Font stack: Inter (body), system-ui (headings), SFMono-Regular (code/monospace).

- **Backend:** Python FastAPI running on port 8100.
  - SSH connections handled by `netmiko` (multi-vendor network automation library).
  - Database: SQLite (`backend/noc.db`), WAL mode.
  - Each vendor has its own CLI output parser module.

**Communication flow:**
```
Browser → Next.js (port 3000) → fetch() → FastAPI (port 8100) → SSH → Network Device
```

## 3. Current Directory Structure

```
c:\Project\noc\
├── backend/                    # Python FastAPI SSH Service
│   ├── main.py                 # FastAPI app with CORS, all API routes
│   ├── database.py             # SQLite schema (devices, metrics_log, command_log) + CRUD
│   ├── ssh_manager.py          # netmiko-based SSH connection handler
│   ├── parsers/                # Per-vendor CLI output parsers
│   │   ├── __init__.py         # Standard metrics output format docs
│   │   ├── mikrotik.py         # /system resource print parser
│   │   ├── ruijie.py           # show version/cpu/memory parser
│   │   ├── ruckus.py           # show sysinfo parser
│   │   └── unifi.py            # Linux commands (proc/uptime, top, free) parser
│   └── requirements.txt        # fastapi, uvicorn, netmiko, pydantic
│
├── app/                        # Next.js App Router
│   ├── layout.js               # Root layout with metadata
│   ├── page.js                 # Dashboard page (device grid, stats, poll all)
│   ├── globals.css             # Full VoltAgent Design System CSS
│   └── devices/
│       └── page.js             # Device management table (CRUD)
│
├── components/                 # React components
│   ├── Sidebar.js              # Navigation sidebar with glow logo
│   ├── DeviceCard.js           # Device card with metrics, status, actions
│   ├── StatusBadge.js          # Colored status pill (online/offline/etc)
│   ├── MetricBar.js            # Animated CPU/RAM progress bars
│   ├── AddDeviceModal.js       # Add/edit device form modal
│   └── GlowLoader.js          # Loading animation
│
├── PROJECT_HISTORY.md
└── voltagent_design.md         # Design system reference
```

## 4. Key Mechanisms & Core Workflows

### Device Polling Flow
1. User clicks "Poll" (single) or "Poll All" on dashboard.
2. Next.js frontend calls FastAPI `GET /poll/{id}` or `GET /poll`.
3. FastAPI's `ssh_manager.py` builds netmiko connection params based on device brand.
4. Connects via SSH, executes vendor-specific commands (e.g., `/system resource print` for MikroTik).
5. Raw CLI output is passed to the corresponding parser module (e.g., `parsers/mikrotik.py`).
6. Parser returns standardized metrics dict: `{ uptime, cpu_percent, ram_percent, extra }`.
7. Metrics are saved to `devices` table (current state) and `metrics_log` table (history).
8. Frontend auto-refreshes device list every 15 seconds.

### Restart Flow
1. User clicks "Restart" → confirmation modal appears.
2. On confirm, frontend POSTs to `FastAPI /restart/{id}`.
3. `ssh_manager.py` connects and sends vendor-specific restart command (e.g., `/system reboot\ny` for MikroTik).
4. Result is logged to `command_log` table; device status set to "restarting".

### Vendor-to-Netmiko Mapping
| Brand    | netmiko device_type    | Poll Commands                        | Restart Command       |
|----------|------------------------|--------------------------------------|-----------------------|
| mikrotik | mikrotik_routeros      | /system resource print               | /system reboot\ny     |
| ruijie   | ruijie_os              | show version, show cpu, show memory  | reload\ny             |
| ruckus   | ruckus_fastiron        | show sysinfo                         | reboot\ny             |
| unifi    | linux                  | cat /proc/uptime, top, free -m       | reboot                |

## 5. Human-Centric Coding Standards

code like real human not like AI!

- Keep variables descriptive.
- Preserve existing comments unless obsolete.
- Keep the UI dynamic, modern, and beautiful — following `voltagent_design.md`.
- All CSS uses Vanilla CSS custom properties, no utility frameworks.
- Python code uses clean function-based architecture, no over-engineering.

---

## 6. Chronological Development History

### Milestone 1: Initial Setup & Core Architecture

**Date**: 2026-04-15
**Changes**:

- Initialized Next.js project with App Router (JavaScript, no Tailwind).
- Created Python FastAPI backend with SQLite database.
- Built SSH manager using netmiko for multi-vendor device connections.
- Implemented four vendor parsers: MikroTik, Ruijie, Ruckus, UniFi.
- Designed full VoltAgent Design System CSS (Abyss Black + Emerald Green terminal aesthetic).
- Built Dashboard page with device cards, stats bar, poll all, and restart functionality.
- Built Device Management page with table view and CRUD operations.
- Created reusable components: Sidebar, DeviceCard, StatusBadge, MetricBar, AddDeviceModal, GlowLoader.
- Added `install.sh` for one-command Ubuntu deployment (systemd services, venv, firewall).

### Milestone 2: Authentication System

**Date**: 2026-04-15
**Changes**:

- Added `users` table to SQLite with salted SHA-256 password hashing.
- Default admin account auto-created on first run (`admin` / `admin`).
- JWT-based authentication with 24-hour expiry (PyJWT).
- Backend endpoints: `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`.
- Frontend login page at `/login` with VoltAgent dark terminal aesthetic (grid background, glow icon, animated card).
- `AuthContext` provider handles login/logout, token persistence in localStorage, auto-redirect to `/login` if unauthenticated.
- `Providers.js` client wrapper bridges server-component layout with client-side AuthProvider.
- Sidebar updated with user display name and logout button.
