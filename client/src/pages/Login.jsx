import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your boards."
      footer={
        <>
          New here? <Link to="/register" className="font-semibold text-brand-600">Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" type="email" required value={form.email} onChange={set("email")} />
        <Input label="Password" type="password" required value={form.password} onChange={set("password")} />
        <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      </form>
    </AuthLayout>
  );
}
