const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
require('dotenv').config();

const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI;
const publicDir = path.join(__dirname, 'public');

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

function sanitize(str) {
  return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function validateContact(data) {
  const errors = [];

  if (!data.email || !/^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(data.email)) {
    errors.push('Invalid e-mail');
  }

  if (!data.message || data.message.length > 1000) {
    errors.push('Message is missing or too long');
  }

  if (!data.privacyAccepted) {
    errors.push('You must accept the privacy policy');
  }

  return errors;
}

MongoClient.connect(MONGO_URI)
  .then(client => {
    console.log('✅ MongoDB connection successful');
    const db = client.db('idopontfoglalas');
    const contactsCollection = db.collection('contacts');

    // Heti egyszeri automatikus törlés (vasárnap 3:00-kor)
    cron.schedule('0 3 * * 0', async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await contactsCollection.deleteMany({ timestamp: { $lt: oneWeekAgo } });
      console.log(`🗑️ Weekly cleanup: deleted ${result.deletedCount} old contact(s).`);
    });

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

      } else if (req.method === 'POST' && req.url === '/api/contact') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            console.log('📨 New contact received:', data);

            const errors = validateContact(data);
            if (errors.length > 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: errors.join(', ') }));
              return;
            }

            const email = sanitize(data.email);
            const message = sanitize(data.message);
            const privacyAccepted = !!data.privacyAccepted; // boolean
            const privacyAcceptedAt = new Date();

            contactsCollection.insertOne({
              email,
              message,
              timestamp: new Date(),
              privacyAccepted,
              privacyAcceptedAt
            })
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
                to: [email, process.env.EMAIL_USER],
                subject: 'Thank you for contacting Kozma-Consulting',
                text: `Dear User,

Thank you for reaching out to us. We received the following message from you:

"${message}"

We will get back to you as soon as possible.

---

Please note: This message may contain personal data, which we use solely for processing your inquiry. 
You have the right to request the correction or deletion of your data at any time by contacting us at 
gtoth0714@gmail.com. Your data will be stored for no longer than 7 days.

Best regards,  
Kozma Consulting`
              };

              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.error('❌ Email sending failed:', error);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'error', message: 'Failed to send email' }));
                  return;
                }

                console.log('📧 Email sent: ' + info.response);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
              });
            })
            .catch(err => {
              console.error('❌ Database save error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: 'Failed to save data' }));
            });

          } catch (err) {
            console.error('❌ Invalid JSON:', err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Invalid data' }));
          }
        });

      } else {
        res.writeHead(405);
        res.end('Method not supported');
      }
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
  });
