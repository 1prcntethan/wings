import { auth } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";

let pendingGoogleCredential = null;

export function captureGoogleCredential(error) {
  pendingGoogleCredential = GoogleAuthProvider.credentialFromError(error) || null;
  return pendingGoogleCredential;
}

export async function linkPendingGoogleCredential(user = auth?.currentUser) {
  if (!pendingGoogleCredential || !user) return false;
  const credential = pendingGoogleCredential;
  pendingGoogleCredential = null;
  await linkWithCredential(user, credential);
  return true;
}

export const doCreateUserWithEmailAndPassword = async (email, password) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(credential.user);
  } catch (error) {
    console.error("Verification email failed", error);
  }
  return credential;
};

export const doSignInWithEmailAndPassword = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const doSignInWithGoogle = async () => {
  return await signInWithPopup(auth, new GoogleAuthProvider());
};

export const doSignOut = () => {
  return signOut(auth);
};

export async function doReauthenticate(password) {
  const user = auth.currentUser;
  if (!user?.email) {
    throw Object.assign(new Error("No email account"), {
      code: "auth/invalid-credential",
    });
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function doReauthenticateWithGoogle() {
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error("Not signed in"), {
      code: "auth/invalid-credential",
    });
  }
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
}

export async function doLinkGoogle() {
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error("Not signed in"), {
      code: "auth/invalid-credential",
    });
  }
  await linkWithPopup(user, new GoogleAuthProvider());
}

export async function doDeleteAuthUser() {
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error("Not signed in"), {
      code: "auth/invalid-credential",
    });
  }
  await deleteUser(user);
}

export const doSendPasswordResetEmail = async (auth, email) => {
  return await sendPasswordResetEmail(auth, email);
};

//   return (
//     <div>
//       <input
//         placeholder="Email..."
//         onChange={(e) => setEmail(e.target.value)}
//       />
//       <input
//         placeholder="Password..."
//         type="password"
//         onChange={(e) => setPassword(e.target.value)}
//       />
//       <button onClick={signIn}> Sign In </button>

//       <button onClick={signInWithGoogle}> Sign In with Google </button>

//       <button onClick={logout}> Log Out </button>
//     </div>
//   );
//
