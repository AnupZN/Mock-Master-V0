import { useMemo } from "react";
import { Question } from "../types";

interface QuestionContentProps {
  question: Question;
  language: "en" | "hi";
  themeClass: {
    id: string;
    lightBg: string;
    primaryText: string;
    primaryBg: string;
  };
  fontSize?: number;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

// Robust table parser for markdown-style pipe syntax
function parseTable(text: string): { textBefore: string; table: ParsedTable | null; textAfter: string } {
  if (!text) return { textBefore: "", table: null, textAfter: "" };

  const lines = text.split("\n");
  let tableStartIndex = -1;
  let tableEndIndex = -1;

  // Find continuous block of lines containing pipes (at least 2 pipes per row or matching pattern)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const hasPipes = trimmed.includes("|") && trimmed.split("|").length >= 2;
    
    if (hasPipes) {
      if (tableStartIndex === -1) {
        tableStartIndex = i;
      }
      tableEndIndex = i;
    } else {
      if (tableStartIndex !== -1) {
        // Table block has ended
        break;
      }
    }
  }

  // If no valid table block found, return original text
  if (tableStartIndex === -1 || tableEndIndex - tableStartIndex < 1) {
    return { textBefore: text, table: null, textAfter: "" };
  }

  const beforeLines = lines.slice(0, tableStartIndex);
  const tableLines = lines.slice(tableStartIndex, tableEndIndex + 1);
  const afterLines = lines.slice(tableEndIndex + 1);

  const parseRow = (rowLine: string) => {
    let content = rowLine.trim();
    if (content.startsWith("|")) content = content.slice(1);
    if (content.endsWith("|")) content = content.slice(0, -1);
    return content.split("|").map(cell => cell.trim());
  };

  const rawHeaders = parseRow(tableLines[0]);
  const headers = rawHeaders.filter((h, idx) => {
    return h !== "" || idx < rawHeaders.length - 1;
  });

  const rows: string[][] = [];
  const hasSeparator = tableLines[1] && tableLines[1].replace(/[\s|:-]/g, "") === "";
  const dataStartIndex = hasSeparator ? 2 : 1;

  for (let i = dataStartIndex; i < tableLines.length; i++) {
    const rowCells = parseRow(tableLines[i]);
    const mappedRow = headers.map((_, colIdx) => rowCells[colIdx] || "");
    rows.push(mappedRow);
  }

  return {
    textBefore: beforeLines.join("\n").trim(),
    table: { headers, rows },
    textAfter: afterLines.join("\n").trim()
  };
}

export default function QuestionContent({
  question,
  language,
  themeClass,
  fontSize,
}: QuestionContentProps) {
  const qText = useMemo(() => {
    return language === "hi" && question.question_hi
      ? question.question_hi
      : question.question;
  }, [question, language]);

  const parsed = useMemo(() => {
    return parseTable(qText);
  }, [qText]);

  const structuredTable = useMemo(() => {
    return language === "hi" && question.table_hi
      ? question.table_hi
      : question.table;
  }, [question, language]);

  const tableToRender = structuredTable || parsed.table;
  const sizeStyle = fontSize ? { fontSize: `${fontSize}px` } : undefined;

  return (
    <div className="space-y-4" style={sizeStyle}>
      <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
        {tableToRender && !structuredTable ? parsed.textBefore : qText}
      </h3>

      {tableToRender && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/85 max-w-full my-4 bg-white/50 dark:bg-slate-900/10 backdrop-blur-sm shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                {tableToRender.headers.map((header, idx) => (
                  <th
                    key={idx}
                    className={`px-4 py-3 text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-200 ${
                      idx > 0 ? "border-l border-slate-200 dark:border-slate-800" : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableToRender.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="even:bg-slate-50/50 dark:even:bg-slate-850/10 border-b last:border-b-0 border-slate-200 dark:border-slate-800/60 transition hover:bg-slate-100/30 dark:hover:bg-slate-900/10"
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className={`px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 ${
                        cellIdx > 0 ? "border-l border-slate-200 dark:border-slate-800/60" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {parsed.textAfter && !structuredTable && (
        <p className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-300 leading-relaxed mt-2">
          {parsed.textAfter}
        </p>
      )}
    </div>
  );
}
