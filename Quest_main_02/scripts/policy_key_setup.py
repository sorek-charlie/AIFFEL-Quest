"""Local-only masked credential entry, saved encrypted to current Windows user."""
import tkinter as tk
from tkinter import messagebox
from briefings.windows_secret import save


def main():
    root = tk.Tk()
    root.title('공공데이터 API 안전 설정')
    root.geometry('510x180')
    root.attributes('-topmost', True)
    tk.Label(root, text='공공데이터포털 일반 인증키', font=('맑은 고딕', 12)).pack(pady=(16, 5))
    field = tk.Entry(root, show='●', width=62)
    field.pack(padx=18, fill='x')
    tk.Label(root, text='키는 현재 Windows 계정으로 암호화하여 보관합니다.').pack(pady=7)
    def store():
        try:
            save(field.get())
            field.delete(0, tk.END)
            root.destroy()
        except (ValueError, OSError):
            messagebox.showerror('저장 실패', '인증키를 확인하거나 Windows 암호화 상태를 확인해 주세요.')
    tk.Button(root, text='암호화해 저장', command=store).pack()
    field.focus_set()
    root.mainloop()


if __name__ == '__main__':
    main()
