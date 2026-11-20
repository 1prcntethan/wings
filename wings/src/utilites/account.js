import {
  USERNAME_RULE_MESSAGE,
  USERNAME_TAKEN_MESSAGE,
  normalizeUsername,
  usernameError,
} from "./username.js";

export { normalizeUsername, usernameError };

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
    case "already-exists":
      return USERNAME_TAKEN_MESSAGE;
    case "invalid-argument":
      return USERNAME_RULE_MESSAGE;
    case "not-found":
      return "Couldn't find your account. Try again.";
    case "unavailable":
    case "deadline-exceeded":
      return "The server is unavailable. Try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
