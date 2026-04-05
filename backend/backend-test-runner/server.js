const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001; // Run on a different port than the main backend

app.use(cors());
app.use(bodyParser.json());

const TEMP_DIR = path.join(__dirname, 'temp');

async function createTempFile(directory, filename, content) {
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, filename);
  await fs.writeFile(filePath, content);
  return filePath;
}

function executeCommand(command, cwd, timeout = 10000) {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

// Placeholder for code execution logic
app.post('/run-tests', async (req, res) => {
  const { challengeId, submittedCode, vulnerableCodePath, testCodePath, exploitCodePath } = req.body;

  if (!challengeId || !submittedCode || !vulnerableCodePath || !testCodePath || !exploitCodePath) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }

  const CYBERRANGEX_BACKEND_URL = process.env.CYBERRANGEX_BACKEND_URL || 'http://localhost:5000';

  console.log(`Received test request for challenge ${challengeId}`);
  console.log(`Submitted Code (first 100 chars): ${submittedCode.substring(0, 100)}...`);

  const sessionId = uuidv4();
  const sessionDir = path.join(TEMP_DIR, sessionId);

  let success = false;
  let message = "";
  let details = {};

  try {
    // 1. Create temporary files for the submitted code and original challenge files
    await fs.mkdir(sessionDir, { recursive: true });

    const submittedCodePath = await createTempFile(sessionDir, 'user-code.js', submittedCode);

    // Fetch actual content for vulnerableCodePath, testCodePath, exploitCodePath from the main backend
    const fetchCode = async (codePath) => {
      try {
        const response = await axios.get(`${CYBERRANGEX_BACKEND_URL}/code?path=${codePath}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching code for ${codePath}:`, error.message);
        throw new Error(`Failed to fetch code for ${codePath}`);
      }
    };

    const vulnerableCodeContent = await fetchCode(vulnerableCodePath);
    const testCodeContent = await fetchCode(testCodePath);
    const exploitCodeContent = await fetchCode(exploitCodePath);

    await createTempFile(sessionDir, 'vulnerable-code.js', vulnerableCodeContent);
    await createTempFile(sessionDir, 'test-code.js', testCodeContent);
    await createTempFile(sessionDir, 'exploit-code.js', exploitCodeContent);

    // 2. Execute tests
    let exploitVulnerableResult, exploitFixedResult, testFunctionalityResult;

    // Test 1: Confirm exploit works on vulnerable code
    exploitVulnerableResult = await executeCommand(`node exploit-code.js "${vulnerableCodeContent}"`, sessionDir);
    const exploitVulnerableSuccess = exploitVulnerableResult.stdout.includes("Exploit successful");

    if (!exploitVulnerableSuccess) {
      message = "Exploit did not work on the vulnerable code. Check exploit script or vulnerable code.";
      success = false;
    } else {
      // Test 2: Check if exploit fails on user's submitted code
      exploitFixedResult = await executeCommand(`node exploit-code.js "${submittedCode}"`, sessionDir);
      const exploitFixedSuccess = exploitFixedResult.stdout.includes("Exploit successful");

      if (exploitFixedSuccess) {
        message = "Vulnerability still present in your code. The exploit still works.";
        success = false;
      } else {
        // Test 3: Check if basic functionality is preserved
        testFunctionalityResult = await executeCommand(`node test-code.js "${submittedCode}"`, sessionDir);
        const functionalityPreserved = testFunctionalityResult.stdout.includes("Functionality test passed: true");

        if (functionalityPreserved) {
          success = true;
          message = "Vulnerability fixed and functionality preserved!";
        } else {
          success = false;
          message = "Vulnerability fixed, but functionality was broken.";
        }
      }
    }
  } catch (error) {
    console.error(`Error during test run for session ${sessionId}:`, error);
    success = false;
    message = 'An error occurred during testing.';
    details = { error: error.message };
  } finally {
    // 3. Clean up the temporary environment
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error(`Error cleaning up session directory ${sessionDir}:`, cleanupError);
    }
  }

  if (success) {
    return res.json({ success, message, details });
  } else {
    return res.status(400).json({ success, message, details });
  }
});

app.get('/status', (req, res) => {
  res.json({ status: 'Test runner is running', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Challenge Test Runner Microservice running on port ${PORT}`);
});