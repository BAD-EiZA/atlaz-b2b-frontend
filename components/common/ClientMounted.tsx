/**
 * @author Void
 * ClientMounted Component
 *
 * A utility component that ensures its children are only rendered after the component has mounted on the client-side.
 * This is useful for avoiding hydration errors in Next.js when dealing with components that rely on browser-specific APIs (e.g., `window`, `document`) or have different server-side and client-side rendered content.
 *
 * Props:
 *  - `children`: The React nodes to be rendered only on the client.
 *
 * State:
 *  - `hasMounted`: A boolean state variable that tracks whether the component has mounted.  It starts as `false` and is set to `true` in a `useEffect` hook.
 *
 * Effects:
 *  - `useEffect`:  An empty dependency array (`[]`) ensures this effect runs only once after the initial render (i.e., on mount).
 *    - `setHasMounted(true)`: Sets `hasMounted` to `true`, indicating that the component has mounted.
 *
 * Rendering:
 *  - `if (!hasMounted) return null;`:  If `hasMounted` is `false` (before mounting), the component returns `null`, preventing its children from rendering.
 *  - `return (<>{children}</>);`:  If `hasMounted` is `true` (after mounting), the component renders its children wrapped in a React fragment (`<>`).
 *
 * Usage:
 *  Wrap components or parts of your UI that should only be rendered on the client with `<ClientMounted>`.
 *
 * Example:
 *  ```javascript
 *   <ClientMounted>
 *     <div>This will only be rendered on the client.</div>
 *   </ClientMounted>
 *  ```
 */

"use client";

import React, { useState, useEffect } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
}

const ClientMounted = ({ children }: ClientOnlyProps) => {
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return <>{children}</>;
};

export default ClientMounted;
