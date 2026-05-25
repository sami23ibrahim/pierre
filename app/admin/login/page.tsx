"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: 12, width: 260 }}
      >
        <h1
          style={{
            color: "#eee",
            fontSize: 16,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}
        >
          Admin
        </h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          style={{
            background: "#141414",
            border: "1px solid #333",
            borderRadius: 5,
            color: "#eee",
            padding: "10px 12px",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#eee",
            border: "none",
            borderRadius: 5,
            color: "#111",
            padding: "10px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {pending ? "…" : "Enter"}
        </button>
        {state.error && (
          <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0 }}>{state.error}</p>
        )}
      </form>
    </main>
  );
}
