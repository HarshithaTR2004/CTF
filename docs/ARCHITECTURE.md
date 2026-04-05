# CyberRangeX Architecture

## Containerization

**Challenges are not individually containerized.**

| Component | Containerized? | Notes |
|-----------|----------------|-------|
| **MongoDB** | Yes | `cyber-mongo` (mongo:7) |
| **Backend (Node/Express)** | Yes | `cyberrangex-backend`. Hosts the REST API and all 24 lab routes. |
| **Test runner** | Yes | `cyberrangex-test-runner` (optional, for code-based challenges). |
| **Nginx** | Yes | Serves frontend and proxies to backend. |
| **Each of the 24 labs** | No | They run as Express routers inside the single backend process. |

All labs are in `backend/labs/*.js` and are mounted at `/lab/<name>` (e.g. `/lab/xss-basic`, `/lab/sqli-basic`). They use in-memory state, local `exec`, `multer` uploads, or simple file reads. There are no per-challenge VMs or separate Docker services.

### How to run

From the **project root** (where `docker-compose.yml` is):

1. **Build frontend** (so nginx can serve it):  
   `cd frontend && npm install && npm run build && cd ..`
2. **Start core stack** (nginx, backend, cyber-mongo, test-runner):  
   `docker compose up -d --build`
3. **Optional – include lab VMs**:  
   `docker compose -f docker-compose.yml -f vms/docker-compose.vms.yml up -d --build`
4. **Seed DB**:  
   `docker compose exec backend npm run seed`  
   `docker compose exec backend npm run seed:admin`

Or run **`scripts\run-project.ps1`** (PowerShell) from the project root to build frontend and start the full stack (core + VMs).
