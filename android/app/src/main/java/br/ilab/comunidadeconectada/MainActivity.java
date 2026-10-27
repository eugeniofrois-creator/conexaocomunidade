package br.ilab.comunidadeconectada;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import java.util.Locale;

/** Thin native shell: all accounts and business data stay on the HTTPS server. */
public class MainActivity extends Activity {
 private static final String HOST="conexao-comunidade-frei-damiao.eugenio-frois.chatgpt.site";
 private static final String HOME="https://"+HOST+"/comunidade.html?app=1";
 private WebView web; private TextView status; private ValueCallback<Uri[]> files;
 private GeolocationPermissions.Callback geo; private String geoOrigin;
 private TextToSpeech tts; private boolean voiceReady; private boolean loadingFailed;
 private boolean trusted(String url){try{Uri u=Uri.parse(url);return "https".equals(u.getScheme())&&HOST.equals(u.getHost())&&(u.getPort()==-1||u.getPort()==443);}catch(Exception e){return false;}}
 @Override public void onCreate(Bundle state){super.onCreate(state);
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff126654);
  LinearLayout bar=new LinearLayout(this);bar.setBackgroundColor(0xffffffff);bar.setGravity(17);bar.setPadding(8,4,8,4);
  Button back=new Button(this);back.setText("Voltar");back.setOnClickListener(v->goBack());bar.addView(back);
  TextView title=new TextView(this);android.text.SpannableString brandTitle=new android.text.SpannableString("CONEXÃO\nCOMUNIDADE");brandTitle.setSpan(new android.text.style.ForegroundColorSpan(0xff083b63),0,7,android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);brandTitle.setSpan(new android.text.style.ForegroundColorSpan(0xff00843d),8,brandTitle.length(),android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);title.setText(brandTitle);title.setTextColor(0xff083b63);title.setTextSize(18);title.setTypeface(android.graphics.Typeface.create("sans-serif-black",android.graphics.Typeface.BOLD));title.setLineSpacing(0,0.95f);title.setPadding(10,0,4,0);bar.addView(title,new LinearLayout.LayoutParams(0,-2,1));
  Button reload=new Button(this);reload.setText("⋮");reload.setContentDescription("Opções");reload.setOnClickListener(v->new AlertDialog.Builder(this).setItems(new String[]{"Atualizar página","Abrir no navegador"},(d,n)->{if(n==0)web.reload();else external(trusted(web.getUrl())?web.getUrl():HOME);}).show());bar.addView(reload);root.addView(bar);
  status=new TextView(this);status.setTextColor(0xffffffff);status.setPadding(12,4,12,4);root.addView(status);
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
  if(Build.VERSION.SDK_INT>=35){root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets sys=insets.getInsets(WindowInsets.Type.systemBars());v.setPadding(sys.left,sys.top,sys.right,sys.bottom);return insets;});root.requestApplyInsets();}
  WebSettings s=web.getSettings();s.setUserAgentString(s.getUserAgentString()+" ComunidadeConectadaApp/0.2");s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setGeolocationEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportMultipleWindows(true);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setMediaPlaybackRequiresUserGesture(true);
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  tts=new TextToSpeech(this,result->{if(result==TextToSpeech.SUCCESS){int lang=tts.setLanguage(new Locale("pt","BR"));voiceReady=lang!=TextToSpeech.LANG_MISSING_DATA&&lang!=TextToSpeech.LANG_NOT_SUPPORTED;}});
  // No JavascriptInterface: voice requests contain only text and originate on this site.
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView w,String url){return navigate(url);}
   @Override public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest r){if(!r.isForMainFrame())return !trusted(r.getUrl().toString());return navigate(r.getUrl().toString());}
   @Override public void onPageStarted(WebView w,String url,android.graphics.Bitmap icon){loadingFailed=false;status.setVisibility(View.VISIBLE);status.setText("Carregando…");if(tts!=null)tts.stop();}
   @Override public void onPageFinished(WebView w,String url){if(!loadingFailed)status.setVisibility(View.GONE);CookieManager.getInstance().flush();if(trusted(url))w.evaluateJavascript("window.__CC_ANDROID__=true;window.dispatchEvent(new Event('cc-android-ready'));",null);}
   @Override public void onReceivedError(WebView w,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame()){loadingFailed=true;status.setVisibility(View.VISIBLE);status.setText("Não foi possível carregar. Confira sua conexão e use Atualizar página.");}}
   @Override public void onReceivedSslError(WebView w,android.webkit.SslErrorHandler h,android.net.http.SslError e){h.cancel();loadingFailed=true;status.setVisibility(View.VISIBLE);status.setText("Não foi possível verificar a conexão segura.");}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback cb){if(!trusted(origin)){cb.invoke(origin,false,false);return;}if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){cb.invoke(origin,true,false);return;}if(geo!=null)geo.invoke(geoOrigin,false,false);geo=cb;geoOrigin=origin;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},7);}
   @Override public void onGeolocationPermissionsHidePrompt(){if(geo!=null){geo.invoke(geoOrigin,false,false);geo=null;}}
   @Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams p){if(!trusted(w.getUrl()))return false;if(files!=null)files.onReceiveValue(null);files=cb;Intent pick=new Intent(Intent.ACTION_GET_CONTENT);pick.setType("image/*");pick.addCategory(Intent.CATEGORY_OPENABLE);pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,p.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);try{startActivityForResult(Intent.createChooser(pick,"Selecionar fotos da empresa"),8);}catch(ActivityNotFoundException e){files.onReceiveValue(null);files=null;Toast.makeText(MainActivity.this,"Nenhum seletor de fotos disponível.",Toast.LENGTH_LONG).show();}return true;}
   @Override public boolean onCreateWindow(WebView w,boolean dialog,boolean gesture,android.os.Message message){if(!gesture)return false;WebView child=new WebView(MainActivity.this);child.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView w,String url){if(trusted(url))web.loadUrl(url);else navigate(url);w.destroy();return true;}@Override public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest r){String url=r.getUrl().toString();if(trusted(url))web.loadUrl(url);else navigate(url);w.destroy();return true;}});((WebView.WebViewTransport)message.obj).setWebView(child);message.sendToTarget();return true;}
  });
  web.setDownloadListener((url,ua,disposition,type,length)->external(url));
  String ua=s.getUserAgentString();java.util.regex.Matcher major=java.util.regex.Pattern.compile("Chrome/(\\d+)").matcher(ua);boolean old=major.find()&&Integer.parseInt(major.group(1))<100;
  if(old){new AlertDialog.Builder(this).setTitle("Atualize o Android System WebView").setMessage("Este componente está antigo. Atualize-o para usar busca, mapa e fotos no aplicativo. Enquanto isso, você pode abrir o sistema em um navegador atualizado.").setPositiveButton("Abrir navegador",(d,n)->external(HOME)).setNegativeButton("Tentar no aplicativo",(d,n)->web.loadUrl(HOME)).setCancelable(false).show();}else if(state==null||web.restoreState(state)==null)web.loadUrl(HOME);
 }
 private boolean navigate(String url){Uri u=Uri.parse(url);if("ccvoice".equals(u.getScheme())){if(trusted(web.getUrl())&&tts!=null){if("cancel".equals(u.getHost()))tts.stop();else if("speak".equals(u.getHost())){String text=u.getQueryParameter("text");if(text!=null&&text.length()<=2000){if(voiceReady)tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"guide");else Toast.makeText(this,"Voz em português indisponível no aparelho.",Toast.LENGTH_SHORT).show();}}}return true;}if(trusted(url))return false;external(url);return true;}
 private void external(String url){if(url==null)return;Uri u=Uri.parse(url);String scheme=u.getScheme();if(!("https".equals(scheme)||"tel".equals(scheme)||"mailto".equals(scheme)||"geo".equals(scheme)))return;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(ActivityNotFoundException e){Toast.makeText(this,"Nenhum aplicativo pode abrir este link.",Toast.LENGTH_LONG).show();}}
 private void goBack(){if(web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setMessage("Sair do aplicativo?").setPositiveButton("Sair",(d,n)->finish()).setNegativeButton("Continuar",null).show();}
 @Override public void onBackPressed(){goBack();}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request==7&&geo!=null){boolean allowed=checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;geo.invoke(geoOrigin,allowed,false);geo=null;}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==8&&files!=null){Uri[] selected=null;if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){int n=data.getClipData().getItemCount();selected=new Uri[n];for(int i=0;i<n;i++)selected[i]=data.getClipData().getItemAt(i).getUri();}else if(data.getData()!=null)selected=new Uri[]{data.getData()};}files.onReceiveValue(selected);files=null;}}
 @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);web.saveState(out);}
 @Override protected void onPause(){super.onPause();if(tts!=null)tts.stop();web.onPause();CookieManager.getInstance().flush();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(files!=null)files.onReceiveValue(null);if(geo!=null)geo.invoke(geoOrigin,false,false);if(tts!=null){tts.stop();tts.shutdown();}web.destroy();super.onDestroy();}
}
