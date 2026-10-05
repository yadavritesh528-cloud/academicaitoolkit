const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static assets from root directory
app.use(express.static(__dirname));

// Handle clean routing for HTML files
app.get('*', (req, res) => {
  // If requesting a specific file with an extension that wasn't found in express.static
  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }

  // Check if requesting admin route
  const cleanPath = req.path.replace(/^\/+|\/+$/g, '');
  if (cleanPath === 'admin' || cleanPath.startsWith('admin/')) {
    const adminFile = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminFile)) {
      return res.sendFile(adminFile);
    }
  }

  // Check if a corresponding .html file exists (e.g. /contact -> contact.html)
  if (cleanPath) {
    const candidateFile = path.join(__dirname, `${cleanPath}.html`);
    if (fs.existsSync(candidateFile)) {
      return res.sendFile(candidateFile);
    }
  }

  // Fallback to index.html
  return res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
