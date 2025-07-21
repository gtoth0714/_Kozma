# Demo Website for Hungarian Client

## Project Purpose

This is a demo version of a website developed for a Hungarian client. The frontend is fully functional and can be viewed and tested. However, to try the booking functionality, you need to configure your own environment variables. Once these are set up correctly, the booking feature can be tested on your own server.

To avoid fake bookings, the booking functionality has been deliberately disabled in this public demo version in agreement with the client.

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/gtoth0714/_Kozma.git
cd sajat-weboldal

2. Set up environment variables:
Create a .env file in the root directory with the required configuration keys. Example:

DATABASE_URL=your_database_url_here
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_pass

3. Install dependencies:

Depending on the technology used run the appropriate command:

npm install
npm install mongoose
npm install mongodb
npm install nodemailer
npm install dotenv

4. Run the project locally:

node server.js

5. Testing booking functionally

## Important Notes
- The frontend is fully accessible and can be previewed without any backend.

- The backend code and environment variables are not included in this public repository for security reasons.

- For any questions about environment variables or backend setup, please contact the project owner.