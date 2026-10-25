import axios from 'axios';
export const api = axios.create({baseURL:import.meta.env.VITE_API_URL || '/api'});
export function sessionId(){let id=localStorage.getItem('mystery-session');if(!id){id=crypto.randomUUID();localStorage.setItem('mystery-session',id)}return id}
api.interceptors.request.use(config=>{config.headers['x-session-id']=sessionId();return config});
export function message(error){
  const serverMessage=error?.response?.data?.error?.message;
  if(serverMessage)return serverMessage;
  // Vite returns a generic proxy error if its API target is not listening. Make
  // that common local setup problem actionable instead of displaying a mystery error.
  if(error?.code==='ERR_NETWORK'||!error?.response||error?.response?.status>=500)
    return 'Cannot reach the mystery API. Start the backend with “npm run dev:server” from the project folder, then try again.';
  return 'Something went wrong. Please try again.';
}
