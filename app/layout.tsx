import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'GRAYLINE — Combat Rally',description:'Four cars. One survivor. A four-player combat racing graybox.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
