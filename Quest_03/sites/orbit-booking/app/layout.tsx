import type {Metadata} from 'next';
export const metadata:Metadata={title:'ORBIT · 미팅 신청',description:'빈 시간을 선택하고 미팅 목적과 방문처를 입력해 신청하세요. 주최자 승인 후 확정됩니다.',robots:{index:false,follow:false}};
export default function Layout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body style={{margin:0}}>{children}</body></html>;}
