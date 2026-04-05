# Starting the Backend Server

## Quick Start

1. **Install dependencies** (if not already done):
   ```powershell
   cd backend
   npm install
   ```

2. **Create `.env` file** (if it doesn't exist):
   Create a file named `.env` in the `backend` folder with:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/cyberrangex
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
   ```

3. **Make sure MongoDB is running**:
   - If MongoDB is installed locally, make sure the service is running
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:7`

4. **Start the server**:
   ```powershell
   npm run dev
   ```

   You should see:
   ```
   MongoDB Connected
   Backend running on port 5000
   ```

5. **Seed the database** (in a new terminal):
   ```powershell
   cd backend
   npm run seed
   ```

## Troubleshooting

### Error: Cannot find module 'cookie-parser'
- **Solution**: Run `npm install` in the backend folder

### Error: MongoDB connection failed
- **Solution**: 
  - Make sure MongoDB is running
  - Check the MONGO_URI in `.env` file
  - Try: `mongosh` to test MongoDB connection

### Error: Port 5000 already in use
- **Solution**: 
  - Change PORT in `.env` file to another port (e.g., 5001)
  - Or stop the process using port 5000

### Server starts but shows "MongoDB Error"
- **Solution**: 
  - Verify MongoDB is running: `mongosh` or check Docker container
  - Check MONGO_URI in `.env` matches your MongoDB setup

## Expected Output

When everything is working, you should see:
```
[nodemon] starting `node server.js`
MongoDB Connected
Backend running on port 5000
```

Then test it by visiting: `http://localhost:5000` - should show "CyberRangeX Backend is Running"

