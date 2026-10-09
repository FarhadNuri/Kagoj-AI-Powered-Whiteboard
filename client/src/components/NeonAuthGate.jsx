import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthView, NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient, neonEnabled } from "../lib/neonAuth";
import AuthLayout from "./AuthLayout";

function RouterLink({ href, ...props }) {
  return <Link to={href} {...props} />;
}

function Inner({ children }) {
  const navigate = useNavigate();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      redirectTo="/dashboard"
      basePath="/auth"
      navigate={(href) => navigate(href)}
      replace={(href) => navigate(href, { replace: true })}
      Link={RouterLink}
    >
      {children}
    </NeonAuthUIProvider>
  );
}

export default function NeonAuthGate({ children }) {
  return neonEnabled ? <Inner>{children}</Inner> : children;
}

// Route element for /auth/:pathname — Neon picks the form from the path segment.
export function NeonAuthPage() {
  const { pathname } = useParams();
  return (
    <AuthLayout wide>
      <AuthView path={pathname} />
    </AuthLayout>
  );
}
