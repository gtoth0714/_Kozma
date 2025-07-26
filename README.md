# Demo Website for Hungarian Client

## Project Purpose

This is a demo version of a website developed for a Hungarian client. The frontend is fully functional and can be viewed and tested. However, to try the booking functionality, you need to configure your own environment variables. Once these are set up correctly, the booking feature can be tested on your own server.

To avoid fake bookings, the booking functionality has been deliberately disabled in this public demo version in agreement with the client.

## Installation

### 1. Clone the repository:

git clone https://github.com/gtoth0714/_Kozma.git
cd _Kozma

### 2. Set up environment variables:
Create a .env file in the root directory with the required configuration keys. Example:

MONGO_URI=your_database_url_here
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_pass

### 3. Install dependencies:
Run the following commands:

npm install
npm install mongoose
npm install mongodb
npm install nodemailer
npm install dotenv

### 4. Run the project locally:
node server.js

### 5. Testing booking functionality:
Note: The booking functionality is disabled in this public demo to prevent fake bookings. To test it fully, ensure your environment variables are configured and you run your own backend.

## Features:
- Contact form with email + message input
- Email sending via Nodemailer (Gmail)
- MongoDB database integration
- Weekly automatic data cleanup (GDPR compliant)
- Privacy policy acceptance stored with timestamp
- Basic XSS and input validation
- Easy to deploy to platforms like Render

## Privacy & GDPR Notice:
- The system stores only email + message, plus checkbox state + timestamp
- Data is stored for a maximum of 7 days, then automatically deleted
- Privacy policy consent is required before submission
- No personal data is included in this repository

## Public Demo Notice:
To avoid misuse:
- The booking functionality (email + DB) is disabled by default
- You are free to test locally using your own email/app password