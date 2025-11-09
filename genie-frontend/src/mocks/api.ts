/**
 * @fileoverview This file contains mock API implementations for frontend testing.
 * It simulates the behavior of the real backend according to the defined contract
 * in swagger.json.
 * 
 * This file is now used to create a mock streaming response for the /api/agent/stream endpoint.
 */

/**
 * Simulates a streaming response for the /api/agent/stream endpoint.
 * @param prompt The user's prompt.
 * @param write A function to write chunks to the stream.
 */
export async function mockStreamResponse(prompt: string, write: (chunk: string) => void) {
  const lowerCasePrompt = prompt.toLowerCase();

  // Always start with a RUN_STARTED event
  write(JSON.stringify({ type: 'RUN_STARTED', data: {} }));
  await new Promise(resolve => setTimeout(resolve, 100));

  // Scenario 1: Simulate an error
  if (lowerCasePrompt.includes('error')) {
    await new Promise(resolve => setTimeout(resolve, 500));
    write(JSON.stringify({ type: 'RUN_ERROR', data: { error: 'This is a simulated error from the mock stream.' } }));
    return;
  }
  
  // Scenario 2: Simulate a tool call
  if (lowerCasePrompt.includes('tool')) {
    const toolName = 'calculate_something';
    await new Promise(resolve => setTimeout(resolve, 300));
    write(JSON.stringify({ type: 'TOOL_CALL_START', data: { name: toolName } }));
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate tool execution time
    const toolResult = '42';
    write(JSON.stringify({ type: 'TOOL_CALL_END', data: { name: toolName, result: toolResult } }));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    const followupText = `The result of the calculation is ${toolResult}.`;
    const chunks = followupText.match(/.{1,10}/g) || [];
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 50));
      write(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', data: { delta: chunk } }));
    }

  } else {
    // Default Scenario: Standard text response
    let content = `This is a mock streaming response for the prompt: "${prompt}". I am simulating the backend sending data chunk by chunk to demonstrate real-time UI updates.`;

    if (lowerCasePrompt.includes('markdown') || lowerCasePrompt.includes('list')) {
        content = `Of course! Here is a sample list in Markdown:\n\n- First item\n- Second item\n- Third item with **bold** and *italic* text.`;
    }
    
    // Simulate streaming the content chunk by chunk
    const chunks = content.match(/.{1,10}/g) || []; // Split into 10-character chunks
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between chunks
      const event = {
        type: 'TEXT_MESSAGE_CONTENT',
        data: { delta: chunk }
      };
      write(JSON.stringify(event));
    }
  }

  // Signal the end of the stream
  await new Promise(resolve => setTimeout(resolve, 100));
  write(JSON.stringify({ type: 'RUN_FINISHED', data: {} }));
}
