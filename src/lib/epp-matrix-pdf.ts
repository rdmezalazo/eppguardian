import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/assets/livigui-logo-corporate.png";
import eppDefault from "@/assets/epp-default.jpg";

interface EppRow {
  area: string;
  nombre: string;
  actividad: string | null;
  descripcion: string | null;
  riesgo_previsto: string | null;
  norma: string | null;
  imagen_url: string | null;
}

async function loadImage(src: string): Promise<{ data: string; format: string } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
    const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
    return { data, format: fmt };
  } catch {
    return null;
  }
}

export async function generateEppMatrixPDF(epps: EppRow[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;

  const logoData = await loadImage(logo);
  const defaultImg = await loadImage(eppDefault);

  const imageCache = new Map<string, { data: string; format: string } | null>();
  await Promise.all(
    epps.map(async (e) => {
      if (e.imagen_url && !imageCache.has(e.imagen_url)) {
        imageCache.set(e.imagen_url, await loadImage(e.imagen_url));
      }
    })
  );

  const fechaStr = "16/12/2024";

  const drawHeader = () => {
    const headerY = margin;
    const headerH = 18;
    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.rect(margin, headerY, 26, headerH);
    if (logoData) doc.addImage(logoData.data, logoData.format, margin + 1, headerY + 1, 24, headerH - 2);
    const titleX = margin + 26;
    const titleW = pageW - margin * 2 - 26 - 50;
    doc.rect(titleX, headerY, titleW, headerH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MATRIZ DE EPP's", titleX + titleW / 2, headerY + headerH / 2 + 1, { align: "center", baseline: "middle" });
    const metaX = titleX + titleW;
    const metaW = pageW - margin - metaX;
    const rowH = headerH / 3;
    doc.rect(metaX, headerY, metaW, rowH);
    doc.rect(metaX, headerY + rowH, metaW, rowH);
    doc.rect(metaX, headerY + 2 * rowH, metaW, rowH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Código: L-SSOMA-MAT-006`, metaX + 1.5, headerY + rowH - 1.2);
    doc.text(`Versión: 1.0`, metaX + 1.5, headerY + 2 * rowH - 1.2);
    doc.text(`Fecha: ${fechaStr}`, metaX + 1.5, headerY + 3 * rowH - 1.2);
  };

  const body = epps.map((e) => [
    e.nombre || "",
    e.area || "",
    e.actividad || "",
    e.descripcion || "",
    e.riesgo_previsto || "",
    e.norma || "",
    "",
  ]);

  drawHeader();

  autoTable(doc, {
    startY: margin + 18 + 2,
    margin: { left: margin, right: margin, top: margin + 18 + 2, bottom: margin + 8 },
    head: [["Nombre", "Área", "Actividad", "Descripción", "Riesgo Previsto", "Norma", "Imagen"]],
    body,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      valign: "middle",
      halign: "left",
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [220, 230, 241],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      fontSize: 8,
    },
    tableWidth: pageW - margin * 2,
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 32, halign: "center" },
      2: { cellWidth: 30 },
      3: { cellWidth: 42 },
      4: { cellWidth: 24 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22, halign: "center" },
    },
    didDrawPage: () => {
      drawHeader();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const epp = epps[data.row.index];
        if (!epp) return;
        const img = (epp.imagen_url && imageCache.get(epp.imagen_url)) || defaultImg;
        if (img) {
          const pad = 1;
          const maxW = data.cell.width - pad * 2;
          const maxH = data.cell.height - pad * 2;
          const size = Math.min(maxW, maxH);
          const x = data.cell.x + (data.cell.width - size) / 2;
          const y = data.cell.y + (data.cell.height - size) / 2;
          try {
            doc.addImage(img.data, img.format, x, y, size, size);
          } catch {
            /* ignore */
          }
        }
      }
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        data.cell.styles.minCellHeight = 22;
      }
    },
  });

  const lastY = (doc as any).lastAutoTable?.finalY ?? margin + 20;
  const notes = [
    "Nota:",
    "- Los EPP básicos son de uso obligatorio para todos los trabajadores. Para ejecutar tareas específicas, el trabajador debe requerir el EPP específico para la actividad.",
    "- El no uso o uso inadecuado del EPP conlleva a una sanción de acuerdo a la matriz de sanciones disciplinarias.",
    "- El bloqueador de uso colectivo estará ubicado en el área de almacén para su disposición.",
    "- El cuidado y mantenimiento de los EPP es responsabilidad de cada trabajador.",
    "- El cambio del EPP es solicitado por el trabajador al Supervisor SSOMA. El trabajador deberá entregar el EPP deteriorado para su eliminación y disposición final.",
    "- Las imágenes son referenciales.",
  ];
  const notesH = notes.length * 3.2 + 4;
  let y = lastY + 4;
  if (y + notesH > pageH - 8) {
    doc.addPage();
    drawHeader();
    y = margin + 18 + 6;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  notes.forEach((n) => {
    doc.text(n, margin, y);
    y += 3.2;
  });

  doc.save(`Matriz-EPPs-${fechaStr.replace(/\//g, "-")}.pdf`);
}
