import emailjs from '@emailjs/browser';

// EmailJS credentials
const SERVICE_ID = 'service_fa95lw9';
const TEMPLATE_ID = 'template_zj5408l';
const PUBLIC_KEY = 'ZGuAwBOQPE1ug-v0p';

// Initialize EmailJS
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

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );

    return response;
  } catch (error) {
    console.error('Failed to send login notification');
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}; 