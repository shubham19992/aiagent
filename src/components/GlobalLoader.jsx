import React, { useEffect, useState } from 'react';
import { subscribeLoading } from '../lib/loading';

/** Full-screen overlay shown whenever any API request is in flight. */
export default function GlobalLoader() {
  const [active, setActive] = useState(false);
  useEffect(() => subscribeLoading((count) => setActive(count > 0)), []);

  if (!active) return null;
  return (
    <div className="xd-global-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="xd-global-spinner" />
    </div>
  );
}
