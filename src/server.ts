import app from "./app";
import { config } from "./config";

console.log(`⚙️  Preparing to listen on port: ${config.port}`);
app.listen(config.port, () => {
  console.log(`🚀 Server running at http://localhost:${config.port}`);
});
