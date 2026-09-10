const API_BASE=process.env.NEXT_PUBLIC_API_BASE_URL||'http://127.0.0.1:8000';
type LoginResponse={access_token:string;token_type?:string;user?:{email:string;role:string}};
let warmLogin:Promise<LoginResponse>|null=null;
export async function apiFetch<T>(path:string,options:RequestInit={}){const token=typeof window!=='undefined'?localStorage.getItem('securex-token'):null;const headers=new Headers(options.headers);headers.set('Content-Type','application/json');if(token)headers.set('Authorization',`Bearer ${token}`);const response=await fetch(`${API_BASE}${path}`,{...options,headers});if(response.status===401&&typeof window!=='undefined'){localStorage.removeItem('securex-token');if(window.location.pathname!=='/login')window.location.assign('/login')}if(!response.ok)throw new Error(`SecureX API ${response.status}`);return response.json() as Promise<T>}
export function warmDemoLogin(){if(!warmLogin){warmLogin=apiFetch<LoginResponse>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email:'ciso@asteriafinance.in',password:'demo'})}).catch(error=>{warmLogin=null;throw error})}return warmLogin}
export function loginRequest(email:string,password:string){return email==='ciso@asteriafinance.in'&&password==='demo'?warmDemoLogin():apiFetch<LoginResponse>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email,password})})}
export const apiBase=API_BASE;
