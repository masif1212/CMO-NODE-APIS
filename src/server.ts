import app from "./app";
import { config } from "./config";

app.listen(3001, () => {
  console.log(`🚀 Server running at http://localhost:${config.port}`);
});
