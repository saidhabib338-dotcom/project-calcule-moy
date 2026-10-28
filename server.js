const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const { handleRestRoutes } = require('./src/routes/restApi');
const { WSDL_XML, handleSoapRequest } = require('./src/services/soapService');
const { OPENAPI_SPEC, getSwaggerHtml } = require('./src/docs/swaggerDoc');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file doesn't exist, fallback to index.html for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // 1. SOAP Web Service Endpoints
  if (pathname === '/soap' || pathname === '/soap/') {
    // WSDL contract request (?wsdl)
    if (query.wsdl !== undefined || req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(WSDL_XML);
      return;
    }

    // POST SOAP Action Envelope
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const soapResponse = handleSoapRequest(body, req.url);
        res.writeHead(200, {
          'Content-Type': 'text/xml; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(soapResponse);
      });
      return;
    }
  }

  // 2. Swagger / OpenAPI Documentation
  if (pathname === '/api-docs/openapi.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(OPENAPI_SPEC, null, 2));
    return;
  }

  if (pathname === '/api-docs' || pathname === '/api-docs/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getSwaggerHtml());
    return;
  }

  // 3. REST API Routes
  if (pathname.startsWith('/api/v1/')) {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      let body = null;
      if (bodyData) {
        try {
          body = JSON.parse(bodyData);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'JSON Body invalide' }));
          return;
        }
      }
      handleRestRoutes(req, res, pathname, query, body);
    });
    return;
  }

  // 4. Static frontend files
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 PLATEFORME SCOLARITÉ LMD (Sujet 2)`);
  console.log(`🚀 Serveur actif sur : http://localhost:${PORT}`);
  console.log(`🌐 Application Web   : http://localhost:${PORT}/`);
  console.log(`📚 Swagger OpenAPI  : http://localhost:${PORT}/api-docs`);
  console.log(`📜 Contrat WSDL SOAP: http://localhost:${PORT}/soap?wsdl`);
  console.log(`=======================================================`);
});
