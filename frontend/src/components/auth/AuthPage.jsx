import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api";

export function AuthPage({ go, setUser }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? api.login : api.signup;
      const res = await fn(email, password);
      setUser({ email: res.email, subscription_status: res.subscription_status });
      go("dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[400px] mx-auto pt-20 px-10">
      <h1 className="text-4xl font-extrabold tracking-tight uppercase mb-2 animate-rise">
        {mode === "login" ? "LOG IN" : "SIGN UP"}
      </h1>
      <p className="text-grey-500 text-[15px] mb-8">
        {mode === "login" ? "Welcome back." : "Create your free Raven account."}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
        />
        {error && <div className="text-sell text-sm font-mono">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          className="bg-transparent border-none text-raven-orange text-sm font-semibold cursor-pointer"
        >
          {mode === "login"
            ? "Don't have an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
