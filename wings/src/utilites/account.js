const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{1,23}$/;

export function normalizeUsername(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function usernameError(value) {
  if (value === "") return "";
  if (!USERNAME_PATTERN.test(value)) {
    return "Use 2–24 characters. Start with a letter or number. Letters, numbers, spaces, _ and - only.";
  }
  return "";
}

export function accountErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/invalid-login-credentials":
      return "That password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "Confirm your sign-in, then try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was closed before it finished.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "permission-denied":
      return "That change was blocked. Try again in a moment.";
    case "unavailable":
    case "deadline-exceeded":
      return "The server is unavailable. Try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
