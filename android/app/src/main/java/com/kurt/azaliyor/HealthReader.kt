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
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId

data class DayData(
    val date: LocalDate,
    val activeKcal: Double?,
    val totalKcal: Double?,
    val steps: Long?,
    val distanceM: Double?,
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

        val metrics = mutableSetOf<AggregateMetric<*>>()
        if (ACTIVE in granted) metrics += ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
        if (TOTAL in granted) metrics += TotalCaloriesBurnedRecord.ENERGY_TOTAL
        if (STEPS in granted) metrics += StepsRecord.COUNT_TOTAL
        if (DISTANCE in granted) metrics += DistanceRecord.DISTANCE_TOTAL

        val dayList = if (metrics.isEmpty()) emptyList() else client.aggregateGroupByPeriod(
            AggregateGroupByPeriodRequest(
                metrics = metrics,
                timeRangeFilter = TimeRangeFilter.between(start.atStartOfDay(), today.plusDays(1).atStartOfDay()),
                timeRangeSlicer = Period.ofDays(1),
            )
        ).map { g ->
            DayData(
                date = g.startTime.toLocalDate(),
                activeKcal = g.result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories,
                totalKcal = g.result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories,
                steps = g.result[StepsRecord.COUNT_TOTAL],
                distanceM = g.result[DistanceRecord.DISTANCE_TOTAL]?.inMeters,
            )
        }.filter { it.activeKcal != null || it.totalKcal != null || it.steps != null }

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
