# Faisal Mobile's Committee Management System

A comprehensive bilingual (English/Urdu) React web application for managing rotating savings committees (committees). Features include member management, payment and installment tracking, automated payouts, PDF receipt/report generation, financial dashboards with charts, CNIC image upload, notifications, backup/restore, and secure PIN-based authentication.

## 🚀 Features

- **Committee Management**: Create and manage rotating savings committees
- **Member Management**: Add, edit, and track committee members
- **Installment Management**: Manage buyer installments, payments, and schedules
- **CNIC Image Upload**: Upload and crop CNIC images for installment buyers
- **Payment Tracking**: Record and monitor installment payments
- **Automated Payouts**: Manage committee payouts with turn-based system
- **PDF Generation**: Generate receipts and reports in PDF format
- **Advanced Reporting**: Download both overall and current month installment reports with dynamic month-based filenames and logic that excludes closed accounts
- **Financial Dashboard**: Visual charts and analytics for financial overview
- **Bilingual Support**: Full English and Urdu language support, switchable at any time
- **Notifications**: Real-time alerts for overdue payments, upcoming payouts, and more
- **Backup & Restore**: Export and import all app data for safety
- **Secure Authentication**: PIN-based app locking system
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **PDF Generation**: jsPDF, html2canvas
- **Email Service**: EmailJS
- **Database**: Firebase Firestore
- **Authentication**: Custom PIN-based system

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Firebase project setup

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd faisal-mobiles
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
   VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📱 Usage

1. **Initial Setup**: Set up your app PIN and user profile
2. **Create Committees**: Add new rotating savings committees
3. **Add Members**: Register committee members with their details
4. **Track Payments & Installments**: Record installment payments for each member or buyer
5. **Upload CNIC Images**: Attach CNIC images to installment buyers
6. **Generate Reports**: Create PDF receipts and financial reports
   - In Installment Management, use the **Download Report** dropdown to choose:
     - **Overall Report**: Full summary of all buyers/installments
     - **[Current Month] Report**: Only includes open accounts and payments for the selected month, with the month name in the filename and heading
7. **Monitor Dashboard**: View financial overview and analytics
8. **Switch Language**: Instantly switch between English and Urdu
9. **Backup & Restore**: Export/import all app data for safety

## 🔧 Configuration

### Committee Types
- **Monthly**: Monthly installments
- **Weekly**: Weekly installments  
- **Daily**: Daily installments

### Payout Methods
- **Manual**: Manual payout management
- **Automatic**: Automated payout system

### Authentication
- **PIN-based**: Secure 4-6 digit PIN

## 📄 License

This project is private and proprietary to Faisal Mobile's Shop.

## 🤝 Contributing

This is a private project. For support or questions, please contact the development team.

## 📞 Support

For technical support or questions about the committee management system, please reach out to the development team.

## 📊 Installment Management Reporting

- **Download Report Dropdown**: In the Installment Management screen, click the **Download Report** button to open a dropdown with two options:
  - **Overall Report**: Generates a PDF with all buyers/installments, their total/advance/collected/remaining amounts, and remaining installments. Closed and open accounts are included.
  - **[Current Month] Report**: Generates a PDF for the current month only. Only open accounts are included. The report shows monthly installment, collected/remaining for the month, and sets remaining installments to 0 if the account is paid for the month. The filename and heading use the current month's name (e.g., `June_2024_Installment_Report.pdf`).

- **Totals**: Both reports show Total Collected, Total Remaining, and Total Amount after the table.
- **Excludes Closed Accounts**: The current month report excludes any account with status 'Closed'.
- **Dynamic Filenames**: The current month report filename uses the month name for clarity.

---

**Built with ❤️ for Faisal Mobile's Shop**
