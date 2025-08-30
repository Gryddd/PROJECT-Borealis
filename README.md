# Project: Borealis - A Full-Stack E-Commerce Platform


Borealis is a comprehensive MERN stack e-commerce project designed to demonstrate a wide range of web development skills. It functions as a complete platform, featuring user authentication, a product catalog, guest/user shopping carts, a full checkout process with Stripe, and a complete admin dashboard.

---

## Key Features

- **User Authentication:** Secure login/registration with JWT and password hashing.
- **Password Reset:** "Forgot Password" functionality using SendGrid for email.
- **Shopping Cart:** Full cart functionality for both guests (LocalStorage) and users.
- **Guest Cart Merging:** Guest carts are automatically merged upon login.
- **Secure Checkout:** Full Stripe integration for handling test payments.
- **Admin Dashboard:** Role-based access to manage products, orders, and users.

---

## Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with MongoDB Atlas)
- **Authentication:** JSON Web Tokens (JWT), bcrypt
- **Payments:** Stripe API
- **Email:** SendGrid API

---

## Getting Started Locally

1.  Clone the repository: `git clone https://github.com/Gryddd/PROJECT-Borealis.git`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and add the required environment variables.
4.  Start the server: `node server.js`
5.  Open `frontend/index.html` in your browser.
