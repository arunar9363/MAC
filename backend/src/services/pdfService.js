const puppeteer = require('puppeteer')

function getRiskColor(risk) {
  const map = {
    critical: '#ef4444',
    high: '#f97316',
    moderate: '#eab308',
    low: '#22c55e',
    minimal: '#6370ef',
  }
  return map[risk?.toLowerCase()] || '#888'
}

function buildHTML(analysis, user) {
  const report = analysis.finalReport || {}
  const features = analysis.extractedFeatures || {}
  const face = features.face || {}
  const voice = features.voice || {}
  const text = features.text || {}
  const riskColor = getRiskColor(report.risk_level)

  const emotionRows = Object.entries(face.emotions || {})
    .sort(([, a], [, b]) => b - a)
    .map(([emotion, val]) => `
      <tr>
        <td style="padding:6px 12px;text-transform:capitalize;color:#666">${emotion}</td>
        <td style="padding:6px 12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="height:8px;width:${Math.round(val * 200)}px;background:#6370ef;border-radius:4px;"></div>
            <span style="color:#333;font-family:monospace">${(val * 100).toFixed(1)}%</span>
          </div>
        </td>
      </tr>
    `).join('')

  const patternTags = (report.patterns_detected || [])
    .map((p) => `<span style="display:inline-block;padding:4px 12px;background:#fff3e0;border:1px solid #f97316;border-radius:20px;font-size:12px;color:#c2410c;margin:3px;text-transform:capitalize">${p}</span>`)
    .join('')

  const recommendations = (report.recommendations || [])
    .map((r, i) => `<li style="margin-bottom:8px;color:#444">${r}</li>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif; background: #f8f9fa; color: #222; }
  .page { width: 794px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, #1e1f4b 0%, #343580 100%); color: #fff; padding: 40px 50px 35px; }
  .header-logo { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
  .header-sub { font-size: 12px; opacity: 0.6; letter-spacing: 2px; text-transform: uppercase; }
  .header-meta { margin-top: 20px; display: flex; gap: 40px; }
  .meta-item label { font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
  .meta-item p { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .risk-banner { padding: 20px 50px; background: ${riskColor}15; border-bottom: 3px solid ${riskColor}; display: flex; align-items: center; gap: 20px; }
  .risk-badge { padding: 8px 20px; background: ${riskColor}; color: #fff; border-radius: 20px; font-weight: 700; font-size: 14px; text-transform: uppercase; }
  .risk-state { font-size: 18px; font-weight: 600; color: #222; }
  .risk-conf { font-size: 13px; color: #666; margin-top: 2px; }
  .content { padding: 40px 50px; }
  .section { margin-bottom: 35px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6370ef; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
  .explanation-box { background: #f8f9ff; border-left: 4px solid #6370ef; padding: 20px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.7; color: #333; }
  .signal-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
  .signal-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; }
  .signal-card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6370ef; margin-bottom: 8px; }
  .signal-card-text { font-size: 12px; line-height: 1.5; color: #555; }
  .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .metric-label { color: #666; }
  .metric-value { font-weight: 600; font-family: monospace; color: #333; }
  .footer { background: #f8f9fa; border-top: 1px solid #eee; padding: 20px 50px; display: flex; justify-content: space-between; font-size: 11px; color: #999; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { background: #fff; } }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-logo">MAC</div>
    <div class="header-sub">Medical Affective Computing Platform</div>
    <div class="header-meta">
      <div class="meta-item">
        <label>Patient ID</label>
        <p>${analysis.patientId}</p>
      </div>
      <div class="meta-item">
        <label>Report ID</label>
        <p style="font-family:monospace;font-size:12px">${analysis._id}</p>
      </div>
      <div class="meta-item">
        <label>Clinician</label>
        <p>${user.name}</p>
      </div>
      <div class="meta-item">
        <label>Date</label>
        <p>${new Date(analysis.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="meta-item">
        <label>Processing Time</label>
        <p>${((analysis.processingTime || 0) / 1000).toFixed(1)}s</p>
      </div>
    </div>
  </div>

  <!-- Risk Banner -->
  <div class="risk-banner">
    <span class="risk-badge">${report.risk_level || 'unknown'} Risk</span>
    <div>
      <div class="risk-state" style="text-transform:capitalize">${report.emotional_state || 'Undetermined'}</div>
      <div class="risk-conf">Confidence: ${Math.round((report.confidence || 0) * 100)}% · Inputs: ${[analysis.inputs.hasVideo && 'Video', analysis.inputs.hasAudio && 'Audio', analysis.inputs.hasText && 'Text'].filter(Boolean).join(', ')}</div>
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    <!-- Patterns -->
    ${patternTags ? `
    <div class="section">
      <div class="section-title">Detected Psychological Patterns</div>
      <div>${patternTags}</div>
    </div>` : ''}

    <!-- AI Explanation -->
    <div class="section">
      <div class="section-title">Clinical AI Reasoning</div>
      <div class="explanation-box">${report.explanation || 'No explanation generated.'}</div>
    </div>

    <!-- Modality Signals -->
    <div class="section">
      <div class="section-title">Modality Signal Summary</div>
      <div class="signal-grid">
        <div class="signal-card">
          <div class="signal-card-title">🎭 Facial</div>
          <div class="signal-card-text">${report.signals?.face || 'No facial data'}</div>
        </div>
        <div class="signal-card">
          <div class="signal-card-title">🎙 Voice</div>
          <div class="signal-card-text">${report.signals?.voice || 'No voice data'}</div>
        </div>
        <div class="signal-card">
          <div class="signal-card-title">📝 Text</div>
          <div class="signal-card-text">${report.signals?.text || 'No text data'}</div>
        </div>
      </div>
    </div>

    <!-- Face metrics -->
    ${face.dominant_emotion ? `
    <div class="section">
      <div class="section-title">Facial Emotion Distribution</div>
      <table>${emotionRows}</table>
      <div class="metric-row" style="margin-top:10px">
        <span class="metric-label">Valence</span>
        <span class="metric-value">${face.valence?.toFixed(3)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Arousal</span>
        <span class="metric-value">${face.arousal?.toFixed(3)}</span>
      </div>
    </div>` : ''}

    <!-- Voice metrics -->
    ${voice.energy_mean !== undefined ? `
    <div class="section">
      <div class="section-title">Voice Biomarkers</div>
      ${[
        ['Energy Mean', voice.energy_mean?.toFixed(3)],
        ['Pitch Mean (F0)', `${voice.pitch_mean?.toFixed(1)} Hz`],
        ['Pitch Variability', `${voice.pitch_std?.toFixed(1)} Hz`],
        ['Speech Rate', `${voice.speech_rate?.toFixed(2)} syl/s`],
        ['Jitter', voice.jitter?.toFixed(4)],
        ['Shimmer', voice.shimmer?.toFixed(4)],
      ].map(([l, v]) => `<div class="metric-row"><span class="metric-label">${l}</span><span class="metric-value">${v || 'N/A'}</span></div>`).join('')}
    </div>` : ''}

    <!-- Text metrics -->
    ${text.emotion ? `
    <div class="section">
      <div class="section-title">Text/Linguistic Analysis</div>
      ${[
        ['Primary Emotion', text.emotion],
        ['Sentiment', text.sentiment],
        ['Positive Score', text.pos?.toFixed(3)],
        ['Negative Score', text.neg?.toFixed(3)],
        ['Compound Score', text.compound?.toFixed(3)],
        ['Hopelessness Score', text.hopelessness_score?.toFixed(3)],
      ].map(([l, v]) => `<div class="metric-row"><span class="metric-label">${l}</span><span class="metric-value">${v || 'N/A'}</span></div>`).join('')}
    </div>` : ''}

    <!-- Recommendations -->
    ${recommendations ? `
    <div class="section">
      <div class="section-title">Clinical Recommendations</div>
      <ol style="padding-left:20px;">${recommendations}</ol>
    </div>` : ''}

    <!-- Disclaimer -->
    <div style="background:#fff8e1;border:1px solid #f59e0b;border-radius:8px;padding:15px;font-size:12px;color:#78350f;line-height:1.6;">
      <strong>⚠ Disclaimer:</strong> This report is generated by an AI system for clinical decision support only. 
      It does not constitute a medical diagnosis and must be reviewed by a qualified healthcare professional. 
      All findings require clinical validation before any therapeutic action.
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>MAC — Medical Affective Computing</span>
    <span>Generated: ${new Date().toISOString()}</span>
    <span>CONFIDENTIAL — Patient Health Record</span>
  </div>
</div>
</body>
</html>`
}

async function generate(analysis, user) {
  const html = buildHTML(analysis, user)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return pdf
  } finally {
    await browser.close()
  }
}

module.exports = { generate }
