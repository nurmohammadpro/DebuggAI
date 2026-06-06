/**
 * Web Builder Template Generator Edge Function
 *
 * Generates complete project structures for different tech stacks.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRequest {
  stack: 'mern' | 'mean' | 'laravel' | 'django' | 'flask' | 'rails' | 'go';
  features: string[];
  projectName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request
    const { stack, features, projectName }: TemplateRequest = await req.json();

    if (!stack || !features || !projectName) {
      return new Response(
        JSON.stringify({ error: 'Stack, features, and project name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate template based on stack
    const template = generateTemplate(stack, features, projectName);

    // 4. Return template
    return new Response(
      JSON.stringify({
        stack,
        projectName,
        template,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Template generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate template based on stack and features
 */
function generateTemplate(stack: string, features: string[], projectName: string): Record<string, string> {
  const hasAuth = features.includes('auth');
  const hasDatabase = features.includes('database');
  const hasAPI = features.includes('api');
  const hasUpload = features.includes('upload');

  switch (stack) {
    case 'mern':
      return generateMERN(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    case 'mean':
      return generateMEAN(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    case 'laravel':
      return generateLaravel(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    case 'django':
      return generateDjango(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    case 'flask':
      return generateFlask(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    case 'rails':
      return generateRails(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    case 'go':
      return generateGo(projectName, { hasAuth, hasDatabase, hasAPI, hasUpload });
    default:
      return {};
  }
}

/**
 * MERN Stack Generator
 */
function generateMERN(projectName: string, options: Record<string, boolean>): Record<string, string> {
  const { hasAuth, hasDatabase, hasAPI, hasUpload } = options;

  const files: Record<string, string> = {};

  // package.json
  files['package.json'] = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "MERN Stack Application",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "nodemon server/index.js",
    "client": "cd client && npm start",
    "build": "cd client && npm run build",
    "install": "cd client && npm install && cd .. && npm install"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "concurrently": "^8.2.2"
  }
}`;

  // Server entry point
  files['server/index.js'] = `const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
${hasDatabase ? `mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));` : ''}

${hasAuth ? `// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);` : ''}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`;

  // User model
  if (hasAuth || hasDatabase) {
    files['server/models/User.js'] = `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
`;
  }

  // Auth routes
  if (hasAuth) {
    files['server/routes/auth.js'] = `const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({ username, email, password: hashedPassword });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
`;
  }

  // API routes
  if (hasAPI) {
    files['server/routes/api.js'] = `const express = require('express');
const router = express.Router();
${hasDatabase ? `const Item = require('../models/Item');` : ''}

// Example API endpoints
router.get('/items', async (req, res) => {
  ${hasDatabase ? `const items = await Item.find();
  res.json(items);` : `res.json({ message: 'Items endpoint' });`}
});

router.post('/items', async (req, res) => {
  ${hasDatabase ? `const item = await Item.create(req.body);
  res.status(201).json(item);` : `res.json({ message: 'Item created' });`}
});

module.exports = router;
`;
  }

  // React App entry
  files['client/public/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${projectName}</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

  files['client/src/App.js'] = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
${hasAuth ? `import Login from './pages/Login';` : ''}
${hasAPI ? `import Dashboard from './pages/Dashboard';` : ''}
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div><h1>Welcome to ${projectName}</h1></div>} />
        ${hasAuth ? `<Route path="/login" element={<Login />} />` : ''}
        ${hasAPI ? `<Route path="/dashboard" element={<Dashboard />} />` : ''}
      </Routes>
    </Router>
  );
}

export default App;
`;

  files['client/src/App.css'] = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}`;

  if (hasAuth) {
    files['client/src/pages/Login.js'] = `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
`;
  }

  if (hasAPI) {
    files['client/src/pages/Dashboard.js'] = `import React, { useEffect, useState } from 'react';

function Dashboard() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <ul>
        {items.map(item => (
          <li key={item._id}>{item.name || item}</li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
`;
  }

  // .env.example
  files['.env.example'] = `MONGODB_URI=mongodb://localhost:27017/${projectName}
JWT_SECRET=your_jwt_secret
PORT=5000
`;

  // README
  files['README.md'] = `# ${projectName}

MERN Stack Application

## Tech Stack
- MongoDB
- Express.js
- React
- Node.js

## Features
${hasAuth ? '- Authentication' : ''}
${hasDatabase ? '- Database with Mongoose' : ''}
${hasAPI ? '- REST API' : ''}
${hasUpload ? '- File Upload' : ''}

## Installation

1. Install dependencies:
   npm run install

2. Set up environment variables:
   cp .env.example .env

3. Start the development server:
   npm run dev

## Project Structure
\`\`\`
${projectName}/
├── client/          # React frontend
├── server/          # Express backend
├── package.json
└── README.md
\`\`\`
`;

  return files;
}
