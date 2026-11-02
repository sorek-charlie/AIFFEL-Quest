using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;

class Launcher : Form {
  Process child;
  string url;
  Label status = new Label();
  Button open = new Button();
  readonly string root = AppDomain.CurrentDomain.BaseDirectory;
  bool smoke;
  bool googleOnly;
  bool gmailOnly;
  string temp;
  public Launcher(bool test,bool calendarOnly,bool mailOnly) {
    gmailOnly=mailOnly;
    googleOnly=calendarOnly;
    smoke=test; Text="이성진 일정 관리"; Size=new Size(480,270); StartPosition=FormStartPosition.CenterScreen;
    BackColor=Color.FromArgb(241,246,255); ForeColor=Color.FromArgb(45,67,113);
    Font=new Font("Malgun Gothic",10); FormBorderStyle=FormBorderStyle.FixedDialog; MaximizeBox=false;
    var title=new Label {Text="이성진  /  나의 시간 공간",Left=28,Top=25,Width=420,Height=35,Font=new Font("Malgun Gothic",17,FontStyle.Bold)};
    status.SetBounds(28,78,410,60);status.Text="서버를 시작하는 중입니다…";
    open.SetBounds(28,145,230,45);open.Text="비밀번호 로그인 화면 열기";open.Enabled=false;open.Click+=(s,e)=>OpenBrowser();
    var stop=new Button {Text="프로그램 종료",Left=275,Top=145,Width=160,Height=45};stop.Click+=(s,e)=>Close();
    open.ForeColor=stop.ForeColor=Color.Black;Controls.AddRange(new Control[]{title,status,open,stop});
    Shown+=(s,e)=>StartServer(); FormClosed+=(s,e)=> { try{if(child!=null&&!child.HasExited){child.Kill();child.WaitForExit(5000);}}catch{} if(smoke&&temp!=null)try{Directory.Delete(temp,true);}catch{} };
  }
  void OpenBrowser() { if(url!=null)Process.Start(new ProcessStartInfo(url){UseShellExecute=true}); }
  void StartServer() {
    try {
      var bundle=File.Exists(Path.Combine(root,"runtime","node.exe"))?root:Path.Combine(root,"dist","ORBIT-Scheduler");
      var info=new ProcessStartInfo(Path.Combine(bundle,"runtime","node.exe"),"\""+Path.Combine(bundle,"app","apps","api","src","bootstrap","server.mjs")+"\"");
      info.WorkingDirectory=Path.Combine(bundle,"app");info.UseShellExecute=false;info.CreateNoWindow=true;info.RedirectStandardOutput=true;info.RedirectStandardError=true;
      var data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ORBIT Scheduler","data");
      if(smoke){temp=Path.Combine(Path.GetTempPath(),"orbit-smoke-"+Guid.NewGuid());data=temp;}
      if(googleOnly||gmailOnly)info.EnvironmentVariables["ORBIT_GOOGLE_IMPORT_ONLY"]="1";
      info.EnvironmentVariables["ORBIT_DATA_DIR"]=data;info.EnvironmentVariables["PORT"]="0";
      child=new Process {StartInfo=info,EnableRaisingEvents=true};
      child.OutputDataReceived+=(s,e)=> { if(e.Data!=null&&e.Data.StartsWith("ORBIT_URL="))BeginInvoke((Action)(()=>{
        url=e.Data.Substring(10);if(googleOnly)url=url.Replace("/#launch=","/?view=google#launch=");if(gmailOnly)url=url.Replace("/#launch=","/?view=gmail#launch=");status.Text="실행 중 · 이 창을 닫으면 서버도 종료됩니다.\n저장 위치: %LOCALAPPDATA%\\ORBIT Scheduler\\data";open.Enabled=true;
        if(smoke){File.WriteAllText(Path.Combine(root,"smoke-result.txt"),"PASS: launcher started bundled Node and received server URL.");Close();}else OpenBrowser();
      }));};
      child.ErrorDataReceived+=(s,e)=>{};
      child.Exited+=(s,e)=> { if(!IsDisposed&&IsHandleCreated)try{BeginInvoke((Action)(()=>{open.Enabled=false;status.Text="서버가 종료되었습니다. 프로그램을 다시 실행해 주세요.";}));}catch{} };
      child.Start();child.BeginOutputReadLine();child.BeginErrorReadLine();
      var timer=new System.Windows.Forms.Timer {Interval=15000};timer.Tick+=(s,e)=> {timer.Stop();if(url==null){status.Text="서버 시작에 실패했습니다. 배포 폴더를 다시 압축 해제해 주세요.";if(smoke){Environment.ExitCode=1;Close();}}};timer.Start();
    }catch(Exception ex){MessageBox.Show("실행할 수 없습니다: "+ex.Message,"이성진");Environment.ExitCode=1;Close();}
  }
  [STAThread] static void Main(string[] args) { Application.EnableVisualStyles();Application.Run(new Launcher(Array.IndexOf(args,"--smoke-test")>=0,Array.IndexOf(args,"--google-calendar")>=0,Array.IndexOf(args,"--gmail-review")>=0)); }
}
