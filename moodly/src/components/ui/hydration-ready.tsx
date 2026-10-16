'use client';
import { useEffect } from 'react';
export function HydrationReady(){useEffect(()=>{const host=window as Window & {__moodlyEndHydrationGuard?:()=>void};host.__moodlyEndHydrationGuard?.();},[]);return null;}
