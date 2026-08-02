import { jsPDF } from "jspdf";

export type CertificateData = {
  studentName: string;
  rankName: string;
  rankIcon?: string | null;
  startedAt?: string | null;
  issuedAt?: Date;
  classTime?: string | null;
  practiceMinutes?: number;
  attendanceCount?: number;
};

const CRIMSON: [number, number, number] = [124, 20, 36];
const GOLD: [number, number, number] = [178, 138, 60];

export function generateCertificatePDF(data: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const issued = data.issuedAt ?? new Date();

  // fundo
  doc.setFillColor(252, 250, 247);
  doc.rect(0, 0, W, H, "F");

  // molduras
  doc.setDrawColor(...CRIMSON);
  doc.setLineWidth(2.5);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(15, 15, W - 30, H - 30);

  // cabeçalho
  doc.setTextColor(...CRIMSON);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ESCOLA DE VIOLAO EZEQUIEL PEREIRA", W / 2, 34, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 30, 38, W / 2 + 30, 38);

  doc.setFontSize(30);
  doc.setTextColor(40, 30, 28);
  doc.text("CERTIFICADO DE PATENTE", W / 2, 55, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 80, 78);
  doc.text("Certificamos que", W / 2, 74, { align: "center" });

  // nome
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...CRIMSON);
  doc.text(data.studentName, W / 2, 90, { align: "center", maxWidth: W - 70 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 80, 78);
  doc.text(
    "concluiu com dedicacao as exigencias tecnicas e musicais e alcancou a patente de",
    W / 2,
    103,
    { align: "center", maxWidth: W - 60 },
  );

  // patente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...GOLD);
  doc.text(data.rankName.toUpperCase(), W / 2, 121, { align: "center" });

  // detalhes
  const details: string[] = [];
  if (data.startedAt) {
    details.push(`Inicio dos estudos: ${new Date(`${data.startedAt}T12:00:00`).toLocaleDateString("pt-BR")}`);
  }
  if (data.classTime) details.push(`Turma: sabado ${data.classTime}`);
  if (data.attendanceCount) details.push(`Aulas registradas: ${data.attendanceCount}`);
  if (data.practiceMinutes) {
    const h = Math.floor(data.practiceMinutes / 60);
    const m = data.practiceMinutes % 60;
    details.push(`Pratica registrada: ${h}h${String(m).padStart(2, "0")}`);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 100, 98);
  doc.text(details.join("   |   "), W / 2, 134, { align: "center", maxWidth: W - 50 });

  // assinatura
  doc.setDrawColor(...GOLD);
  doc.line(W / 2 - 45, 163, W / 2 + 45, 163);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 30, 28);
  doc.text("Ezequiel Pereira", W / 2, 170, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 110, 108);
  doc.text("Professor e Mestre da Escola", W / 2, 176, { align: "center" });

  doc.setFontSize(9);
  doc.text(
    `Portal California  ·  Emitido em ${issued.toLocaleDateString("pt-BR", { dateStyle: "long" })}`,
    W / 2,
    189,
    { align: "center" },
  );

  const slug = data.studentName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`certificado-${slug || "aluno"}.pdf`);
}
