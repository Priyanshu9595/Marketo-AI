import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { autoPostDue } from './controllers/socialController.js';
dotenv.config();

// Export autoPostDue temporarily if it is not exported, by reading and evaling, or just run the maintenance queue and wait.
// Actually, runSocialMaintenance is not awaiting autoPostDue. I will just run socialController.js directly? No.
