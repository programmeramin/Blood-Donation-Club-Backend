import axios from "axios";
import dotenv from "dotenv";

dotenv.config();



// Brevo API দিয়ে generic email পাঠানোর function
export const sendEmail = async (to, subject, htmlContent) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing in environment variables!");
  }

  console.log(process.env.BREVO_API_KEY);


  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "Blood Donation Club", email: "no-reply@bloodclub.com" },
        to: [{ email: to }],
        subject,
        htmlContent,
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        timeout: 15000, // 15 seconds
      }
    );

    console.log("Response:", response.data);
    
    console.log("✅ Email sent successfully:", response.data);
    return true;
  } catch (error) {
    if (error.response) {
    // Server responded with a status code outside 2xx
    console.error("❌ Response error:", error.response.data);
  } else if (error.request) {
    // Request was made but no response received
    console.error("❌ No response received:", error.request);
  } else {
    // Other errors
    console.error("❌ Axios error:", error.message);
  }
  return false;
  }
};
