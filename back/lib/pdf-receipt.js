import PDFDocument from "pdfkit";
function streamReceiptPdf(res, data) {
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${data.transactionId}.pdf"`);
  try {
    doc.pipe(res);
    const primary = "#0b74d1";
    const lightRow = "#eef7ff";
    const textDark = "#0f172a";
    const textMuted = "#475569";
    const headerName = data.bankName ?? "SecureBank";
    doc.rect(0, 0, doc.page.width, 96).fill("#ffffff");
    doc.circle(56, 48, 28).fill(primary);
    doc.fontSize(14).fillColor("#ffffff").font("Helvetica-Bold").text("SB", 44, 36, { width: 24, align: "center" });
    doc.fontSize(16).fillColor(textDark).font("Helvetica-Bold").text(headerName, 96, 36);
    const decorX = doc.page.width - 150;
    doc.circle(decorX, 40, 18).fill("#60a5fa");
    doc.circle(decorX + 34, 40, 18).fill("#3b82f6");
    doc.roundedRect(decorX + 68, 28, 56, 24, 12).fill("#2563eb");
    doc.fontSize(18).fillColor(textDark).font("Helvetica-Bold").text("PAYMENT RECEIPT", 0, 112, { align: "center" });
    doc.fontSize(9).fillColor(textMuted).font("Helvetica").text(`Receipt #${data.transactionId.toString().padStart(8, "0")} \u2022 ${data.createdAt.toLocaleString()}`, 0, 132, { align: "center" });
    doc.moveTo(48, 146).lineTo(doc.page.width - 48, 146).lineWidth(1).strokeColor("#e6eef8").stroke();
    const typeLabel = {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      transfer_out: "Transfer Sent",
      transfer_in: "Transfer Received"
    };
    const label = typeLabel[data.type] ?? data.type;
    let rows = [
      ["Account", `\u2022\u2022\u2022\u2022${data.accountNumber.slice(-4)}`],
      ["Account Holder", data.userName],
      ["Transaction Type", label],
      ["Reference", `#${data.transactionId.toString().padStart(8, "0")}`],
      ["Date & Time", data.createdAt.toLocaleString()]
    ];
    if (data.description) rows.push(["Description", data.description]);
    if (data.balanceAfter !== null) rows.push(["Balance After", `${data.currency} ${data.balanceAfter.toFixed(2)}`]);
    if (data.metadata) {
      if (data.metadata.bankName) rows.push(["Destination Bank", data.metadata.bankName]);
      if (data.metadata.bankAccountNumber) rows.push(["Destination Account", `\u2022\u2022\u2022\u2022${data.metadata.bankAccountNumber.slice(-4)}`]);
      if (data.metadata.senderBank) rows.push(["Sender Bank", data.metadata.senderBank]);
    }
    let y = 156;
    doc.fontSize(10).font("Helvetica");
    const footerTop = doc.page.height - 120;
    const rowHeight = 26;
    const availableRows = Math.max(0, Math.floor((footerTop - y - 40) / rowHeight));
    const originalRowCount = rows.length;
    if (originalRowCount > availableRows) {
      const visible = Math.max(0, availableRows - 1);
      const omitted = originalRowCount - visible;
      rows = rows.slice(0, visible);
      rows.push(["Additional details", `${omitted} item(s) omitted`]);
    }
    for (let i = 0; i < rows.length; i++) {
      const [label2, value] = rows[i];
      const rowY = y + i * rowHeight;
      if (i % 2 === 0) {
        doc.rect(48, rowY - 6, doc.page.width - 96, rowHeight + 6).fill(lightRow).fillColor(textDark);
      }
      doc.fillColor(textMuted).font("Helvetica-Bold").fontSize(9).text(label2, 56, rowY - 2, { width: 200 });
      doc.fillColor(textDark).font("Helvetica").fontSize(10).text(value, 260, rowY - 2, { width: doc.page.width - 320, ellipsis: true });
    }
    const footerY = doc.page.height - 66;
    doc.rect(0, footerY, doc.page.width, 66).fill(primary);
    doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold").text(headerName, 56, footerY + 16);
    doc.fontSize(9).fillColor("#e6f6ff").font("Helvetica").text("contact@securebank.com", 0, footerY + 36, { align: "right", width: doc.page.width - 56 });
    doc.end();
  } catch (err) {
    try {
      if (doc && typeof doc.destroy === "function") doc.destroy();
    } catch (e) {
    }
    console.error("PDF generation error:", err);
    if (!res.headersSent) {
      try {
        res.status(500).json({ error: "Failed to generate PDF" });
      } catch (e) {
        try {
          res.end();
        } catch {
        }
      }
    } else {
      try {
        res.end();
      } catch {
      }
    }
  }
}
export {
  streamReceiptPdf
};
//# sourceMappingURL=pdf-receipt.js.map
