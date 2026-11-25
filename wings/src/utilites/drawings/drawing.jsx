import { cloneElement, useEffect, useState } from "react";

export function Drawing({ load, name, svgId }) {
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

  if (shown?.name !== name || !shown.node) return null;
  if (svgId && shown.node.type === "svg") {
    return cloneElement(shown.node, { id: svgId });
  }
  return shown.node;
}
