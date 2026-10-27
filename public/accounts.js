"use strict";
const el = (id) => document.getElementById(id);
let pending = false,
  resetUser = null;
function status(s) {
  el("status").textContent = s;
}
async function call(path, method = "GET", data) {
  const res = await fetch(path, {
    method,
    cache: "no-store",
    ...(data
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }
      : {}),
  });
  return readApiResponse(res);
}
async function action(form, work) {
  if (pending) return;
  pending = true;
  form.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    await work();
  } catch (e) {
    status(e.message);
  } finally {
    pending = false;
    form.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
const fields = (form) => Object.fromEntries(new FormData(form));
if (el("login")) {
  el("login").onsubmit = (e) => {
    e.preventDefault();
    action(e.target, async () => {
      const result = await call("/api/auth", "POST", fields(e.target));
      if (result.role === "coordination") {location.href = "/coordenacao.html";return;}
      e.target.reset();
      location.href =
        new URLSearchParams(location.search).get("next") === "app"
          ? "/comunidade.html?app=1&view=account"
          : new URLSearchParams(location.search).get("next") === "reports"
            ? "/admin-relatos.html"
            : new URLSearchParams(location.search).get("next") === "business"
              ? "/teste.html?area=business"
              : "/teste.html";
    });
  };
  call("/api/auth")
    .then((d) => {
      if (d.user) {
        el("login").hidden = true;
        el("login-options").hidden = true;
        el("session-profile").hidden = false;
        el("session-name").textContent = d.user.name;
        el("session-avatar").textContent = d.user.name.trim()[0]?.toUpperCase() || "E";
        const admin = ["owner", "company-admin"].includes(d.user.role);
        const coordinator = d.user.role === "coordination";
        el("session-role").textContent = admin
          ? "ADM · acesso completo"
          : d.user.role === "company"
            ? "Conta de empresa"
            : coordinator ? "Coordenação · escola" : "Conta de teste";
        el("session-reports").hidden = !(admin || coordinator);
        el("session-images").hidden = !admin;
        el("session-accounts").hidden = !admin;
        el("session-logs").hidden = !admin;
        el("admin-access-summary").hidden = !admin;
        el("session-continue").href =
          new URLSearchParams(location.search).get("next") === "reports" && admin
            ? "/admin-relatos.html"
            : "/teste.html?area=business";
        el("session-continue").textContent =
          new URLSearchParams(location.search).get("next") === "reports" && admin
            ? "Acessar relatos"
            : admin
              ? "Gerenciar empresas"
              : "Acessar minha empresa";
        if (coordinator) {el("session-continue").href = "/coordenacao.html";el("session-continue").textContent = "Acompanhar projeto";}
        if (d.user.auth === "local") {
          el("change").hidden = false;
          el("password-panel").hidden = false;
          el("recovery-email-panel").hidden = false;
          el("recovery-email").elements.email.value = d.user.email || "";
        }
        el("session-logout").onclick = () =>
          action(el("session-profile"), async () => {
            if (d.user.auth === "local") {
              await call("/api/auth", "POST", { action: "logout" });
              location.reload();
            } else location.href = "/signout-with-chatgpt?return_to=%2Fentrar.html";
          });
      }
    })
    .catch((e) => status(e.message));
  el("change").onsubmit = (e) => {
    e.preventDefault();
    action(e.target, async () => {
      await call("/api/auth", "POST", { action: "password", ...fields(e.target) });
      e.target.reset();
      el("change").hidden = true;
      el("password-panel").hidden = true;
      el("recovery-email-panel").hidden = true;
      el("session-profile").hidden = true;
      el("login").hidden = false;
      el("login-options").hidden = false;
      status("Senha alterada. Entre novamente com a nova senha.");
    });
  };
}
async function users() {
  const d = await call("/api/test-users");
  el("admin").hidden = false;
  el("owner-access").hidden = true;
  el("users").replaceChildren();
  if (!d.users.length) el("users").textContent = "Nenhuma conta cadastrada ainda.";
  for (const u of d.users) {
    const row = document.createElement("article");
    row.className = "panel";
    const p = document.createElement("p");
    p.textContent =
      u.name +
      " · " +
      u.username +
      " · " +
      (["owner", "company-admin"].includes(u.role)
        ? "ADM · acesso completo"
        : u.role === "company"
          ? "Empresa"
          : u.role === "coordination" ? "Coordenação" : "Conta antiga") +
      " · " +
      (u.active ? "Ativa" : "Desativada");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = u.active ? "Desativar acesso" : "Reativar acesso";
    toggle.onclick = () =>
      action(row, async () => {
        await call("/api/test-users", "POST", {
          action: "active",
          username: u.username,
          revision: u.revision,
          active: !u.active,
        });
        status("Permissão atualizada. Sessões antigas foram encerradas.");
        await users();
      });
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Redefinir senha";
    reset.onclick = () => {
      resetUser = u;
      el("reset-name").textContent = u.username;
      el("reset").hidden = false;
      el("reset").scrollIntoView({ behavior: "smooth" });
    };
    row.append(p, toggle, reset);
    el("users").append(row);
  }
}
if (el("users")) {
  users().catch((e) => status(e.message));
  el("reset").onsubmit = (e) => {
    e.preventDefault();
    if (!resetUser) return;
    action(e.target, async () => {
      await call("/api/test-users", "POST", {
        action: "reset",
        username: resetUser.username,
        revision: resetUser.revision,
        ...fields(e.target),
      });
      e.target.reset();
      e.target.hidden = true;
      status("Senha redefinida. Sessões antigas foram encerradas.");
      await users();
    });
  };
  el("cancel-reset").onclick = () => {
    el("reset").reset();
    el("reset").hidden = true;
    resetUser = null;
  };
}


if (el("signup-company")) {
  const form = el("signup-company");
  form.onsubmit = (e) => {
    e.preventDefault();
    action(form, async () => {
      const data = fields(form);
      if (data.password !== data.confirmPassword) throw Error("As senhas precisam ser iguais.");
      await call("/api/auth", "POST", {
        action: "register-company",
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
      });
      form.reset();
      location.href = "/teste.html?area=business";
    });
  };
  call("/api/auth")
    .then((d) => {
      if (d.user && ["company", "company-admin", "owner"].includes(d.user.role))
        location.replace("/teste.html?area=business");
      else if (d.user)
        status(
          "Você está em uma conta de cliente. Para cadastrar um negócio, use sua conta de empresa.",
        );
    })
    .catch((e) => status(e.message));
}

if (el("recovery-email"))
  el("recovery-email").onsubmit = (e) => {
    e.preventDefault();
    action(e.target, async () => {
      await call("/api/auth", "POST", { action: "recovery-email", ...fields(e.target) });
      e.target.elements.currentPassword.value = "";
      status("E-mail de recuperação salvo.");
    });
  };
if (el("recovery-request")) {
  call("/api/password-recovery")
    .then((d) => {
      if (!d.available)
        status(
          "O envio de e-mail ainda não está configurado. A recuperação automática ficará disponível quando o serviço for ativado.",
        );
    })
    .catch((e) => status(e.message));
  el("recovery-request").onsubmit = (e) => {
    e.preventDefault();
    action(e.target, async () => {
      const d = await call("/api/password-recovery", "POST", {
        action: "request",
        ...fields(e.target),
      });
      status(d.message);
    });
  };
}
if (el("recovery-reset")) {
  const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  history.replaceState(null, "", location.pathname);
  if (!token) {
    status("Este link é inválido. Solicite outro link de recuperação.");
    el("recovery-reset").hidden = true;
  }
  el("recovery-reset").onsubmit = (e) => {
    e.preventDefault();
    action(e.target, async () => {
      const data = fields(e.target);
      if (data.password !== data.confirmPassword) throw Error("As senhas precisam ser iguais.");
      const d = await call("/api/password-recovery", "POST", {
        action: "reset",
        token,
        password: data.password,
      });
      e.target.reset();
      e.target.hidden = true;
      status(d.message);
    });
  };
}
