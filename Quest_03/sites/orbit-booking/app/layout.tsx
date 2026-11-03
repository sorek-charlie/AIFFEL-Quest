import type {Metadata} from 'next';
export const metadata:Metadata={title:'이성진 · 개인 일정 관리',description:'직접 입력과 Google 가져오기로 일정·할 일·프로젝트를 관리합니다.',robots:{index:false,follow:false}};
export default function Layout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body style={{margin:0}}>{children}</body></html>;}
