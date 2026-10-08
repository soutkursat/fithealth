package com.kurt.azaliyor

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object Uploader {
    /** POSTs to <server>/api/sync. Returns the server's JSON response. */
    suspend fun send(serverUrl: String, token: String, days: List<DayData>, weights: List<WeightData>): JSONObject =
        withContext(Dispatchers.IO) {
            val body = JSONObject().apply {
                put("days", JSONArray().apply {
                    days.forEach { d ->
                        put(JSONObject().apply {
                            put("date", d.date.toString())
                            d.activeKcal?.let { put("activeKcal", it) }
                            d.totalKcal?.let { put("totalKcal", it) }
                            d.steps?.let { put("steps", it) }
                            d.distanceM?.let { put("distanceM", it) }
                        })
                    }
                })
                put("weights", JSONArray().apply {
                    weights.forEach { w -> put(JSONObject().put("date", w.date.toString()).put("kg", w.kg)) }
                })
            }

            val conn = URL("$serverUrl/api/sync").openConnection() as HttpURLConnection
            try {
                conn.requestMethod = "POST"
                conn.connectTimeout = 15_000
                conn.readTimeout = 20_000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.outputStream.use { it.write(body.toString().toByteArray()) }
                val code = conn.responseCode
                val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.use { it.readText() } ?: ""
                if (code !in 200..299) {
                    val msg = runCatching { JSONObject(text).optString("error") }.getOrNull()
                    throw IllegalStateException("Sunucu hatası $code${if (!msg.isNullOrEmpty()) ": $msg" else ""}")
                }
                JSONObject(text)
            } finally {
                conn.disconnect()
            }
        }
}
