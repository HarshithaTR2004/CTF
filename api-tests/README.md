# API Tests (Thunder Client / Postman)

Use these collections to test the CyberRangeX API.

## Import

- **Thunder Client (VS Code):** Collections → Menu → **Import** → choose `CyberRangeX-API.postman_collection.json`
- **Postman:** Import → Upload Files → same file

## Base URL

- Local backend: `http://localhost:5000/api`
- Docker (nginx proxy): `http://localhost/api` or set `baseUrl` to `/api` if same origin

## Admin Login

1. Seed the admin user (once):  
   `docker compose exec backend npm run seed:admin`  
   or locally: `cd backend && npm run seed:admin`

2. **Admin Login** request:  
   - POST `{{baseUrl}}/auth/admin/login`  
   - Body: `{ "email": "admin@cyberrangex.com", "password": "admin123" }`

3. Copy the `token` from the response into your environment variable `token` (or use Thunder Client/Postman env), then call **Admin → Get Users** with `x-auth-token: {{token}}`.

## Requests

- **Auth:** Register, Login, **Admin Login**
- **Challenges:** Get Challenges
- **Profile:** Get Profile (requires `token`)
- **Admin:** Get Users (requires admin `token`)
