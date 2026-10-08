package com.kurt.azaliyor

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit

/** Runs a sync: reads Health Connect and uploads. Returns a human-readable summary. */
suspend fun runSync(context: Context, days: Long = 7): String {
    val prefs = Prefs(context)
    check(prefs.isConfigured) { "Önce site adresini ve senkron anahtarını gir." }
    val client = HealthReader.client(context) ?: error("Health Connect kullanılamıyor.")
    val (dayList, weights) = HealthReader.readDays(client, days)
    val res = Uploader.send(prefs.serverUrl, prefs.token, dayList, weights)
    val time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM HH:mm"))
    val summary = "$time · ${res.optInt("days")} gün, ${res.optInt("weights")} kilo kaydı gönderildi"
    prefs.lastResult = summary
    return summary
}

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        runSync(applicationContext)
        Result.success()
    } catch (e: SecurityException) {
        // Arka planda okuma izni yok: uygulama açılınca senkron yapılır.
        Prefs(applicationContext).lastResult = "Arka plan izni yok — uygulamayı açınca senkronlanır"
        Result.failure()
    } catch (e: Exception) {
        Prefs(applicationContext).lastResult = "Hata: ${e.message}"
        if (runAttemptCount < 3) Result.retry() else Result.failure()
    }

    companion object {
        private const val NAME = "kurt-sync"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
        }
    }
}
