const PDFDocument = require('pdfkit');

const COLORS = {
  bg:         '#F5FAF7',
  primary:    '#071A0E',
  accent:     '#0E9E57',
  accentDark: '#065f34',
  muted:      '#2E6645',
  subtle:     '#5A9A72',
  border:     '#C8E8D4',
  white:      '#FFFFFF',
  risk: {
    minimal:  { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
    low:      { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    moderate: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    high:     { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    critical: { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' },
  },
};

const RISK_LABELS = {
  minimal:  '✓ MINIMAL RISK',
  low:      '✓ LOW RISK',
  moderate: '⚠ MODERATE RISK',
  high:     '⚡ HIGH RISK',
  critical:  '🚨 CRITICAL RISK',
};

function drawRoundedRect(doc, x, y, w, h, r, fillColor, strokeColor) {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fillAndStroke(fillColor, strokeColor)
    .restore();
}

function sectionTitle(doc, text, y) {
  doc.fontSize(8).font('Helvetica-Bold')
    .fillColor(COLORS.subtle)
    .text(text.toUpperCase(), 50, y, { characterSpacing: 1.5 });
  doc.moveTo(50, y + 14).lineTo(545, y + 14)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();
  return y + 22;
}

function metricBar(doc, label, value, color, x, y, width) {
  const pct = Math.min(Math.max(value || 0, 0), 1);
  doc.fontSize(8).font('Helvetica').fillColor(COLORS.muted).text(label, x, y);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text(`${Math.round(pct * 100)}%`, x + width - 25, y, { width: 25, align: 'right' });
  const barY = y + 12;
  const barW = width - 30;
  doc.roundedRect(x, barY, barW, 5, 2).fill('#e2e8f0');
  if (pct > 0) doc.roundedRect(x, barY, barW * pct, 5, 2).fill(color);
  return y + 24;
}

const generatePDFReport = (analysis, user) => {
  return new Promise((resolve, reject) => {
    try {
      // ── Correct field mapping from MongoDB schema ──
      const report   = analysis.finalReport        || {};
      const features = analysis.extractedFeatures  || {};
      const patientId = analysis.patientId         || 'UNKNOWN';
      const sessionId = analysis._id?.toString()   || 'N/A';
      const createdAt = analysis.createdAt         || new Date();

      const date = new Date(createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const riskLevel  = report.risk_level || 'low';
      const riskColors = COLORS.risk[riskLevel] || COLORS.risk.low;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title:   `MAC Clinical Report - ${patientId}`,
          Author:  user?.name || 'MAC System',
          Subject: 'Clinical Emotion Analysis Report',
        },
      });

      const chunks = [];
      doc.on('data',  chunk => chunks.push(chunk));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 495;
      let y = 50;

      // ── HEADER ───────────────────────────────────────────
      drawRoundedRect(doc, 50, y, W, 70, 8, COLORS.accent, COLORS.accent);
      doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.white).text('MAC', 65, y + 14);
      doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.85)')
        .text('Medical Affective Computing', 65, y + 40);
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.white)
        .text(`Clinician: ${user?.name || 'Unknown'}`,   320, y + 12, { width: 210, align: 'right' })
        .text(`Generated: ${date}`,                       320, y + 26, { width: 210, align: 'right' })
        .text(`Session: ${sessionId.slice(0, 24)}`,       320, y + 40, { width: 210, align: 'right' });
      y += 86;

      // ── PATIENT INFO ─────────────────────────────────────
      y = sectionTitle(doc, 'Patient Information', y);
      const cardW = (W - 20) / 3;
      [
        { label: 'Patient ID',     value: patientId },
        { label: 'Session ID',     value: sessionId.slice(0, 20) + '...' },
        { label: 'Analysis Date',  value: new Date(createdAt).toLocaleDateString('en-IN') },
      ].forEach((item, i) => {
        const cx = 50 + i * (cardW + 10);
        drawRoundedRect(doc, cx, y, cardW, 44, 6, '#f0faf4', COLORS.border);
        doc.fontSize(7).font('Helvetica').fillColor(COLORS.subtle)
          .text(item.label.toUpperCase(), cx + 10, y + 8, { characterSpacing: 0.5 });
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary)
          .text(item.value, cx + 10, y + 20, { width: cardW - 20 });
      });
      y += 58;

      // ── ASSESSMENT RESULT ─────────────────────────────────
      y = sectionTitle(doc, 'Assessment Result', y);
      drawRoundedRect(doc, 50, y, W, 72, 8, riskColors.bg, riskColors.border);
      const badgeText = RISK_LABELS[riskLevel] || riskLevel.toUpperCase();
      doc.fontSize(11).font('Helvetica-Bold').fillColor(riskColors.text)
        .text(report.emotional_state || 'Analysis Complete', 65, y + 12, { width: 300 });
      drawRoundedRect(doc, 385, y + 10, 110, 22, 11, riskColors.border, riskColors.border);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(riskColors.text)
        .text(badgeText, 385, y + 15, { width: 110, align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor(riskColors.text)
        .text(`Confidence: ${Math.round((report.confidence || 0) * 100)}%`, 65, y + 34);
      const confBarY = y + 46;
      doc.roundedRect(65, confBarY, 250, 6, 3).fill('#e2e8f0');
      doc.roundedRect(65, confBarY, 250 * (report.confidence || 0), 6, 3).fill(COLORS.accent);
      y += 88;

      // ── DETECTED PATTERNS ─────────────────────────────────
      if (report.patterns_detected?.length > 0) {
        y = sectionTitle(doc, 'Detected Patterns', y);
        let px = 50;
        report.patterns_detected.forEach(p => {
          const tw = doc.widthOfString(p, { fontSize: 8 }) + 20;
          if (px + tw > 540) { px = 50; y += 22; }
          drawRoundedRect(doc, px, y, tw, 18, 9, '#fef9c3', '#fde047');
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#854d0e')
            .text(p, px + 10, y + 5, { width: tw - 20 });
          px += tw + 8;
        });
        y += 32;
      }

      // ── MODALITY SIGNALS ──────────────────────────────────
      y = sectionTitle(doc, 'Modality Signals', y);
      const sigData = [
        { icon: '🎭', label: 'Face',  content: report.signals?.face,  color: '#3b82f6' },
        { icon: '🎙', label: 'Voice', content: report.signals?.voice, color: '#8b5cf6' },
        { icon: '💬', label: 'Text',  content: report.signals?.text,  color: COLORS.accent },
      ];
      sigData.forEach((sig, i) => {
        if (!sig.content) return;
        const cx = 50 + i * (cardW + 10);
        const lines = doc.heightOfString(sig.content, { width: cardW - 20, fontSize: 8 });
        const ch = Math.max(70, lines + 36);
        drawRoundedRect(doc, cx, y, cardW, ch, 6, COLORS.white, COLORS.border);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(sig.color)
          .text(`${sig.icon} ${sig.label}`, cx + 10, y + 8);
        doc.fontSize(7.5).font('Helvetica').fillColor(COLORS.muted)
          .text(sig.content, cx + 10, y + 22, { width: cardW - 20, lineGap: 2 });
      });
      const maxSigH = sigData.reduce((max, sig) => {
        if (!sig.content) return max;
        return Math.max(max, doc.heightOfString(sig.content, { width: cardW - 20, fontSize: 8 }) + 36);
      }, 70);
      y += maxSigH + 16;

      // ── CLINICAL AI REASONING ─────────────────────────────
      if (y > 650) { doc.addPage(); y = 50; }
      y = sectionTitle(doc, 'Clinical AI Reasoning', y);

      const explanation = report.explanation || 'No clinical explanation available.';
      const contradictions = report.contradictions?.length
        ? `\n\nCross-Modal Contradictions:\n${report.contradictions.map(c => `• ${c}`).join('\n')}`
        : '';
      const fullReasoning = explanation + contradictions;

      const expH = doc.heightOfString(fullReasoning, { width: W - 30, fontSize: 9, lineGap: 3 });
      const expBoxH = expH + 40;

      drawRoundedRect(doc, 50, y, W, expBoxH, 8, '#f0fdf4', '#86efac');
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.accentDark)
        .text('Groq LLaMA 3.3 — Multimodal Clinical Agent', 65, y + 10);
      doc.fontSize(7).font('Helvetica').fillColor(COLORS.subtle)
        .text(`Risk: ${riskLevel.toUpperCase()}  |  Confidence: ${Math.round((report.confidence || 0) * 100)}%  |  Modalities: ${[features.face ? 'Face' : null, features.voice ? 'Voice' : null, features.text ? 'Text' : null].filter(Boolean).join(', ') || 'N/A'}`,
          65, y + 22, { width: W - 30 });
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.primary)
        .text(fullReasoning, 65, y + 34, { width: W - 30, lineGap: 3 });
      y += expBoxH + 14;

      // ── RECOMMENDATIONS ───────────────────────────────────
      if (report.recommendations?.length > 0) {
        if (y > 650) { doc.addPage(); y = 50; }
        y = sectionTitle(doc, 'Clinical Recommendations', y);
        report.recommendations.forEach((rec, i) => {
          if (y > 720) { doc.addPage(); y = 50; }
          const recH = doc.heightOfString(rec, { width: W - 24, fontSize: 8.5 });
          drawRoundedRect(doc, 50, y, W, recH + 14, 6, i % 2 === 0 ? '#f0fdf4' : COLORS.white, COLORS.border);
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLORS.accent)
            .text(`${i + 1}.`, 62, y + 7);
          doc.fontSize(8.5).font('Helvetica').fillColor(COLORS.primary)
            .text(rec, 80, y + 7, { width: W - 40, lineGap: 2 });
          y += recH + 20;
        });
        y += 6;
      }

      // ── BIOMETRIC FEATURES ────────────────────────────────
      if (y > 600) { doc.addPage(); y = 50; }
      y = sectionTitle(doc, 'Extracted Biometric Features', y);
      const face  = features.face;
      const voice = features.voice;
      const text  = features.text;
      const colW  = (W - 20) / 3;

      if (face) {
        drawRoundedRect(doc, 50, y, colW, 110, 6, COLORS.white, COLORS.border);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#3b82f6').text('🎭 Facial Features', 60, y + 10);
        let fy = y + 26;
        fy = metricBar(doc, 'Valence', (face.valence + 1) / 2, '#3b82f6', 60, fy, colW - 20);
        fy = metricBar(doc, 'Arousal', face.arousal,           '#8b5cf6', 60, fy, colW - 20);
        doc.fontSize(7.5).font('Helvetica').fillColor(COLORS.subtle)
          .text(`Dominant: ${face.dominant_emotion || '—'}  |  Confidence: ${Math.round((face.confidence || 0) * 100)}%`, 60, fy + 4);
      }

      if (voice) {
        const vx = 50 + colW + 10;
        drawRoundedRect(doc, vx, y, colW, 110, 6, COLORS.white, COLORS.border);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#8b5cf6').text('🎙 Voice Biomarkers', vx + 10, y + 10);
        let vy = y + 26;
        vy = metricBar(doc, 'Energy',      voice.energy_mean,                                       '#8b5cf6', vx + 10, vy, colW - 20);
        vy = metricBar(doc, 'Speech Rate', voice.speech_rate ? Math.min(voice.speech_rate / 5, 1) : 0, '#f59e0b', vx + 10, vy, colW - 20);
        doc.fontSize(7.5).font('Helvetica').fillColor(COLORS.subtle)
          .text(`Pitch: ${voice.pitch_mean?.toFixed(0) || '—'} Hz  |  HNR: ${voice.hnr?.toFixed(1) || '—'} dB`, vx + 10, vy + 4);
      }

      if (text) {
        const tx = 50 + (colW + 10) * 2;
        drawRoundedRect(doc, tx, y, colW, 110, 6, COLORS.white, COLORS.border);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.accent).text('💬 Text Analysis', tx + 10, y + 10);
        let ty = y + 26;
        ty = metricBar(doc, 'Positive',   text.pos || 0,                    COLORS.accent,  tx + 10, ty, colW - 20);
        ty = metricBar(doc, 'Negative',   text.neg || 0,                    '#ef4444',      tx + 10, ty, colW - 20);
        doc.fontSize(7.5).font('Helvetica').fillColor(COLORS.subtle)
          .text(`Emotion: ${text.emotion || '—'}  |  Hopelessness: ${((text.hopelessness_score || 0) * 100).toFixed(0)}%`, tx + 10, ty + 4);
      }

      y += 126;

      // ── FOOTER ────────────────────────────────────────────
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.moveTo(50, 780).lineTo(545, 780).strokeColor(COLORS.border).lineWidth(0.5).stroke();
        doc.fontSize(7).font('Helvetica').fillColor(COLORS.subtle)
          .text('MAC v1.0 — Confidential Clinical Report — For Professional Use Only', 50, 786, { width: 350 })
          .text(`Page ${i + 1} of ${pageCount}`, 50, 786, { width: W, align: 'right' });
        doc.fontSize(6.5).fillColor('#94a3b8')
          .text('Generated by AI — Not a substitute for professional medical advice', 50, 798, { width: W, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generate: generatePDFReport };