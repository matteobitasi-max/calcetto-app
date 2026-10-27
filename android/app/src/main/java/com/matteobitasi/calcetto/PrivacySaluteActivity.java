package com.matteobitasi.calcetto;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

// Health Connect apre questa schermata per spiegare perché The Cap legge i dati di salute:
// mostra la pagina Privacy (sezione "Km percorsi") e si chiude.
public class PrivacySaluteActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.thecapfc.app/privacy")));
        finish();
    }
}
