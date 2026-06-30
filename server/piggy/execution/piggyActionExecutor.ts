import { Action, WorkflowInstance, ExecutionState } from "../types/piggyCognitiveTypes.js";
import { executeToolWithGuard } from "./piggyToolExecutor.js";
import { verifyStepExecution } from "../safety/piggyVerification.js";
import { logExecution } from "./piggyExecutionLogger.js";

/**
 * Executes a structured multi-tool workflow.
 * Analyzes dependencies and executes steps in parallel or sequential chains.
 */
export async function runWorkflowActions(
  workflow: WorkflowInstance,
  userData: any
): Promise<WorkflowInstance> {
  const workflowId = workflow.id;
  const steps = workflow.steps;
  
  console.log(`[ACTION EXECUTOR] Starting workflow: "${workflow.goal}" (Steps: ${steps.length})`);
  workflow.state = "Running";
  workflow.startTime = new Date().toISOString();

  // Helper to check if dependencies of a step are successfully completed
  const dependenciesMet = (step: Action, completedStepIds: Set<string>): boolean => {
    return step.dependencies.every(depId => completedStepIds.has(depId));
  };

  const completedStepIds = new Set<string>();
  const failedStepIds = new Set<string>();

  let executionQueue = [...steps];

  // Loop until all possible steps are executed or blocked
  while (executionQueue.length > 0) {
    // Find steps that are ready (all dependencies met) and are in Pending state
    const readySteps = executionQueue.filter(
      s => s.state === "Pending" && dependenciesMet(s, completedStepIds)
    );

    // Cancel steps whose dependencies have failed
    const blockedSteps = executionQueue.filter(
      s => s.state === "Pending" && s.dependencies.some(depId => failedStepIds.has(depId))
    );

    blockedSteps.forEach(s => {
      s.state = "Cancelled";
      failedStepIds.add(s.id);
      console.log(`[ACTION EXECUTOR] Step cancelled due to failed dependency: ${s.toolId}`);
    });

    if (readySteps.length === 0) {
      // If we still have queue items but none are ready/blocked, we have a circular dependency or finished.
      break;
    }

    // Execute ready steps in parallel
    console.log(`[ACTION EXECUTOR] Executing round of ${readySteps.length} parallel steps...`);
    
    await Promise.all(
      readySteps.map(async (step) => {
        step.state = "Running";
        let stepCompleted = false;
        
        while (!stepCompleted && step.retryCount < 3) {
          const startTime = Date.now();
          
          // Execute individual tool
          const runRes = await executeToolWithGuard(step.toolId, step.args, userData);
          const duration = Date.now() - startTime;
          
          // Run Verification Engine
          const verification = verifyStepExecution(step.toolId, step.args, step.expectedResult, runRes.result);

          step.actualResult = runRes.result;
          step.difference = verification.difference;
          step.qualityScore = verification.qualityScore;

          // Log the execution
          logExecution(userData, {
            workflowId,
            tool: step.toolId,
            executionTimeMs: duration,
            success: verification.valid,
            failureReason: verification.difference,
            retryCount: step.retryCount,
            confidence: workflow.confidence
          });

          if (verification.valid) {
            step.state = "Completed";
            stepCompleted = true;
            completedStepIds.add(step.id);
            console.log(`[ACTION EXECUTOR] Step completed: ${step.toolId}`);
          } else {
            step.retryCount += 1;
            if (step.retryCount < 3) {
              step.state = "Retrying";
              console.log(`[ACTION EXECUTOR] Step verification failed. Retrying: ${step.toolId} (Attempt ${step.retryCount + 1}/3)`);
            } else {
              step.state = "Failed";
              failedStepIds.add(step.id);
              console.error(`[ACTION EXECUTOR] Step failed permanently after max retries: ${step.toolId}`);
            }
          }
        }
      })
    );

    // Remove executed/processed steps from queue
    executionQueue = executionQueue.filter(s => s.state === "Pending");
  }

  // Update overall workflow state
  const hasFailed = steps.some(s => s.state === "Failed");
  const hasCancelled = steps.some(s => s.state === "Cancelled");
  
  if (hasFailed) {
    workflow.state = "Failed";
  } else if (hasCancelled) {
    workflow.state = "Cancelled";
  } else {
    workflow.state = "Completed";
  }

  workflow.endTime = new Date().toISOString();
  console.log(`[ACTION EXECUTOR] Workflow execution finished. Outcome State: ${workflow.state}`);
  return workflow;
}
