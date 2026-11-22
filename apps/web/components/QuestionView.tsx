"use client";
import type { OptionLabel, Question } from "@itil5/core";
import { Tr } from "./Tr";

/**
 * Renders a source question verbatim. Answer selection uses a dedicated radio control (left zone);
 * the option text is a translation target only, so revealing Arabic can never select an answer.
 * `feedback` is only passed after submission (review) or in Study mode.
 */
export function QuestionView({ q, selected, onSelect, feedback, disabled, name }: {
  q: Question;
  selected: OptionLabel | null | undefined;
  onSelect?: (l: OptionLabel) => void;
  feedback?: { showKey: boolean } | null;
  disabled?: boolean;
  name: string;
}) {
  return (
    <fieldset className="question" aria-describedby={`${name}-hint`}>
      <legend className="sr-only">Question options</legend>
      <Tr k={q.i18n.question} className="stem" as="div">
        <span className="stem-text">{q.englishQuestion}</span>
      </Tr>
      <p id={`${name}-hint`} className="sr-only">Select an answer with the radio buttons. Activating the option text shows its Arabic translation.</p>
      <ul className="options" role="radiogroup" aria-label="Answer options">
        {q.englishOptions.map((o) => {
          const id = `${name}-${o.label}`;
          const isSel = selected === o.label;
          const isKey = feedback?.showKey && o.label === q.sourceAnswerKey;
          const isWrongSel = feedback?.showKey && isSel && o.label !== q.sourceAnswerKey;
          return (
            <li key={o.label} className={`option ${isSel ? "selected" : ""} ${isKey ? "key" : ""} ${isWrongSel ? "wrong" : ""}`}>
              <label className="select-zone" htmlFor={id}>
                <input
                  id={id}
                  type="radio"
                  name={name}
                  value={o.label}
                  checked={isSel}
                  disabled={disabled}
                  onChange={() => onSelect?.(o.label)}
                  aria-label={`Option ${o.label}: ${o.text}`}
                />
                <span className="letter" aria-hidden="true">{o.label}</span>
              </label>
              <Tr k={q.i18n.options[o.label]} className="option-text" as="div">{o.text}</Tr>
              {isKey && <span className="badge ok">Source key</span>}
              {isWrongSel && <span className="badge bad">Your answer</span>}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
