import type {Metadata} from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata:Metadata={title:'Conexão Comunidade',description:'Encontre talentos e serviços, organize sua rotina e acompanhe as necessidades do bairro.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
