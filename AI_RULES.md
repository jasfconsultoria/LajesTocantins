# AI Development Rules

This document outlines the tech stack and coding conventions for this web application. Following these rules ensures consistency, maintainability, and leverages the existing libraries effectively.

## Tech Stack

This is a modern web application built with the following technologies:

-   **Framework**: React (with Vite) for building the user interface.
-   **Language**: TypeScript (used in `.jsx`/`.tsx` files) for type safety.
-   **Styling**: Tailwind CSS for all styling. We use a utility-first approach and avoid custom CSS files where possible.
-   **UI Components**: `shadcn/ui` provides a set of pre-built, accessible, and customizable components located in `src/components/ui`.
-   **Icons**: `lucide-react` is the exclusive library for all icons.
-   **Routing**: `react-router-dom` is used for all client-side routing, with routes defined in `src/main.jsx`.
-   **Backend & Database**: Supabase is used for authentication, database storage, and serverless edge functions.
-   **Notifications**: A custom toast implementation based on `radix-ui/react-toast` is available via `useToast`.

## Library Usage Rules

### 1. UI and Styling

-   **Styling**: **ALWAYS** use Tailwind CSS classes for styling. Do not add new CSS files or use inline styles. The main stylesheet is `src/index.css`, which should only contain base Tailwind directives and global CSS variables.
-   **Components**:
    -   **ALWAYS** prioritize using components from the `shadcn/ui` library (`@/components/ui/*`). These include `Button`, `Input`, `Dialog`, `Select`, `Table`, etc.
    -   If a `shadcn/ui` component needs to be modified, create a new, custom component in `src/components/` that wraps or extends its functionality. **DO NOT** edit the files in `src/components/ui/` directly.
    -   New, reusable components should be created in the `src/components/` directory.
-   **Layout**: Main application layout is handled by `src/layouts/MainLayout.jsx`. New pages should be rendered within this layout via the `<Outlet />` component.

### 2. Routing and Pages

-   **Routing**: All application routes are managed in `src/main.jsx`. When adding a new page, you must add a new `<Route>` definition there.
-   **Pages**: Create new pages as components inside the `src/pages/` directory. For example, a user list page would be `src/pages/UserList.jsx`.

### 3. State Management

-   **Local State**: Use `React.useState` and `React.useEffect` for state that is local to a single component.
-   **Global State**: Use React Context for application-wide state. The primary contexts are:
    -   `SupabaseAuthContext`: For user authentication, session data, user role, and the currently active company.
    -   `AppContext`: For general application state, like the app version.

### 4. Backend (Supabase)

-   **Client**: Use the shared Supabase client instance from `@/lib/customSupabaseClient.js` for all database interactions.
-   **Authentication**: Use the hooks and functions provided by `SupabaseAuthContext` (e.g., `signIn`, `signOut`, `user`, `role`).
-   **Business Logic**: For complex operations, data aggregation, or actions requiring admin privileges, **ALWAYS** create and call a Supabase Edge Function (located in `supabase/functions/`). This keeps sensitive logic off the client.

### 5. Icons

-   **ALWAYS** use icons from the `lucide-react` package. Do not install or use any other icon libraries.

### 6. Notifications

-   To show feedback to the user (e.g., success or error messages), **ALWAYS** use the `useToast()` hook from `@/components/ui/use-toast.js`.