using System;
using System.IO;
using System.Text;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

// Actual WebView2 initialization and real completed-download event, offline and
// without accessing the user's certificate, institution sessions or accounts.
internal static class InstitutionCollectorSmoke
{
    public static int Run(string root)
    {
        int result=1;string report=Path.Combine(root,"collector-smoke.txt");
        using(var form=new Form { Text="경정청구 수집기 검증",Width=600,Height=450,ShowInTaskbar=false,Opacity=0 })
        using(var view=new WebView2 { Dock=DockStyle.Fill })
        using(var timeout=new Timer { Interval=30000 })
        {
            form.Controls.Add(view);timeout.Tick+=delegate{File.WriteAllText(report,"FAIL: WebView2 download timeout",Encoding.UTF8);form.Close();};
            form.Shown+=async delegate
            {
                try
                {
                    string runtime=CoreWebView2Environment.GetAvailableBrowserVersionString();
                    var environment=await CoreWebView2Environment.CreateAsync(null,Path.Combine(root,"smoke-profile"));await view.EnsureCoreWebView2Async(environment);
                    view.CoreWebView2.DownloadStarting+=(sender,e)=>
                    {
                        string target=Path.Combine(root,"collector-fixture.txt");e.ResultFilePath=target;e.Handled=true;var operation=e.DownloadOperation;
                        operation.StateChanged+=delegate
                        {
                            if(operation.State==CoreWebView2DownloadState.Completed)
                            {
                                if(File.Exists(target)&&File.ReadAllText(target)=="returncheck-native-download-test")
                                {File.WriteAllText(report,"PASS: embedded WebView2 initialized; real download-completed event and saved content verified. Runtime: "+runtime,Encoding.UTF8);result=0;}
                                else File.WriteAllText(report,"FAIL: downloaded content mismatch",Encoding.UTF8);
                                timeout.Stop();form.Close();
                            }
                            else if(operation.State==CoreWebView2DownloadState.Interrupted){File.WriteAllText(report,"FAIL: "+operation.InterruptReason,Encoding.UTF8);form.Close();}
                        };
                    };
                    view.CoreWebView2.NavigateToString("<!doctype html><title>경정청구 수집기 검증</title><p>로컬 테스트 자료</p><script>setTimeout(function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['returncheck-native-download-test'],{type:'text/plain'}));a.download='collector-fixture.txt';document.body.appendChild(a);a.click()},500)</script>");
                    timeout.Start();
                }
                catch(Exception error){File.WriteAllText(report,"FAIL: "+error.ToString(),Encoding.UTF8);form.Close();}
            };
            Application.Run(form);
        }
        return result;
    }
}
