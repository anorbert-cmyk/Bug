/**
 * Analysis Processor
 * 
 * Handles the actual analysis generation for retry queue items.
 * This is a wrapper around the main analysis generation logic.
 */

import { getDb } from "../db";
import { analysisSessions, analysisResults } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { Tier } from "../../shared/pricing";
import { recordSuccessToDB, recordFailureToDB } from "./metricsPersistence";

/**
 * Generate analysis for a session
 * This is called by the retry queue processor
 */
export async function generateAnalysisForSession(
  sessionId: string,
  tier: Tier,
  problemStatement: string
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    const db = await getDb();
    if (!db) {
      console.error("[AnalysisProcessor] Database not available");
      return false;
    }

    // Update session status to processing
    await db
      .update(analysisSessions)
      .set({ status: "processing" })
      .where(eq(analysisSessions.sessionId, sessionId));

    // Import the analysis generation function from routers
    // This avoids circular dependencies by using dynamic import
    const { invokeLLM } = await import("../_core/llm");
    const { getTierPromptConfig, getObserverPrompt, getInsiderInitialPrompt, getSyndicateInitialPrompt, OBSERVER_SYSTEM_PROMPT, INSIDER_SYSTEM_PROMPT, SYNDICATE_SYSTEM_PROMPT } = await import("./tierPromptService");

    // Get the appropriate prompt for the tier
    let systemPrompt: string;
    let userPrompt: string;
    
    if (tier === 'standard') {
      systemPrompt = OBSERVER_SYSTEM_PROMPT;
      userPrompt = getObserverPrompt(problemStatement);
    } else if (tier === 'medium') {
      systemPrompt = INSIDER_SYSTEM_PROMPT;
      userPrompt = getInsiderInitialPrompt(problemStatement);
    } else {
      systemPrompt = SYNDICATE_SYSTEM_PROMPT;
      userPrompt = getSyndicateInitialPrompt(problemStatement);
    }

    // Generate the analysis
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error("No content in LLM response");
    }

    // Ensure content is a string
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    // Save the result
    const existingResult = await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.sessionId, sessionId))
      .limit(1);

    if (existingResult.length > 0) {
      // Update existing result
      await db
        .update(analysisResults)
        .set({
          singleResult: content,
          generatedAt: new Date(),
        })
        .where(eq(analysisResults.sessionId, sessionId));
    } else {
      // Create new result
      await db.insert(analysisResults).values([{
        sessionId,
        tier,
        problemStatement,
        singleResult: content,
        generatedAt: new Date(),
      }]);
    }

    // Update session status to completed
    await db
      .update(analysisSessions)
      .set({ status: "completed" })
      .where(eq(analysisSessions.sessionId, sessionId));

    const duration = Date.now() - startTime;
    await recordSuccessToDB(sessionId, tier, duration);

    console.log(`[AnalysisProcessor] Successfully generated analysis for session ${sessionId} in ${duration}ms`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await recordFailureToDB(sessionId, tier, duration, "GENERATION_ERROR", errorMessage);
    
    console.error(`[AnalysisProcessor] Failed to generate analysis for session ${sessionId}:`, errorMessage);
    return false;
  }
}

/**
 * Get prompt configuration for a tier
 * This is a simplified version - the actual prompts are in tierPrompts.ts
 */
function getPromptForTierFallback(tier: Tier, problemStatement: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a strategic business analyst providing ${tier} tier analysis.
Your task is to analyze the given problem statement and provide actionable insights.`;

  const userPrompt = `Please analyze the following problem statement and provide strategic recommendations:

${problemStatement}`;

  return { systemPrompt, userPrompt };
}
