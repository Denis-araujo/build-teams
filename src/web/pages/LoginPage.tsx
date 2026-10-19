import { useState, type FormEvent } from "react";
import { api, HttpError, UnauthorizedError } from "../api";

function loginError(e: unknown): string {
  if (e instanceof UnauthorizedError) return "Senha incorreta";
  if (e instanceof HttpError && e.status === 429)
    return "Muitas tentativas. Tente de novo em alguns minutos.";
  if (e instanceof HttpError && e.status === 503)
    return "Servidor sem senha configurada";
  return "Não foi possível entrar. Tente de novo.";
}

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.login(password);
      setPassword("");
      onLoggedIn();
    } catch (err) {
      setPassword("");
      setError(loginError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center px-5 py-12 min-h-[calc(100vh-66px)] box-border">
      <form className="admin-card login-card" onSubmit={submit}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>
          Administrador
        </h1>
        <label className="field">
          Senha
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          Entrar
        </button>
      </form>
    </div>
  );
}
