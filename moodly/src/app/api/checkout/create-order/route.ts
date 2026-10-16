import { NextResponse } from 'next/server';
// Public checkout intentionally cannot reserve stock or create payment orders.
// Old bookmarked clients receive an explicit response instead of silently buying.
export async function POST(){return NextResponse.json({success:false,error:'Moodly now accepts WhatsApp requests, not instant orders. Refresh the website and use Request on WhatsApp.',code:'REQUEST_ONLY',requestEndpoint:'/api/checkout/request'},{status:410});}
