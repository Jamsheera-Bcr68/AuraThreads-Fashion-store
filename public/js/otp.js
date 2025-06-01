let timeLeft = 60;
const countdownElement = document.getElementById("countdown");
const resendButton = document.getElementById("resendOTP");

const countdown = setInterval(() => {
  if (timeLeft <= 0) {
    clearInterval(countdown);
    resendButton.disabled = false;
    resendButton.innerText = "Resend OTP";
  } else {
    countdownElement.innerText = timeLeft--;
  }
}, 1000);

// Resend OTP Logic
resendButton.addEventListener("click", async () => {
  resendButton.disabled = true;
  resendButton.innerText = "Resending...";

  const response = await fetch("/resend-otp", { method: "POST" });
  if (response.ok) {
    timeLeft = 60;
    resendButton.innerText = "Resend OTP in 60s";
    resendButton.disabled = true;
    countdownElement.innerText = 60;
    setInterval(() => {
      if (timeLeft <= 0) {
        resendButton.disabled = false;
        resendButton.innerText = "Resend OTP";
      } else {
        countdownElement.innerText = timeLeft--;
      }
    }, 1000);
  }
});
