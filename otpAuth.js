import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "./firebaseConfig"; // Import Firebase config

let recaptchaVerifier; // Store recaptcha instance

// Function to initialize Recaptcha
const setupRecaptcha = () => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  }
};

// Function to send OTP
export const sendOTP = async (phoneNumber) => {
  setupRecaptcha();
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    return true; // OTP sent successfully
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
};

// Function to verify OTP
export const verifyOTP = async (otp) => {
  try {
    const result = await window.confirmationResult.confirm(otp);
    return result.user; // User verified
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return null;
  }
};

// Function to resend OTP
export const resendOTP = async (phoneNumber) => {
  return sendOTP(phoneNumber); // Calls sendOTP again
};
