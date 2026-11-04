using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

// Official pages perform certificate signing. No private key or password enters
// the analysis app, command line, audit log, or a third-party collection API.
internal sealed class InstitutionCollectorForm : Form
{
    private readonly WebView2 web = new WebView2 { Dock=DockStyle.Fill };
    private readonly Label status = new Label { Dock=DockStyle.Top,Height=58,Padding=new Padding(16,8,16,8),Font=new Font("Malgun Gothic",11,FontStyle.Bold),BackColor=Color.FromArgb(234,242,255) };
    private readonly Label context = new Label { Dock=DockStyle.Top,Height=50,Padding=new Padding(16,6,16,6),Font=new Font("Malgun Gothic",9) };
    private readonly Label address = new Label { Dock=DockStyle.Top,Height=30,Padding=new Padding(16,5,16,5),Font=new Font("Segoe UI",9),BackColor=Color.FromArgb(247,250,252),ForeColor=Color.FromArgb(35,76,125) };
    private readonly Button action = new Button { AutoSize=true,Text="기관 응답 확인",Padding=new Padding(12,5,12,5) };
    private readonly Button skip = new Button { AutoSize=true,Text="현재 서류 미확보로 넘기기",Padding=new Padding(12,5,12,5) };
    private readonly Timer timer = new Timer { Interval=2000 };
    private readonly JavaScriptSerializer json = new JavaScriptSerializer();
    private readonly List<Dictionary<string,object>> routes;
    private readonly List<object> audit = new List<object>();
    private readonly string companyId,companyName,folder,script,format,jobId=Guid.NewGuid().ToString("N");
    private readonly Action<object> report;
    private CoreWebView2Environment environment;
    private int routeIndex,year=2021,menuIndex,downloadCount;
    private string phase="login",lastState="initializing";
    private bool authenticated,allMenuOpened,busy,closed,queryDone;
    private string currentHost="";
    private List<string> hosts=new List<string>();
    private DateTime earliest=DateTime.UtcNow;
    private Dictionary<string,object> Route { get { return routes[routeIndex]; } }
    private string RouteId { get { return Convert.ToString(Route["id"]); } }
    private string RouteName { get { return Convert.ToString(Route["name"]); } }
    public InstitutionCollectorForm(string root,string destination,string selected,string selectedFormat,Action<object> onReport,string manifest=null,string company="",string name="")
    {
        companyId=company??"";companyName=name??"";folder=Path.GetFullPath(destination);Directory.CreateDirectory(folder);format=selectedFormat;report=onReport;
        if(manifest!=null&&manifest.Length>262144)throw new InvalidDataException("수집 경로 자료 크기 오류");
        var data=json.Deserialize<Dictionary<string,object>>(String.IsNullOrEmpty(manifest)?File.ReadAllText(Path.Combine(root,"app/data/acquisition_routes.json")):manifest);
        var ids=new HashSet<string>(selected.Split(','));
        routes=((System.Collections.IEnumerable)data["routes"]).Cast<object>().Select(o=>(Dictionary<string,object>)o).Where(r=>ids.Contains(Convert.ToString(r["id"]))&&Convert.ToString(r["id"])!="derived-summary").ToList();
        foreach(var route in routes)
        {
            Uri uri;if(!Uri.TryCreate(Convert.ToString(route["url"]),UriKind.Absolute,out uri)||uri.Scheme!="https"||!uri.IsDefaultPort||!String.IsNullOrEmpty(uri.UserInfo)||!new[]{"hometax.go.kr","nts.go.kr","comwel.or.kr","kcomwel.or.kr","nhis.or.kr"}.Any(h=>uri.Host==h||uri.Host.EndsWith("."+h,StringComparison.OrdinalIgnoreCase)))throw new InvalidDataException("공식기관 수집 주소만 허용됩니다.");
            if(route.ContainsKey("automationMenu"))
            {
                if(route["automationMenu"] is string)throw new InvalidDataException("수집 메뉴 배열 오류");
                string[] menu=((System.Collections.IEnumerable)route["automationMenu"]).Cast<object>().Select(Convert.ToString).ToArray();
                if(menu.Length>20||menu.Any(m=>m.Length>200||System.Text.RegularExpressions.Regex.IsMatch(m.Trim(),"^(신청|제출|접수|확인|납부|결제|등록|삭제|동의|전송|수정|취소)$")))throw new InvalidDataException("제출·변경 동작은 자료 수집 메뉴로 사용할 수 없습니다.");
            }
        }
        if(routes.Count==0)throw new InvalidDataException("수집할 정부기관 서류를 선택하세요.");
        // 기관별 순차 발급: 같은 기관(호스트) 서류를 묶어 한 번 인증한 세션으로 이어서 발급합니다.
        routes=routes.Select((r,i)=>new { r,i }).OrderBy(x=>HostRank(HostOf(x.r))).ThenBy(x=>HostOf(x.r)).ThenBy(x=>x.i).Select(x=>x.r).ToList();
        hosts=routes.Select(HostOf).Distinct().ToList();
        script=File.ReadAllText(Path.Combine(root,"app/assets/portal-automation.js"));
        Text="경정청구 · 기관 인증·자료 수집";Width=1480;Height=960;MinimumSize=new Size(980,680);StartPosition=FormStartPosition.CenterScreen;
        var buttons=new FlowLayoutPanel { Dock=DockStyle.Bottom,Height=55,Padding=new Padding(12,6,12,6),BackColor=Color.WhiteSmoke };
        buttons.Controls.Add(action);buttons.Controls.Add(skip);buttons.Controls.Add(new Label { AutoSize=true,Text="인증서·암호는 아래 공식기관 인증창에 입력 · 다운로드 완료 파일만 확보 기록",Padding=new Padding(12,12,0,0) });
        Controls.Add(web);Controls.Add(address);Controls.Add(context);Controls.Add(status);Controls.Add(buttons);
        action.Click+=delegate { ContinueManual(); };skip.Click+=delegate { Record("미확보 건너뜀",null);NextDocument(); };
        Shown+=async delegate { await Initialize(); };
        FormClosed+=delegate { closed=true;timer.Stop();timer.Dispose();Publish("closed","수집 창 종료 · 실제 확보 파일 "+downloadCount+"개");WriteAudit();web.Dispose(); };
        timer.Tick+=async delegate { await Tick(); };
    }
    private async Task Initialize()
    {
        try
        {
            string profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ReturnCheck","InstitutionBrowser");
            environment=await CoreWebView2Environment.CreateAsync(null,profile);
            await web.EnsureCoreWebView2Async(environment);
            web.CoreWebView2.Settings.IsPasswordAutosaveEnabled=false;
            web.CoreWebView2.Settings.IsGeneralAutofillEnabled=false;
            Wire(web.CoreWebView2,null,0);
            web.CoreWebView2.SourceChanged+=delegate
            {
                Uri uri;if(Uri.TryCreate(web.CoreWebView2.Source,UriKind.Absolute,out uri))address.Text="현재 기관 주소: "+uri.GetLeftPart(UriPartial.Path);
            };
            NavigateRoute();timer.Start();
        }
        catch(Exception e){Publish("error","기관 수집 창을 시작하지 못했습니다: "+e.Message+". Microsoft Edge WebView2 Runtime 설치 여부를 확인하세요.");}
    }
    private static string HostOf(Dictionary<string,object> r){Uri u;return Uri.TryCreate(Convert.ToString(r["url"]),UriKind.Absolute,out u)?u.Host.ToLowerInvariant():"";}
    private static int HostRank(string h){string[] order={"hometax.go.kr","nts.go.kr","comwel.or.kr","kcomwel.or.kr","nhis.or.kr"};for(int i=0;i<order.Length;i++)if(h==order[i]||h.EndsWith("."+order[i]))return i;return order.Length;}
    private string Progress(){string h=HostOf(Route);var same=routes.Where(r=>HostOf(r)==h).ToList();return "기관 "+(hosts.IndexOf(h)+1)+"/"+hosts.Count+" · 이 기관 서류 "+(same.IndexOf(Route)+1)+"/"+same.Count+" · 전체 "+(routeIndex+1)+"/"+routes.Count;}
    private void NavigateRoute()
    {
        if(routeIndex>=routes.Count){timer.Stop();Publish("finished","전 기관 순차 수집 종료 · 기관 "+hosts.Count+"곳 · 확보 "+downloadCount+"개. 미확보·출력 전용 자료는 기록을 확인하세요.");WriteAudit();return;}
        string host=HostOf(Route);bool sameAgency=authenticated&&host==currentHost;currentHost=host;
        phase=sameAgency?"navigate":"login";authenticated=sameAgency;allMenuOpened=false;menuIndex=0;queryDone=false;
        context.Text=Progress()+" · "+RouteName+" · "+year+"년 · "+(format=="npki"?"NPKI: signCert.der + signPri.key":"PFX/P12: 인증서 파일 한 개")+"\n저장 폴더: "+folder;
        if(sameAgency)Publish("auth","같은 기관 인증 세션으로 다음 서류 발급 · "+Convert.ToString(Route["agency"])+" · "+Progress());
        else Publish("auth","공식기관 법인 로그인 대기 · "+Convert.ToString(Route["agency"])+" · "+Progress()+" — 이 기관에서 한 번 인증하면 이 기관 서류를 이어서 발급합니다.");
        web.CoreWebView2.Navigate(Convert.ToString(Route["url"]));earliest=DateTime.UtcNow.AddSeconds(3);
    }
    private async Task Tick()
    {
        if(closed||busy||web.CoreWebView2==null||routeIndex>=routes.Count||DateTime.UtcNow<earliest)return;
        if(new[]{"manual","parameters","manual-export","company-check","error","download-wait"}.Contains(lastState))return;
        busy=true;
        try
        {
            object[] customMenu=Route.ContainsKey("automationMenu")?((System.Collections.IEnumerable)Route["automationMenu"]).Cast<object>().ToArray():new object[0];
            var job=new { id=RouteId,phase=phase,year=year,menuIndex=menuIndex,menu=customMenu,authConfirmed=authenticated,allMenuOpened=allMenuOpened,companyId=companyId,companyName=companyName };
            string expression=script+"\nJSON.stringify(PortalAutomation.step("+json.Serialize(job)+"));";
            string outer=await web.CoreWebView2.ExecuteScriptAsync(expression),inner=json.Deserialize<string>(outer);
            var result=json.Deserialize<Dictionary<string,object>>(inner);string state=Convert.ToString(result["state"]),message=result.ContainsKey("message")?Convert.ToString(result["message"]):state;
            Publish(state,message);
            if(state=="session-expired"){authenticated=false;phase="login";menuIndex=0;}
            else if(state=="authenticated"){authenticated=true;phase="navigate";menuIndex=0;}
            else if(state=="menu-clicked"){menuIndex++;allMenuOpened=false;earliest=DateTime.UtcNow.AddSeconds(3);}
            else if(state=="all-menu-opened"){allMenuOpened=true;earliest=DateTime.UtcNow.AddSeconds(1);}
            else if(state=="menu-complete"){phase="set-year";}
            else if(state=="year-set"){phase="query";earliest=DateTime.UtcNow.AddSeconds(1);}
            else if(state=="queried"){phase="export";queryDone=true;earliest=DateTime.UtcNow.AddSeconds(5);}
            else if(state=="empty"){if(queryDone){Record("조회 결과 없음 · 금액/자격 미확정",null);NextYear();}else Publish("parameters","기관에서 실제 조회를 완료한 뒤 조회 완료를 누르세요.");}
            else if(state=="download-requested"){lastState="download-wait";status.Text="기관 다운로드 요청됨 · 실제 파일 완료 이벤트 대기";action.Text="저장/출력 화면 직접 확인";}
        }
        catch(Exception e){Publish("error","기관 응답 확인 실패: "+e.Message);}
        finally{busy=false;}
    }
    private void ContinueManual()
    {
        if(lastState=="company-check"){authenticated=true;phase="navigate";menuIndex=0;}
        else if(lastState=="manual"){phase="set-year";}
        else if(lastState=="parameters"){phase="export";queryDone=true;}
        else if(lastState=="manual-export"||lastState=="download-wait"){phase="export";queryDone=true;}
        lastState="retry";earliest=DateTime.UtcNow.AddSeconds(2);
    }
    private void NextYear(){year++;queryDone=false;if(year>2025){NextDocument();return;}phase="set-year";lastState="next-year";context.Text=Progress()+" · "+RouteName+" · "+year+"년\n저장 폴더: "+folder;earliest=DateTime.UtcNow.AddSeconds(2);}
    private void NextDocument(){routeIndex++;year=2021;NavigateRoute();}
    private void Publish(string state,string message)
    {
        lastState=state;status.Text=message;
        action.Text=state=="company-check"?"화면의 대상 법인 확인 후 계속":state=="manual"?"해당 서류의 현재 화면 사용":state=="parameters"?"기관에서 조회 완료":state=="manual-export"?"파일 저장/출력 진행 후 다시 확인":"기관 응답 다시 확인";
        report(new { jobId=jobId,state=state,message=message,document=routeIndex<routes.Count?RouteName:"",year=year,downloadCount=downloadCount,folder=folder,automaticAllInstitutionsVerified=false });
    }
    private void Wire(CoreWebView2 core,string popupRoute,int popupYear)
    {
        core.DownloadStarting+=(sender,e)=>
        {
            string id=popupRoute??(routeIndex<routes.Count?RouteId:"document");int y=popupYear==0?year:popupYear;
            string name=Path.GetFileName(e.ResultFilePath);foreach(char bad in Path.GetInvalidFileNameChars())name=name.Replace(bad,'_');
            string extension=Path.GetExtension(name).ToLowerInvariant();
            if(!new[]{".pdf",".xlsx",".xls",".zip",".csv",".xml",".hwp",".hwpx"}.Contains(extension)){e.Cancel=true;Publish("manual-export","자료 파일 형식이 아닙니다. 보안프로그램 설치는 공식기관 안내에 따라 별도로 진행하세요.");return;}
            string target=Path.Combine(folder,id+"_"+y+"_"+Guid.NewGuid().ToString("N").Substring(0,6)+"_"+name);
            e.ResultFilePath=target;e.Handled=true;var operation=e.DownloadOperation;
            operation.StateChanged+=delegate
            {
                if(closed)return;
                if(operation.State==CoreWebView2DownloadState.Completed)
                {
                    if(!File.Exists(target)||new FileInfo(target).Length==0){Publish("error","다운로드 완료 파일이 없거나 비어 있습니다.");return;}
                    downloadCount++;string sha;using(var hash=SHA256.Create())using(var stream=File.OpenRead(target))sha=BitConverter.ToString(hash.ComputeHash(stream)).Replace("-","").ToLowerInvariant();
                    audit.Add(new { route=id,year=y,status="다운로드 완료",file=Path.GetFileName(target),bytes=new FileInfo(target).Length,sha256=sha,time=DateTime.UtcNow.ToString("o") });WriteAudit();
                    Publish("saved","다운로드 완료: "+Path.GetFileName(target));if(routeIndex<routes.Count&&RouteId==id&&year==y)NextYear();
                }
                else if(operation.State==CoreWebView2DownloadState.Interrupted)Publish("manual-export","다운로드 중단: "+operation.InterruptReason+". 확보로 기록하지 않았습니다.");
            };
        };
        core.NewWindowRequested+=async (sender,e)=>
        {
            var deferral=e.GetDeferral();try
            {
                string id=popupRoute??(routeIndex<routes.Count?RouteId:"document");int y=popupYear==0?year:popupYear;
                var child=new Form { Text="경정청구 · 기관 발급·출력",Width=1200,Height=900,StartPosition=FormStartPosition.CenterParent };
                var view=new WebView2 { Dock=DockStyle.Fill };child.Controls.Add(view);child.Show(this);await view.EnsureCoreWebView2Async(environment);Wire(view.CoreWebView2,id,y);e.NewWindow=view.CoreWebView2;e.Handled=true;child.FormClosed+=delegate { view.Dispose(); };
            }
            catch(Exception ex){Publish("manual-export","기관 출력창 열기 실패: "+ex.Message);e.Handled=true;}
            finally{deferral.Complete();}
        };
    }
    private void Record(string state,string file){audit.Add(new { route=routeIndex<routes.Count?RouteId:"",year=year,status=state,file=file,time=DateTime.UtcNow.ToString("o") });WriteAudit();}
    private void WriteAudit(){try{File.WriteAllText(Path.Combine(folder,"수집진행_"+jobId+".json"),json.Serialize(new { schema=1,companyId=companyId,entries=audit }),System.Text.Encoding.UTF8);}catch(Exception e){status.Text="수집 기록 저장 실패: "+e.Message;}}
}
