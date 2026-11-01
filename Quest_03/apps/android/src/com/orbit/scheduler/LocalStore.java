package com.orbit.scheduler;
import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import android.util.Base64;
final class LocalStore {
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("orbit-private",Context.MODE_PRIVATE);}
 static String hash(String text)throws Exception {return Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(text.getBytes("UTF-8")),Base64.NO_WRAP);}
 static byte[] derive(String password,byte[] salt)throws Exception {return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(password.toCharArray(),salt,160000,256)).getEncoded();}
 static void password(Context c,String password)throws Exception {if(password.length()<8||password.length()>128)throw new Exception("비밀번호는 8~128자로 설정하세요.");byte[] salt=new byte[32];new SecureRandom().nextBytes(salt);prefs(c).edit().putString("salt",Base64.encodeToString(salt,Base64.NO_WRAP)).putString("password",Base64.encodeToString(derive(password,salt),Base64.NO_WRAP)).commit();}
 static boolean verify(Context c,String password)throws Exception {if(System.currentTimeMillis()<prefs(c).getLong("locked",0))throw new Exception("15분 뒤 다시 시도하세요.");String value=prefs(c).getString("password",null);if(value==null)return false;boolean ok=MessageDigest.isEqual(derive(password,Base64.decode(prefs(c).getString("salt",""),Base64.NO_WRAP)),Base64.decode(value,Base64.NO_WRAP));if(ok)prefs(c).edit().putInt("failures",0).apply();else {int count=prefs(c).getInt("failures",0)+1;if(count>=6)prefs(c).edit().putLong("locked",System.currentTimeMillis()+900000).putInt("failures",0).apply();else prefs(c).edit().putInt("failures",count).apply();}return ok;}
 static synchronized JSONArray queue(Context c){try{return new JSONArray(prefs(c).getString("queue","[]"));}catch(Exception e){return new JSONArray();}}
 static synchronized void add(Context c,String title,String text)throws Exception {String id=hash(title+"\n"+text);JSONArray all=queue(c);for(int i=0;i<all.length();i++)if(id.equals(all.getJSONObject(i).optString("id")))return;JSONArray next=new JSONArray();next.put(new JSONObject().put("id",id).put("title",title).put("text",text).put("at",System.currentTimeMillis()).put("state","pending"));for(int i=0;i<Math.min(all.length(),199);i++)next.put(all.getJSONObject(i));prefs(c).edit().putString("queue",next.toString()).commit();}
 static synchronized void finish(Context c,String id,String state)throws Exception {JSONArray all=queue(c);for(int i=0;i<all.length();i++){JSONObject item=all.getJSONObject(i);if(id.equals(item.optString("id")))item.put("state",state);}prefs(c).edit().putString("queue",all.toString()).commit();}
}
