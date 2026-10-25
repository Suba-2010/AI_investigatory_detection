import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';

if (config.mongoUri !== 'memory') await mongoose.connect(config.mongoUri);
app.listen(config.port, '0.0.0.0', () => console.log(`AI Mystery Room API listening on ${config.port}`));
