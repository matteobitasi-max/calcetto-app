package com.matteobitasi.calcetto;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayDeque;

// La scossa del telefono la riconosce qui l'accelerometro e la segnala alla pagina con
// l'evento "scossa" (components/scuoti-foto.tsx mostra una foto sorpresa).
public class MainActivity extends BridgeActivity implements SensorEventListener {

    private static final float STRATTONE = 1.3f; // scostamento dalla gravità (in g) per contare uno strattone
    private static final int STRATTONI = 4; // strattoni ravvicinati che fanno una "scossa"
    private static final long FINESTRA = 1500; // ms entro cui devono arrivare gli strattoni
    private static final long DISTANZA = 150; // ms tra due strattoni (le letture di uno stesso colpo contano una volta)
    private static final long PAUSA = 2000; // ms dopo una scossa prima di riconoscerne un'altra

    private SensorManager sensori;
    private final ArrayDeque<Long> strattoni = new ArrayDeque<>();
    private long ferma = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // plugin "Salute" dell'app (Health Connect): va registrato prima di avviare Capacitor
        registerPlugin(SalutePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (sensori == null) sensori = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        Sensor accelerometro = sensori != null ? sensori.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) : null;
        if (accelerometro != null) sensori.registerListener(this, accelerometro, SensorManager.SENSOR_DELAY_GAME);
    }

    @Override
    public void onPause() {
        super.onPause();
        if (sensori != null) sensori.unregisterListener(this);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        float x = event.values[0] / SensorManager.GRAVITY_EARTH;
        float y = event.values[1] / SensorManager.GRAVITY_EARTH;
        float z = event.values[2] / SensorManager.GRAVITY_EARTH;
        // a riposo vale circa 1 g (la gravità): uno strattone si stacca molto da 1
        double forza = Math.sqrt(x * x + y * y + z * z);
        if (Math.abs(forza - 1) <= STRATTONE) return;
        long ora = System.currentTimeMillis();
        if (ora < ferma) return;
        if (!strattoni.isEmpty() && ora - strattoni.peekLast() < DISTANZA) return;
        while (!strattoni.isEmpty() && ora - strattoni.peekFirst() > FINESTRA) strattoni.pollFirst();
        strattoni.addLast(ora);
        if (strattoni.size() < STRATTONI) return;
        strattoni.clear();
        ferma = ora + PAUSA;
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
        webView.evaluateJavascript("window.dispatchEvent(new Event('scossa'))", null);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
