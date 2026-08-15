"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  adaptText,
  CEFR_LEVELS,
  LANGUAGES,
  MAX_TEXT_CHARACTERS,
  ReadiverApiError,
  type AdaptRequest,
  type AdaptResponse,
  type CefrLevel,
  type TargetLanguage,
} from "@/lib/readiver-api";

type AdaptAction = (request: AdaptRequest) => Promise<AdaptResponse>;

interface ReadiverExperienceProps {
  adapt?: AdaptAction;
}

function characterCount(value: string): number {
  return Array.from(value).length;
}

export function ReadiverExperience({ adapt = adaptText }: ReadiverExperienceProps) {
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("de");
  const [level, setLevel] = useState<CefrLevel>("B1");
  const [result, setResult] = useState<AdaptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const count = useMemo(() => characterCount(text), [text]);
  const isTooLong = count > MAX_TEXT_CHARACTERS;
  const canSubmit = text.trim().length > 0 && !isTooLong && !isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsLoading(true);
    try {
      const adaptation = await adapt({ text, targetLanguage, level });
      setResult(adaptation);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(
        cause instanceof ReadiverApiError || cause instanceof Error
          ? cause.message
          : "This text could not be adapted. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startAnother() {
    setResult(null);
    setError(null);
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("#source-text")?.focus());
  }

  if (result) {
    const languageName =
      LANGUAGES.find(({ code }) => code === result.targetLanguage)?.name ?? result.targetLanguage;

    return (
      <div className="app-shell reader-shell">
        <header className="topbar">
          <Link className="wordmark" href="/" aria-label="Readiver home">Readiver</Link>
          <button className="quiet-button" type="button" onClick={startAnother}>
            Adapt another text
          </button>
        </header>

        <main className="reader-view">
          <article aria-labelledby="adapted-title">
            <p className="reader-meta">
              {languageName} <span aria-hidden="true">·</span> {result.level}
            </p>
            <h1 id="adapted-title">{result.title}</h1>
            <div className="reader-copy">
              {result.adaptedText.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${result.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </article>

          <details className="original-disclosure">
            <summary>Original text</summary>
            <div className="original-copy">{result.sourceText}</div>
          </details>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell input-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Readiver home">Readiver</Link>
        <p className="promise">Read anything at your level.</p>
      </header>

      <main className="input-view">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Your next read</p>
          <h1 id="page-title">Read something<br />at your level.</h1>
          <p className="intro-copy">
            Bring the writing you care about. Readiver keeps its meaning and shapes the language for you.
          </p>
        </section>

        <form className="adapt-form" onSubmit={handleSubmit} noValidate>
          <div className="writing-surface">
            <label htmlFor="source-text">Text to adapt</label>
            <textarea
              id="source-text"
              name="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste anything you want to understand…"
              aria-describedby={`character-count${isTooLong ? " text-error" : ""}`}
              aria-invalid={isTooLong}
              disabled={isLoading}
              autoFocus
            />
            <div className="surface-footer">
              <p id="character-count" className={isTooLong ? "character-count over-limit" : "character-count"}>
                {count.toLocaleString("en-US")} / {MAX_TEXT_CHARACTERS.toLocaleString("en-US")}
              </p>
              {isTooLong ? (
                <p id="text-error" className="field-error">
                  Shorten the text to {MAX_TEXT_CHARACTERS.toLocaleString("en-US")} characters.
                </p>
              ) : null}
            </div>
          </div>

          <div className="choices-row">
            <div className="language-field">
              <label htmlFor="target-language">Read in</label>
              <div className="select-wrap">
                <select
                  id="target-language"
                  name="targetLanguage"
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value as TargetLanguage)}
                  disabled={isLoading}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>{language.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="level-field" disabled={isLoading}>
              <legend>Reading level</legend>
              <div className="level-lens">
                {CEFR_LEVELS.map((option) => (
                  <label key={option} className="level-option">
                    <input
                      type="radio"
                      name="level"
                      value={option}
                      checked={level === option}
                      onChange={() => setLevel(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="submit-row">
            <div className="status-space" aria-live="polite">
              {isLoading ? <p className="loading-copy">Adapting your text…</p> : null}
              {error ? <p className="form-error" role="alert">{error}</p> : null}
            </div>
            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {isLoading ? "Adapting…" : "Adapt for me"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
