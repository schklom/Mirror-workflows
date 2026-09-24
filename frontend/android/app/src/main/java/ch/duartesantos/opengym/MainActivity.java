package ch.duartesantos.opengym;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    // Where the status bar (or the camera cutout) ends and the navigation bar starts, in CSS
    // pixels; negative until the window has said.
    private float barTop = -1;
    private float barBottom = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(InstallPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(RestAlertPlugin.class);
        super.onCreate(savedInstanceState);
        passSystemBarsToPage();
    }

    /**
     * Android 15 draws an app that targets it edge to edge: the page runs under the status bar and
     * under the navigation bar. The WebView reports only the camera cutout as
     * env(safe-area-inset-*), and on some cold starts not even that, so the tab bar sat under the
     * navigation bar (with three buttons, a tap on a tab hit Home or Recents) and now and then the
     * header sat under the status bar. The window's own insets go to the page as --native-sat and
     * --native-sab, which index.css takes over env() wherever they are larger. Before Android 15
     * the window stops at the bars and there is nothing to pass.
     */
    private void passSystemBarsToPage() {
        if (Build.VERSION.SDK_INT < 35 || bridge == null) return;
        WebView web = bridge.getWebView();
        if (web == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            float density = v.getResources().getDisplayMetrics().density;
            barTop = bars.top / density;
            barBottom = bars.bottom / density;
            applyBars(web);
            // The WebView's own handling, which is where env(safe-area-inset-*) comes from.
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
        // A page that loads (the first one, or a reload) starts without them.
        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                applyBars(view);
            }
        });
        ViewCompat.requestApplyInsets(web);
    }

    private void applyBars(WebView web) {
        if (barTop < 0 || barBottom < 0) return;
        web.evaluateJavascript(barsScript(barTop, barBottom), null);
    }

    /** Float.toString: a decimal point in every locale, where String.format could write a comma. */
    static String barsScript(float top, float bottom) {
        return "(function(e){if(!e)return;"
                + "e.style.setProperty('--native-sat','" + Float.toString(top) + "px');"
                + "e.style.setProperty('--native-sab','" + Float.toString(bottom) + "px')"
                + "})(document.documentElement)";
    }
}
