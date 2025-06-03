import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());

// Simple request logger middleware
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Webhook endpoint
app.post('/api/webhook', (req: Request, res: Response) => {
  console.log('Webhook received data:');
  // Log the entire body, pretty-printed
  console.log(JSON.stringify(req.body, null, 2));

  // You can add more specific validation or processing logic here
  // For example, check if the request body contains expected fields
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error('Webhook request body is empty or invalid.');
    const responseMessage = { status: 'error', message: 'Empty or invalid request body.' };
    console.log('Sending response:', JSON.stringify(responseMessage, null, 2));
    return res.status(400).json(responseMessage);
  }

  // Process the webhook data (e.g., save to a database, trigger other actions)
  // For this example, we'll just acknowledge receipt.

  const responseMessage = { status: 'success', message: 'Webhook received successfully.' };
  console.log('Sending response:', JSON.stringify(responseMessage, null, 2));
  res.status(200).json(responseMessage);
});

// Generic error handler
// This should be defined after all other app.use() and routes calls
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error on ${req.method} ${req.url}:`, err.stack);
  const responseMessage = { status: 'error', message: 'Internal Server Error' };
  console.log('Sending error response:', JSON.stringify(responseMessage, null, 2));
  res.status(500).json(responseMessage);
});


app.listen(PORT, () => {
  console.log(`Webhook server is running on http://localhost:${PORT}`);
});

export default app; // Optional: export for testing or programmatic use
