/**
 * @author Void
 * TanstackProvider Component
 *
 * Provides a React Query context using `@tanstack/react-query`. This makes the `QueryClient` available to all child components,
 * enabling them to use React Query hooks like `useQuery`, `useMutation`, etc., for data fetching and caching. It also
 * manages storing and updating an email in local storage.
 *
 * Props:
 *  - `children`: The React nodes to be rendered within the provider's context.
 *  - `email`: A string representing a user's email address.
 *
 * `QueryClient`:
 *  - `queryClient = new QueryClient()`: Creates a new instance of `QueryClient`. This object manages the cache and provides
 *    methods for interacting with it. The `QueryClient` is created *outside* the component to avoid recreating it on every render.
 *
 * Local Storage Logic (`useEffect`):
 *  - The `useEffect` hook runs after every render, but the dependency array (`[email, localStorage.getItem("email")]`) ensures
 *    that the logic inside only executes when either the `email` prop changes or the value of "email" in `localStorage` changes.
 *  - `localStorage.getItem("email") == null && email != null`: Checks if "email" is not in `localStorage` AND the `email` prop is not null.  This handles the initial setting of the email.
 *  - `localStorage.getItem("email") != email`: Checks if the "email" in `localStorage` is different from the current `email` prop. This handles updates to the email.
 *  - `localStorage.setItem("email", email!)`:  If either of the above conditions is true, the `email` prop is stored in `localStorage` under the key "email". The non-null assertion operator (`!`) is used because the code already checks for null/undefined conditions.
 *
 * Rendering:
 *  - `<QueryClientProvider client={queryClient}>`:  Wraps the `children` with `QueryClientProvider`.  This makes the
 *    `queryClient` instance available to all components within the `children` tree.  Any component within this tree can
 *    now use React Query hooks.
 *
 * Usage Example:
 *
 * ```jsx
 * <TanstackProvider email={userEmail}>
 *   <MyComponent />
 *   <AnotherComponent />
 * </TanstackProvider>
 * ```
 *
 *  In this example, both `MyComponent` and `AnotherComponent` can access the same `QueryClient` instance and use React Query hooks.  Any data fetched and cached by one component will be available to the other.
 */

"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
type Props = {
  children: React.ReactNode;
};

const queryClient = new QueryClient();

const TanstackProvider = ({ children }: Props) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default TanstackProvider;
