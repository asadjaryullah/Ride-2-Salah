package app.ride2salah.mobile;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* Springt direkt in die App-eigenen Systemeinstellungen (Standort,
   Benachrichtigungen usw.). Einmal abgelehnte Berechtigungen lassen sich
   nicht erneut per App-Dialog erfragen - das ist eine Betriebssystem-
   Einschraenkung, keine Eigenheit dieser App. Ohne diesen direkten Sprung
   bliebe nur eine Textanleitung, in welchem Menü man das selbst suchen
   muss - das wirkte wie eine Sackgasse. */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        getContext().startActivity(intent);
        call.resolve();
    }
}
