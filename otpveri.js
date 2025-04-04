import { sendOTP, verifyOTP, resendOTP } from "./otpAuth.js";

document.getElementById("sendOTP").addEventListener("click", async () => {
    const phoneNumber = document.getElementById("phoneInput").value;
    if (!phoneNumber) {
        alert("Please enter a valid phone number.");
        return;
    }

    if (await sendOTP(phoneNumber)) {
        alert("OTP sent successfully!");
        document.getElementById("phoneSection").style.display = "none";
        document.getElementById("otpSection").style.display = "block";
        startResendTimer();
    } else {
        alert("Failed to send OTP. Please try again.");
    }
});

document.getElementById("verifyOTP").addEventListener("click", async () => {
    const otp = document.getElementById("otpInput").value;
    if (!otp) {
        alert("Please enter the OTP.");
        return;
    }

    const user = await verifyOTP(otp);
    if (user) {
        alert("OTP Verified! Login successful.");
    } else {
        alert("Invalid OTP. Please try again.");
    }
});

document.getElementById("resendOTP").addEventListener("click", async () => {
    const phoneNumber = document.getElementById("phoneInput").value;
    if (!phoneNumber) {
        alert("Please enter your phone number first.");
        return;
    }

    if (await resendOTP(phoneNumber)) {
        alert("OTP resent successfully!");
        startResendTimer();
    } else {
        alert("Failed to resend OTP.");
    }
});

// Resend OTP Timer
const startResendTimer = () => {
    let countdown = 60;
    const countdownElement = document.getElementById("countdown");
    const resendButton = document.getElementById("resendOTP");

    resendButton.disabled = true;
    const interval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;

        if (countdown <= 0) {
            clearInterval(interval);
            resendButton.disabled = false;
        }
    }, 1000);
};
