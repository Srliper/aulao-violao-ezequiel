import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportRow = { nome: string; status: string };

function fileBase(date: string, turma: string) {
  return `presenca_${date}_${turma.replace(":", "h")}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAttendanceCSV(rows: ExportRow[], date: string, turma: string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ["Data", "Turma", "Aluno", "Status"].map(esc).join(";"),
    ...rows.map((r) => [date, `Sábado ${turma}`, r.nome, r.status].map(esc).join(";")),
  ];
  // BOM para acentos abrirem certo no Excel
  download(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${fileBase(date, turma)}.csv`);
}

export function exportAttendancePDF(rows: ExportRow[], date: string, turma: string) {
  const doc = new jsPDF();
  const dataBR = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { dateStyle: "long" });

  doc.setFontSize(16);
  doc.text("Escola de Violão Ezequiel Pereira", 14, 18);
  doc.setFontSize(11);
  doc.text(`Lista de presença · Sábado ${turma}`, 14, 26);
  doc.text(dataBR, 14, 32);

  const total = rows.length;
  const presentes = rows.filter((r) => r.status === "Presente").length;
  const atrasados = rows.filter((r) => r.status === "Atrasado").length;
  const faltas = rows.filter((r) => r.status === "Faltou").length;

  autoTable(doc, {
    startY: 40,
    head: [["#", "Aluno", "Status"]],
    body: rows.map((r, i) => [String(i + 1), r.nome, r.status]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [124, 20, 36] },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Total: ${total}  ·  Presentes: ${presentes}  ·  Atrasados: ${atrasados}  ·  Faltas: ${faltas}`, 14, y);

  doc.save(`${fileBase(date, turma)}.pdf`);
}
