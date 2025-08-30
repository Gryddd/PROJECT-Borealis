<!-- Centering the logo -->
<p align="center">
  <img src="https://raw.githubusercontent.com/Gryddd/PROJECT-Borealis/main/logo.png" alt="Borealis Project Logo" width="150">
</p>

<h1 align="center">Project: Borealis - A Full-Stack E-Commerce Platform</h1>

<!-- Badges -->
<p align="center">
  <img src="https://img.shields.io/github/repo-size/Gryddd/PROJECT-Borealis?style=for-the-badge" alt="Repo Size">
  <img src="https://img.shields.io/github/last-commit/Gryddd/PROJECT-Borealis?style=for-the-badge" alt="Last Commit">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="License">
</p>

---

Borealis is a comprehensive **MERN stack e-commerce project** designed to demonstrate a wide range of web development skills. It functions as a complete platform, featuring user authentication, a dynamic product catalog, guest/user shopping carts, a full checkout process powered by Stripe, and a complete admin dashboard for site management.

---

## ✨ Key Features

-   **👤 User Authentication:** Secure login/registration with JWT and password hashing (bcrypt).
-   **🔑 Password Reset:** "Forgot Password" functionality using the SendGrid API for secure email delivery.
-   **🛒 Dynamic Shopping Cart:** Full cart functionality for both guests (using LocalStorage) and registered users (stored in the database).
-   **🔄 Guest Cart Merging:** Guest carts are automatically and seamlessly merged with the user's account upon login.
-   **💳 Secure Checkout:** Full Stripe integration for handling test payments in a secure, PCI-compliant environment.
-   **🛠️ Admin Dashboard:** Role-based access to a private dashboard for managing products (CRUD), viewing all orders, updating order statuses, and viewing all registered users.
-   **🔍 Live Search:** Instant search functionality with a debounced API call for a smooth user experience.
-   **📱 Responsive Design:** A mobile-first approach ensures the application is fully functional and visually appealing on all devices.

---

## 🛠️ Technology Stack

| Category         | Technology                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**     | `HTML5`, `CSS3`, `Vanilla JavaScript (ES6+)`                                                                                            |
| **Backend**      | `Node.js`, `Express.js`                                                                                                                 |
| **Database**     | `MongoDB` (with `Mongoose` ODM), hosted on `MongoDB Atlas`                                                                              |
| **Authentication** | `JSON Web Tokens (JWT)`, `bcrypt.js`                                                                                                    |
| **Payments**     | `Stripe API`                                                                                                                            |
| **Email Service**| `SendGrid API`                                                                                                                          |
| **Deployment**   | `Vercel`                                                                                                                                |

---

## 🚀 Getting Started Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

You must have `Node.js` and `npm` installed on your machine.

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/Gryddd/PROJECT-Borealis.git
    ```
2.  Navigate to the project directory and install NPM packages:
    ```sh
    cd PROJECT-Borealis
    npm install
    ```
3.  Create a `.env` file in the root directory and add the required environment variables. You can use `.env.example` as a template:
    ```    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    STRIPE_SECRET_KEY=your_stripe_secret_key
    SENDGRID_API_KEY=your_sendgrid_api_key
    FROM_EMAIL=your_verified_sendgrid_email
    ```
4.  Start the server:
    ```sh
    node server.js
    ```
5.  Open `frontend/index.html` in your browser or with a live server extension.
