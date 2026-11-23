import { useEffect, useState } from "react";

export function Drawing({ load, name }) {
  const [shown, setShown] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => load(name))
      .then((next) => {
        if (live) setShown({ name, node: next ?? null });
      })
      .catch(() => {
        if (live) setShown({ name, node: null });
      });
    return () => {
      live = false;
    };
  }, [load, name]);

  if (shown?.name !== name) return null;
  return shown.node;
}
