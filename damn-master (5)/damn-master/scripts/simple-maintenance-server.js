const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const maintenanceFile = path.join(__dirname, 'maintenance.html');

// Read the maintenance HTML file once at startup
let maintenanceHTML;
try {
    maintenanceHTML = fs.readFileSync(maintenanceFile, 'utf8');
} catch (error) {
    console.error('Error reading maintenance.html:', error);
    maintenanceHTML = '<h1>Site under maintenance</h1><p>Please try again later.</p>';
}

const server = http.createServer((req, res) => {
    // Set headers
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    // Always serve the maintenance page regardless of the URL
    res.end(maintenanceHTML);
});

server.listen(PORT, () => {
    console.log(`🚧 Maintenance server running on port ${PORT}`);
    console.log(`📄 Serving maintenance page for all requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Maintenance server shutting down...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Maintenance server shutting down...');
    server.close(() => {
        process.exit(0);
    });
});