package com.kurt.azaliyor

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregateMetric
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

data class DayData(
    val date: LocalDate,
    val activeKcal: Double?,
    val totalKcal: Double?,
    val steps: Long?,
    val distanceM: Double?,
    /**
     * True when Health Connect had no real calorie data for the day and the
     * total is only its built-in basal (resting) estimate.
     */
    val totalEstimated: Boolean,
    /** Package names of the apps that wrote this day's data. */
    val sources: List<String>,
)

data class WeightData(val date: LocalDate, val kg: Double)

object HealthReader {
    val ACTIVE = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
    val TOTAL = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    val STEPS = HealthPermission.getReadPermission(StepsRecord::class)
    val DISTANCE = HealthPermission.getReadPermission(DistanceRecord::class)
    val WEIGHT = HealthPermission.getReadPermission(WeightRecord::class)
    val BACKGROUND = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

    val PERMISSIONS = setOf(ACTIVE, TOTAL, STEPS, DISTANCE, WEIGHT, BACKGROUND)

    fun sdkStatus(context: Context): Int = HealthConnectClient.getSdkStatus(context)

    fun client(context: Context): HealthConnectClient? =
        if (sdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) HealthConnectClient.getOrCreate(context) else null

    suspend fun granted(client: HealthConnectClient): Set<String> =
        client.permissionController.getGrantedPermissions()

    /** Reads the last [days] days (including today), one entry per local day. */
    suspend fun readDays(client: HealthConnectClient, days: Long): Pair<List<DayData>, List<WeightData>> {
        val granted = granted(client)
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val start = today.minusDays(days - 1)

        val now = LocalDateTime.now(zone)

        val otherMetrics = mutableSetOf<AggregateMetric<*>>()
        if (ACTIVE in granted) otherMetrics += ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
        if (STEPS in granted) otherMetrics += StepsRecord.COUNT_TOTAL
        if (DISTANCE in granted) otherMetrics += DistanceRecord.DISTANCE_TOTAL

        val dayList = (0 until days).map { start.plusDays(it) }.map { date ->
            // Bugün için aralık "şu an"da biter; yoksa Health Connect günün
            // geri kalanı için de tahmini bazal kalori ekler.
            val end = minOf(date.plusDays(1).atStartOfDay(), now)
            val range = TimeRangeFilter.between(date.atStartOfDay(), end)

            val other = if (otherMetrics.isEmpty()) null else client.aggregate(AggregateRequest(otherMetrics, range))
            // Toplam ayrı sorgulanır ki hangi uygulamalardan geldiği (dataOrigins) net görülsün.
            val total = if (TOTAL in granted) {
                client.aggregate(AggregateRequest(setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL), range))
            } else null

            val totalKcal = total?.get(TotalCaloriesBurnedRecord.ENERGY_TOTAL)?.inKilocalories
            val totalSources = total?.dataOrigins?.map { it.packageName }.orEmpty()
            DayData(
                date = date,
                activeKcal = other?.get(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)?.inKilocalories,
                totalKcal = totalKcal,
                steps = other?.get(StepsRecord.COUNT_TOTAL),
                distanceM = other?.get(DistanceRecord.DISTANCE_TOTAL)?.inMeters,
                totalEstimated = totalKcal != null && totalSources.isEmpty(),
                sources = (totalSources + other?.dataOrigins?.map { it.packageName }.orEmpty()).distinct(),
            )
        }.filter {
            // Sadece tahmini bazal değeri olan (gerçek veri içermeyen) günleri gönderme.
            it.activeKcal != null || it.steps != null || (it.totalKcal != null && !it.totalEstimated)
        }

        val weights = if (WEIGHT !in granted) emptyList() else client.readRecords(
            ReadRecordsRequest(
                recordType = WeightRecord::class,
                timeRangeFilter = TimeRangeFilter.between(
                    start.atStartOfDay(zone).toInstant(),
                    today.plusDays(1).atStartOfDay(zone).toInstant(),
                ),
            )
        ).records
            .sortedBy { it.time }
            .groupBy { it.time.atZone(zone).toLocalDate() }
            .map { (date, recs) -> WeightData(date, recs.last().weight.inKilograms) }

        return dayList to weights
    }
}
