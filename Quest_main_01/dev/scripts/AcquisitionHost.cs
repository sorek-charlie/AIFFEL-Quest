using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Diagnostics;

// Loopback-only companion. Never reads the certificate store or NPKI directories.
internal sealed class AcquisitionHost : IDisposable
{
    private readonly string root, token, defaultFolder;
    private readonly TcpListener listener;
    private readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 3000000 };
    private readonly object gate = new object();
    private readonly Dictionary<string, string> seen = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, DownloadItem> items = new Dictionary<string, DownloadItem>();
    private string folder;
    private bool watching, stopped;
    private bool collectorRunning;
    private object collectorState = new { state="idle",message="기관 수집 대기",downloadCount=0 };
    private readonly System.Threading.Timer timer;
    private int scanning;
    public string Home { get; private set; }
    private string Origin { get; set; }
    private sealed class DownloadItem { public string id, name, path, stamp; public long bytes; }

    public AcquisitionHost(string runtime, bool test)
    {
        root = Path.GetFullPath(runtime).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        byte[] key = new byte[32]; using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(key);
        token = BitConverter.ToString(key).Replace("-", "").ToLowerInvariant(); Array.Clear(key, 0, key.Length);
        listener = new TcpListener(IPAddress.Loopback, 35927);
        try { listener.Start(); } catch (SocketException) { listener = new TcpListener(IPAddress.Loopback, 0); listener.Start(); }
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        Origin = "http://127.0.0.1:" + port;
        Home = Origin + "/" + token + "/app/index.html#upload";
        defaultFolder = test ? Path.Combine(root,"downloads") : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),"ReturnCheck","Downloads");
        Directory.CreateDirectory(defaultFolder); folder = defaultFolder;
        timer = new System.Threading.Timer(delegate { Scan(); }, null, 2000, 2000);
        new Thread(Accept) { IsBackground = true }.Start();
        if(test)File.WriteAllText(Path.Combine(root,"host-session.json"),json.Serialize(new { home=Home, folder=folder, origin=Origin }),Encoding.UTF8);
    }
    private void Accept()
    {
        while(!stopped)try { TcpClient client=listener.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(delegate { Handle(client); }); } catch { if(stopped)return; }
    }
    private static string HeaderLine(Stream s)
    {
        var b=new List<byte>();int c;
        while((c=s.ReadByte())!=-1){if(c==10)break;b.Add((byte)c);if(b.Count>8192)throw new InvalidDataException("header");}
        if(c==-1&&b.Count==0)return null;
        return Encoding.ASCII.GetString(b.ToArray()).TrimEnd('\r');
    }
    private void Handle(TcpClient client)
    {
        using(client)
        {
            client.ReceiveTimeout=20000;client.SendTimeout=20000;
            using(NetworkStream stream=client.GetStream())try
            {
                string line=HeaderLine(stream);if(line==null)return;
                string[] request=line.Split(' ');if(request.Length!=3)throw new InvalidDataException();
                string method=request[0],raw=request[1];var headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);int size=0;
                while(!String.IsNullOrEmpty(line=HeaderLine(stream))){size+=line.Length;if(size>32768)throw new InvalidDataException();int i=line.IndexOf(':');if(i<1)throw new InvalidDataException();string k=line.Substring(0,i);if(headers.ContainsKey(k))throw new InvalidDataException();headers[k]=line.Substring(i+1).Trim();}
                if(!headers.ContainsKey("Host")||headers["Host"]!=Origin.Substring(7)){Reply(stream,403,"text/plain","Host denied");return;}
                string prefix="/"+token+"/";
                if(!raw.StartsWith(prefix,StringComparison.Ordinal)){Reply(stream,403,"text/plain","Session denied");return;}
                string path=Uri.UnescapeDataString(raw.Substring(prefix.Length).Split('?')[0]);
                if(method!="GET"&&method!="POST"){Reply(stream,405,"text/plain","Method denied");return;}
                if(headers.ContainsKey("Transfer-Encoding"))throw new InvalidDataException();
                byte[] body=new byte[0];
                if(method=="POST")
                {
                    if(!headers.ContainsKey("X-ReturnCheck")||headers["X-ReturnCheck"]!=token||!headers.ContainsKey("Origin")||headers["Origin"]!=Origin){Reply(stream,403,"text/plain","Origin denied");return;}
                    int length;if(!headers.ContainsKey("Content-Length")||!Int32.TryParse(headers["Content-Length"],out length)||length<0||length>2000000)throw new InvalidDataException();
                    body=new byte[length];int offset=0;while(offset<length){int n=stream.Read(body,offset,length-offset);if(n<=0)throw new EndOfStreamException();offset+=n;}
                }
                try
                {
                    if(path.StartsWith("api/"))Api(stream,method,path,body);
                    else
                    {
                        if(method!="GET"){Reply(stream,405,"text/plain","GET only");return;}
                        if(path.Contains("\\")||path.Split('/').Contains("..")){Reply(stream,403,"text/plain","Path denied");return;}
                        string file=Path.GetFullPath(Path.Combine(root,path.Replace('/',Path.DirectorySeparatorChar)));
                        string extension=Path.GetExtension(file).ToLowerInvariant();
                        if(!file.StartsWith(root,StringComparison.OrdinalIgnoreCase)||!new[]{".html",".js",".css",".json",".txt",".svg",".png",".woff2",".pdf"}.Contains(extension)||!File.Exists(file)){Reply(stream,404,"text/plain","Not found");return;}
                        byte[] bytes=File.ReadAllBytes(file);string mime=extension==".html"?"text/html":extension==".js"?"application/javascript":extension==".css"?"text/css":extension==".json"?"application/json":extension==".pdf"?"application/pdf":extension==".svg"?"image/svg+xml":"application/octet-stream";
                        if(path=="app/index.html")bytes=Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(bytes).Replace("</head>","<script>window.RETURNCHECK_NATIVE={base:"+json.Serialize(Origin+prefix)+",token:"+json.Serialize(token)+"};</script></head>"));
                        Reply(stream,200,mime,bytes);
                    }
                }finally{Array.Clear(body,0,body.Length);}
            }
            catch{try{Reply(stream,400,"application/json","{\"error\":\"요청을 처리하지 못했습니다. 입력 형식과 파일을 확인하세요.\"}");}catch{}}
        }
    }
    private Dictionary<string,object> Parse(byte[] body){return json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(body))??new Dictionary<string,object>();}
    private static string Value(Dictionary<string,object>d,string k){return d.ContainsKey(k)?Convert.ToString(d[k]):"";}
    private void Api(Stream s,string method,string path,byte[] body)
    {
        if(method=="GET"&&path=="api/status"){lock(gate)Json(s,new{version="1.4.0",watching=watching,folder=folder,credentialMode="official-institution-window",automaticInstitutionLogin=false,collector=collectorState,items=items.Values.Select(i=>new{id=i.id,name=i.name,bytes=i.bytes}).ToArray()});return;}
        if(method=="GET"&&path.StartsWith("api/file/"))
        {
            DownloadItem item;lock(gate)items.TryGetValue(path.Substring(9),out item);
            if(item==null||!File.Exists(item.path)){Reply(s,404,"text/plain","File unavailable");return;}
            var info=new FileInfo(item.path);if(info.Length>50L*1024*1024||Stamp(info)!=item.stamp){Reply(s,409,"text/plain","File changed; scan again");return;}
            Reply(s,200,"application/octet-stream",File.ReadAllBytes(item.path));return;
        }
        if(method!="POST"){Reply(s,404,"text/plain","Unknown API");return;}
        var d=Parse(body);
        if(path=="api/institution-collect")
        {
            string selected=Value(d,"routes"),format=Value(d,"format"),manifest=Value(d,"manifestJson");string companyId=Value(d,"companyId")??"";string companyName=Value(d,"companyName")??"";if(companyName.Length>100)throw new InvalidDataException("법인명 길이 오류");if(companyId.Length>0&&!System.Text.RegularExpressions.Regex.IsMatch(companyId,"^\\d{10}$"))throw new InvalidDataException("사업자등록번호 형식 오류");
            if(!new[]{"npki","pfx","p12"}.Contains(format)||selected.Length>1500||selected.Split(',').Any(id=>!System.Text.RegularExpressions.Regex.IsMatch(id,"^[a-z][a-z0-9-]{0,60}$")))throw new InvalidDataException("수집 형식·서류 선택 오류");
            lock(gate)
            {
                if(collectorRunning){Json(s,new{error="기관 수집 창이 이미 열려 있습니다. 기존 창에서 진행하거나 닫은 뒤 다시 시작하세요."});return;}
                collectorRunning=true;watching=true;items.Clear();seen.Clear();foreach(string f in Directory.GetFiles(folder)){var info=new FileInfo(f);if(Supported(info))seen[f]=Stamp(info);}
                collectorState=new{state="starting",message="EXE 안의 공식기관 인증·수집 창을 여는 중",downloadCount=0};
            }
            string targetFolder=folder;
            var thread=new Thread(delegate()
            {
                try { using(var form=new InstitutionCollectorForm(root,targetFolder,selected,format,delegate(object state){lock(gate)collectorState=state;},manifest,companyId,companyName))Application.Run(form); }
                catch(Exception error){lock(gate)collectorState=new{state="error",message="기관 수집 창 실행 실패: "+error.Message,downloadCount=0};}
                finally{lock(gate)collectorRunning=false;}
            });thread.SetApartmentState(ApartmentState.STA);thread.IsBackground=true;thread.Start();Json(s,new{started=true,folder=targetFolder,state="starting"});return;
        }
        if(path=="api/certificate") { CheckCertificate(s,d);return; }
        if(path=="api/watch")
        {
            bool enabled=Value(d,"enabled")=="True"||Value(d,"enabled")=="true";
            lock(gate){watching=enabled;items.Clear();seen.Clear();if(enabled)foreach(string f in Directory.GetFiles(folder)){var info=new FileInfo(f);if(Supported(info))seen[f]=Stamp(info);}}
            Json(s,new{watching=watching,folder=folder});return;
        }
        if(path=="api/select-folder")
        {
            string selected=null;var thread=new Thread(delegate(){using(var dialog=new FolderBrowserDialog{Description="이후 새로 저장되는 자료만 자동 가져올 폴더를 선택하세요",SelectedPath=folder,ShowNewFolderButton=true}){if(dialog.ShowDialog()==DialogResult.OK)selected=dialog.SelectedPath;}});
            thread.SetApartmentState(ApartmentState.STA);thread.Start();thread.Join();
            lock(gate){if(selected!=null){folder=Path.GetFullPath(selected);watching=false;items.Clear();seen.Clear();}}
            Json(s,new{folder=folder,watching=watching,cancelled=selected==null});return;
        }
        if(path=="api/open-folder"){Process.Start(new ProcessStartInfo{FileName=folder,UseShellExecute=true});Json(s,new{opened=true});return;}
        if(path=="api/ack") { lock(gate){items.Remove(Value(d,"id"));}Json(s,new{ok=true});return; }
        Reply(s,404,"text/plain","Unknown API");
    }
    private void CheckCertificate(Stream s,Dictionary<string,object>d)
    {
        byte[] bytes=null;
        try
        {
            string format=Value(d,"format");bytes=Convert.FromBase64String(Value(d,"data"));if(bytes.Length>1024*1024)throw new InvalidDataException();
            if(format!="pfx"&&format!="p12"&&format!="der")throw new InvalidDataException();
            var flags=(X509KeyStorageFlags)32; // EphemeralKeySet: no private-key file or store entry.
            using(var cert=new X509Certificate2(bytes,format=="der"?"":Value(d,"password"),flags))
            {
                bool valid=DateTime.Now>=cert.NotBefore&&DateTime.Now<=cert.NotAfter;
                Json(s,new{subject=cert.GetNameInfo(X509NameType.SimpleName,false),issuer=cert.GetNameInfo(X509NameType.SimpleName,true),expires=cert.NotAfter.ToString("yyyy-MM-dd"),validDates=valid,hasPrivateKey=cert.HasPrivateKey,passwordChecked=format!="der"&&cert.HasPrivateKey,authenticated=false,corporateIdentityVerified=false,message=valid?(format=="der"?"NPKI 공개 인증서만 확인했습니다. 비밀번호·개인키·법인 일치·기관 로그인은 확인하지 않았습니다.":"인증서 비밀번호·개인키를 로컬에서 확인했습니다. 법인 일치·기관 로그인·자료 다운로드는 아직 수행되지 않았습니다."):"유효기간이 맞지 않는 인증서입니다. 갱신 후 기관에서 인증하세요."});
            }
        }
        catch(CryptographicException){Json(s,new{error="인증서 암호 또는 파일을 확인하세요. 지원하지 않는 암호 형식일 수도 있습니다. 기관 인증창에서도 확인할 수 있습니다."});}
        finally {if(bytes!=null)Array.Clear(bytes,0,bytes.Length);d.Clear();}
    }
    private static bool Supported(FileInfo f){return new[]{".pdf",".xlsx",".zip"}.Contains(f.Extension.ToLowerInvariant())&&f.Length>0&&f.Length<=50L*1024*1024&&(f.Attributes&FileAttributes.ReparsePoint)==0;}
    private static string Stamp(FileInfo f){return f.Length+":"+f.LastWriteTimeUtc.Ticks;}
    private void Scan()
    {
        if(Interlocked.Exchange(ref scanning,1)!=0)return;
        try{lock(gate)
        {
            if(!watching)return;
            foreach(string file in Directory.GetFiles(folder))try
            {
                var info=new FileInfo(file);if(!Supported(info)||(DateTime.UtcNow-info.LastWriteTimeUtc).TotalSeconds<2)continue;
                string stamp=Stamp(info);if(seen.ContainsKey(file)&&seen[file]==stamp)continue;
                using(var check=new FileStream(file,FileMode.Open,FileAccess.Read,FileShare.None)){} // downloads still writing are retried
                foreach(string stale in items.Where(x=>x.Value.path==file).Select(x=>x.Key).ToArray())items.Remove(stale);
                string id=Guid.NewGuid().ToString("N");items[id]=new DownloadItem{id=id,name=info.Name,path=file,bytes=info.Length,stamp=stamp};seen[file]=stamp;
                if(items.Count>=100)break;
            }catch(IOException){}catch(UnauthorizedAccessException){}
        }}catch{}finally{Interlocked.Exchange(ref scanning,0);}
    }
    private void Json(Stream s,object data){Reply(s,200,"application/json",json.Serialize(data));}
    private static void Reply(Stream s,int code,string type,string body){Reply(s,code,type,Encoding.UTF8.GetBytes(body));}
    private static void Reply(Stream s,int code,string type,byte[] body)
    {
        string header="HTTP/1.1 "+code+" Response\r\nContent-Type: "+type+"; charset=utf-8\r\nContent-Length: "+body.Length+"\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nX-Frame-Options: SAMEORIGIN\r\n\r\n";
        byte[] bytes=Encoding.ASCII.GetBytes(header);s.Write(bytes,0,bytes.Length);s.Write(body,0,body.Length);
    }
    public void Dispose(){stopped=true;timer.Dispose();listener.Stop();}
}
