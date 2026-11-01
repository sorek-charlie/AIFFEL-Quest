package com.orbit.scheduler;
import android.app.Notification;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
public class KakaoNotifications extends NotificationListenerService {
 @Override public void onNotificationPosted(StatusBarNotification item){
  if(!"com.kakao.talk".equals(item.getPackageName())||!LocalStore.prefs(this).getBoolean("capture",false))return;
  Notification n=item.getNotification();if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
  Bundle b=n.extras;if(b==null)return;
  String title=String.valueOf(b.getCharSequence(Notification.EXTRA_TITLE,"카카오톡"));
  CharSequence value=b.getCharSequence(Notification.EXTRA_BIG_TEXT);if(value==null)value=b.getCharSequence(Notification.EXTRA_TEXT);
  Parcelable[] messages=b.getParcelableArray("android.messages");if(messages!=null&&messages.length>0&&messages[messages.length-1] instanceof Bundle){CharSequence latest=((Bundle)messages[messages.length-1]).getCharSequence("text");if(latest!=null)value=latest;}
  if(value==null||value.length()<2)return;
  String text=value.toString();if(text.length()>4000)text=text.substring(0,4000);
  try{LocalStore.add(this,title,text);}catch(Exception ignored){} // Never log notification contents.
 }
}
