import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const preview = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get("toast") === "1";
  if (!needRefresh && !preview) return null;

  return (
    <div className="wings-toast">
      <button
        type="button"
        className="wings-toast__card"
        onClick={() => updateServiceWorker?.(true)}
      >
        WINGS updated, tap to reload
      </button>
    </div>
  );
}
