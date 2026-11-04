using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using System.Runtime.InteropServices;

[assembly: AssemblyTitle("경정청구")]
[assembly: AssemblyDescription("경정청구 원자료 분석 프로그램")]
[assembly: AssemblyCompany("경정청구")]
[assembly: AssemblyProduct("경정청구")]
[assembly: AssemblyVersion("1.4.0.0")]
[assembly: AssemblyFileVersion("1.4.0.0")]

internal static class Program
{
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern bool SetDllDirectory(string path);
    [STAThread]
    private static int Main(string[] args)
    {
        bool verify = args.Length == 2 && args[0] == "--verify";
        bool hostTest = args.Length == 2 && args[0] == "--host-test";
        bool collectorSmoke = args.Length == 2 && args[0] == "--collector-smoke-test";
        try
        {
            Application.EnableVisualStyles();
            string version;
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("ReturnCheck.Build"))
            using (StreamReader reader = new StreamReader(s, Encoding.UTF8))
                version = reader.ReadToEnd().Trim();
            string destination = (verify || hostTest || collectorSmoke) ? Path.GetFullPath(args[1]) : Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "ReturnCheck", version);
            Directory.CreateDirectory(destination);
            string root = Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            using (Stream payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("ReturnCheck.App"))
            using (ZipArchive zip = new ZipArchive(payload, ZipArchiveMode.Read, false, Encoding.UTF8))
            {
                foreach (ZipArchiveEntry entry in zip.Entries)
                {
                    string target = Path.GetFullPath(Path.Combine(root, entry.FullName.Replace('/', Path.DirectorySeparatorChar)));
                    if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("실행 파일의 경로 정보가 올바르지 않습니다.");
                    if (String.IsNullOrEmpty(entry.Name)) { Directory.CreateDirectory(target); continue; }
                    // Reopening an instance must not overwrite the WebView2 DLLs
                    // already mapped by its running institution browser.
                    if(ExistingEntryMatches(entry,target))continue;
                    Directory.CreateDirectory(Path.GetDirectoryName(target));
                    using (Stream input = entry.Open())
                    using (FileStream output = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None))
                        input.CopyTo(output);
                }
            }
            VerifyFiles(root);
            string webViewLibraries=Path.Combine(root,"app","vendor","webview2");
            SetDllDirectory(webViewLibraries);
            AppDomain.CurrentDomain.AssemblyResolve+=delegate(object sender,ResolveEventArgs e)
            {
                string name=new AssemblyName(e.Name).Name;
                if(name!="Microsoft.Web.WebView2.Core"&&name!="Microsoft.Web.WebView2.WinForms")return null;
                return Assembly.LoadFrom(Path.Combine(webViewLibraries,name+".dll"));
            };
            string home = Path.Combine(root, "index.html");
            if (!File.Exists(home)) throw new FileNotFoundException("시작 화면을 찾을 수 없습니다.");
            if(collectorSmoke)return InstitutionCollectorSmoke.Run(root);
            if (verify)
            {
                File.WriteAllText(Path.Combine(root, "verification.txt"), "PASS: embedded archive extracted; SHA-256 verified; entry page exists.", Encoding.UTF8);
                return 0;
            }
            using (var host = new AcquisitionHost(root, hostTest))
            {
                if(hostTest) Application.Run();
                else
                {
                    using (var tray = new NotifyIcon { Icon = System.Drawing.SystemIcons.Application, Text = "경정청구 · 기관 자료 수집", Visible = true })
                    using (var menu = new ContextMenuStrip())
                    {
                        menu.Items.Add("프로그램 열기", null, delegate { Process.Start(new ProcessStartInfo { FileName = host.Home, UseShellExecute = true }); });
                        menu.Items.Add("자료 수집 연결 종료", null, delegate { Application.Exit(); });
                        tray.ContextMenuStrip = menu;
                        tray.DoubleClick += delegate { Process.Start(new ProcessStartInfo { FileName = host.Home, UseShellExecute = true }); };
                        Process.Start(new ProcessStartInfo { FileName = host.Home, UseShellExecute = true });
                        Application.Run();tray.Visible=false;
                    }
                }
            }
            return 0;
        }
        catch (Exception error)
        {
            if (!verify) MessageBox.Show("프로그램을 실행하지 못했습니다.\n\n" + error.Message,
                "경정청구", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void VerifyFiles(string root)
    {
        foreach (string line in File.ReadAllLines(Path.Combine(root, "checksums.txt"), Encoding.UTF8))
        {
            if (String.IsNullOrWhiteSpace(line)) continue;
            int separator = line.IndexOf("  ", StringComparison.Ordinal);
            if (separator != 64) throw new InvalidDataException("파일 검증 정보가 올바르지 않습니다.");
            string target = Path.GetFullPath(Path.Combine(root, line.Substring(separator + 2).Replace('/', Path.DirectorySeparatorChar)));
            if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("파일 검증 경로 오류");
            string actual;
            using (SHA256 hash = SHA256.Create())
            using (FileStream input = File.OpenRead(target))
                actual = BitConverter.ToString(hash.ComputeHash(input)).Replace("-", "").ToLowerInvariant();
            if (!String.Equals(actual, line.Substring(0, 64), StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("파일 검증 실패: " + Path.GetFileName(target));
        }
    }

    private static bool ExistingEntryMatches(ZipArchiveEntry entry,string target)
    {
        if(!File.Exists(target)||new FileInfo(target).Length!=entry.Length)return false;
        using(var hash=SHA256.Create())
        using(var input=entry.Open())
        using(var existing=new FileStream(target,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete))
        {
            byte[] expected=hash.ComputeHash(input),actual=hash.ComputeHash(existing);
            return expected.SequenceEqual(actual);
        }
    }
}
