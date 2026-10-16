import 'server-only';
import { developmentAdminEnabled } from '../../../scripts/runtime-config.mjs';
export const isDevelopmentAdmin=()=>developmentAdminEnabled();
export const useLocalImageStorage=()=>process.env.MOODLY_DEMO_MODE==='true'||isDevelopmentAdmin();
