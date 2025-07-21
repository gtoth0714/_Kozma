const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI;
const publicDir = path.join(__dirname, 'public');

// MIME típusok
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

// Egyszerű XSS elleni tisztítás
function sanitize(str) {
  return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Validációs függvény
function validateBooking(booking) {
  const errors = [];

  if (!booking.name || booking.name.length < 2 || booking.name.length > 100) {
    errors.push('Invalid name');
  }

  if (!/^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(booking.email)) {
    errors.push('Invalid e-mail');
  }

  if (!/^\+?[0-9\s\-]{7,20}$/.test(booking.phone)) {
    errors.push('Invalid phone number');
  }

  if (!booking.advisor || booking.advisor.length < 2) {
    errors.push('Invalid advisor');
  }

  if (!booking.message || booking.message.length > 1000) {
    errors.push('Message is missing or too long');
  }

  if (!booking.startTime || !booking.endTime) {
    errors.push('Missing datetime');
  }

  return errors;
}

// MongoDB kliens létrehozása
MongoClient.connect(MONGO_URI)
  .then(client => {
    console.log('Successfully connected to MongoDB!');
    const db = client.db('idopontfoglalas');
    const foglalasokCollection = db.collection('foglalasok');

    // HTTP szerver
    const server = http.createServer((req, res) => {
      if (req.method === 'GET') {
        let safePath = req.url.split('?')[0];
        if (safePath === '/') safePath = '/index.html';
        let filePath = path.join(publicDir, path.normalize(safePath));

        if (!filePath.startsWith(publicDir)) {
          res.writeHead(403);
          res.end('Access denied');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end('File not found');
          } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
          }
        });

      } else if (req.method === 'GET' && req.url === '/api/foglalasok') {
        foglalasokCollection.find({}).toArray()
          .then(foglalasok => {
            const idopontok = foglalasok.map(f => ({
              title: 'Booked',
              startTime: f.startTime,
              endTime: f.endTime,
              rendering: 'background',
              color: 'gray'
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(idopontok));
          })
          .catch(err => {
            console.error('Error fetching bookings:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Adatbázis hiba' }));
          });

      } else if (req.method === 'POST' && req.url === '/api/foglalas') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const booking = JSON.parse(body);
            console.log('New appointment received:', booking);

            const errors = validateBooking(booking);
            if (errors.length > 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: errors.join(', ') }));
              return;
            }

            // XSS védelem
            booking.name = sanitize(booking.name);
            booking.email = sanitize(booking.email);
            booking.phone = sanitize(booking.phone);
            booking.advisor = sanitize(booking.advisor);
            booking.message = sanitize(booking.message);

            foglalasokCollection.insertOne(booking)
              .then(() => {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                  }
                });

                const mailOptions = {
                  from: process.env.EMAIL_USER,
                  to: booking.email,
                  subject: 'Időpontfoglalás megerősítése',
                  text: `
Kedves ${booking.name}!

Köszönjük, hogy időpontot foglalt nálunk. Felkészült tanácsadónk várni fogja Önt
irodánkban a megbeszélt időpontban.

Foglalási adatok:
- Tanácsadó: ${booking.advisor}
- Időpont: ${booking.startTime}
- Telefonszám: ${booking.phone}

Üzenet: ${booking.message}

Üdvözlettel,
Kozma Consulting
                  `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error('Hiba az email küldésekor:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Nem sikerült az email küldése' }));
                    return;
                  }

                  console.log('Email elküldve: ' + info.response);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'ok' }));
                });
              })
              .catch(err => {
                console.error('Error saving to database:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Nem sikerült menteni az adatot' }));
              });

          } catch (err) {
            console.error('Error processing data:', err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Érvénytelen adat' }));
          }
        });

      } else {
        res.writeHead(405);
        res.end('Method not supported');
      }
    });

    server.listen(PORT, () => {
      console.log(`Server running: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });
