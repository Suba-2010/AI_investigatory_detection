import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';

if (config.mongoUri !== 'memory') await mongoose.connect(config.mongoUri);
app.listen(config.port, () => console.log(`AI Mystery Room API listening on ${config.port}`));
