import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { Worker, EppItem, KardexEntry, CompanyInfo } from "@/types/kardex";
import logo from "@/assets/livigui-logo-corporate.png";

async function loadImage(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

interface Args {
  company: CompanyInfo;
  worker: Worker;
  entries: KardexEntry[];
  epps: EppItem[];
  preview?: boolean; // if true, returns a blob URL instead of downloading
}

export async function generateKardexPDF({ company, worker, entries, epps, preview }: Args): Promise<string | void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 8;

  const logoData = await loadImage(logo);

  // ===== Header bar =====
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  // Logo box
  doc.rect(margin, margin, 28, 18);
  doc.addImage(logoData, "PNG", margin + 1, margin + 1, 26, 16);
  // Title box
  const titleX = margin + 28;
  const titleW = pageW - margin * 2 - 28 - 60;
  doc.rect(titleX, margin, titleW, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(company.titulo, titleX + titleW / 2, margin + 11, { align: "center", maxWidth: titleW - 4 });
  // Code box
  const codeX = titleX + titleW;
  const codeW = 60;
  doc.rect(codeX, margin, codeW, 6);
  doc.rect(codeX, margin + 6, codeW, 6);
  doc.rect(codeX, margin + 12, codeW, 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Código: ${company.codigo}`, codeX + 2, margin + 4);
  doc.text(`Versión: ${company.version}`, codeX + 2, margin + 10);
  doc.text(`Fecha: ${company.fecha}`, codeX + 2, margin + 16);

  let y = margin + 18;

  // ===== Datos empresa / trabajador =====
  const labelW = 38;
  const rightLabelW = 28;
  const rightValW = 50;
  const valW = pageW - margin * 2 - labelW - rightLabelW - rightValW;
  const rowH = 7;

  const drawRow = (l1: string, v1: string, l2: string, v2: string, h = rowH) => {
    doc.setFillColor(204, 215, 220);
    doc.rect(margin, y, labelW, h, "FD");
    doc.rect(margin + labelW, y, valW, h);
    doc.setFillColor(204, 215, 220);
    doc.rect(margin + labelW + valW, y, rightLabelW, h, "FD");
    doc.rect(margin + labelW + valW + rightLabelW, y, rightValW, h);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const l1Lines = doc.splitTextToSize(l1, labelW - 3);
    const l2Lines = doc.splitTextToSize(l2, rightLabelW - 3);
    doc.text(l1Lines, margin + 1.5, y + 4);
    doc.text(l2Lines, margin + labelW + valW + 1.5, y + 4);
    doc.setFont("helvetica", "normal");
    const v1Lines = doc.splitTextToSize(v1, valW - 3);
    const v2Lines = doc.splitTextToSize(v2, rightValW - 3);
    doc.text(v1Lines, margin + labelW + 1.5, y + 4);
    doc.text(v2Lines, margin + labelW + valW + rightLabelW + 1.5, y + 4);
    y += h;
  };

  drawRow("Razón Social", company.razonSocial, "RUC", company.ruc);
  drawRow("Dirección", company.direccion, "Actividad Económica", company.actividadEconomica, 11);
  drawRow("Apellidos y Nombres del Trabajador", `${worker.lastName}, ${worker.firstName}`, "N° DNI", worker.dni, 11);
  drawRow("Puesto", worker.position, "Área", worker.area);

  y += 2;

  // ===== Declaración legal =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const declaration = (company.textoDescriptivo ?? "").replace(/\{razonSocial\}/g, company.razonSocial);
  const declLines = doc.splitTextToSize(declaration, pageW - margin * 2);
  doc.text(declLines, margin, y + 4);
  y += declLines.length * 3.5 + 4;

  // ===== Tabla de registros =====
  const eppMap = new Map(epps.map((e) => [e.id, e]));
  const rows = entries.map((e, i) => [
    String(i + 1),
    eppMap.get(e.eppId)?.name ?? "—",
    String(e.quantity),
    e.deliveryDate ? format(parseISO(e.deliveryDate), "dd/MM/yyyy") : "",
    e.deliveryType,
    reasonLabelShort(e.reason),
    e.returnDate ? format(parseISO(e.returnDate), "dd/MM/yyyy") : "",
    "",
    "",
  ]);
  // Track which rows are voided so we can render the name with strikethrough + "(Anulado)"
  const voidedRows = new Set<number>();
  entries.forEach((e, i) => { if (e.voided) voidedRows.add(i); });
  // Pad rows
  while (rows.length < 18) rows.push(["", "", "", "", "", "", "", "", ""]);

  const h = company.headers;
  autoTable(doc, {
    startY: y,
    head: [[
      h.nro,
      h.nombre,
      h.cantidad,
      h.fechaEntrega,
      h.tipoEntrega,
      h.motivoEntrega,
      h.fechaDevolucion,
      h.firmaUsuario,
      h.firmaResponsable,
    ]],
    body: rows,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, valign: "middle", halign: "center", lineColor: [120, 120, 120], lineWidth: 0.2, minCellHeight: 9 },
    headStyles: { fillColor: [204, 215, 220], textColor: [20, 20, 20], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 50, halign: "left" },
      2: { cellWidth: 16 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 24 },
      6: { cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: 0 }, // auto fill remaining
    },
    margin: { left: margin, right: margin },
    willDrawCell: (data) => {
      if (data.section !== "body") return;
      const entry = entries[data.row.index];
      if (entry?.voided && data.column.index === 1) {
        // Suppress autoTable's default text render; we draw it manually in didDrawCell
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      const entry = entries[data.row.index];
      if (!entry) return;
      const sig = data.column.index === 7 ? entry.workerSignature : data.column.index === 8 ? entry.responsibleSignature : null;
      if (sig && !entry.voided) {
        try {
          doc.addImage(sig, "PNG", data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2);
        } catch {/* ignore */}
      }
      // For voided rows: render the name (col 1) with strikethrough + "(Anulado)" tag
      if (entry.voided && data.column.index === 1) {
        const eppName = eppMap.get(entry.eppId)?.name ?? "—";
        const cx = data.cell.x + 1.5;
        const cy = data.cell.y + data.cell.height / 2 + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(110, 110, 110);
        const nameW = doc.getTextWidth(eppName);
        doc.text(eppName, cx, cy);
        // strikethrough line
        doc.setDrawColor(110, 110, 110);
        doc.setLineWidth(0.25);
        doc.line(cx, cy - 0.8, cx + nameW, cy - 0.8);
        // "(Anulado)" label after the name
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(180, 50, 50);
        doc.text(" (Anulado)", cx + nameW, cy);
        // reset
        doc.setTextColor(20, 20, 20);
        doc.setDrawColor(120, 120, 120);
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(company.pieTexto ?? "", margin, finalY);

  if (preview) {
    const blob = doc.output("blob");
    return URL.createObjectURL(blob);
  }
  doc.save(`Kardex_EPP_${worker.dni}_${worker.lastName.replace(/\s+/g, "_")}.pdf`);
}

function reasonLabelShort(r: string): string {
  const m: Record<string, string> = {
    deterioro: "Deterioro",
    fin_vida_util: "Fin de vida útil",
    perdida: "Pérdida",
    entrega_inicial: "Entrega inicial",
    otro: "Otro",
  };
  return m[r] ?? r;
}
