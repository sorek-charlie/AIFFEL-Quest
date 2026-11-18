"""Let the user enter paid-provider keys locally, encrypted to the Windows account."""
import tkinter as tk
from tkinter import messagebox, ttk
from pathlib import Path
from briefings.windows_secret import transform

def main():
    root=tk.Tk();root.title('AI 서비스 API 키 설정');root.geometry('550x300');root.attributes('-topmost',True)
    tk.Label(root,text='서비스를 선택하고 해당 API 키를 입력하세요.',font=('맑은 고딕',11)).pack(pady=(18,8))
    kind=tk.StringVar(value='ChatGPT (OpenAI)')
    ttk.Combobox(root,textvariable=kind,state='readonly',values=['ChatGPT (OpenAI)','Claude (Anthropic)']).pack()
    entry=tk.Entry(root,show='●');entry.pack(fill='x',padx=25,pady=14)
    tk.Label(root,text='키는 이 Windows 계정으로 암호화해 PC에 저장합니다.').pack()
    status=tk.StringVar(value='각 서비스를 선택해 키를 한 번씩 저장하세요.')
    tk.Label(root,textvariable=status,fg='#245a9a').pack(pady=5)
    def save():
        key=entry.get().strip()
        if not key or len(key)>512 or '\n' in key:
            messagebox.showerror('설정 실패','API 키를 확인해 주세요.');return
        try:
            filename='openai.dpapi' if kind.get().startswith('ChatGPT') else 'anthropic.dpapi'
            path=Path(__file__).resolve().parents[1]/'data'/'secrets'/filename
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(transform(key.encode('utf8'),True))
            entry.delete(0,tk.END);status.set(kind.get()+' 키를 암호화해 저장했습니다. 다른 서비스도 선택해 저장하세요.')
        except OSError:messagebox.showerror('설정 실패','Windows 암호화 저장에 실패했습니다.')
    buttons=tk.Frame(root);buttons.pack(pady=8)
    tk.Button(buttons,text='선택한 서비스 키 저장',command=save).pack(side='left',padx=5)
    tk.Button(buttons,text='완료',command=root.destroy).pack(side='left',padx=5)
    entry.focus_set();root.mainloop()

if __name__=='__main__':main()
