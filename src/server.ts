import app from "./app";
import { config } from "./config";

console.log(`⚙️  Preparing to listen on port: ${config.port}`);
// app.listen(config.port, () => {
//   console.log(`🚀 Server running at http://localhost:${config.port}`);
// });

const HOST = "0.0.0.0"; // This is the crucial line

app.listen(config.port, HOST, () => {
  // Updated log for clarity. 'localhost' is misleading in a container environment.
  console.log(`Server listening on port ${config.port}`);
});
