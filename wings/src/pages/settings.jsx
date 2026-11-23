import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useAuth } from "../config/auth-context.jsx";
import {
  doDeleteAuthUser,
  doLinkGoogle,
  doReauthenticate,
  doReauthenticateWithGoogle,
  doSignOut,
} from "../config/auth.js";
import { deleteAccountData, deleteUserDocument, getUserDoc, updateUsername } from "../config/firestore.js";
import { reportError } from "../config/sentry.js";
import {
  accountErrorMessage,
  normalizeUsername,
  usernameError,
} from "../utilites/account.js";
import { UnverifiedNotice } from "../components/unverified.jsx";
import "./settings.css";

function signInMethod(user) {
  const providers = user?.providerData?.map((provider) => provider.providerId) ?? [];
  if (providers.includes("password")) return "password";
  if (providers.includes("google.com")) return "google";
  return "unknown";
}

export function Settings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const method = signInMethod(currentUser);

  const [profileStatus, setProfileStatus] = useState("loading");
  const [profileRetry, setProfileRetry] = useState(0);
  const [savedName, setSavedName] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dataDeleted, setDataDeleted] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [linkError, setLinkError] = useState("");

  const providers = currentUser?.providerData?.map((provider) => provider.providerId) ?? [];
  const canLinkGoogle = providers.includes("password") && !providers.includes("google.com");
  const busy = saving || signingOut || deleting || linking;

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    setProfileStatus("loading");
    setSaveError("");
    setSaveMessage("");

    getUserDoc(currentUser.uid)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setProfileStatus("error");
          return;
        }
        const name = typeof data.username === "string" ? data.username : "";
        setSavedName(name);
        setDraft(name);
        setProfileStatus("ready");
      })
      .catch((error) => {
        reportError(error, { where: "settings-profile" });
        if (!cancelled) setProfileStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, profileRetry]);

  async function handleSave(event) {
    event.preventDefault();
    if (busy || profileStatus !== "ready") return;

    const next = normalizeUsername(draft);
    const problem = usernameError(next);
    setDraft(next);
    if (problem) {
      setSaveError(problem);
      setSaveMessage("");
      return;
    }

    const unchanged = next === savedName;
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      await updateUsername(currentUser.uid, next);
      setSavedName(next);
      setSaveMessage(
        unchanged ? "Saved." : next ? "Username saved." : "Username cleared.",
      );
    } catch (error) {
      setSaveError(accountErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (busy || dataDeleted) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await doSignOut();
      navigate("/", { replace: true });
    } catch (error) {
      setSignOutError(accountErrorMessage(error));
      setSigningOut(false);
    }
  }

  function closeDelete() {
    if (deleting || dataDeleted) return;
    setDeleteOpen(false);
    setDeleteConfirm("");
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleDelete(event) {
    event.preventDefault();
    if (deleting || deleteConfirm !== "DELETE") return;
    if (!dataDeleted && method === "password" && !deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    if (!dataDeleted && method === "unknown") return;

    setDeleting(true);
    setDeleteError("");
    try {
      if (!dataDeleted) {
        if (method === "password") {
          await doReauthenticate(deletePassword);
        } else {
          await doReauthenticateWithGoogle();
        }
        await deleteAccountData(currentUser.uid);
        setDataDeleted(true);
        setDeletePassword("");
      }
      await deleteUserDocument(currentUser.uid);
      await doDeleteAuthUser();
      navigate("/", { replace: true });
    } catch (error) {
      if (!String(error?.code || "").startsWith("auth/")) {
        reportError(error, { where: "delete-account" });
      }
      setDeleteError(accountErrorMessage(error));
      setDeleting(false);
    }
  }

  async function handleLinkGoogle() {
    if (busy || !canLinkGoogle) return;
    setLinking(true);
    setLinkError("");
    setLinkMessage("");
    try {
      await doLinkGoogle();
      await currentUser.reload();
      setLinkMessage("Google is linked. You can sign in with it next time.");
    } catch (error) {
      setLinkError(accountErrorMessage(error));
    } finally {
      setLinking(false);
    }
  }

  const deleteReady =
    deleteConfirm === "DELETE" &&
    (dataDeleted || method === "google" || (method === "password" && deletePassword));

  return (
    <>
      <Navbar />
      <UnverifiedNotice />
      <div className="settings">
        <h1 className="settings-title">account</h1>

        <section className="settings-card">
          <div className="settings-card__header">
            <h2>profile</h2>
            <button
              type="button"
              className="settings-button settings-button--quiet"
              onClick={handleSignOut}
              disabled={busy || dataDeleted}
            >
              {signingOut ? "signing out..." : "sign out"}
            </button>
          </div>
          {signOutError && (
            <p className="settings-message settings-message--error">{signOutError}</p>
          )}
          <form onSubmit={handleSave}>
            <div className="settings-fields">
              <div className="settings-group">
                <p className="settings-label">Email</p>
                <p className="settings-value">{currentUser?.email}</p>
              </div>
              <div className="settings-group">
                {profileStatus === "loading" && (
                  <p className="settings-message">Loading your account...</p>
                )}
                {profileStatus === "error" && (
                  <>
                    <p className="settings-message settings-message--error">
                      Couldn't load your account.
                    </p>
                    <div className="settings-actions">
                      <button
                        type="button"
                        className="settings-button settings-button--quiet"
                        onClick={() => setProfileRetry((count) => count + 1)}
                        disabled={busy}
                      >
                        retry
                      </button>
                    </div>
                  </>
                )}
                {profileStatus === "ready" && (
                  <>
                    <label className="settings-label" htmlFor="username">
                      Username
                    </label>
                    <input
                      id="username"
                      className="settings-input"
                      value={draft}
                      maxLength={40}
                      autoComplete="username"
                      disabled={busy || dataDeleted}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setSaveMessage("");
                        setSaveError("");
                      }}
                    />
                    <p className="settings-help">
                      This name shows on your dashboard. Each username belongs to one
                      account. Leave it blank to use your email.
                    </p>
                    {saveMessage && (
                      <p className="settings-message settings-message--ok">{saveMessage}</p>
                    )}
                    {saveError && (
                      <p className="settings-message settings-message--error">{saveError}</p>
                    )}
                    <div className="settings-actions">
                      <button
                        className="settings-button settings-button--primary"
                        disabled={busy || dataDeleted}
                      >
                        {saving ? "saving..." : "save"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>
        </section>

        {canLinkGoogle && (
          <section className="settings-card">
            <h2>google</h2>
            <p className="settings-help">
              Link Google to this password account so either method can sign in.
            </p>
            {linkMessage && (
              <p className="settings-message settings-message--ok">{linkMessage}</p>
            )}
            {linkError && (
              <p className="settings-message settings-message--error">{linkError}</p>
            )}
            <div className="settings-actions">
              <button
                type="button"
                className="settings-button settings-button--primary"
                onClick={handleLinkGoogle}
                disabled={busy}
              >
                {linking ? "linking..." : "link google"}
              </button>
            </div>
          </section>
        )}

        <section className="settings-card settings-card--danger">
          <h2>delete account</h2>
          {!deleteOpen ? (
            <>
              <p className="settings-delete-copy">
                Deletes your sign-in, streak, skill progress, and workout logs.
              </p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-button settings-button--danger"
                  onClick={() => setDeleteOpen(true)}
                  disabled={busy}
                >
                  delete account
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleDelete}>
              <p className="settings-delete-copy">
                This permanently deletes your Wings account, streak, skill progress,
                and workout logs.
              </p>
              {dataDeleted ? (
                <p className="settings-message">
                  Your progress is deleted. One more step removes the sign-in.
                </p>
              ) : (
                <>
                  <label className="settings-label" htmlFor="delete-confirm">
                    Type DELETE to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    className="settings-input"
                    value={deleteConfirm}
                    autoComplete="off"
                    disabled={deleting}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                  />
                  {method === "password" && (
                    <>
                      <label className="settings-label" htmlFor="delete-password">
                        Password
                      </label>
                      <input
                        id="delete-password"
                        className="settings-input"
                        type="password"
                        value={deletePassword}
                        autoComplete="current-password"
                        disabled={deleting}
                        onChange={(event) => setDeletePassword(event.target.value)}
                      />
                    </>
                  )}
                  {method === "unknown" && (
                    <p className="settings-message settings-message--error">
                      Sign out, sign in again, then come back to delete this account.
                    </p>
                  )}
                </>
              )}
              {deleteError && (
                <p className="settings-message settings-message--error">{deleteError}</p>
              )}
              <div className="settings-actions">
                <button
                  className="settings-button settings-button--danger-solid"
                  disabled={deleting || !deleteReady || method === "unknown"}
                >
                  {deleting
                    ? "deleting..."
                    : method === "google" && !dataDeleted
                      ? "continue with google"
                      : "delete account"}
                </button>
                {!dataDeleted && (
                  <button
                    type="button"
                    className="settings-button settings-button--quiet"
                    onClick={closeDelete}
                    disabled={deleting}
                  >
                    cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
      <div className="footer-app-chrome">
        <Footer />
      </div>
    </>
  );
}
