# Asad Mobile's Shop Committee Management System

A comprehensive bilingual (English/Urdu) React web application for managing rotating savings committees (committees). Features include member management, payment tracking, automated payouts, PDF receipt generation, financial dashboards with charts, and secure PIN-based authentication.

## 🚀 Features

- **Committee Management**: Create and manage rotating savings committees
- **Member Management**: Add, edit, and track committee members
- **Payment Tracking**: Record and monitor installment payments
- **Automated Payouts**: Manage committee payouts with turn-based system
- **PDF Generation**: Generate receipts and reports in PDF format
- **Financial Dashboard**: Visual charts and analytics for financial overview
- **Bilingual Support**: Full English and Urdu language support
- **Secure Authentication**: PIN-based app locking system
- **AI Assistant**: Integrated Google Gemini AI for assistance
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **PDF Generation**: jsPDF, html2canvas
- **AI Integration**: Google Gemini API
- **Email Service**: EmailJS
- **Database**: Firebase Firestore
- **Authentication**: Custom PIN-based system

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Google Gemini API key
- Firebase project setup

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd asad-mobiles-shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
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
4. **Track Payments**: Record installment payments for each member
5. **Generate Reports**: Create PDF receipts and financial reports
6. **Monitor Dashboard**: View financial overview and analytics

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
- **Password-based**: Traditional password authentication

## 📄 License

This project is private and proprietary to Asad Mobile's Shop.

## 🤝 Contributing

This is a private project. For support or questions, please contact the development team.

## 📞 Support

For technical support or questions about the committee management system, please reach out to the development team.

---

**Built with ❤️ for Asad Mobile's Shop**
