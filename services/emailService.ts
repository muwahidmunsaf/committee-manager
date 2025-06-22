import emailjs from '@emailjs/browser';

// EmailJS credentials
const SERVICE_ID = 'service_or17wts';
const TEMPLATE_ID = 'template_d1nlh35';
const PUBLIC_KEY = 'ZGuAwBOQPE1ug-v0p';

// Initialize EmailJS with proper configuration
emailjs.init(PUBLIC_KEY);

export const sendLoginNotification = async (
  ownerEmail: string,
  userName: string,
  loginTime: string,
  deviceInfo: string
) => {
  try {
    if (!ownerEmail) {
      throw new Error('Owner email is required');
    }

    const templateParams = {
      to_email: ownerEmail,
      user_name: userName || 'Unknown User',
      login_time: loginTime,
      device_info: deviceInfo || 'Unknown Device'
    };

    // Use the newer API format without passing PUBLIC_KEY as the last parameter
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Failed to send login notification:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}; 