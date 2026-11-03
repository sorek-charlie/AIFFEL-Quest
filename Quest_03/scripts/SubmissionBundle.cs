using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;
class SubmissionBundle {
  [STAThread] static int Main(string[] args) {
    try {
      bool smoke = Array.IndexOf(args, "--smoke-test") >= 0;
      bool gmailOnly = Path.GetFileNameWithoutExtension(Assembly.GetExecutingAssembly().Location).Contains("메일") || Array.IndexOf(args,"--gmail-review") >= 0;
      bool googleOnly = Path.GetFileNameWithoutExtension(Assembly.GetExecutingAssembly().Location).Contains("구글") || Array.IndexOf(args,"--google-calendar") >= 0;
      string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ORBIT Scheduler", "bundle", "submission-20261103-menu-kinds");
      Directory.CreateDirectory(root);
      using (var resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
      using (var archive = new ZipArchive(resource, ZipArchiveMode.Read)) {
        foreach (var entry in archive.Entries) {
          string path = Path.GetFullPath(Path.Combine(root, entry.FullName));
          if (!path.StartsWith(Path.GetFullPath(root) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new IOException("Invalid bundle path");
          if (entry.Name.Length == 0) { Directory.CreateDirectory(path); continue; }
          Directory.CreateDirectory(Path.GetDirectoryName(path));
          if (File.Exists(path) && new FileInfo(path).Length == entry.Length) continue;
          using (var input = entry.Open()) using (var output = File.Create(path)) input.CopyTo(output);
        }
      }
      string app = Path.Combine(root, "ORBIT-Scheduler");
      var start = new ProcessStartInfo(Path.Combine(app, "ORBIT-Scheduler.exe"), (smoke ? "--smoke-test " : "") + (gmailOnly ? "--gmail-review" : googleOnly ? "--google-calendar" : ""));
      start.WorkingDirectory = app; start.UseShellExecute = false;
      using (var child = Process.Start(start)) {
        if (smoke && !child.WaitForExit(30000)) { child.Kill(); throw new IOException("Smoke test timed out"); }
        if (!smoke) child.WaitForExit();
        if (child.ExitCode != 0) return child.ExitCode;
      }
      if (smoke) {
        string result = Path.Combine(app, "smoke-result.txt");
        if (!File.Exists(result)) throw new IOException("Missing smoke result");
        File.Copy(result, Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-result.txt"), true);
      }
      return 0;
    } catch (Exception ex) { MessageBox.Show(ex.Message, "이성진 일정 관리"); return 1; }
  }
}
