package com.inigo.ligalab;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins propios de la app se registran ANTES de crear el puente.
        registerPlugin(LaligaOAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
