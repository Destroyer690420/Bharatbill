# Bharatbill

A modern, comprehensive billing, invoicing, and business management web application. Built with a focus on simplicity, ease of use, and professional invoice generation, Bharatbill helps small businesses and freelancers streamline their day-to-day operations.

## 🚀 Features

*   **Dashboard & Analytics**: Get a bird's-eye view of your business performance, total sales, outstanding balances, and recent activities via interactive charts.
*   **Customer & Party Management**: Maintain a centralized directory for all your clients, vendors, and business partners.
*   **Product & Inventory Hub**: Easily add, edit, and organize the items or services you sell for quick selection during billing.
*   **Professional Invoicing**: Create beautiful, customized invoices with calculated taxes and discounts. Easily print or export them as a PDF.
*   **Quotations/Estimates**: Generate quotations for prospective deals and easily share them.
*   **Payment Tracking**: Record incoming and outgoing payments against specific invoices and parties.
*   **Detailed Party Ledgers**: View comprehensive transaction histories for individual parties to monitor debits, credits, and closing balances easily.
*   **Business Settings**: Customize your business profile, adjust tax settings, update themes, and even upload digital signatures to personalize invoices.
*   **Secure Authentication**: Fully integrated Firebase Authentication ensuring that your business data remains private and secure.

## 🛠️ Tech Stack

*   **Frontend Framework**: React (v19) powered by Vite for lightning-fast development.
*   **Routing**: React Router DOM (v7) for seamless single-page application navigation.
*   **Styling**: Tailwind CSS integrated with Radix UI components for a modern, accessible, and responsive visual design.
*   **Forms & Data Validation**: React Hook Form paired with Zod to enforce robust and reliable data entry.
*   **Data Visualization**: Recharts for intuitive analytics and dashboard charts.
*   **Backend & Database**: Firebase (Auth and Firestore) provides real-time data synchronization and persistent storage.
*   **Document Export**: `html2pdf.js` for robust, client-side PDF generation.

## ⚙️ Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn
*   A Firebase project with Authentication and Firestore enabled.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/bharat-bill.git
    cd bharat-bill
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Firebase:**
    Open `src/lib/firebase.js` and update the `firebaseConfig` object with your own credentials obtained from the Firebase Console:
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```
    *(Note: It is highly advised to extract these into an `.env` file for production usage.)*

4.  **Start the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will be accessible at `http://localhost:5173`.

## 📖 How to Use

1.  **Authentication & Onboarding**: Launch the app and sign up or log in. Complete the onboarding wizard to establish your core business persona.
2.  **Manage Data Master**: Head over to the **Products** and **Parties** sections to build your inventory and client base respectively.
3.  **Generate Invoices**: Navigate to **Invoices** -> **New Invoice**. Select a billing party, add products, adjust quantities or discounts, and hit save to instantly record the sale.
4.  **Record Payments**: Go to the **Payments** tab to record cash, bank transfers, or digital payments allocated to a customer's specific unpaid invoice.
5.  **View Ledgers**: Need to send a statement? Open a Party's profile and go to their **Ledger** view to automatically see their closing balance and transaction logs.
6.  **Exporting**: When an invoice is ready, view its details and click **Print** to export a formatted PDF perfectly tailored for sharing with clients.

## 📦 Build for Production

To create an optimized production build, run:

```bash
npm run build
```

This will output the finalized static assets to the `dist` folder, ready to be deployed to platforms like Vercel, Netlify, or Firebase Hosting.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check out the issues page if you want to contribute.

## 📄 License

This project is licensed under the MIT License.
