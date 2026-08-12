"use client";

/* eslint-disable react-hooks/set-state-in-effect -- categorias protegidas são carregadas após autenticação. */

import { FormEvent, useEffect, useState } from "react";

type Category = { id: string; name: string; serviceCount: number };

export default function CategoryManagement({ onChanged }: { onChanged: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function request(options?: RequestInit) {
    const response = await fetch("/api/admin/service-categories", { cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Não foi possível concluir a operação.");
    return payload;
  }

  async function load() {
    const payload = await request();
    setCategories(payload.categories ?? []);
  }

  useEffect(() => {
    void load().catch((reason) => {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar as categorias.");
    });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(false);
    try {
      const payload = await request({
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, name }),
      });
      setMessage(payload.message);
      setEditing(null);
      setName("");
      await load();
      onChanged();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Não foi possível salvar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  function edit(category: Category) {
    setEditing(category);
    setName(category.name);
    setMessage("");
    setError(false);
  }

  async function remove(category: Category) {
    if (category.serviceCount > 0 || !window.confirm(`Excluir a categoria “${category.name}”?`)) return;
    setSaving(true);
    setError(false);
    try {
      const payload = await request({ method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: category.id }) });
      setMessage(payload.message);
      if (editing?.id === category.id) { setEditing(null); setName(""); }
      await load();
      onChanged();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Não foi possível excluir a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-panel category-management">
    <div className="admin-panel-heading">
      <div><span>Organização do catálogo</span><h2>Categorias</h2></div>
      <p>{categories.length} cadastradas</p>
    </div>
    <form className="category-form" onSubmit={save}>
      <label>Nome da categoria<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} placeholder="Ex.: Cabelos" required /></label>
      <button className="button button-gold" type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar edição" : "Criar categoria"}<span>↗</span></button>
      {editing && <button className="text-button" type="button" onClick={() => { setEditing(null); setName(""); }}>Cancelar</button>}
    </form>
    {message && <p className={error ? "admin-feedback error" : "admin-feedback"}>{message}</p>}
    <div className="category-list">
      {categories.length ? categories.map((category) => <article key={category.id}>
        <div><strong>{category.name}</strong><small>{category.serviceCount} serviço{category.serviceCount === 1 ? "" : "s"}</small></div>
        <div><button className="text-button" type="button" onClick={() => edit(category)}>Editar</button><button className="category-delete" type="button" disabled={category.serviceCount > 0 || saving} title={category.serviceCount > 0 ? "Mova os serviços antes de excluir" : "Excluir categoria"} onClick={() => void remove(category)}>Excluir</button></div>
      </article>) : <p className="admin-empty-state">Nenhuma categoria cadastrada.</p>}
    </div>
  </section>;
}
