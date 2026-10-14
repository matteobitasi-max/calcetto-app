package com.matteobitasi.calcetto

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Instant

// Health Connect (Android): i km camminati/corsi registrati (Google Fit, Samsung Health, Fitbit...)
// tra l'inizio e la fine della partita. Solo lettura. È il plugin "Salute", come su iPhone,
// usato da components/km-partita.tsx e components/km-automatici.tsx.
@CapacitorPlugin(name = "Salute")
class SalutePlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val permessi = setOf(HealthPermission.getReadPermission(DistanceRecord::class))

    @PluginMethod
    fun distanza(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Health Connect richiede Android 8 o successivo", "NON_DISPONIBILE")
            return
        }
        when (HealthConnectClient.getSdkStatus(context)) {
            HealthConnectClient.SDK_AVAILABLE -> Unit
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                apriPlayStore()
                call.reject("Installa o aggiorna Health Connect dal Play Store", "DA_INSTALLARE")
                return
            }
            else -> {
                call.reject("Health Connect non è disponibile su questo telefono", "NON_DISPONIBILE")
                return
            }
        }
        if (millis(call, "inizio") == null || millis(call, "fine") == null) {
            call.reject("Orario della partita mancante")
            return
        }
        val client = HealthConnectClient.getOrCreate(context)
        scope.launch {
            try {
                if (client.permissionController.getGrantedPermissions().containsAll(permessi)) {
                    leggi(call, client)
                } else {
                    val intent = PermissionController.createRequestPermissionResultContract().createIntent(context, permessi)
                    startActivityForResult(call, intent, "dopoPermesso")
                }
            } catch (e: Exception) {
                call.reject(e.message ?: "Errore di Health Connect")
            }
        }
    }

    @ActivityCallback
    private fun dopoPermesso(call: PluginCall?, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        if (call == null) return
        val client = HealthConnectClient.getOrCreate(context)
        scope.launch {
            try {
                // senza permesso si risponde 0 km, come fa Apple Salute
                if (client.permissionController.getGrantedPermissions().containsAll(permessi)) leggi(call, client)
                else call.resolve(JSObject().put("metri", 0))
            } catch (e: Exception) {
                call.reject(e.message ?: "Errore di Health Connect")
            }
        }
    }

    private suspend fun leggi(call: PluginCall, client: HealthConnectClient) {
        val inizio = Instant.ofEpochMilli(millis(call, "inizio")!!)
        val fine = Instant.ofEpochMilli(millis(call, "fine")!!)
        val totale = client.aggregate(AggregateRequest(setOf(DistanceRecord.DISTANCE_TOTAL), TimeRangeFilter.between(inizio, fine)))
        call.resolve(JSObject().put("metri", totale[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0))
    }

    // Gli orari arrivano in millisecondi: numeri interi grandi (Long), non Double.
    private fun millis(call: PluginCall, chiave: String): Long? =
        call.data.opt(chiave).let { (it as? Number)?.toLong() }

    private fun apriPlayStore() {
        val uri = Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")
        activity?.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.vending").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
