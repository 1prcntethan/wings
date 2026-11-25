import { useAuth } from "../config/auth-context.jsx";

export function UnverifiedNotice() {
  const { currentUser } = useAuth();
  const password = currentUser?.providerData?.some((provider) => provider.providerId === "password");
  if (!currentUser || !password || currentUser.emailVerified) return null;
  return (
    <p className="wings-unverified" role="status">
      Check your inbox to verify this account. You can keep using Wings meanwhile.
    </p>
  );
}
