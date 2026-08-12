"use client";

/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect -- imagens remotas são configuradas pela administradora. */

import { FormEvent, useEffect, useState } from "react";

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  serviceId: string | null;
  serviceName: string | null;
  professionalId: string | null;
  professionalName: string | null;
  mainImageUrl: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  published: boolean;
  featured: boolean;
  displayOrder: number;
};

type Reference = { id: string; name: string };
type ImageField = "mainImageUrl" | "beforeImageUrl" | "afterImageUrl";
type PortfolioForm = {
  id?: string;
  title: string;
  description: string;
  category: string;
  serviceId: string;
  professionalId: string;
  mainImageUrl: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  published: boolean;
  featured: boolean;
  displayOrder: string;
};

const emptyPortfolio: PortfolioForm = {
  title: "",
  description: "",
  category: "Coloração",
  serviceId: "",
  professionalId: "",
  mainImageUrl: "",
  beforeImageUrl: "",
  afterImageUrl: "",
  published: true,
  featured: false,
  displayOrder: "10",
};

function messageOf(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value &&
    "message" in value &&
    typeof value.message === "string"
    ? value.message
    : fallback;
}

export default function PortfolioManagement() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Reference[]>([]);
  const [professionals, setProfessionals] = useState<Reference[]>([]);
  const [form, setForm] = useState<PortfolioForm>(emptyPortfolio);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<ImageField | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isError, setIsError] = useState(false);

  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const result: unknown = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        messageOf(result, "Não foi possível concluir a operação."),
      );
    return result as Record<string, unknown>;
  }

  async function load(search = query) {
    setLoading(true);
    try {
      const result = await request(
        `/api/admin/portfolio?q=${encodeURIComponent(search)}`,
      );
      setItems(
        Array.isArray(result.items) ? (result.items as PortfolioItem[]) : [],
      );
      setServices(
        Array.isArray(result.services) ? (result.services as Reference[]) : [],
      );
      setProfessionals(
        Array.isArray(result.professionals)
          ? (result.professionals as Reference[])
          : [],
      );
      setIsError(false);
    } catch (cause) {
      setIsError(true);
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar a galeria.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // A carga inicial usa busca vazia; as próximas buscas são disparadas pelo formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(item: PortfolioItem) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      serviceId: item.serviceId ?? "",
      professionalId: item.professionalId ?? "",
      mainImageUrl: item.mainImageUrl,
      beforeImageUrl: item.beforeImageUrl ?? "",
      afterImageUrl: item.afterImageUrl ?? "",
      published: item.published,
      featured: item.featured,
      displayOrder: String(item.displayOrder),
    });
    setFeedback("");
  }

  function reset() {
    setForm(emptyPortfolio);
    setFeedback("");
  }

  async function uploadImage(file: File, field: ImageField) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setIsError(true);
      setFeedback("Selecione uma imagem JPEG ou PNG.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setIsError(true);
      setFeedback("A imagem deve ter no máximo 4 MB.");
      return;
    }
    setUploadingField(field);
    setIsError(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await request("/api/admin/media", { method: "POST", body });
      if (typeof result.imageUrl !== "string") throw new Error("O envio da imagem não retornou um arquivo válido.");
      setForm((current) => ({ ...current, [field]: result.imageUrl as string }));
      setFeedback("Imagem enviada com sucesso.");
    } catch (cause) {
      setIsError(true);
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingField(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await request("/api/admin/portfolio", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceId: form.serviceId || null,
          professionalId: form.professionalId || null,
          beforeImageUrl: form.beforeImageUrl || null,
          afterImageUrl: form.afterImageUrl || null,
          displayOrder: Number(form.displayOrder),
        }),
      });
      setFeedback(messageOf(result, "Trabalho salvo com sucesso."));
      setIsError(false);
      reset();
      await load();
    } catch (cause) {
      setIsError(true);
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o trabalho.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-portfolio-module">
      {feedback && (
        <p
          className={`admin-feedback ${isError ? "error" : ""}`}
          role={isError ? "alert" : "status"}
        >
          {feedback}
        </p>
      )}
      <div className="admin-portfolio-layout">
        <form
          className="admin-service-form admin-portfolio-form"
          onSubmit={save}
        >
          <div className="admin-panel-heading">
            <div>
              <span>{form.id ? "Editar trabalho" : "Novo trabalho"}</span>
              <h2>
                {form.id ? "Ajuste a publicação." : "Mostre um resultado."}
              </h2>
            </div>
            {form.id && (
              <button className="text-button" type="button" onClick={reset}>
                Novo cadastro
              </button>
            )}
          </div>
          <label>
            Título
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              maxLength={160}
              required
            />
          </label>
          <div className="admin-form-grid">
            <label>
              Categoria
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                maxLength={80}
                placeholder="Ex.: Coloração"
                required
              />
            </label>
            <label>
              Ordem de exibição
              <input
                type="number"
                min="0"
                max="9999"
                value={form.displayOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayOrder: event.target.value,
                  }))
                }
                required
              />
            </label>
          </div>
          <label>
            Descrição do resultado
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              maxLength={1000}
              rows={3}
              required
              placeholder="Ex.: Morena iluminada · Brilho natural"
            />
          </label>
          <div className="admin-form-grid">
            <label>
              Serviço relacionado
              <select
                value={form.serviceId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    serviceId: event.target.value,
                  }))
                }
              >
                <option value="">Não vincular</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Profissional
              <select
                value={form.professionalId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    professionalId: event.target.value,
                  }))
                }
              >
                <option value="">Não vincular</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="portfolio-file-field">
            Imagem principal (JPEG ou PNG)
            <input
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              required={!form.mainImageUrl}
              disabled={uploadingField !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file, "mainImageUrl");
                event.target.value = "";
              }}
            />
            <small>{uploadingField === "mainImageUrl" ? "Enviando imagem..." : form.mainImageUrl ? "Imagem selecionada. Escolha outra para substituir." : "Escolha uma foto de até 4 MB."}</small>
          </label>
          <div className="admin-form-grid">
            <label className="portfolio-file-field">
              Imagem antes — JPEG ou PNG (opcional)
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                disabled={uploadingField !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file, "beforeImageUrl");
                  event.target.value = "";
                }}
              />
              {form.beforeImageUrl && <button className="portfolio-remove-image" type="button" onClick={() => setForm((current) => ({ ...current, beforeImageUrl: "" }))}>Remover imagem</button>}
            </label>
            <label className="portfolio-file-field">
              Imagem depois — JPEG ou PNG (opcional)
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                disabled={uploadingField !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file, "afterImageUrl");
                  event.target.value = "";
                }}
              />
              {form.afterImageUrl && <button className="portfolio-remove-image" type="button" onClick={() => setForm((current) => ({ ...current, afterImageUrl: "" }))}>Remover imagem</button>}
            </label>
          </div>
          {form.mainImageUrl && (
            <div className="admin-portfolio-preview">
              <img
                src={form.mainImageUrl}
                alt="Prévia do trabalho"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span>Prévia da imagem principal</span>
            </div>
          )}
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  published: event.target.checked,
                }))
              }
            />{" "}
            Publicar no site
          </label>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  featured: event.target.checked,
                }))
              }
            />{" "}
            Destacar na galeria
          </label>
          <button
            className="button button-gold"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Salvando…"
              : form.id
                ? "Salvar trabalho"
                : "Cadastrar trabalho"}
            <span>↗</span>
          </button>
        </form>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span>Portfólio</span>
              <h2>Trabalhos do studio</h2>
            </div>
            <p>
              Itens não publicados permanecem salvos e não aparecem no site.
            </p>
          </div>
          <form
            className="admin-client-search"
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <label className="sr-only" htmlFor="portfolio-search">
              Buscar trabalho
            </label>
            <input
              id="portfolio-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título ou categoria…"
            />
            <button className="text-button" type="submit" disabled={loading}>
              Buscar
            </button>
            {query && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  void load("");
                }}
              >
                Limpar
              </button>
            )}
          </form>
          {loading ? (
            <p className="admin-loading">Carregando trabalhos…</p>
          ) : items.length ? (
            <div className="admin-portfolio-list">
              {items.map((item) => (
                <article
                  className={!item.published ? "unpublished" : ""}
                  key={item.id}
                >
                  <img src={item.mainImageUrl} alt="" />
                  <div>
                    <span>
                      {item.category} ·{" "}
                      {item.published ? "Publicado" : "Rascunho"}
                      {item.featured ? " · Destaque" : ""}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <small>
                      {item.professionalName ?? "Sem profissional"}
                      {item.serviceName ? ` · ${item.serviceName}` : ""}
                    </small>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => edit(item)}
                  >
                    Editar
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <h2>Nenhum trabalho encontrado.</h2>
              <p>Cadastre um resultado ou limpe a busca.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
