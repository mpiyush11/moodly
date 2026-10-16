import { CommerceError } from './commerce';
import type { Product,Quote } from './types';
export const designCode=(product:Pick<Product,'id'>)=>`D-${product.id.replaceAll('-','').slice(-6).toUpperCase()}`;
export function whatsappDraftUrl(phone:string,text:string):string {
  const digits=phone.replace(/\D/g,'');
  if(!/^[1-9]\d{9,14}$/.test(digits))throw new CommerceError('The business WhatsApp number is not configured.',503,'STORE_NOT_CONFIGURED');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
export function whatsappRequestUrl(quote:Quote,phone:string,city=''):string {
  const text=[
    'Hi Moodly! I would like to request these items (not a confirmed order).',
    '',
    ...quote.items.map(item=>`${designCode({id:item.product_id})} | ${item.title}\nColour: ${item.color} | Size: ${item.size} | Quantity: ${item.qty}\nCatalogue price: ₹${item.unit_price} each`),
    '',
    `Delivery preference: ${quote.deliveryMode==='JAIPUR_PICKUP'?'Jaipur self-pickup':'Home delivery'}`,
    ...(city?[`Delivery city: ${city}`]:[]),
    `Indicative items subtotal: ₹${quote.subtotal}`,
    ...(quote.discountAmount?[`Indicative pickup saving: ₹${quote.discountAmount}`]:[]),
    `Indicative catalogue amount: ₹${quote.totalAmount}`,
    'Please confirm availability, printing feasibility, any delivery charges, final amount and dispatch time before I pay.',
    'I understand that sending this request does not reserve stock or confirm an order.',
  ].join('\n');
  return whatsappDraftUrl(phone,text);
}
export function customPrintDraft(phone:string,input?:{colour:string;size:string;qty:number;placement:string;city:string}):string {
  return whatsappDraftUrl(phone,[
    'Hi Moodly! I would like a custom print on a 240 GSM tee.',
    `Colour: ${input?.colour??'[please confirm]'}`,
    `Size: ${input?.size??'[please confirm]'}`,
    `Quantity: ${input?.qty??1}`,
    `Print placement: ${input?.placement??'[front / back / both]'}`,
    ...(input?.city?[`Delivery city: ${input.city}`]:[]),
    'I will attach my design/image in this chat. Please check its print quality and feasibility, then confirm the preview, final price and dispatch time before production.',
    'I own this artwork or have permission to use it for printing.',
  ].join('\n'));
}
