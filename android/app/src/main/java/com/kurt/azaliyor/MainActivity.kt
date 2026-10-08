package com.kurt.azaliyor

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private val Accent = Color(0xFF3987E5)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Accent,
                    background = Color(0xFF0D0D0D),
                    surface = Color(0xFF1A1A19),
                    surfaceVariant = Color(0xFF1A1A19),
                ),
            ) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    BridgeScreen()
                }
            }
        }
    }
}

@Composable
private fun BridgeScreen() {
    val context = LocalContext.current
    val prefs = remember { Prefs(context) }
    val scope = rememberCoroutineScope()

    var url by remember { mutableStateOf(prefs.serverUrl) }
    var token by remember { mutableStateOf(prefs.token) }
    var sdkStatus by remember { mutableStateOf(HealthReader.sdkStatus(context)) }
    var granted by remember { mutableStateOf<Set<String>>(emptySet()) }
    var today by remember { mutableStateOf<DayData?>(null) }
    var status by remember { mutableStateOf(prefs.lastResult) }
    var busy by remember { mutableStateOf(false) }

    suspend fun refresh(autoSync: Boolean) {
        sdkStatus = HealthReader.sdkStatus(context)
        val client = HealthReader.client(context) ?: return
        granted = HealthReader.granted(client)
        if (granted.isEmpty()) return
        runCatching { HealthReader.readDays(client, 1).first.lastOrNull() }.onSuccess { today = it }
        if (autoSync && prefs.isConfigured) {
            busy = true
            status = runCatching { runSync(context) }.getOrElse { "Hata: ${it.message}" }
            busy = false
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { result ->
        granted = result
        scope.launch { refresh(autoSync = true) }
    }

    LaunchedEffect(Unit) {
        if (prefs.isConfigured) SyncWorker.schedule(context)
        refresh(autoSync = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Kurt Giderek Azalıyor", fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Health Connect → site köprüsü. Yakılan kalori, adım ve kilo her saat başı siteye gönderilir.",
            color = Color(0xFFC3C2B7), fontSize = 14.sp,
        )

        // 1) Health Connect
        Section("1 · Health Connect") {
            when (sdkStatus) {
                HealthConnectClient.SDK_AVAILABLE -> {
                    val missing = HealthReader.PERMISSIONS - granted
                    if (missing.isEmpty()) {
                        Text("✅ Tüm izinler verildi (arka plan dahil)")
                    } else {
                        if (granted.isNotEmpty()) Text("Verilen izin: ${granted.size}/${HealthReader.PERMISSIONS.size}")
                        if (HealthReader.BACKGROUND in missing && granted.isNotEmpty()) {
                            Text(
                                "Arka plan izni yok: veriler sadece uygulamayı açtığında gönderilir.",
                                color = Color(0xFFFAB219), fontSize = 13.sp,
                            )
                        }
                        Button(onClick = { permissionLauncher.launch(HealthReader.PERMISSIONS) }, modifier = Modifier.fillMaxWidth()) {
                            Text("İzinleri ver")
                        }
                    }
                }
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                    Text("Health Connect güncellenmeli.")
                    Button(onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"))
                        )
                    }) { Text("Play Store'da aç") }
                }
                else -> Text("Bu cihazda Health Connect yok. Play Store'dan “Health Connect” uygulamasını kur.")
            }
        }

        // 2) Site ayarları
        Section("2 · Site bağlantısı") {
            OutlinedTextField(
                value = url, onValueChange = { url = it },
                label = { Text("Site adresi") }, placeholder = { Text("https://kurt.vercel.app") },
                singleLine = true, modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            )
            OutlinedTextField(
                value = token, onValueChange = { token = it },
                label = { Text("Senkron anahtarı (SYNC_TOKEN)") },
                singleLine = true, modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
            )
            Button(onClick = {
                prefs.serverUrl = url
                prefs.token = token
                url = prefs.serverUrl
                SyncWorker.schedule(context)
                scope.launch { refresh(autoSync = true) }
            }, modifier = Modifier.fillMaxWidth()) { Text("Kaydet") }
        }

        // 3) Bugün + senkron
        Section("3 · Bugün") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Stat("Toplam", today?.totalKcal?.let { "${it.roundToInt()} kcal" } ?: "—")
                Stat("Aktif", today?.activeKcal?.let { "${it.roundToInt()} kcal" } ?: "—")
                Stat("Adım", today?.steps?.toString() ?: "—")
            }
            today?.let { d ->
                if (d.totalEstimated) {
                    Text(
                        "⚠️ Toplam kalori için gerçek veri yok; gösterilen değer Health Connect'in tahmini bazal (dinlenme) değeri. " +
                            "Saat/bileklik uygulamanda Health Connect'e “kalori” yazma iznini aç.",
                        color = Color(0xFFFAB219), fontSize = 13.sp,
                    )
                }
                Text(
                    "Kaynak: " + (d.sources.map(::appName).ifEmpty { listOf("yok") }.joinToString()),
                    fontSize = 12.sp, color = Color(0xFF9A9890),
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(
                    enabled = !busy && prefs.isConfigured && granted.isNotEmpty(),
                    onClick = {
                        scope.launch {
                            busy = true
                            status = runCatching { runSync(context, days = 30) }.getOrElse { "Hata: ${it.message}" }
                            busy = false
                        }
                    },
                ) { Text(if (busy) "Gönderiliyor…" else "Şimdi senkronla (30 gün)") }
            }
            if (status.isNotEmpty()) Text(status, fontSize = 13.sp, color = Color(0xFFC3C2B7))
        }

        Spacer(Modifier.width(1.dp))
        Text(
            "İpucu: Pil ayarlarında bu uygulama için “Kısıtlanmamış” seçersen arka plan senkronu daha düzenli çalışır.",
            fontSize = 12.sp, color = Color(0xFF9A9890),
        )
    }
}

private fun appName(pkg: String): String = when (pkg) {
    "com.sec.android.app.shealth" -> "Samsung Health"
    "com.google.android.apps.fitness" -> "Google Fit"
    "com.fitbit.FitbitMobile" -> "Fitbit"
    "com.xiaomi.wearable", "com.mi.health" -> "Mi Fitness"
    "com.huami.watch.hmwatchmanager", "com.xiaomi.hm.health" -> "Zepp"
    "com.garmin.android.apps.connectmobile" -> "Garmin Connect"
    "com.strava" -> "Strava"
    "com.withings.wiscale2" -> "Withings"
    "fi.polar.polarflow" -> "Polar Flow"
    "com.google.android.apps.healthdata", "android" -> "Health Connect"
    else -> pkg
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            content()
        }
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column {
        Text(value, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
        Text(label, fontSize = 12.sp, color = Color(0xFF9A9890))
    }
}
