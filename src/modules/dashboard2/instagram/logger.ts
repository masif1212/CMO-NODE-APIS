import { createLogger, transports, format as winstonFormat } from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// Ensure log directory exists
const logDir = path.join('social_media', 'data');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = createLogger({
  level: 'error',
  format: winstonFormat.combine(
    winstonFormat.timestamp(),
    winstonFormat.json()
  ),
  transports: [
    new transports.File({ filename: path.join(logDir, 'api_debug.log') })
  ]
});

export default logger;