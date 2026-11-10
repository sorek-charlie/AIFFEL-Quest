using System;
using System.IO;
using System.Diagnostics;
using System.Linq;
class Launcher {
    static string Home = AppDomain.CurrentDomain.BaseDirectory;
    static int Run(string program, string arguments) {
        var info = new ProcessStartInfo(program, arguments);
        info.WorkingDirectory = Home;
        info.UseShellExecute = false;
        using (var process = Process.Start(info)) {
            process.WaitForExit();
            return process.ExitCode;
        }
    }
    static int Main(string[] args) {
        bool noPause = args.Contains("--no-pause");
        int code = 1;
        try {
            Console.Title = "YOLO Assignment";
            Console.WriteLine("YOLO detection and segmentation / CPU");
            string python = Path.Combine(Home, ".venv", "Scripts", "python.exe");
            if (!File.Exists(Path.Combine(Home, "run.py")))
                throw new Exception("Keep this EXE in the same folder as run.py.");
            if (!File.Exists(python)) {
                Console.WriteLine("Preparing Python environment. Python 3.11 or 3.12 must be installed.");
                int created;
                try { created = Run("py.exe", "-3 -m venv .venv"); }
                catch (System.ComponentModel.Win32Exception) { created = Run("python.exe", "-m venv .venv"); }
                if (created != 0) throw new Exception("Could not create Python environment.");
            }
            if (Run(python, "-c \"import ultralytics, numpy; from PIL import Image\"") != 0) {
                Console.WriteLine("Installing requirements. Internet access is required.");
                if (Run(python, "-m pip install -r requirements.txt") != 0)
                    throw new Exception("Requirements installation failed. Run again after resolving the error above.");
            }
            code = Run(python, "run.py");
            if (code == 0) {
                Console.WriteLine("Completed. Results:");
                Console.WriteLine(Path.GetFullPath(Path.Combine(Home, "..", "과제제출내용", "outputs", "local_run")));
            } else Console.Error.WriteLine("Execution failed. See the error above.");
        } catch (Exception e) { Console.Error.WriteLine(e.Message); code = 1; }
        if (!noPause && !Console.IsInputRedirected) {
            Console.WriteLine("Press Enter to close.");
            Console.ReadLine();
        }
        return code;
    }
}
