package com.matteobitasi.calcetto

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
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
import java.time.Duration
import java.time.Instant

// Health Connect (Android): i km camminati/corsi registrati (Google Fit, Samsung Health, Fitbit...)
// tra l'inizio e la fine della partita. Solo lettura. È il plugin "Salute", come su iPhone,
// usato da components/km-partita.tsx e components/km-automatici.tsx.
//
// Non tutte le app scrivono la distanza con l'orario giusto (Garmin, per esempio, può salvarla come totale
// del giorno), mentre i passi sì. Quindi si tiene il valore più alto tra la distanza nell'orario della partita
// e i passi dell'app che ne ha contati di più, convertiti in metri con il passo di quella persona
// (km ÷ passi della stessa app negli ultimi giorni) o con 0,8 m. Come su iPhone (AppDelegate.swift).
@CapacitorPlugin(name = "Salute")
class SalutePlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val permessi = setOf(
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
    )
    // Lunghezza di un passo quando non si può calcolare quella della persona (tra camminata e corsa).
    private val metriPerPasso = 0.8

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
                // senza il permesso della distanza si risponde 0 km, come fa Apple Salute;
                // senza quello dei passi si legge solo la distanza
                val concessi = client.permissionController.getGrantedPermissions()
                if (concessi.contains(HealthPermission.getReadPermission(DistanceRecord::class))) leggi(call, client)
                else call.resolve(JSObject().put("metri", 0))
            } catch (e: Exception) {
                call.reject(e.message ?: "Errore di Health Connect")
            }
        }
    }

    private suspend fun leggi(call: PluginCall, client: HealthConnectClient) {
        val inizio = Instant.ofEpochMilli(millis(call, "inizio")!!)
        val fine = Instant.ofEpochMilli(millis(call, "fine")!!)
        // 1. Il totale di Health Connect nell'orario della partita. Somma tutte le app/dispositivi
        // senza contare due volte gli stessi passi (telefono e orologio), secondo le priorità di Health Connect.
        val distanza = client.aggregate(
            AggregateRequest(setOf(DistanceRecord.DISTANCE_TOTAL), TimeRangeFilter.between(inizio, fine)),
        )[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
        // 2. I passi dell'app che ne ha contati di più (l'orologio, non il telefono in borsa).
        val daiPassi = try {
            stimaDaiPassi(client, inizio, fine)
        } catch (e: SecurityException) {
            0.0 // permesso dei passi non concesso: resta la distanza
        }
        val metri = maxOf(distanza, daiPassi)
        val fonte = if (metri == 0.0) "nessuna" else if (metri == distanza) "distanza" else "passi"
        call.resolve(JSObject().put("metri", metri).put("fonte", fonte))
    }

    private suspend fun stimaDaiPassi(client: HealthConnectClient, inizio: Instant, fine: Instant): Double {
        val partita = TimeRangeFilter.between(inizio, fine)
        val origini = client.readRecords(ReadRecordsRequest(StepsRecord::class, partita)).records
            .map { it.metadata.dataOrigin.packageName }.toSet()
        // passi nell'orario della partita, app per app (aggregate conta solo la parte dentro l'orario)
        val (orologio, passi) = origini
            .map { it to (client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), partita, setOf(DataOrigin(it))))[StepsRecord.COUNT_TOTAL] ?: 0L) }
            .maxByOrNull { it.second } ?: return 0.0
        // il passo di questa persona secondo la stessa app: la settimana prima e il giorno dopo
        // (alcune app scrivono i km del giorno solo quando si sincronizzano)
        val giorni = TimeRangeFilter.between(inizio.minus(Duration.ofDays(7)), fine.plus(Duration.ofDays(1)))
        val totali = client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL, DistanceRecord.DISTANCE_TOTAL), giorni, setOf(DataOrigin(orologio))))
        val tuttiPassi = totali[StepsRecord.COUNT_TOTAL] ?: 0L
        val tuttiMetri = totali[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
        val calcolato = if (tuttiPassi > 2000) tuttiMetri / tuttiPassi else 0.0
        val passo = if (calcolato in 0.5..1.5) calcolato else metriPerPasso
        return passi * passo
    }

    // Gli orari arrivano in millisecondi: numeri interi grandi (Long), non Double.
    private fun millis(call: PluginCall, chiave: String): Long? =
        call.data.opt(chiave).let { (it as? Number)?.toLong() }

    private fun apriPlayStore() {
        val uri = Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")
        activity?.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.vending").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
