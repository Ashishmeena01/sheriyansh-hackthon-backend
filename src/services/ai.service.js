import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude AI Service for ProctorVision
 * Supports Claude 3.5 Sonnet analysis for proctored examination attempts
 */
export const analyzeAttemptWithClaude = async ({
  examTitle,
  studentName,
  durationMinutes,
  events,
  riskScore,
}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

  // Event summary breakdown
  const eventCounts = events.reduce((acc, ev) => {
    acc[ev.type] = (acc[ev.type] || 0) + 1;
    return acc;
  }, {});

  const simplifiedEvents = events.map((ev) => ({
    type: ev.type,
    time: ev.occurredAt,
    durationMs: ev.durationMs,
    confidence: ev.confidence,
    severity: ev.severity,
  }));

  // If no API key is provided, use high-quality rule-based fallback
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_anthropic")) {
    return generateFallbackAIAnalysis(examTitle, studentName, events, riskScore, eventCounts);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are ProctorVision's Senior AI Proctoring & Privacy Analyst.
Analyze the following online exam monitoring events for student ${studentName} taking "${examTitle}" (${durationMinutes} mins).

Monitoring Data:
- Total Events Flagged: ${events.length}
- Calculated Risk Score: ${riskScore} / 100
- Event Breakdown: ${JSON.stringify(eventCounts)}
- Chronological Events: ${JSON.stringify(simplifiedEvents.slice(0, 20))}

Guidelines:
1. Privacy-First: Never accuse the student of cheating definitively. Use calibrated, fair phrasing ("indicators requiring human verification").
2. Contextual: Distinguish between minor benign gestures (brief glance away, camera flicker) vs serious patterns (sustained phone presence, multiple faces).
3. Return STRICTLY valid JSON with no markdown wrapping or extra text.

Format:
{
  "riskLevel": "low" | "medium" | "high",
  "summary": "Short 2-3 sentence executive summary for the teacher",
  "recommendation": "Actionable advice for the teacher on whether to approve or conduct a manual interview",
  "keyConcerns": ["Concern 1", "Concern 2"]
}`;

    const message = await anthropic.messages.create({
      model: model,
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0]?.text || "{}";
    const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      success: true,
      provider: "claude-3-5-sonnet",
      ...parsed,
      analyzedAt: new Date(),
    };
  } catch (error) {
    console.warn("Anthropic Claude API call failed, falling back to local analysis:", error.message);
    return generateFallbackAIAnalysis(examTitle, studentName, events, riskScore, eventCounts);
  }
};

/**
 * Intelligent fallback when Claude API key is not yet set in .env
 */
const generateFallbackAIAnalysis = (examTitle, studentName, events, riskScore, eventCounts) => {
  let riskLevel = "low";
  if (riskScore >= 60) riskLevel = "high";
  else if (riskScore >= 30) riskLevel = "medium";

  const concerns = [];
  if (eventCounts["PHONE_DETECTED"]) {
    concerns.push(`${eventCounts["PHONE_DETECTED"]} instance(s) of potential mobile device detected in camera frame.`);
  }
  if (eventCounts["MULTIPLE_FACES"]) {
    concerns.push(`${eventCounts["MULTIPLE_FACES"]} incident(s) with multiple persons visible simultaneously.`);
  }
  if (eventCounts["TAB_HIDDEN"]) {
    concerns.push(`Exam window was switched/minimized ${eventCounts["TAB_HIDDEN"]} time(s).`);
  }
  if (eventCounts["LOOKING_AWAY"]) {
    concerns.push(`Gaze deviation recorded ${eventCounts["LOOKING_AWAY"]} time(s).`);
  }

  let summary = `Student ${studentName} completed "${examTitle}" with normal exam telemetry. No persistent anomalous patterns detected.`;
  let recommendation = "Standard grading recommended. Telemetry shows standard behavior.";

  if (riskLevel === "high") {
    summary = `Multiple elevated integrity flags were recorded during ${studentName}'s session. High review priority recommended.`;
    recommendation = "Teacher review strongly recommended. Check the recorded snapshot evidence and verify flagged incidents.";
  } else if (riskLevel === "medium") {
    summary = `Moderate telemetry activity detected. Some brief gaze shifts or window unfocus occurred.`;
    recommendation = "Brief review recommended to verify whether events were benign environmental distractions.";
  }

  return {
    success: true,
    provider: "proctorvision-rule-engine (Set ANTHROPIC_API_KEY in .env to activate live Claude 3.5 Sonnet)",
    riskLevel,
    summary,
    recommendation,
    keyConcerns: concerns.length ? concerns : ["No significant concerns flagged."],
    analyzedAt: new Date(),
  };
};
