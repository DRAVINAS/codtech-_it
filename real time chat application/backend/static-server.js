const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3000;
const frontendDir = path.join(__dirname, '../frontend');

const server = http.createServer((req, res) => {
  try {
    let safeSuffix = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(frontendDir, safeSuffix);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if(error.code == 'ENOENT') {
          res.writeHead(404);
          res.end('404 Not Found');
        }
        else {
          res.writeHead(500);
          res.end('Server Error: '+error.code);
        }
      }
      else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  } catch (err) {
    res.writeHead(500);
    res.end('Server Error: ' + err.message);
  }
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
});
