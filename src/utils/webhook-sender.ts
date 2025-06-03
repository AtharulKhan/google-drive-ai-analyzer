/**
 * Sends data to a specified webhook URL.
 *
 * @param webhookUrl The URL to send the POST request to.
 * @param data The data payload to send (will be JSON.stringified).
 * @returns A promise that resolves to an object indicating success or failure.
 *          { success: true } if successful.
 *          { success: false, error: string } if failed.
 */
export async function sendToWebhook(webhookUrl: string, data: any): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: "Webhook URL is not provided or is empty." };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      // response.status >= 200 && response.status <= 299
      return { success: true };
    } else {
      // Handle non-successful HTTP responses
      const errorBody = await response.text(); // Try to get more details from the response body
      return {
        success: false,
        error: `Webhook request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`
      };
    }
  } catch (error) {
    // Handle network errors or other issues with the fetch call itself
    if (error instanceof Error) {
      return { success: false, error: `Failed to send webhook: ${error.message}` };
    }
    return { success: false, error: 'An unknown error occurred while sending the webhook.' };
  }
}
