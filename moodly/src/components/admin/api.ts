'use client';
export async function adminRequest<T=unknown>(url:string,method:string,body:unknown):Promise<T> {
  const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error??'The change could not be saved.');return data as T;
}
